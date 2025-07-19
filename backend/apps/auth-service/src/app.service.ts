// backend/apps/auth-service/src/app.service.ts
import {
  Injectable,
  Inject,
  Logger,
} from '@nestjs/common';
import { RpcException, ClientProxy } from '@nestjs/microservices';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { SupabaseService } from './supabase/supabase.service';
import { PrismaService } from './prisma/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { Prisma } from '../prisma/generated/auth-client';

@Injectable()
export class AppService {
  private readonly supabase;
  private readonly supabaseAdmin;
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService,
    @Inject('GYM_SERVICE') private readonly gymClient: ClientProxy,
    private readonly amqpConnection: AmqpConnection,
  ) {
    this.supabase = this.supabaseService.getClient();
    this.supabaseAdmin = this.supabaseService.getAdminClient();
  }

  getHello(): string {
    return 'Auth Service is running! 🚀';
  }

  //
  // ─── AUTH / REGISTER / LOGIN ───────────────────────────────────────────────
  //

  async registerUser(registerUserDto: RegisterUserDto) {
    const { email, password, firstName, lastName, gymId } = registerUserDto;
    try {
      // 1. Registrar en Supabase Auth
      const { data: authData, error: authError } =
        await this.supabase.auth.signUp({
          email,
          password,
          options: { data: { firstName, lastName } },
        });

      if (authError) {
        if (authError.message.includes('already_registered')) {
          throw new RpcException({ message: 'El email ya está registrado.', status: 409 });
        }
        throw new RpcException({ message: `Error en el registro: ${authError.message}`, status: 400 });
      }
      if (!authData.user) {
        throw new RpcException({ message: 'No se pudo crear el usuario en Auth.', status: 500 });
      }

      // 2. Actualizar metadata en Supabase Admin
      await this.supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
        app_metadata: { role: 'MEMBER', gymId },
        user_metadata: { firstName, lastName, role: 'MEMBER', gymId },
      });

      // 3. Crear perfil en Prisma
      try {
        await this.prisma.user.create({
          data: {
            id: authData.user.id,
            email,
            firstName,
            lastName,
            role: 'MEMBER',
            gymId: gymId || null,
          },
        });
      } catch (profileError) {
        // Borrar user en Supabase si falla Prisma
        await this.supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        if (
          profileError instanceof Prisma.PrismaClientKnownRequestError &&
          profileError.code === 'P2002'
        ) {
          throw new RpcException({ message: 'El email ya está en uso en la BD.', status: 409 });
        }
        console.error('Error creando perfil:', profileError);
        throw new RpcException({ message: 'Error interno creando el perfil.', status: 500 });
      }

      // 4. Emitir evento user.created
      const payload = {
        id: authData.user.id,
        email,
        firstName,
        lastName,
        role: 'MEMBER',
        gymId: gymId || null,
      };
      await this.amqpConnection.publish(
        'gymcore-exchange',
        'user.created',
        payload,
        { persistent: true },
      );
      this.logger.log(`📤 user.created: ${JSON.stringify(payload)}`);

      return {
        id: authData.user.id,
        email: authData.user.email,
        firstName,
        lastName,
        role: 'MEMBER',
        createdAt: authData.user.created_at,
        message: 'Usuario registrado. Verifica tu email para activar la cuenta.',
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error inesperado en registerUser:', error);
      throw new RpcException({ message: 'Error interno en registro.', status: 500 });
    }
  }

  async loginUser(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    try {
      const { data: authData, error } =
        await this.supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.code === 'invalid_credentials') {
          throw new RpcException({ message: 'Credenciales inválidas.', status: 401 });
        }
        throw new RpcException({ message: error.message, status: 500 });
      }
      if (!authData.user || !authData.session) {
        throw new RpcException({ message: 'No se pudo autenticar.', status: 401 });
      }

      const profile = await this.prisma.user.findUnique({
        where: { id: authData.user.id },
        select: { role: true, firstName: true, lastName: true },
      });
      if (!profile) {
        throw new RpcException({ message: 'Perfil no encontrado.', status: 404 });
      }

      return {
        message: 'Login exitoso.',
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          role: profile.role,
        },
        expiresAt: authData.session.expires_at,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error inesperado en loginUser:', error);
      throw new RpcException({ message: 'Error interno en login.', status: 500 });
    }
  }

  //
  // ─── ROLE MANAGEMENT ────────────────────────────────────────────────────────
  //

  async changeRole(userId: string, newRole: string, gymId?: string) {
    const validRoles = ['OWNER', 'MANAGER', 'RECEPTIONIST', 'MEMBER'];
    if (!validRoles.includes(newRole)) {
      throw new RpcException({ message: 'Rol inválido', status: 400 });
    }

    this.logger.log(`🔄 changeRole: ${userId} → ${newRole}, gym ${gymId}`);
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole as any, gymId },
    });

    await this.supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { role: newRole, gymId },
      user_metadata: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: newRole,
        gymId,
      },
    });

    await this.amqpConnection.publish(
      'gymcore-exchange',
      'user.role.updated',
      { userId: updatedUser.id, newRole: updatedUser.role, gymId: updatedUser.gymId },
      { persistent: true },
    );
    this.logger.log(`📢 user.role.updated emitido.`);

    return updatedUser;
  }

  //
  // ─── BIOMETRÍA ─────────────────────────────────────────────────────────────
  //

  async enrollBiometric(userId: string, fingerprintId: number) {
    this.logger.log(`🔄 enrollBiometric: user=${userId}, fp=${fingerprintId}`);
    try {
      const result = await this.prisma.biometricTemplate.create({
        data: { userId, fingerprintId },
      });
      this.logger.log(`✅ Biometric mapping saved for ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error enrollBiometric: ${error instanceof Error ? error.message : error}`);
      throw new RpcException({
        status: 500,
        message: `Error al crear el mapeo biométrico: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  async getUserById(userId: string) {
    this.logger.log(`🔍 getUserById: ${userId}`);
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          gymId: true,
        },
      });
      if (!user) {
        this.logger.warn(`⚠️ Usuario no encontrado: ${userId}`);
        throw new RpcException({ message: 'Usuario no encontrado', status: 404 });
      }
      this.logger.log(`✅ Found user: ${JSON.stringify(user)}`);
      return user;
    } catch (error) {
      this.logger.error(`❌ Error getUserById: ${error instanceof Error ? error.message : error}`);
      throw new RpcException({ message: 'Error interno al buscar el usuario', status: 500 });
    }
  }

  async getUserByFingerprintId(fingerprintId: number) {
    this.logger.log(`🔍 getUserByFingerprintId: ${fingerprintId}`);
    // 1) Buscar mapping
    const mapping = await this.prisma.biometricTemplate.findUnique({
      where: { fingerprintId },
    });
    if (!mapping) {
      this.logger.warn(`⚠️ No mapping for fp=${fingerprintId}`);
      return null;
    }
    this.logger.log(`✅ Mapping found: userId=${mapping.userId}`);

    // 2) Obtener el usuario
    try {
      return await this.getUserById(mapping.userId);
    } catch {
      this.logger.error(`❌ Inconsistencia: mapping.userId no existe`);
      return null;
    }
  }

  //
  // ─── USUARIOS / STAFF / PERFIL ──────────────────────────────────────────────
  //

  async findUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true, gymId: true, role: true },
    });
    if (!user) {
      throw new RpcException({ message: `Usuario ${userId} no encontrado.`, status: 404 });
    }
    return {
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      gymId: user.gymId,
      role: user.role,
    };
  }

  async getStaffUsers() {
    this.logger.log('Obteniendo staff administrativo...');
    try {
      const staff = await this.prisma.user.findMany({
        where: { NOT: { role: 'MEMBER' } },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, gymId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      return staff;
    } catch (error) {
      this.logger.error('Error getStaffUsers:', error);
      throw new RpcException({ message: 'Error obteniendo staff', status: 500 });
    }
  }

  async updateUserProfile(userId: string, data: { firstName?: string; lastName?: string }) {
    this.logger.log(`Updating profile ${userId}`);
    try {
      const existing = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!existing) throw new RpcException({ message: `Usuario ${userId} no encontrado.`, status: 404 });

      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { firstName: data.firstName, lastName: data.lastName },
      });

      await this.supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          role: updated.role,
          gymId: updated.gymId,
        },
      });

      await this.amqpConnection.publish(
        'gymcore-exchange',
        'user.profile.updated',
        {
          userId,
          firstName: updated.firstName,
          lastName: updated.lastName,
          email: updated.email,
          timestamp: new Date().toISOString(),
        },
        { persistent: true },
      );

      return {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        role: updated.role,
        gymId: updated.gymId,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error('Error updateUserProfile:', error);
      throw new RpcException({ message: 'Error interno actualizando perfil', status: 500 });
    }
  }

  async findUsersByRole(roles: string[]) {
    this.logger.log(`findUsersByRole: ${roles.join(', ')}`);
    try {
      const users = await this.prisma.user.findMany({
        where: { role: { in: roles as any } },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, gymId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      return users;
    } catch (error) {
      this.logger.error('Error findUsersByRole:', error);
      throw new RpcException({ message: 'Error obteniendo usuarios por rol', status: 500 });
    }
  }

  async findAllUsers() {
    this.logger.log('findAllUsers');
    try {
      const users = await this.prisma.user.findMany({
        select: { id: true, email: true, firstName: true, lastName: true, role: true, gymId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      return users;
    } catch (error) {
      this.logger.error('Error findAllUsers:', error);
      throw new RpcException({ message: 'Error obteniendo todos los usuarios', status: 500 });
    }
  }

  async updateUser(
    id: string,
    data: { firstName?: string; lastName?: string; role?: string; gymId?: string },
  ) {
    this.logger.log(`updateUser ${id}`, data);
    try {
      const updateData: any = { ...data };
      if (data.gymId === '') updateData.gymId = null;
      if (data.role) updateData.role = data.role as any;

      const existing = await this.prisma.user.findUnique({ where: { id } });
      if (!existing) throw new RpcException({ message: `Usuario ${id} no encontrado`, status: 404 });

      const updated = await this.prisma.user.update({ where: { id }, data: updateData });

      await this.supabaseAdmin.auth.admin.updateUserById(id, {
        app_metadata: { role: updated.role, gymId: updated.gymId },
        user_metadata: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          role: updated.role,
          gymId: updated.gymId,
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error('Error updateUser:', error);
      throw new RpcException({ message: 'Error interno actualizando usuario', status: 500 });
    }
  }

  async requestPasswordReset(email: string) {
    this.logger.log(`requestPasswordReset ${email}`);
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Respuesta genérica
        return { message: 'Si tu email está registrado, recibirás un enlace de reseteo.' };
      }

      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
      });
      if (error) {
        throw new RpcException({ status: 400, message: `Error reset password: ${error.message}` });
      }
      return { success: true, message: 'Enlace de reseteo enviado.' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error('Error requestPasswordReset:', error);
      throw new RpcException({ message: 'Error interno reseteo contraseña', status: 500 });
    }
  }

  async getStaffByGym(managerId: string) {
    this.logger.log(`getStaffByGym manager=${managerId}`);
    try {
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: { gymId: true, role: true },
      });
      if (!manager?.gymId) {
        throw new RpcException({ message: 'Manager no encontrado o sin gym', status: 404 });
      }
      if (!['MANAGER', 'OWNER'].includes(manager.role)) {
        throw new RpcException({ message: 'No autorizado', status: 403 });
      }

      const staff = await this.prisma.user.findMany({
        where: {
          gymId: manager.gymId,
          role: { in: ['MANAGER', 'RECEPTIONIST', 'OWNER'] },
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      return staff;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error('Error getStaffByGym:', error);
      throw new RpcException({ message: 'Error obteniendo staff', status: 500 });
    }
  }

  async assignRoleInGym(managerId: string, targetUserId: string, role: string) {
    this.logger.log(`assignRoleInGym: mgr=${managerId} → ${role} on ${targetUserId}`);
    try {
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: { gymId: true, role: true },
      });
      if (!manager?.gymId) {
        throw new RpcException({ message: 'Manager inválido', status: 404 });
      }
      if (!['MANAGER', 'OWNER'].includes(manager.role)) {
        throw new RpcException({ message: 'No autorizado', status: 403 });
      }

      const target = await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { gymId: true, role: true, email: true },
      });
      if (!target) {
        throw new RpcException({ message: 'Usuario objetivo no encontrado', status: 404 });
      }
      if (target.gymId !== manager.gymId) {
        throw new RpcException({ message: 'Diferente gimnasio', status: 403 });
      }

      const valid = ['RECEPTIONIST', 'MEMBER'];
      if (!valid.includes(role)) {
        throw new RpcException({ message: 'Managers sólo asignan RECEPTIONIST', status: 400 });
      }

      const updated = await this.prisma.user.update({
        where: { id: targetUserId },
        data: { role: role as any },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, gymId: true },
      });

      await this.supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        app_metadata: { role, gymId: manager.gymId },
        user_metadata: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          role,
          gymId: manager.gymId,
        },
      });

      await this.amqpConnection.publish(
        'gymcore-exchange',
        'user.role.updated',
        {
          userId: updated.id,
          newRole: updated.role,
          oldRole: target.role,
          gymId: updated.gymId,
          assignedBy: managerId,
        },
        { persistent: true },
      );
      return updated;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error('Error assignRoleInGym:', error);
      throw new RpcException({ message: 'Error interno asignando rol', status: 500 });
    }
  }

  async updateUserAuthEmail(userId: string, newEmail: string) {
    this.logger.log(`updateUserAuthEmail: ${userId} → ${newEmail}`);
    try {
      const { data, error } = await this.supabaseAdmin.auth.admin.updateUserById(userId, { email: newEmail });
      if (error) {
        throw new RpcException({ status: 500, message: `Error auth email: ${error.message}` });
      }
      await this.prisma.user.update({ where: { id: userId }, data: { email: newEmail, updatedAt: new Date() } });
      return { success: true, message: 'Email actualizado.' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error('Error updateUserAuthEmail:', error);
      throw new RpcException({ message: 'Error interno actualizando email', status: 500 });
    }
  }

  async sendPasswordReset(email: string) {
    this.logger.log(`sendPasswordReset: ${email}`);
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
      });
      if (error) {
        throw new RpcException({ status: 400, message: `Error reset: ${error.message}` });
      }
      return { success: true, message: 'Correo de reseteo enviado.' };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error('Error sendPasswordReset:', error);
      throw new RpcException({ message: 'Error interno enviando reseteo', status: 500 });
    }
  }
}

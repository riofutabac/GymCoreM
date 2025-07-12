// backend/apps/auth-service/src/app.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
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

  async registerUser(registerUserDto: RegisterUserDto) {
    const { email, password, firstName, lastName, gymId } = registerUserDto;

    try {
      // 1. Register user with Supabase Auth (this handles password hashing and email confirmation)
      const { data: authData, error: authError } =
        await this.supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              firstName,
              lastName,
            },
          },
        });

      if (authError) {
        if (authError.message.includes('already_registered')) {
          throw new RpcException({
            message: 'El email ya está registrado.',
            status: 409,
          });
        }
        throw new RpcException({
          message: `Error en el registro: ${authError.message}`,
          status: 400,
        });
      }

      if (!authData.user) {
        throw new RpcException({
          message: 'No se pudo crear el usuario en el sistema de autenticación.',
          status: 500,
        });
      }

      // Asegurar que el rol esté disponible dentro del JWT
      await this.supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
        app_metadata: { role: 'MEMBER', gymId: gymId },
        user_metadata: { firstName, lastName, role: 'MEMBER', gymId: gymId },
      });

      // 2. Create profile in User table only if auth user was created successfully
      try {
        await this.prisma.user.create({
          data: {
            id: authData.user.id,
            email: email,
            firstName: firstName,
            lastName: lastName,
            role: 'MEMBER',
            gymId: gymId || null,
          },
        });
      } catch (profileError) {
        // Clean up Supabase user first in any case of profile creation failure
        await this.supabaseAdmin.auth.admin.deleteUser(authData.user.id);

        // Handle Prisma unique constraint violation (duplicate email)
        if (
          profileError instanceof Prisma.PrismaClientKnownRequestError &&
          profileError.code === 'P2002'
        ) {
          throw new RpcException({
            message: 'El email ya está en uso en la base de datos.',
            status: 409,
          });
        }

        // For any other profile creation error
        console.error('Error creando perfil:', profileError);
        throw new RpcException({
          message: 'Error interno creando el perfil del usuario.',
          status: 500,
        });
      }

      // Emitir evento asíncrono via RabbitMQ
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
        { persistent: true }, // <-- Make message persistent
      );
      this.logger.log(`📤 Evento user.created publicado: ${JSON.stringify(payload)}`);

      return {
        id: authData.user.id,
        email: authData.user.email,
        firstName,
        lastName,
        role: 'MEMBER',
        createdAt: authData.user.created_at,
        message:
          'Usuario registrado exitosamente. Por favor verifica tu email para activar tu cuenta.',
      };
    } catch (error) {
      // If error is already RpcException, re-throw it
      if (error instanceof RpcException) {
        throw error;
      }

      // For any other unexpected error, convert to RpcException
      console.error('Error inesperado en registro:', error);
      throw new RpcException({
        message: 'Error interno del servidor durante el registro.',
        status: 500,
      });
    }
  }

  async loginUser(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    try {
      const { data: authData, error } =
        await this.supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        // Use RpcException for microservice communication
        if (error.code === 'invalid_credentials') {
          throw new RpcException({
            message: 'Credenciales inválidas.',
            status: 401,
          });
        }

        // For any other Supabase error
        throw new RpcException({
          message: error.message,
          status: 500,
        });
      }

      if (!authData.user || !authData.session) {
        throw new RpcException({
          message: 'No se pudo autenticar al usuario.',
          status: 401,
        });
      }

      const profile = await this.prisma.user.findUnique({
        where: { id: authData.user.id },
        select: { role: true, firstName: true, lastName: true },
      });

      if (!profile) {
        throw new RpcException({
          message: 'No se pudo encontrar el perfil del usuario.',
          status: 404,
        });
      }

      return {
        message: 'Inicio de sesión exitoso.',
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
      // If error is already RpcException, re-throw it
      if (error instanceof RpcException) {
        throw error;
      }

      // For any other unexpected error
      console.error('Error inesperado y no controlado en login:', error);
      throw new RpcException({
        message: 'Error interno crítico en el servicio de autenticación.',
        status: 500,
      });
    }
  }

  async changeRole(userId: string, newRole: string, gymId?: string) {
    const validRoles = ['OWNER', 'MANAGER', 'RECEPTIONIST', 'MEMBER'];
    if (!validRoles.includes(newRole)) {
      throw new RpcException({ message: 'Rol inválido', status: 400 });
    }

    console.log(
      `🔄 Intentando cambiar el rol del usuario ${userId} a ${newRole} y asignar gym ${gymId}`,
    );

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: newRole as any,
        gymId: gymId,
      },
    });

    await this.supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { 
        role: newRole,
        gymId: gymId  // ← AÑADIR gymId aquí para que esté en el JWT
      },
      user_metadata: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: newRole,
        gymId: gymId, // ← También en user_metadata para consistencia
      },
    });

    await this.amqpConnection.publish('gymcore-exchange', 'user.role.updated', {
      userId: updatedUser.id,
      newRole: updatedUser.role,
      gymId: updatedUser.gymId,
    }, { persistent: true }); // <-- Make message persistent

    console.log(`📢 Evento 'user_role_updated' emitido con datos completos.`);

    return updatedUser;
  }

  async findUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new RpcException({
        message: `Usuario con ID ${userId} no encontrado.`,
        status: 404,
      });
    }

    return {
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    };
  }

  async getStaffUsers() {
    this.logger.log('Obteniendo lista de usuarios administrativos...');
    
    try {
      const staffUsers = await this.prisma.user.findMany({
        where: {
          NOT: {
            role: 'MEMBER'
          }
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          gymId: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      this.logger.log(`Se encontraron ${staffUsers.length} usuarios administrativos`);
      return staffUsers;
    } catch (error) {
      this.logger.error('Error obteniendo usuarios administrativos:', error);
      throw new RpcException({
        message: 'Error obteniendo la lista de usuarios administrativos',
        status: 500,
      });
    }
  }

  async updateUserProfile(userId: string, data: { firstName?: string; lastName?: string }) {
    this.logger.log(`Actualizando perfil para usuario ${userId}`);

    try {
      // 1. Verificar que el usuario existe
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new RpcException({
          message: `Usuario con ID ${userId} no encontrado.`,
          status: 404,
        });
      }

      // 2. Actualizar en la base de datos de Prisma
      const updatedUserInDb = await this.prisma.user.update({
        where: { id: userId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });

      // 3. Actualizar metadatos en Supabase para consistencia
      await this.supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          firstName: updatedUserInDb.firstName,
          lastName: updatedUserInDb.lastName,
          role: updatedUserInDb.role,
          gymId: updatedUserInDb.gymId,
        },
      });

      // 4. Publicar evento para sincronización con otros servicios
      await this.amqpConnection.publish(
        'gymcore-exchange',
        'user.profile.updated',
        { 
          userId, 
          firstName: updatedUserInDb.firstName, 
          lastName: updatedUserInDb.lastName,
          email: updatedUserInDb.email,
          timestamp: new Date().toISOString(),
        },
        { persistent: true }
      );

      this.logger.log(`✅ Perfil y metadatos actualizados para ${userId}`);
      return {
        id: updatedUserInDb.id,
        email: updatedUserInDb.email,
        firstName: updatedUserInDb.firstName,
        lastName: updatedUserInDb.lastName,
        role: updatedUserInDb.role,
        gymId: updatedUserInDb.gymId,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      this.logger.error('Error actualizando perfil de usuario:', error);
      throw new RpcException({
        message: 'Error interno actualizando el perfil del usuario',
        status: 500,
      });
    }
  }

  async findUsersByRole(roles: string[]) {
    this.logger.log(`Obteniendo usuarios con roles: ${roles.join(', ')}`);
    
    try {
      const users = await this.prisma.user.findMany({
        where: {
          role: {
            in: roles as any, // Cast temporal para evitar problemas de tipos
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          gymId: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      this.logger.log(`Se encontraron ${users.length} usuarios con roles especificados`);
      return users;
    } catch (error) {
      this.logger.error('Error obteniendo usuarios por rol:', error);
      throw new RpcException({
        message: 'Error obteniendo usuarios por rol',
        status: 500,
      });
    }
  }

  async findAllUsers() {
    this.logger.log('Obteniendo todos los usuarios...');
    
    try {
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          gymId: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      this.logger.log(`Se encontraron ${users.length} usuarios en total`);
      return users;
    } catch (error) {
      this.logger.error('Error obteniendo todos los usuarios:', error);
      throw new RpcException({
        message: 'Error obteniendo la lista de usuarios',
        status: 500,
      });
    }
  }

  async updateUser(id: string, data: { firstName?: string; lastName?: string; role?: string; gymId?: string }) {
    this.logger.log(`Actualizando usuario ${id} con datos:`, data);
    
    try {
      // Si se pasa un gymId vacío, lo convertimos a null para la base de datos
      const updateData: any = { ...data };
      if (data.gymId === '') {
        updateData.gymId = null;
      }
      
      // Cast del role si está presente
      if (data.role) {
        updateData.role = data.role as any;
      }
      
      // 1. Verificar que el usuario existe
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new RpcException({
          message: `Usuario con ID ${id} no encontrado`,
          status: 404,
        });
      }

      // 2. Actualizar en la base de datos de Prisma
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
      });

      // 3. Actualizar metadatos en Supabase para consistencia
      await this.supabaseAdmin.auth.admin.updateUserById(id, {
        app_metadata: {
          role: updatedUser.role,
          gymId: updatedUser.gymId,
        },
        user_metadata: {
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          gymId: updatedUser.gymId,
        },
      });

      this.logger.log(`✅ Usuario ${id} actualizado exitosamente`);
      return updatedUser;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      this.logger.error('Error actualizando usuario:', error);
      throw new RpcException({
        message: 'Error interno actualizando el usuario',
        status: 500,
      });
    }
  }

  async requestPasswordReset(email: string) {
    this.logger.log(`Iniciando reseteo de contraseña para ${email}`);
    
    try {
      // Verificar que el usuario existe
      const user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Por seguridad, no revelamos si el email existe o no
        this.logger.warn(`Intento de reset para email inexistente: ${email}`);
        return {
          message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación.'
        };
      }

      // Generar token de reset
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // En un entorno real, enviarías un email aquí
      this.logger.log(`Token de reset generado para ${email}: ${resetToken}`);
      
      return {
        message: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación.',
        // En desarrollo, devolvemos el token. En producción, esto no se haría.
        ...(process.env.NODE_ENV === 'development' && { resetToken })
      };
    } catch (error) {
      this.logger.error('Error en password reset:', error);
      throw new RpcException({
        message: 'Error procesando la solicitud de reseteo',
        status: 500,
      });
    }
  }

  /**
   * Obtiene el personal (staff) de un gimnasio específico basado en el managerId
   */
  async getStaffByGym(managerId: string) {
    this.logger.log(`Obteniendo staff para manager ${managerId}`);
    
    try {
      // Primero obtenemos el gymId del manager
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: { gymId: true, role: true }
      });

      if (!manager || !manager.gymId) {
        throw new RpcException({
          message: 'Manager no encontrado o no asignado a un gimnasio',
          status: 404,
        });
      }

      if (manager.role !== 'MANAGER' && manager.role !== 'OWNER') {
        throw new RpcException({
          message: 'Usuario no autorizado para ver el staff',
          status: 403,
        });
      }

      // Obtener todo el staff del mismo gimnasio
      const staff = await this.prisma.user.findMany({
        where: {
          gymId: manager.gymId,
          role: {
            in: ['MANAGER', 'RECEPTIONIST', 'OWNER']
          }
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      this.logger.log(`Se encontraron ${staff.length} miembros del staff`);
      return staff;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      this.logger.error('Error obteniendo staff del gimnasio:', error);
      throw new RpcException({
        message: 'Error obteniendo el staff del gimnasio',
        status: 500,
      });
    }
  }

  /**
   * Asigna un rol a un usuario dentro del mismo gimnasio
   */
  async assignRoleInGym(managerId: string, targetUserId: string, role: string) {
    this.logger.log(`Manager ${managerId} asignando rol ${role} a usuario ${targetUserId}`);
    
    try {
      // Verificar que el manager existe y obtener su gymId
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: { gymId: true, role: true }
      });

      if (!manager || !manager.gymId) {
        throw new RpcException({
          message: 'Manager no encontrado o no asignado a un gimnasio',
          status: 404,
        });
      }

      if (manager.role !== 'MANAGER' && manager.role !== 'OWNER') {
        throw new RpcException({
          message: 'Usuario no autorizado para asignar roles',
          status: 403,
        });
      }

      // Verificar que el usuario objetivo existe y pertenece al mismo gimnasio
      const targetUser = await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { gymId: true, role: true, email: true }
      });

      if (!targetUser) {
        throw new RpcException({
          message: 'Usuario objetivo no encontrado',
          status: 404,
        });
      }

      if (targetUser.gymId !== manager.gymId) {
        throw new RpcException({
          message: 'El usuario no pertenece al mismo gimnasio',
          status: 403,
        });
      }

      // Validar el rol que se quiere asignar
      const validRoles = ['RECEPTIONIST'];
      if (!validRoles.includes(role)) {
        throw new RpcException({
          message: 'Los managers solo pueden asignar el rol RECEPTIONIST',
          status: 400,
        });
      }

      // Actualizar el rol del usuario
      const updatedUser = await this.prisma.user.update({
        where: { id: targetUserId },
        data: { role: role as any },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          gymId: true,
        }
      });

      // Actualizar metadatos en Supabase
      await this.supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        app_metadata: { 
          role: role,
          gymId: manager.gymId
        },
        user_metadata: {
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: role,
          gymId: manager.gymId,
        },
      });

      // Publicar evento
      await this.amqpConnection.publish('gymcore-exchange', 'user.role.updated', {
        userId: updatedUser.id,
        newRole: updatedUser.role,
        oldRole: targetUser.role,
        gymId: updatedUser.gymId,
        assignedBy: managerId,
      }, { persistent: true });

      this.logger.log(`✅ Rol ${role} asignado exitosamente a ${targetUser.email}`);
      return updatedUser;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      this.logger.error('Error asignando rol:', error);
      throw new RpcException({
        message: 'Error interno asignando el rol',
        status: 500,
      });
    }
  }

  /**
   * Actualiza el email de un usuario en Supabase Auth
   */
  async updateUserAuthEmail(userId: string, newEmail: string) {
    this.logger.log(`Actualizando email en Supabase para usuario ${userId}`);
    
    try {
      // Actualizar el email en Supabase Auth
      const { data, error } = await this.supabaseAdmin.auth.admin.updateUserById(userId, {
        email: newEmail,
      });

      if (error) {
        this.logger.error(`Error actualizando email en Supabase:`, error);
        throw new RpcException({
          status: 500,
          message: `Error actualizando email en el sistema de autenticación: ${error.message}`,
        });
      }

      // También actualizar en la base de datos local
      await this.prisma.user.update({
        where: { id: userId },
        data: { 
          email: newEmail,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`✅ Email actualizado exitosamente para usuario ${userId}`);
      return { success: true, message: 'Email actualizado exitosamente' };

    } catch (error) {
      this.logger.error(`Error actualizando email para usuario ${userId}:`, error);
      
      if (error instanceof RpcException) {
        throw error;
      }
      
      throw new RpcException({
        status: 500,
        message: 'Error interno actualizando email',
      });
    }
  }

  /**
   * Envía un correo de reseteo de contraseña
   */
  async sendPasswordReset(email: string) {
    this.logger.log(`Enviando reseteo de contraseña para email: ${email}`);
    
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
      });

      if (error) {
        this.logger.error(`Error enviando reseteo de contraseña:`, error);
        throw new RpcException({
          status: 400,
          message: `Error enviando correo de reseteo: ${error.message}`,
        });
      }

      this.logger.log(`✅ Correo de reseteo enviado exitosamente a ${email}`);
      return { 
        success: true, 
        message: 'Correo de reseteo de contraseña enviado exitosamente' 
      };

    } catch (error) {
      this.logger.error(`Error enviando reseteo de contraseña para ${email}:`, error);
      
      if (error instanceof RpcException) {
        throw error;
      }
      
      throw new RpcException({
        status: 500,
        message: 'Error interno enviando reseteo de contraseña',
      });
    }
  }
}


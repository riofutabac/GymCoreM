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

  async enrollBiometric(userId: string, template: string) {
    this.logger.log(`Registrando plantilla biométrica para el usuario: ${userId}`);

    return this.prisma.biometricTemplate.upsert({
      where: { userId: userId },
      update: { template: template },
      create: {
        userId: userId,
        template: template,
      },
    });
  }
}


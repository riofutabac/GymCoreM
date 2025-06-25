// backend/apps/auth-service/src/app.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { RpcException, ClientProxy } from '@nestjs/microservices';
import { SupabaseService } from './supabase/supabase.service';
import { PrismaService } from './prisma/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class AppService {
  private readonly supabase;
  private readonly supabaseAdmin;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService,
    @Inject('GYM_SERVICE') private readonly gymClient: ClientProxy,
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
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName,
            lastName,
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already_registered')) {
          throw new ConflictException('El email ya está registrado.');
        }
        throw new BadRequestException(`Error en el registro: ${authError.message}`);
      }

      if (!authData.user) {
        throw new InternalServerErrorException('No se pudo crear el usuario en el sistema de autenticación.');
      }

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
        console.error('Error creando perfil:', profileError);
        await this.supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new InternalServerErrorException(
          'Error creando el perfil del usuario:' + profileError.message,
        );
      }

      // Emitir evento para que otros servicios sincronicen el nuevo usuario
      this.gymClient.emit('user_created', {
        id: authData.user.id,
        email,
        firstName,
        lastName,
      });

      return {
          id: authData.user.id,
          email: authData.user.email,
          firstName,
          lastName,
          role: 'MEMBER',
          createdAt: authData.user.created_at,
          message: 'Usuario registrado exitosamente. Por favor verifica tu email para activar tu cuenta.'
      };

    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof ConflictException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      
      console.error('Error inesperado en registro:', error);
      throw new InternalServerErrorException('Error interno del servidor durante el registro.');
    }
  }

  async loginUser(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    try {
      const { data: authData, error } = await this.supabase.auth.signInWithPassword({
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
        expiresAt: authData.session.expires_at
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

  async changeRole(userId: string, newRole: string) {
    const validRoles = ['OWNER', 'MANAGER', 'RECEPTIONIST', 'MEMBER'];
    if (!validRoles.includes(newRole)) {
      throw new RpcException({ message: 'Rol inválido', status: 400 });
    }

    console.log(`🔄 Intentando cambiar el rol del usuario ${userId} a ${newRole}`);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole as any },
    });

    this.gymClient.emit('user_role_updated', {
      userId: updatedUser.id,
      newRole: updatedUser.role,
    });

    console.log(`📢 Evento 'user_role_updated' emitido.`);

    return updatedUser;
  }
}


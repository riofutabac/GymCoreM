// backend/apps/auth-service/src/app.service.ts
import { Injectable, BadRequestException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { SupabaseService } from './supabase/supabase.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class AppService {
  private readonly supabase;
  private readonly supabaseAdmin;

  constructor(private readonly supabaseService: SupabaseService) {
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
      const { error: profileError } = await this.supabaseAdmin
        .from('User')
        .insert({
          id: authData.user.id, // Use the Supabase Auth user ID
          email: email,
          firstName: firstName,
          lastName: lastName,
          role: 'MEMBER',
          gymId: gymId || null,
          // Remove password field - Supabase Auth handles this
        });

      if (profileError) {
        console.error('Error creando perfil:', profileError);
        // Clean up: delete the auth user if profile creation fails
        await this.supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new InternalServerErrorException(`Error creando el perfil del usuario: ${profileError.message}`);
      }

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

      const { data: profile, error: profileError } = await this.supabaseAdmin
        .from('User')
        .select('role, firstName, lastName')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
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
}


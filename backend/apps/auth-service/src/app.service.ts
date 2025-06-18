// backend/apps/auth-service/src/app.service.ts
import { Injectable, BadRequestException, InternalServerErrorException, ConflictException, UnauthorizedException } from '@nestjs/common';
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
      // 1. Autenticar al usuario con Supabase
      const { data: authData, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Si hay un error en el login (email no existe, contraseña incorrecta)
      if (error) {
        throw new UnauthorizedException('Credenciales inválidas.');
      }

      if (!authData.user || !authData.session) {
        throw new UnauthorizedException('No se pudo autenticar al usuario.');
      }

      // 2. Obtener el rol del usuario desde la tabla 'User'
      const { data: profile, error: profileError } = await this.supabaseAdmin
        .from('User') // <-- CORREGIDO: de 'profiles' a 'User'
        .select('role, firstName, lastName') // <-- CORREGIDO: nombres de columnas
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        throw new InternalServerErrorException('No se pudo encontrar el perfil del usuario.');
      }

      // 3. Devolver la sesión y el token
      return {
        message: 'Inicio de sesión exitoso.',
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          firstName: profile.firstName, // <-- CORREGIDO
          lastName: profile.lastName,   // <-- CORREGIDO
          role: profile.role,
        },
        expiresAt: authData.session.expires_at
      };

    } catch (error) {
      if (error instanceof UnauthorizedException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      
      console.error('Error inesperado en login:', error);
      throw new InternalServerErrorException('Error interno del servidor durante el login.');
    }
  }
}


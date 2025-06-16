// backend/apps/auth-service/src/app.service.ts
import { Injectable, BadRequestException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { SupabaseService } from './supabase/supabase.service';
import { RegisterUserDto } from './dto/register-user.dto';

@Injectable()
export class AppService {
  private readonly supabase;
  private readonly supabaseAdmin; // <- Añadir referencia al cliente admin

  constructor(private readonly supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.getClient();
    this.supabaseAdmin = this.supabaseService.getAdminClient(); // <- Obtener el cliente admin
  }

  getHello(): string {
    return 'Auth Service is running! 🚀';
  }

  async registerUser(registerUserDto: RegisterUserDto) {
    const { email, password, firstName, lastName, gymId } = registerUserDto;

    try {
      // 1. Verificar si el email ya existe (usando cliente admin para poder buscar)
      const { data: existingProfile } = await this.supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single();

      if (existingProfile) {
        throw new ConflictException('El email ya está registrado.');
      }

      // 2. Crear usuario en Supabase Auth (siempre con cliente público)
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (authError) {
        throw new BadRequestException(`Error en el registro: ${authError.message}`);
      }

      if (!authData.user) {
        throw new InternalServerErrorException('No se pudo crear el usuario en el sistema de autenticación.');
      }

      // 3. Crear perfil en la tabla profiles (USANDO EL CLIENTE ADMIN)
      const { error: profileError } = await this.supabaseAdmin // <- ¡Cambio clave aquí!
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          role: 'MEMBER',
          gym_id: gymId || null,
        });

      if (profileError) {
        // Verificar si profileError existe antes de acceder a sus propiedades
        const errorMessage = profileError?.message || 'Error desconocido al crear el perfil';
        console.error('Error creando perfil:', profileError);
        throw new InternalServerErrorException(`Error creando el perfil del usuario: ${errorMessage}`);
      }

      return {
          id: authData.user.id,
          email: authData.user.email,
          firstName,
          lastName,
          role: 'MEMBER',
          createdAt: authData.user.created_at,
          message: 'Usuario registrado exitosamente. Por favor verifica tu email.'
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
}
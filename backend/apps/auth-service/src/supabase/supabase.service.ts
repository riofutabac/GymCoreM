// backend/apps/auth-service/src/supabase/supabase.service.ts
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient; // Cliente de administrador

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey || !supabaseServiceRoleKey) {
      throw new Error('Supabase URL, Key, and Service Role Key must be provided in .env file');
    }
    
    // Cliente público
    this.supabase = createClient(supabaseUrl, supabaseKey);
    // Cliente de administrador (ignora RLS)
    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  }

  // Cliente para operaciones públicas/anónimas
  getClient(): SupabaseClient {
    return this.supabase;
  }

  // Cliente para operaciones de administrador
  getAdminClient(): SupabaseClient {
    return this.supabaseAdmin;
  }
}
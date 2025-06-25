import { PrismaClient, Role } from '../prisma/generated/auth-client';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';

// Cargar variables de entorno desde el archivo .env especificado
config({ path: 'backend/apps/auth-service/.env' });

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Cliente para emitir eventos a otros microservicios
const gymServiceClient: ClientProxy = ClientProxyFactory.create({
  transport: Transport.TCP,
  options: {
    host: process.env.GYM_SERVICE_HOST || 'localhost',
    port: +(process.env.GYM_SERVICE_PORT || 3002),
  },
});

async function inicializarOwner() {
  console.log('🚀 Iniciando script de inicialización del OWNER...');

  const ownerEmail = process.env.OWNER_INITIAL_EMAIL;
  const ownerPassword = process.env.OWNER_INITIAL_PASSWORD;

  if (!ownerEmail || !ownerPassword) {
    throw new Error('OWNER_INITIAL_EMAIL y OWNER_INITIAL_PASSWORD deben estar definidos en .env');
  }

  // 1. VERIFICAR SI YA EXISTE EN NUESTRA BASE DE DATOS (IDEMPOTENCIA)
  const existingOwner = await prisma.user.findFirst({
    where: { role: 'OWNER' },
  });

  if (existingOwner) {
    console.log('✅ Un OWNER ya existe en la base de datos. Script finalizado.');
    return;
  }

  console.log(`OWNER no encontrado. Creando usuario con email: ${ownerEmail}`);

  // 2. CREAR USUARIO EN SUPABASE AUTH
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true, // Lo creamos ya confirmado para evitar el paso de verificación por email
  });

  if (authError) {
    // Si el error es que el usuario ya existe en Supabase, es un estado inconsistente.
    if (authError.message.includes('already registered')) {
      throw new Error(
        `El usuario '${ownerEmail}' ya existe en Supabase Auth pero no es OWNER en tu base de datos. ` +
        `Esto indica un estado inconsistente. Por favor, resuelve esto manualmente en Supabase y vuelve a intentarlo.`
      );
    }
    // Para cualquier otro error de Supabase
    throw new Error(`Error creando usuario en Supabase: ${authError.message}`);
  }

  const userId = authData.user!.id;
  console.log(`👤 Usuario creado en Supabase con ID: ${userId}`);

  // 3. CREAR PERFIL EN LA BASE DE DATOS DEL AUTH-SERVICE
  const newOwner = await prisma.user.create({
    data: {
      id: userId,
      email: ownerEmail,
      role: Role.OWNER, // Usando el enum importado para mayor seguridad de tipos
      firstName: 'System',
      lastName: 'Owner',
    },
  });

  console.log('💾 Perfil del OWNER guardado en la base de datos de Auth.');

  // 4. EMITIR EVENTO PARA SINCRONIZAR CON OTROS SERVICIOS
  await gymServiceClient.connect();
  gymServiceClient.emit('user_created', {
    id: newOwner.id,
    email: newOwner.email,
    firstName: newOwner.firstName,
    lastName: newOwner.lastName,
    role: newOwner.role, // Enviamos también el rol en el evento
  });

  console.log(`📢 Evento 'user_created' emitido para el nuevo OWNER.`);
  await gymServiceClient.close();

  console.log('🎉 Proceso de inicialización del OWNER completado con éxito.');
}

inicializarOwner()
  .catch((e) => {
    console.error('❌ Error durante la inicialización:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

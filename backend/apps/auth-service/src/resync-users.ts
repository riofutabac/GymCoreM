// backend/apps/auth-service/src/resync-users.ts

import { PrismaClient } from '../prisma/generated/auth-client';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { config } from 'dotenv';

// Cargar variables de entorno
config({ path: 'backend/apps/auth-service/.env' });

const prisma = new PrismaClient();
const amqpConnection = new AmqpConnection({
  exchanges: [
    {
      name: 'gymcore-exchange',
      type: 'topic',
      options: { durable: true },
    },
  ],
  uri: process.env.MESSAGE_BUS_URL || 'amqp://guest:guest@localhost:5672',
  connectionInitOptions: { wait: true, timeout: 10000 },
});

async function resyncUsers() {
  console.log('🚀 Iniciando script de resincronización de usuarios...');

  try {
    // 1. Conectar a RabbitMQ
    await amqpConnection.init();
    console.log('🐇 Conectado a RabbitMQ.');

    // 2. Obtener todos los usuarios de la base de datos de Auth
    const allUsers = await prisma.user.findMany();

    if (allUsers.length === 0) {
      console.log('No se encontraron usuarios para sincronizar. Finalizando.');
      return;
    }

    console.log(`🔍 Se encontraron ${allUsers.length} usuarios. Publicando eventos...`);

    // 3. Iterar y publicar un evento 'user.created' para cada usuario
    for (const user of allUsers) {
      const eventPayload = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        gymId: user.gymId,
      };

      await amqpConnection.publish(
        'gymcore-exchange',
        'user.created', // La misma routing key que usas en el registro
        eventPayload,
        { persistent: true }, // Aseguramos que el mensaje sea persistente
      );

      console.log(`📢 Evento 'user.created' publicado para: ${user.email}`);
    }

    console.log('✅ Todos los eventos de usuario han sido publicados.');
  } catch (error) {
    console.error('❌ Error durante la resincronización:', error);
  } finally {
    // 4. Cerrar conexiones
    await amqpConnection.close();
    await prisma.$disconnect();
    console.log('🔌 Conexiones cerradas. Script finalizado.');
  }
}

// Ejecutar el script
resyncUsers();
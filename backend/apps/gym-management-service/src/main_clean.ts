import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AppService } from './app.service';
import { Role } from '../prisma/generated/gym-client';

// Interfaces para tipado seguro
interface UserPayload {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  gymId?: string;
}

interface RoleUpdatePayload {
  userId: string;
  newRole: string;
  gymId?: string;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3002;

  // Configurar microservicio TCP
  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: port,
    },
  });

  // Registrar el filtro de excepciones global SOLO para el microservicio
  microservice.useGlobalFilters(new AllExceptionsFilter());

  // ========================================
  // 🎯 CONFIGURACIÓN MANUAL DE SUSCRIPTORES
  // ========================================

  try {
    // Obtener las instancias ya inicializadas
    const amqpConnection = app.get<AmqpConnection>(AmqpConnection);
    const appService = app.get<AppService>(AppService);

    console.log('🔌 Configurando suscriptores de RabbitMQ...');

    // Suscriptor para eventos de creación de usuarios
    await amqpConnection.createSubscriber(
      async (msg: UserPayload) => {
        await appService.handleUserCreated(msg);
      },
      {
        exchange: 'gymcore-exchange',
        routingKey: 'user.created',
        queue: 'gym-management.user.created',
        queueOptions: {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': 'gymcore-dead-letter-exchange',
            'x-message-ttl': 300000, // 5 minutos
          },
        },
      },
      'user.created',
    );

    // Suscriptor para eventos de actualización de roles
    await amqpConnection.createSubscriber(
      async (msg: RoleUpdatePayload) => {
        await appService.handleUserRoleUpdated(msg);
      },
      {
        exchange: 'gymcore-exchange',
        routingKey: 'user.role.updated',
        queue: 'gym-management.user.role.updated',
        queueOptions: {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': 'gymcore-dead-letter-exchange',
            'x-message-ttl': 300000,
          },
        },
      },
      'user.role.updated',
    );

    console.log('✅ Suscriptores RabbitMQ configurados correctamente');
  } catch (error) {
    console.error('❌ Error configurando suscriptores de RabbitMQ:', error);
    // No detenemos la aplicación, pero sí logueamos el error
  }

  // Iniciar todos los microservicios
  await app.startAllMicroservices();
  console.log(`🚀 Gym Management Service ejecutándose en puerto ${port}`);
}

bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});

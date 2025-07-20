// backend/apps/gym-management-service/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { GymEventsController } from './gym-events.controller';
import { AmqpLogger } from './amqp-logger.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { logger: false });
  
  // Configurar el logger centralizado
  const amqpLogger = app.get(AmqpLogger);
  app.useLogger(amqpLogger);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3002;

  const micro = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port },
  });

  micro.useGlobalFilters(new AllExceptionsFilter());

  // =================================================================
  // CONFIGURACIÓN #2: MICROSERVICIO RABBITMQ (¡La nueva para RPC!)
  // Esto convierte al servicio en un "respondedor" de RPC.
  // Escuchará en 'gym_service_queue' y responderá las preguntas.
  // =================================================================
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.MESSAGE_BUS_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'gym-management.check_membership', // La cola dedicada para las preguntas de membresía
      queueOptions: {
        durable: false, // Las colas RPC no necesitan sobrevivir a reinicios
      },
    },
  });

  // 🔥 REGISTRO MANUAL TEMPORAL DE HANDLERS - hasta que funcione enableControllerDiscovery
  try {
    const amqp = app.get(AmqpConnection);
    const gymEventsController = app.get(GymEventsController);
    
    logger.log('🔧 Registrando handlers manualmente...');
    
    // Handler para user.created
    await amqp.createSubscriber(
      (payload: any) => gymEventsController.handleUserCreated(payload),
      {
        exchange: 'gymcore-exchange',
        routingKey: 'user.created',
        queue: 'gym-management.user.created',
        queueOptions: { 
          durable: true, 
          arguments: { 
            'x-dead-letter-exchange': 'gymcore-dead-letter-exchange' 
          } 
        },
      },
      'handleUserCreated'
    );
    
    // Handler para user.role.updated
    await amqp.createSubscriber(
      (payload: any) => gymEventsController.handleUserRoleUpdated(payload),
      {
        exchange: 'gymcore-exchange',
        routingKey: 'user.role.updated',
        queue: 'gym-management.user.role.updated',
        queueOptions: { 
          durable: true, 
          arguments: { 
            'x-dead-letter-exchange': 'gymcore-dead-letter-exchange' 
          } 
        },
      },
      'handleUserRoleUpdated'
    );
    
    // Handler para payment.completed (con manejo de retries)
    await amqp.createSubscriber(
      (payload: any, raw: any) => gymEventsController.handlePaymentCompleted(payload, raw),
      {
        exchange: 'gymcore-exchange',
        routingKey: 'payment.completed',
        queue: 'gym-management.payment.completed',
        queueOptions: {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': 'gymcore-dead-letter-exchange',
            'x-dead-letter-routing-key': 'payment.completed.dead',
          },
        },
      },
      'handlePaymentCompleted'
    );
    
    logger.log('✅ Handlers RabbitMQ registrados manualmente');
  } catch (error: any) {
    logger.error('❌ Error registrando handlers RabbitMQ', error);
  }

  await app.startAllMicroservices();
  logger.log(`Gym Management Service is running on port ${port}`);
}

bootstrap().catch(err => {
  console.error('❌ Failed to start Gym Management Service', err);
  process.exit(1);
});

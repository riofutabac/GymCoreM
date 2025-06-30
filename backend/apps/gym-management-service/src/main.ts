import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AppService } from './app.service';
import { Logger } from '@nestjs/common';

/**
 * Configura los suscriptores de RabbitMQ manualmente para asegurar
 * que la aplicación esté completamente inicializada antes de empezar a escuchar.
 * Esto previene errores de "carrera de condiciones" en aplicaciones híbridas.
 */
async function setupRabbitMQListeners(app) {
  const amqpConnection = app.get(AmqpConnection);
  const appService = app.get(AppService);
  const logger = new Logger('RabbitMQ-Setup');

  logger.log('Iniciando configuración de suscriptores de RabbitMQ...');

  await amqpConnection.createSubscriber(
    appService.handleUserCreated.bind(appService),
    {
      exchange: 'gymcore-exchange',
      routingKey: 'user.created',
      queue: 'gym-management.user.created',
      queueOptions: { durable: true },
    },
    'user-created-subscriber'
  );
  logger.log('✅ Suscriptor para "user.created" configurado.');

  await amqpConnection.createSubscriber(
    appService.handleUserRoleUpdated.bind(appService),
    {
      exchange: 'gymcore-exchange',
      routingKey: 'user.role.updated',
      queue: 'gym-management.user.role.updated',
      queueOptions: { durable: true },
    },
    'user-role-updated-subscriber'
  );
  logger.log('✅ Suscriptor para "user.role.updated" configurado.');
  
  logger.log('Todos los suscriptores están listos y escuchando eventos.');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3002;

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: port,
    },
  });

  await setupRabbitMQListeners(app);

  await app.startAllMicroservices();
  console.log(`Gym Management microservice is listening on port ${port}`);
}
bootstrap();
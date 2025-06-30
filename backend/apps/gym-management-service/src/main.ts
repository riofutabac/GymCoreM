import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AppService } from './app.service';

async function bootstrap() {
  // Create the Nest application directly
  const app = await NestFactory.create(AppModule);

  // Get configuration service from the app itself
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3002;

  // Connect the microservice listener
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: port,
    },
  });

  // ¡AQUÍ ESTÁ LA SOLUCIÓN!
  // 1. Obtenemos acceso a la conexión de RabbitMQ y al AppService
  const amqpConnection = app.get<AmqpConnection>(AmqpConnection);
  const appService = app.get<AppService>(AppService);

  // 2. Creamos los suscriptores manualmente
  await amqpConnection.createSubscriber(
    // La función que se ejecutará, atada al contexto del appService
    appService.handleUserCreated.bind(appService),
    {
      exchange: 'gymcore-exchange',
      routingKey: 'user.created',
      queue: 'gym-management.user.created',
      queueOptions: { durable: true },
    },
    'user-created-subscriber', // Un nombre para identificarlo
  );
  console.log('✅ Suscriptor para "user.created" configurado manualmente.');

  await amqpConnection.createSubscriber(
    appService.handleUserRoleUpdated.bind(appService),
    {
      exchange: 'gymcore-exchange',
      routingKey: 'user.role.updated',
      queue: 'gym-management.user.role.updated',
      queueOptions: { durable: true },
    },
    'user-role-updated-subscriber',
  );
  console.log('✅ Suscriptor para "user.role.updated" configurado manualmente.');

  // Start all microservice listeners
  await app.startAllMicroservices();
  console.log(`Gym Management microservice is listening on port ${port}`);
}
bootstrap();
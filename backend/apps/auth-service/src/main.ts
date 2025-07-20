// backend/apps/auth-service/src/main.ts (VERSIÓN CORREGIDA)

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AmqpLogger } from './amqp-logger.service';

async function bootstrap() {
  // Creamos la aplicación con el logger desactivado inicialmente
  const app = await NestFactory.create(AppModule, {
    // Desactivamos el logger por defecto para que no haya duplicados
    logger: false,
  });

  // Usamos nuestro logger personalizado que envía a RabbitMQ
  const amqpLogger = app.get(AmqpLogger);
  app.useLogger(amqpLogger);

  // Ahora usamos el logger personalizado para bootstrap también
  const logger = amqpLogger;
  
  // Get configuration service from the app itself
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;

  // Connect the microservice listener
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: port,
    },
  });

  // Start all microservice listeners
  await app.startAllMicroservices();
  logger.log(`Auth microservice is listening on port ${port}`, 'AuthService-Bootstrap');
  
  // Log successful startup
  logger.log('Auth service bootstrap completed successfully', 'AuthService-Bootstrap');
}

bootstrap().catch((error) => {
  console.error('Failed to start Auth service:', error);
  process.exit(1);
});
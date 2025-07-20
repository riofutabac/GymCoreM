import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AmqpLogger } from './amqp-logger.service';

async function bootstrap() {
  // Creamos la aplicación con el logger desactivado inicialmente
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.ANALYTICS_SERVICE_HOST || 'localhost',
        port: parseInt(process.env.ANALYTICS_SERVICE_PORT || '3005', 10),
      },
      // Desactivamos el logger por defecto para que no haya duplicados
      logger: false,
    },
  );

  // Usamos nuestro logger personalizado que envía a RabbitMQ
  const amqpLogger = app.get(AmqpLogger);
  app.useLogger(amqpLogger);

  // Ahora usamos el logger personalizado para bootstrap también
  const logger = amqpLogger;
  logger.setContext('AnalyticsService-Bootstrap');

  await app.listen();
  logger.log(
    `Analytics Service listening on ${process.env.ANALYTICS_SERVICE_HOST || 'localhost'}:${parseInt(process.env.ANALYTICS_SERVICE_PORT || '3005', 10)}`,
  );
}
bootstrap();

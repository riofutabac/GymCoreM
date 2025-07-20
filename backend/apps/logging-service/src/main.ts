import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap-LoggingService');
  // Usamos createApplicationContext porque no necesita exponer un puerto HTTP
  const app = await NestFactory.createApplicationContext(AppModule);

  logger.log('🚀 Logging Service está listo y escuchando eventos en RabbitMQ.');
}
bootstrap();
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AnalyticsService');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.ANALYTICS_SERVICE_HOST || 'localhost',
        port: parseInt(process.env.ANALYTICS_SERVICE_PORT || '3005', 10),
      },
    },
  );

  await app.listen();
  logger.log(
    `Analytics Service listening on ${process.env.ANALYTICS_SERVICE_HOST || 'localhost'}:${parseInt(process.env.ANALYTICS_SERVICE_PORT || '3005', 10)}`,
  );
}
bootstrap();

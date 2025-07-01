// backend/apps/gym-management-service/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3002;

  const micro = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port },
  });

  micro.useGlobalFilters(new AllExceptionsFilter());

  await app.startAllMicroservices();
  logger.log(`Gym Management Service is running on port ${port}`);
}

bootstrap().catch(err => {
  console.error('❌ Failed to start Gym Management Service', err);
  process.exit(1);
});

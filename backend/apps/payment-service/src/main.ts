import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

async function bootstrap() {
  // Create the Nest application
  const app = await NestFactory.create(AppModule);

  // Get configuration service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3003;

  // Connect the microservice listener
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port,
    },
  });

  // Start all microservice listeners
  await app.startAllMicroservices();
  console.log(`Payment microservice is listening on port ${port}`);
}
bootstrap();


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // Create the Nest application directly
  const app = await NestFactory.create(AppModule);

  // Get configuration service from the app itself
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3003;

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
  console.log(`Payment microservice is listening on port ${port}`);
}
bootstrap();

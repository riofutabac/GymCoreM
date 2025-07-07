import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        port: parseInt(process.env.PORT || '3004'),
      },
    },
  );

  app.useGlobalPipes(new ValidationPipe());

  await app.listen();
  console.log('Inventory service is listening on port', process.env.PORT || '3004');
}

bootstrap();

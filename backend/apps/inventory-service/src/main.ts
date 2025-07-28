import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { AmqpLogger } from './amqp-logger.service';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: parseInt(process.env.PORT || '3004'),
      },
      logger: false,
    },
  );
  
  // Configurar el logger centralizado
  const amqpLogger = app.get(AmqpLogger);
  app.useLogger(amqpLogger);

  app.useGlobalPipes(new ValidationPipe());

  await app.listen();
  amqpLogger.log('Inventory service is listening on port ' + (process.env.PORT || '3004'), 'Bootstrap');
}

bootstrap();

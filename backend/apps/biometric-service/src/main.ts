// backend/apps/biometric-service/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
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
  logger.setContext('BiometricService-Bootstrap');

  const configService = app.get(ConfigService);
  const tcpPort = configService.get<number>('PORT') || 3006;
  
  // Puerto "fantasma" para el servidor HTTP. No lo usaremos, pero `app.listen` lo necesita.
  // Podemos usar un puerto diferente para evitar conflictos.
  const httpDummyPort = tcpPort + 1; // Ej: 3007

  // 2. Conectamos el listener de microservicios TCP.
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: tcpPort,
    },
  });

  // 3. Iniciamos el listener de microservicios.
  await app.startAllMicroservices();
  
  // 4. Iniciamos el servidor HTTP para mantener el proceso estable.
  //    Como no hay @Get/@Post en el controlador, este servidor no responderá a nada (dará 404).
  await app.listen(httpDummyPort);
  
  logger.log(`Biometric Service TCP listener running on port ${tcpPort}`);
  logger.log(`Biometric Service dummy HTTP server running on port ${httpDummyPort} (no routes enabled)`);
}
bootstrap();
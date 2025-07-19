// backend/apps/biometric-service/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('BiometricService-Bootstrap');

  // 1. Creamos la aplicación completa. Este es el modo que SÍ conecta con tu Arduino.
  const app = await NestFactory.create(AppModule);

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
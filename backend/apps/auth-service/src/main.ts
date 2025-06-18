// backend/apps/auth-service/src/main.ts (VERSIÓN CORREGIDA)

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // 1. Crea un contexto de la aplicación para poder leer la configuración
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const configService = appContext.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;

  // 2. Crea la aplicación como un MICROSERVICIO, no como una app web
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP, // Usa el protocolo TCP
      options: {
        host: '0.0.0.0',
        port: port, // Usa el puerto de tu .env
      },
    },
  );

  // 3. Usa app.listen() que, para microservicios, inicia el listener
  await app.listen();
  console.log(`Auth microservice is listening on port ${port}`);

  // Cierra el contexto que solo usamos para leer la config
  await appContext.close();
}
bootstrap();
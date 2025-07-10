// backend/apps/api-gateway/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { CustomRpcExceptionFilter } from './rpc-exception.filter';
import cookieParser from 'cookie-parser';
import { json } from 'express'; // <--- Importa el parser de Express

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Añade esta configuración para el rawBody
    bodyParser: false, 
  });

  // Configurar cookie-parser para leer cookies HTTP-Only
  app.use(cookieParser());

  // Configurar el parser de JSON manualmente con la opción 'verify'
  app.use(json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));
  
  // Configuración CORS estricta para credenciales
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3030',
    credentials: true,
    allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    exposedHeaders: 'Content-Disposition', // Para descargas de archivos
  });
  
  app.setGlobalPrefix('api/v1');

  app.useGlobalFilters(new CustomRpcExceptionFilter());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;

  await app.listen(port);
  console.log(`API Gateway is running on: ${await app.getUrl()}`);
}

void bootstrap();


// backend/apps/api-gateway/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { CustomRpcExceptionFilter } from './rpc-exception.filter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configurar cookie-parser para leer cookies HTTP-Only
  app.use(cookieParser());
  
  app.enableCors();
  app.setGlobalPrefix('api');

  app.useGlobalFilters(new CustomRpcExceptionFilter());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;

  await app.listen(port);
  console.log(`API Gateway is running on: ${await app.getUrl()}`);
}

void bootstrap();
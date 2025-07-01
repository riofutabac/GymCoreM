// backend/apps/api-gateway/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { CustomRpcExceptionFilter } from './rpc-exception.filter';
import * as bodyParser from 'body-parser'; // <-- AÑADE ESTE IMPORT

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // --- AÑADE ESTE BLOQUE COMPLETO ---
  // Captura el rawBody para la verificación de la firma del webhook de PayPal.
  // Es crucial que se ejecute antes de que NestJS parsee el JSON.
  app.use(bodyParser.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }));
  // --- FIN DEL BLOQUE AÑADIDO ---

  app.enableCors();
  app.setGlobalPrefix('api');


  app.useGlobalFilters(new CustomRpcExceptionFilter());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  await app.listen(port);
  console.log(`API Gateway is running on: ${await app.getUrl()}`);
}
bootstrap();
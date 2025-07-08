import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Exportamos el token para poder inyectarlo en otros servicios
export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global() // Hace que el provider esté disponible en todo el módulo sin re-importar
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
        if (!redisUrl) {
          throw new Error('REDIS_URL no está configurada en las variables de entorno.');
        }
        return new Redis(redisUrl);
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
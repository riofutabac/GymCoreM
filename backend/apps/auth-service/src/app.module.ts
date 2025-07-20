import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { PrismaModule } from './prisma/prisma.module';
import { AmqpLogger } from './amqp-logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    SupabaseModule,
    PrismaModule,
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        exchanges: [
          {
            name: 'gymcore-exchange',
            type: 'topic',
            options: {
              durable: true,
            },
          },
          {
            name: 'gymcore-logs-exchange',
            type: 'topic',
            options: {
              durable: true,
            },
          },
        ],
        uri: configService.get<string>('MESSAGE_BUS_URL') || 'amqp://localhost:5672',
        connectionInitOptions: {
          wait: false, // No esperar la conexión para inicializar
          reject: false, // No fallar si no se puede conectar
          timeout: 5000, // Timeout más corto
        },
        enableControllerDiscovery: true,
        prefetchCount: 1,
        enableDirectReplyTo: false, // Deshabilitar para evitar bloqueos
      }),
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      {
        name: 'GYM_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => {
          const gymServiceUrl =
            configService.get<string>('GYM_SERVICE_URL') || 'tcp://localhost:3002';
          const [host, port] = gymServiceUrl.replace('tcp://', '').split(':');
          return {
            transport: Transport.TCP,
            options: {
              host: host,
              port: +port,
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService, AmqpLogger],
  exports: [AmqpLogger],
})
export class AppModule {}
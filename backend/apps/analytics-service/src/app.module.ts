import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { RedisModule } from './redis.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Módulo de configuración para variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    // Módulo personalizado de Redis
    RedisModule,
    // Módulo de Prisma para base de datos
    PrismaModule,
    // Clientes para comunicación con otros microservicios
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3001,
        },
      },
      {
        name: 'GYM_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3002,
        },
      },
    ]),
    // Módulo de RabbitMQ para recibir eventos
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        exchanges: [
          {
            name: 'gymcore-exchange',
            type: 'topic',
            options: { durable: true },
          },
        ],
        uri: configService.get<string>(
          'MESSAGE_BUS_URL',
          'amqp://localhost:5672',
        ),
        connectionInitOptions: { wait: true, timeout: 10000 },
        enableControllerDiscovery: true, // Permite que los @RabbitSubscribe se detecten automáticamente
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController, AnalyticsController],
  providers: [AppService, AnalyticsService],
})
export class AppModule {}

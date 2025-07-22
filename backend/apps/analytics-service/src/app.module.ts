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
import { AmqpLogger } from './amqp-logger.service';

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
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => {
          const authServiceUrl = configService.get<string>('AUTH_SERVICE_URL') || 'tcp://localhost:3001';
          const [host, port] = authServiceUrl.replace('tcp://', '').split(':');
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
      {
        name: 'GYM_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => {
          const gymServiceUrl = configService.get<string>('GYM_SERVICE_URL') || 'tcp://localhost:3002';
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
      {
        name: 'PAYMENT_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => {
          const paymentServiceUrl = configService.get<string>('PAYMENT_SERVICE_URL') || 'tcp://localhost:3003';
          const [host, port] = paymentServiceUrl.replace('tcp://', '').split(':');
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
          {
            name: 'gymcore-logs-exchange',
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
  providers: [AppService, AnalyticsService, AmqpLogger],
  exports: [AmqpLogger],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebSocketModule } from './websocket/websocket.module';
import { RedisModule } from './redis.module';
import { RedisService } from './biometric.service';
import { BiometricEventsController } from './biometric.events.controller';
import { AmqpLogger } from './amqp-logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    RabbitMQModule.forRoot({
      exchanges: [
        {
          name: 'gymcore-logs-exchange',
          type: 'topic',
          options: {
            durable: true,
          },
        },
      ],
      uri: process.env.MESSAGE_BUS_URL || 'amqp://localhost:5672',
      connectionInitOptions: { wait: false },
    }),
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('AUTH_SERVICE_HOST') || (process.env.NODE_ENV === 'production' ? 'auth-service' : '127.0.0.1'),
            port: parseInt(configService.get('AUTH_SERVICE_PORT') || '3001', 10),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'GYM_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get('MESSAGE_BUS_URL') || 'amqp://localhost:5672'] as string[],
            queue: 'gym-management.check_membership',
            queueOptions: {
              durable: false,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    WebSocketModule,
    RedisModule,
  ],
  controllers: [AppController, BiometricEventsController],
  providers: [AppService, RedisService, AmqpLogger],
  exports: [AmqpLogger],
})
export class AppModule {}

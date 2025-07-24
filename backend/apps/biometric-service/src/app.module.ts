import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.NODE_ENV === 'production' ? 'auth-service' : '127.0.0.1',
          port: parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10),
        },
      },
      {
        name: 'GYM_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.MESSAGE_BUS_URL || 'amqp://localhost:5672'],
          queue: 'gym-management.check_membership',
          queueOptions: {
            durable: false,
          },
        },
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

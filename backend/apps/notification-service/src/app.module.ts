import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailService } from './email.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitMQModule.forRoot({
      exchanges: [
        {
          name: 'gymcore-exchange',
          type: 'topic',
          options: { durable: true },
        },
      ],
      uri: process.env.MESSAGE_BUS_URL || 'amqp://localhost:5672',
      connectionInitOptions: {
        wait: true,
        reject: process.env.NODE_ENV === 'production' ? true : false,
        timeout: 10000,
      },
      enableControllerDiscovery: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, EmailService],
})
export class AppModule {}

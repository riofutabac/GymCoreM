import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MembershipService } from './membership.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    PrismaModule,
    RabbitMQModule.forRoot({
      exchanges: [
        {
          name: 'gymcore-exchange',
          type: 'topic',
          options: {
            durable: true,
          },
        },
      ],
      uri: process.env.MESSAGE_BUS_URL || 'amqp://localhost:5672',
      enableControllerDiscovery: true,
      connectionInitOptions: {
        wait: false,
        reject: false,
        timeout: 10000,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, MembershipService],
})
export class AppModule {}
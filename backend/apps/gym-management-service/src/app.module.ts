// backend/apps/gym-management-service/src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { AppController } from './app.controller';
import { GymEventsController } from './gym-events.controller';
import { AppService } from './app.service';
import { MembershipService } from './membership.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Configuración global de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),

    // Módulo de Prisma para acceso a BD
    PrismaModule,

    // Configuración de RabbitMQ
    RabbitMQModule.forRoot({
      exchanges: [
        {
          name: 'gymcore-exchange',
          type: 'topic',
          options: { durable: true },
        },
        {
          name: 'gymcore-dead-letter-exchange',
          type: 'fanout',
          options: { durable: true },
        },
      ],
      uri: process.env.MESSAGE_BUS_URL ?? 'amqp://localhost:5672',
      enableControllerDiscovery: true,
    }),
  ],
  controllers: [
    AppController, // tus endpoints HTTP/tcp
    GymEventsController, // aquí están los @RabbitSubscribe
  ],
  providers: [AppService, MembershipService],
})
export class AppModule {}

// backend/apps/gym-management-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ClientsModule, Transport } from '@nestjs/microservices';   // 👈 nuevo
import { AppController } from './app.controller';
import { GymEventsController } from './gym-events.controller';
import { AppService } from './app.service';
import { MembershipService } from './membership.service';
import { PrismaModule } from './prisma/prisma.module';
import { MembersModule } from './members/members.module';

@Module({
  imports: [
    /* 1. Variables de entorno */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),

    /* 2. Prisma */
    PrismaModule,

    /* 3. Modulo de Miembros */
    MembersModule,

    /* 4. RabbitMQ para eventos */
    RabbitMQModule.forRoot({
      exchanges: [
        { name: 'gymcore-exchange', type: 'topic',  options: { durable: true } },
        { name: 'gymcore-dead-letter-exchange', type: 'fanout', options: { durable: true } },
      ],
      uri: process.env.MESSAGE_BUS_URL ?? 'amqp://localhost:5672',
      enableControllerDiscovery: true,
    }),

    /* 5. ClientProxy hacia AUTH-SERVICE */
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',               // ← token que inyectarás en MembersService
        transport: Transport.RMQ,
        options: {
          urls: [process.env.MESSAGE_BUS_URL ?? 'amqp://localhost:5672'],
          queue: 'auth_service_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],

  controllers: [
    AppController,        // REST ó TCP
    GymEventsController,  // @RabbitSubscribe listeners
  ],

  providers: [AppService, MembershipService],
})
export class AppModule {}

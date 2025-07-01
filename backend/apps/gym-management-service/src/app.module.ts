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
          options: { durable: true },
        },
        // Exchange para los mensajes "muertos" (fallidos)
        {
          name: 'gymcore-dead-letter-exchange',
          type: 'fanout', // fanout es simple y efectivo para DLQs
          options: { durable: true },
        },
      ],
      uri: process.env.MESSAGE_BUS_URL || 'amqp://localhost:5672',
      connectionInitOptions: { wait: true, timeout: 5000 },
      // Habilitamos el descubrimiento automático para que NestJS encuentre los @RabbitSubscribe
      enableControllerDiscovery: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, MembershipService],
})
export class AppModule {}
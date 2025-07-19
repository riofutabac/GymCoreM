import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    RabbitMQModule.forRoot({
      exchanges: [
        {
          name: 'gymcore-exchange',
          type: 'topic',
          options: { durable: true },
        },
      ],
      uri: process.env.MESSAGE_BUS_URL ?? 'amqp://localhost:5672',
    }),
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        useFactory: (configService: ConfigService) => {
          const authServiceUrl = configService.get<string>('AUTH_SERVICE_URL') ?? 'tcp://localhost:3001';
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
    ]),
  ],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}

import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';

@Module({
  imports: [
    RabbitMQModule.forRoot({
      exchanges: [
        {
          name: 'gymcore-exchange',
          type: 'topic',
        },
      ],
      uri: process.env.MESSAGE_BUS_URL || 'amqp://localhost:5672',
    }),
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}

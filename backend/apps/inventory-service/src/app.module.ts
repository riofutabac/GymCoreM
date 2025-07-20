import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { SaleCompletedListener } from './listeners/sale-completed.listener';
import { AmqpLogger } from './amqp-logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        'backend/apps/inventory-service/.env',
        '.env'
      ],
    }),
    RabbitMQModule.forRoot({
      exchanges: [
        {
          name: 'gymcore-exchange',
          type: 'topic',
        },
        {
          name: 'gymcore-logs-exchange',
          type: 'topic',
          options: { durable: true },
        },
      ],
      uri: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      connectionInitOptions: { wait: false, timeout: 5000 },
    }),
    PrismaModule,
    ProductsModule,
    SalesModule,
  ],
  providers: [
    SaleCompletedListener,
    AmqpLogger,
  ],
  exports: [AmqpLogger],
})
export class AppModule {}

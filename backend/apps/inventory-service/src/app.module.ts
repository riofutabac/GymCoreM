import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { SaleCompletedListener } from './listeners/sale-completed.listener';

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
      ],
      uri: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      connectionInitOptions: { wait: false, timeout: 5000 },
    }),
    PrismaModule,
    ProductsModule,
    SalesModule,
  ],
  providers: [SaleCompletedListener], // Habilitado para manejar payment.completed
})
export class AppModule {}

import { Module } from '@nestjs/common';
// import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';

@Module({
  imports: [/* RabbitMQModule */], // Temporalmente comentado para resolver el problema de arranque
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}

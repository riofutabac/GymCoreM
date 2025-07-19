// apps/payment-service/src/rabbit-bindings.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class RabbitBindingsService implements OnModuleInit {
  private readonly logger = new Logger(RabbitBindingsService.name);

  constructor(private readonly amqp: AmqpConnection) {}

  async onModuleInit() {
    try {
      this.logger.log('Configurando colas de RabbitMQ para Payment Service...');
      const channel = await this.amqp.managedChannel;

      // Cola para activaciones manuales
      await channel.assertQueue('payments.membership.activated.manually', { durable: true });
      await channel.bindQueue(
        'payments.membership.activated.manually',
        'gymcore-exchange',
        'membership.activated.manually',
      );

      // Nota: Renovaciones se manejan via listener unificado
      this.logger.log('Colas de Payment Service configuradas');
    } catch (error) {
      this.logger.error('Error configurando colas de RabbitMQ:', error);
      throw error;
    }
  }
}
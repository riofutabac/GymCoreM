// apps/payment-service/src/rabbit-bindings.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class RabbitBindingsService implements OnModuleInit {
  private readonly logger = new Logger(RabbitBindingsService.name);

  constructor(private readonly amqp: AmqpConnection) {}

  async onModuleInit() {
    this.logger.log('Initializing RabbitMQ bindings...');
    
    try {
      const channel = await this.amqp.managedChannel;

      // Create durable queue for manual membership activations
      await channel.assertQueue('payments.membership.activated.manually', { durable: true });

      // Bind queue to exchange with routing key
      await channel.bindQueue(
        'payments.membership.activated.manually',
        'gymcore-exchange',
        'membership.activated.manually',
      );

      this.logger.log('RabbitMQ queue and bindings created successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RabbitMQ bindings', error);
    }
  }
}
// apps/payment-service/src/rabbit-bindings.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class RabbitBindingsService implements OnModuleInit {
  constructor(private readonly amqp: AmqpConnection) {
    // Constructor limpio sin logs
  }

  async onModuleInit() {
    try {
      const channel = await this.amqp.managedChannel;

      await channel.assertQueue('payments.membership.activated.manually', { durable: true });

      await channel.bindQueue(
        'payments.membership.activated.manually',
        'gymcore-exchange',
        'membership.activated.manually',
      );
    } catch (error) {
      // Error handling sin logs
      throw error;
    }
  }
}
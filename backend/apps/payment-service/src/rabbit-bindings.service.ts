// apps/payment-service/src/rabbit-bindings.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class RabbitBindingsService implements OnModuleInit {
  private readonly logger = new Logger(RabbitBindingsService.name);

  constructor(private readonly amqp: AmqpConnection) {
    console.log('🐰 RabbitBindingsService.constructor() cargado');
    this.logger.log('🐰 RabbitBindingsService constructor ejecutado');
  }

  async onModuleInit() {
    console.log('🔧 onModuleInit de RabbitBindingsService arrancó');
    this.logger.log('🔧 onModuleInit de RabbitBindingsService arrancó');
    
    try {
      const channel = await this.amqp.managedChannel;
      console.log('📡 Channel obtenido correctamente');

      // 1) Creamos (assert) la cola durable
      await channel.assertQueue('payments.membership.activated.manually', { durable: true });
      console.log('📦 Queue creada: payments.membership.activated.manually');

      // 2) La enlazamos al exchange con la routing key correcta
      await channel.bindQueue(
        'payments.membership.activated.manually',
        'gymcore-exchange',
        'membership.activated.manually',
      );
      console.log('🔗 Binding creado correctamente');

      this.logger.log('✅ Queue y binding creados: payments.membership.activated.manually ← membership.activated.manually');
      console.log('✅ Queue y binding creados: payments.membership.activated.manually ← membership.activated.manually');
    } catch (error) {
      console.error('❌ Error en onModuleInit:', error);
      this.logger.error('❌ Error en onModuleInit:', error);
    }
  }
}
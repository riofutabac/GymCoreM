// backend/apps/gym-management-service/src/gym-events.controller.ts

import { Controller, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack, AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AppService } from './app.service';
import { MembershipService } from './membership.service';
import { Role } from '../prisma/generated/gym-client';

@Controller()
export class GymEventsController {
  private readonly logger = new Logger(GymEventsController.name);
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly appService: AppService,
    private readonly membershipService: MembershipService,
    private readonly amqp: AmqpConnection,
  ) {}

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'user.created',
    queue: 'gym-management.user.created',
    queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': 'gymcore-dead-letter-exchange' } },
  })
  async handleUserCreated(payload: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: Role;
    gymId?: string;
  }) {
    this.logger.log(`📝 user.created → ${payload.email}`);
    await this.appService.createLocalUser(payload);
    this.logger.log(`✅ Usuario ${payload.email} sincronizado`);
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'user.role.updated',
    queue: 'gym-management.user.role.updated',
    queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': 'gymcore-dead-letter-exchange' } },
  })
  async handleUserRoleUpdated(payload: { userId: string; newRole: string; gymId?: string }) {
    this.logger.log(`🔄 user.role.updated → ${payload.userId}`);
    await this.appService.updateLocalUserRole(payload);
    this.logger.log(`✅ Rol actualizado para ${payload.userId}`);
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'payment.completed',
    queue: 'gym-management.payment.completed',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'gymcore-dead-letter-exchange',
      deadLetterRoutingKey: 'payment.completed.dead',
    },
  })
  async handlePaymentCompleted(
    payload: { userId: string; membershipId: string; paidAt: string },
    raw: any,
  ) {
    const headers = raw.properties.headers || {};
    const retry = (headers['x-retry-count'] || 0) + 1;
    this.logger.log(`[Intento #${retry}] payment.completed → ${payload.membershipId}`);

    try {
      await this.membershipService.processPaidMembership(payload);
      this.logger.log(`✅ Membresía ${payload.membershipId} procesada`);
    } catch (err) {
      this.logger.error(`[Intento #${retry}] error en ${payload.membershipId}`, err.stack);
      if (retry >= this.MAX_RETRIES) {
        this.logger.error(`DLQ tras ${retry} intentos`);
        return new Nack(false);
      }
      this.logger.warn(`Re-publicando para intento #${retry + 1}`);
      await this.amqp.publish(
        'gymcore-exchange',
        'payment.completed',
        payload,
        { expiration: 10000, headers: { 'x-retry-count': retry }, persistent: true },
      );
    }
  }
}

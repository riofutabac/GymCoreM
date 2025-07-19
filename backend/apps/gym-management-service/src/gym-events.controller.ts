// backend/apps/gym-management-service/src/gym-events.controller.ts

import { Controller, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack, AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AppService } from './app.service';
import { MembershipService } from './membership.service';
import { MembersService } from './members/members.service';
import { Role } from '../prisma/generated/gym-client';

@Controller()
export class GymEventsController {
  private readonly logger = new Logger(GymEventsController.name);
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly appService: AppService,
    private readonly membershipService: MembershipService,
    private readonly membersService: MembersService,
    private readonly amqp: AmqpConnection,
  ) {
    this.logger.log('🚀 GymEventsController instanciado - debería registrar handlers');
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'user.created',
    queue: 'gym-management.user.created',
    queueOptions: { 
      durable: true, 
      arguments: { 
        'x-dead-letter-exchange': 'gymcore-dead-letter-exchange' 
      } 
    },
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
    queueOptions: { 
      durable: true, 
      arguments: { 
        'x-dead-letter-exchange': 'gymcore-dead-letter-exchange' 
      } 
    },
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
      arguments: {
        'x-dead-letter-exchange': 'gymcore-dead-letter-exchange',
        'x-dead-letter-routing-key': 'payment.completed.dead',
      },
    },
  })
  async handlePaymentCompleted(
    payload: { 
      userId?: string; 
      membershipId?: string; 
      saleId?: string;
      paidAt?: string;
      timestamp?: string;
      amount?: number;
      paymentMethod?: string;
    },
    raw: any,
  ) {
    // 🚨 VALIDACIÓN CRÍTICA: Solo procesar pagos de membresías
    if (!payload.membershipId) {
      const eventDescription = payload.saleId ? `venta POS #${payload.saleId}` : 'evento sin membershipId';
      this.logger.log(`✅ Evento 'payment.completed' ignorado: No es un pago de membresía (${eventDescription})`);
      return; // Detiene la ejecución para este evento
    }

    // Validar que tenemos userId para membresías
    if (!payload.userId) {
      this.logger.warn(`⚠️ Pago de membresía ${payload.membershipId} sin userId. Ignorando evento.`);
      return;
    }

    const headers = raw.properties.headers || {};
    const retry = (headers['x-retry-count'] || 0) + 1;
    this.logger.log(`[Intento #${retry}] payment.completed → ${payload.membershipId}`);

    try {
      // Usar paidAt si existe, si no usar timestamp, si no usar fecha actual
      const paidAt = payload.paidAt || payload.timestamp || new Date().toISOString();
      
      const processPayload = {
        userId: payload.userId as string, // Type assertion después de validación
        membershipId: payload.membershipId as string, // Type assertion después de validación
        paidAt: paidAt
      };

      await this.membershipService.processPaidMembership(processPayload);
      this.logger.log(`✅ Membresía ${payload.membershipId} procesada`);
    } catch (err: any) {
      this.logger.error(`[Intento #${retry}] error en ${payload.membershipId}`, err.stack || err.message);
      if (retry >= this.MAX_RETRIES) {
        this.logger.error(`DLQ tras ${retry} intentos`);
        return new Nack(false);
      }
      this.logger.warn(`Re-publicando para intento #${retry + 1}`);
      
      // Backoff exponencial: 10s, 40s, 90s
      const backoffDelay = 10000 * (retry * retry);
      
      await this.amqp.publish(
        'gymcore-exchange',
        'payment.completed',
        payload,
        { 
          expiration: backoffDelay.toString(), // AMQP requiere string
          headers: { 'x-retry-count': retry }, 
          persistent: true 
        },
      );
    }
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'user.profile.updated',
    queue: 'gym-management.user.profile.updated',
    queueOptions: { 
      durable: true, 
      arguments: { 
        'x-dead-letter-exchange': 'gymcore-dead-letter-exchange' 
      } 
    },
  })
  async handleUserProfileUpdated(payload: { 
    userId: string; 
    firstName?: string; 
    lastName?: string; 
    email?: string;
  }) {
    this.logger.log(`🔄 user.profile.updated → ${payload.userId}`);
    try {
      await this.membersService.updateMemberProfile(payload.userId, {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
      });
      this.logger.log(`✅ Perfil de usuario ${payload.userId} sincronizado`);
    } catch (err) {
      this.logger.error(`❌ Error sincronizando perfil ${payload.userId}:`, err);
      throw err;
    }
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'user.gym.assigned',
    queue: 'gym-management.user.gym.assigned',
    queueOptions: { 
      durable: true, 
      arguments: { 
        'x-dead-letter-exchange': 'gymcore-dead-letter-exchange' 
      } 
    },
  })
  async handleUserGymAssigned(payload: { 
    userId: string; 
    gymId: string;
    gymName: string;
  }) {
    this.logger.log(`🏢 user.gym.assigned → Usuario ${payload.userId} asignado a ${payload.gymName}`);
    // Este evento se genera desde gym-management-service, por lo que no necesitamos procesarlo
    // Solo lo registramos para auditoria
    this.logger.log(`✅ Evento gym.assigned registrado para usuario ${payload.userId}`);
  }
}

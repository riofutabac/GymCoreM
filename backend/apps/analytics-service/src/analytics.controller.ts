import { Controller, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { MessagePattern } from '@nestjs/microservices';
import { AnalyticsService } from './analytics.service';

@Controller()
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'user.created',
    queue: 'analytics.user.created', // Queue específica para este consumidor
  })
  public async handleUserCreated(payload: { email: string }) {
    this.logger.log(`Evento 'user.created' recibido para ${payload.email}`);
    await this.analyticsService.processNewUser();
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'payment.completed',
    queue: 'analytics.payment.completed',
  })
  public async handlePaymentCompleted(payload: { 
    amount: number; 
    paymentId?: string; 
    membershipId?: string; 
    saleId?: string;
    timestamp?: string;
  }) {
    // Crear un eventId único basado en los datos disponibles
    const eventId = payload.paymentId || 
                   payload.membershipId || 
                   payload.saleId || 
                   `${payload.amount}_${payload.timestamp || Date.now()}`;
    
    this.logger.log(
      `Evento 'payment.completed' recibido por $${payload.amount} (eventId: ${eventId})`,
    );
    
    if (typeof payload.amount === 'number') {
      await this.analyticsService.processCompletedPayment(payload.amount, eventId);
    }
  }

  @MessagePattern({ cmd: 'get_kpis' })
  public async getKPIs() {
    this.logger.log('Solicitud de KPIs recibida');
    // LA CORRECCIÓN ESTÁ AQUÍ: getKpis con 'i' minúscula
    return this.analyticsService.getKpis(); 
  }

  @MessagePattern({ cmd: 'get_global_trends' })
  public async getGlobalTrends() {
    this.logger.log('Solicitud de tendencias globales recibida');
    return this.analyticsService.getGlobalTrends();
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'gym.updated',
    queue: 'analytics.gym.updated',
  })
  public async handleGymUpdated(payload: { gymId: string; updatedFields?: string[] }) {
    this.logger.log(`Evento 'gym.updated' recibido para gimnasio ${payload.gymId}`);
    await this.analyticsService.handleGymUpdate();
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'gym.deactivated',
    queue: 'analytics.gym.deactivated',
  })
  public async handleGymDeactivated(payload: { gymId: string; gymName: string; deactivatedAt: string }) {
    this.logger.log(`Evento 'gym.deactivated' recibido para gimnasio ${payload.gymName} (ID: ${payload.gymId})`);
    await this.analyticsService.handleGymDeactivation(payload.gymId);
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'user.profile.updated',
    queue: 'analytics.user.profile.updated',
  })
  public async handleUserProfileUpdated(payload: { userId: string; updatedFields?: string[] }) {
    this.logger.log(`Evento 'user.profile.updated' recibido para usuario ${payload.userId}`);
    await this.analyticsService.handleUserProfileUpdate();
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'user.role.updated',
    queue: 'analytics.user.role.updated',
  })
  public async handleUserRoleUpdated(payload: { userId: string; newRole: string; oldRole?: string }) {
    this.logger.log(`Evento 'user.role.updated' recibido para usuario ${payload.userId}: ${payload.oldRole || 'unknown'} → ${payload.newRole}`);
    await this.analyticsService.handleUserRoleUpdate();
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'membership.activated',
    queue: 'analytics.membership.activated',
  })
  public async handleMembershipActivated(payload: { userId: string; membershipType: string; gymId?: string }) {
    this.logger.log(`Evento 'membership.activated' recibido para usuario ${payload.userId}, tipo: ${payload.membershipType}`);
    await this.analyticsService.handleMembershipActivation(payload);
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'gym.created',
    queue: 'analytics.gym.created',
  })
  public async handleGymCreated(payload: { gymId: string; name: string }) {
    this.logger.log(`Evento 'gym.created' recibido para gimnasio ${payload.name} (ID: ${payload.gymId})`);
    await this.analyticsService.handleGymUpdate(); // Reutilizamos la función que invalida la caché
  }
}
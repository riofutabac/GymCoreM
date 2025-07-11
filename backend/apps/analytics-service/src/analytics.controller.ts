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
  public async handlePaymentCompleted(payload: { amount: number }) {
    this.logger.log(
      `Evento 'payment.completed' recibido por $${payload.amount}`,
    );
    if (typeof payload.amount === 'number') {
      await this.analyticsService.processCompletedPayment(payload.amount);
    }
  }

  @MessagePattern({ cmd: 'get_kpis' })
  public async getKPIs() {
    return this.analyticsService.getKPIs();
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
}
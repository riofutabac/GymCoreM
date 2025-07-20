import { Controller, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { RedisService } from './biometric.service';

@Controller()
export class BiometricEventsController {
  private readonly logger = new Logger(BiometricEventsController.name);

  constructor(private readonly redisService: RedisService) {}

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'membership.updated',
    queue: 'biometric-service.membership.updated',
  })
  public async handleMembershipUpdated(payload: { userId: string }) {
    this.logger.log(`Received membership update for user ${payload.userId}. Invalidating cache.`);
    await this.redisService.invalidateMembershipStatus(payload.userId);
  }
}
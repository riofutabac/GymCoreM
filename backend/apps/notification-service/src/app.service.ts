import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  getHello(): string {
    this.logger.log('Health check requested');
    return 'GymCore Notification Service is running! 🎉';
  }

  getHealth(): object {
    return {
      service: 'notification-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  async getUserInfo(userId: string): Promise<{ email: string; name: string } | null> {
    try {
      const userInfo = await firstValueFrom(
        this.authClient.send({ cmd: 'get_user_info' }, { userId }),
      );
      return userInfo;
    } catch (error) {
      this.logger.error(`Error obteniendo información del usuario ${userId}`, error);
      return null;
    }
  }
}

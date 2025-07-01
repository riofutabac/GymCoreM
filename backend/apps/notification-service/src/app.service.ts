import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

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
}

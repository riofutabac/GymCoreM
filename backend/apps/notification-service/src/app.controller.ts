import { Controller, Get, Logger, Post, Body } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AppService } from './app.service';
import { EmailService } from './email.service';

interface PaymentCompletedPayload {
  userId: string;
  membershipId: string;
  paidAt: string;
  amount: number;
  userEmail?: string;
  userName?: string;
}

interface PaymentFailedPayload {
  userId: string;
  membershipId: string;
  amount: number;
  failureReason: string;
  userEmail?: string;
  userName?: string;
}

interface TestEmailPayload {
  email: string;
}

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): object {
    return this.appService.getHealth();
  }

  @Post('test-email')
  async sendTestEmail(@Body() payload: TestEmailPayload): Promise<object> {
    this.logger.log(`Test email requested for: ${payload.email}`);

    try {
      await this.emailService.sendTestEmail(payload.email);
      return {
        success: true,
        message: `Test email sent to ${payload.email}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send test email', errorMessage);
      return {
        success: false,
        message: 'Failed to send test email',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'payment.completed',
    queue: 'notification.payment.completed',
  })
  async onPaymentCompleted(payload: PaymentCompletedPayload) {
    this.logger.log(
      `Payment completed event received for user ${payload.userId}`,
    );

    try {
      // In a real implementation, you would fetch user details from auth-service or database
      // For now, we'll use the payload data or fallback values
      const userEmail = payload.userEmail || 'user@example.com';
      const userName = payload.userName || 'Valued Member';

      await this.emailService.sendMembershipActivated(userEmail, {
        name: userName,
        membershipId: payload.membershipId,
        membershipType: 'Premium', // You could get this from payload or fetch from DB
        activationDate: new Date().toLocaleDateString(),
      });

      this.logger.log(
        `✅ Membership activation email sent for user ${payload.userId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `❌ Failed to send membership activation email for user ${payload.userId}`,
        errorMessage,
      );
    }
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'payment.failed',
    queue: 'notification.payment.failed',
  })
  async onPaymentFailed(payload: PaymentFailedPayload) {
    this.logger.log(`Payment failed event received for user ${payload.userId}`);

    try {
      // In a real implementation, you would fetch user details from auth-service or database
      const userEmail = payload.userEmail || 'user@example.com';
      const userName = payload.userName || 'Valued Member';

      await this.emailService.sendPaymentFailed(userEmail, {
        name: userName,
        membershipId: payload.membershipId,
        amount: `$${payload.amount.toFixed(2)}`,
        failureReason: payload.failureReason,
      });

      this.logger.log(
        `✅ Payment failed email sent for user ${payload.userId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `❌ Failed to send payment failed email for user ${payload.userId}`,
        errorMessage,
      );
    }
  }
}

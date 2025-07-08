import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

export interface MembershipActivatedData {
  name: string;
  membershipId: string;
  membershipType?: string;
  activationDate?: string;
}

export interface PaymentFailedData {
  name: string;
  membershipId: string;
  amount: string;
  failureReason?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {
    // Set SendGrid API Key when service initializes
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    if (!apiKey) {
      this.logger.error('SENDGRID_API_KEY is not configured');
      throw new Error('SendGrid API Key is required');
    }
    sgMail.setApiKey(apiKey);
    this.logger.log('SendGrid API Key configured successfully');
  }

  async sendMembershipActivated(
    to: string,
    data: MembershipActivatedData,
  ): Promise<void> {
    const from = this.config.get<string>('SENDGRID_FROM_EMAIL');

    if (!from) {
      this.logger.error('SENDGRID_FROM_EMAIL is not configured');
      throw new Error('SendGrid from email is required');
    }

    this.logger.log(`Sending 'membership-activated' email to: ${to}`);

    try {
      await sgMail.send({
        to,
        from,
        templateId:
          this.config.get<string>(
            'SENDGRID_MEMBERSHIP_ACTIVATED_TEMPLATE_ID',
          ) ?? 'd-0acea7d5b5754616bfc882ac9470c757',
        dynamicTemplateData: {
          ...data,
          activationDate:
            data.activationDate ?? new Date().toLocaleDateString(),
        },
      });

      this.logger.log(
        `✅ Membership activation email sent successfully to ${to}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error sending membership activation email to ${to}`,
        error.response?.body ?? error.message,
      );
      throw error;
    }
  }

  async sendPaymentFailed(to: string, data: PaymentFailedData): Promise<void> {
    const from = this.config.get<string>('SENDGRID_FROM_EMAIL');

    if (!from) {
      this.logger.error('SENDGRID_FROM_EMAIL is not configured');
      throw new Error('SendGrid from email is required');
    }

    this.logger.log(`Sending 'payment-failed' email to: ${to}`);

    try {
      await sgMail.send({
        to,
        from,
        templateId:
          this.config.get<string>('SENDGRID_PAYMENT_FAILED_TEMPLATE_ID') ??
          'd-YOUR_PAYMENT_FAILED_TEMPLATE_ID',
        dynamicTemplateData: {
          ...data,
          failureDate: new Date().toLocaleDateString(),
        },
      });

      this.logger.log(`✅ Payment failed email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(
        `❌ Error sending payment failed email to ${to}`,
        error.response?.body ?? error.message,
      );
      throw error;
    }
  }

  async sendTestEmail(to: string): Promise<void> {
    const from = this.config.get<string>('SENDGRID_FROM_EMAIL');

    if (!from) {
      this.logger.error('SENDGRID_FROM_EMAIL is not configured');
      throw new Error('SendGrid from email is required');
    }

    this.logger.log(`Sending test email to: ${to}`);

    try {
      await sgMail.send({
        to,
        from,
        subject: 'GymCore Notification Service - Test Email',
        html: `
          <h2>🎉 GymCore Notification Service is Working!</h2>
          <p>This is a test email to verify that your notification service is properly configured.</p>
          <p><strong>Service:</strong> notification-service</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Status:</strong> ✅ Active</p>
        `,
      });

      this.logger.log(`✅ Test email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(
        `❌ Error sending test email to ${to}`,
        error.response?.body ?? error.message,
      );
      throw error;
    }
  }
}

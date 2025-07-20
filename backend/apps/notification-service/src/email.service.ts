// backend/apps/notification-service/src/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

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
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.error('RESEND_API_KEY no está configurado');
      throw new Error('Resend API Key es requerida');
    }
    this.resend = new Resend(apiKey);

    const from = this.config.get<string>('RESEND_FROM_EMAIL');
    if (!from) {
      this.logger.error('RESEND_FROM_EMAIL no está configurado');
      throw new Error('Email from (RESEND_FROM_EMAIL) es requerido');
    }
    this.from = from;

    this.logger.log('🔑 Resend configurado correctamente');
  }

  async sendMembershipActivated(
    to: string,
    data: MembershipActivatedData,
  ): Promise<void> {
    this.logger.log(`Enviando 'membership-activated' a: ${to}`);
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: '🎉 ¡Membresía Activada!',
      html: `<p>Hola ${data.name},</p>
             <p>Tu membresía <strong>${data.membershipId}</strong> (${data.membershipType ?? '—'}) 
             fue activada el ${data.activationDate ?? new Date().toLocaleDateString()}.</p>`,
      // O si usas plantillas HTML/variables personalizadas, ajusta aquí
    });
    this.logger.log(`✅ Email de activación enviado a ${to}`);
  }

  async sendPaymentFailed(
    to: string,
    data: PaymentFailedData,
  ): Promise<void> {
    this.logger.log(`Enviando 'payment-failed' a: ${to}`);
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: '⚠️ Pago Rechazado',
      html: `<p>Hola ${data.name},</p>
             <p>Tu pago de <strong>${data.amount}</strong> para la membresía 
             <strong>${data.membershipId}</strong> falló por: ${data.failureReason ?? 'desconocido'}.</p>`,
    });
    this.logger.log(`✅ Email de pago fallido enviado a ${to}`);
  }

  async sendTestEmail(to: string): Promise<void> {
    try {
      this.logger.log(`Enviando test email a: ${to}`);
      const result = await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'GymCore Notification Service - Test Email',
        html: `<h2>🎉 Servicio de Notificaciones Activo</h2>
               <p>Timestamp: ${new Date().toISOString()}</p>
               <p>🟢 Status: OK</p>`,
      });
      this.logger.log(`✅ Resend id: ${result.data?.id || 'unknown'}`);
    } catch (err: any) {
      this.logger.error('❌ Resend error', {
        name: err.name,
        message: err.message,
        statusCode: err.statusCode,
        data: err.response?.data,
      });
      throw err;
    }
  }
}

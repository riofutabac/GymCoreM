import {
  Controller,
  Get,
  UsePipes,
  ValidationPipe,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { register } from 'prom-client';
import { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @MessagePattern({ cmd: 'create_checkout_session' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createCheckout(@Payload() dto: CreateCheckoutDto) {
    return this.appService.createCheckoutSession(dto);
  }

  // --- WEBHOOK CON VERIFICACIÓN DE FIRMA USANDO SDK ---
  @MessagePattern({ cmd: 'handle_paypal_webhook' })
  handleWebhook(@Payload() data: { body: any; headers: any; rawBody: string }) {
    // Pasamos el cuerpo, las cabeceras y el rawBody (como string) al servicio
    return this.appService.handlePaypalWebhook(data);
  }

  // --- AÑADIR ESTE NUEVO MÉTODO PARA PROMETHEUS ---
  @Get('metrics')
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  }

  // --- ENDPOINT TEMPORAL PARA TESTING (SOLO DESARROLLO) ---
  @Get('test-webhook')
  async testWebhook() {
    // Proteger endpoint en producción
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException('Endpoint no disponible en producción', 404);
    }

    // Obtener el último pago PENDING para simular su completado
    const pendingPayment = await this.appService.getLastPendingPayment();
    
    if (!pendingPayment) {
      return { error: 'No hay pagos pendientes para simular' };
    }

    // Simular un webhook de PayPal para testing
    const mockWebhookBody = {
      id: 'WH-TEST-123',
      event_type: 'CHECKOUT.ORDER.APPROVED',
      resource: {
        id: pendingPayment.transactionId, // Usar un transactionId real
      }
    };

    const mockWebhookData = {
      body: mockWebhookBody,
      headers: {
        'paypal-transmission-time': new Date().toISOString(),
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-TEST',
        'paypal-transmission-id': 'test-transmission-id',
        'paypal-transmission-sig': 'test-signature',
      },
      rawBody: JSON.stringify(mockWebhookBody), // ← AHORA ES STRING
    };

    return this.appService.handlePaypalWebhook(mockWebhookData);
  }
}

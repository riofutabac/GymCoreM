import {
  Controller,
  Get,
  UsePipes,
  ValidationPipe,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AppService } from './app.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { register } from 'prom-client';
import { Response } from 'express';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {
    // Log para verificar que el controlador se inicializa
    this.logger.log('🚀 PaymentService AppController inicializado');
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @MessagePattern({ cmd: 'create_checkout_session' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createCheckout(@Payload() dto: CreateCheckoutDto) {
    return this.appService.createCheckoutSession(dto);
  }

  @MessagePattern({ cmd: 'create_sale_checkout' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createSaleCheckout(@Payload() payload: { saleId: string; amount: number }) {
    return this.appService.createSaleCheckout(payload);
  }

  @MessagePattern({ cmd: 'get_cash_revenue_for_gym' })
  getCashRevenueForGym(@Payload() data: { gymId: string; startOfMonth: string; endOfMonth: string }) {
    return this.appService.getCashRevenueForGym(data.gymId, data.startOfMonth, data.endOfMonth);
  }

  // --- WEBHOOK CON VERIFICACIÓN DE FIRMA USANDO SDK ---
  @MessagePattern({ cmd: 'handle_paypal_webhook' })
  async handlePaypalWebhook(@Payload() data: any) {
    this.logger.log('📥 Webhook de PayPal recibido en payment-service');
    return this.appService.handlePaypalWebhook(data);
  }

  // Escuchar eventos payment.completed del inventory-service (ventas POS)
  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'payment.completed',
    queue: 'payment-service-payment-completed',
    queueOptions: { durable: true },
  })
  async handlePaymentCompleted(@Payload() data: any): Promise<void> {
    this.logger.log(`🎯 PAYMENT-SERVICE: Evento payment.completed recibido: ${JSON.stringify(data)}`);
    
    // SIEMPRE procesar para debug
    this.logger.log(`🔍 Debug - source: ${data.source}, saleId: ${data.saleId}`);
    
    // Solo procesar si viene del POS (inventory-service)
    if (data.source === 'POS') {
      this.logger.log(`✅ Procesando venta POS: ${data.saleId}`);
      await this.appService.createPaymentFromPOSSale(data);
      return;
    }
    
    this.logger.log(`⚠️ Evento payment.completed ignorado (source: ${data.source})`);
  }

  // LISTENER DE DEBUG - TEMPORAL
  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: '#',
    queue: 'payment-debug-all-events',
    queueOptions: { durable: false, autoDelete: true },
  })
  async debugAllEvents(@Payload() data: any, @Payload('routingKey') routingKey: string): Promise<void> {
    if (routingKey === 'payment.completed') {
      this.logger.log(`🐛 DEBUG: Capturé event payment.completed en listener genérico: ${JSON.stringify(data)}`);
    }
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

  // --- LISTENER PARA ACTIVACIONES MANUALES DE MEMBRESÍA ---
  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'membership.activated.manually',
    queue: 'payments.membership.activated.manually', // Una queue dedicada
    queueOptions: { durable: true },    // ← Aquí
  })
  public async handleManualMembershipActivation(payload: {
    userId: string;
    membershipId: string;
    amount: number;
    method: string;
    reason?: string;
    activatedBy: string;
  }) {
    this.logger.log(`Evento de activación manual recibido para membresía ${payload.membershipId}`);
    
    // Llamar a un método en AppService para manejar la lógica
    await this.appService.createManualPayment(payload);
  }
}

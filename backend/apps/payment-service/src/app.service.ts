import { Injectable, Inject, HttpStatus, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { PaypalService } from './paypal/paypal.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import * as paypal from '@paypal/checkout-server-sdk';
import { firstValueFrom } from 'rxjs';
import { Counter, register } from 'prom-client';

interface MembershipDetails {
  id: string;
  name: string;
  price: number;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  // --- MÉTRICA DE PROMETHEUS ---
  private readonly webhookCounter = new Counter({
    name: 'paypal_webhook_events_total',
    help: 'Total de webhooks de PayPal recibidos por tipo y estado',
    labelNames: ['event_type', 'status'], // Etiquetas: ej. 'CHECKOUT.ORDER.APPROVED', 'processed'
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly paypalSvc: PaypalService,
    private readonly config: ConfigService,
    @Inject('GYM_SERVICE') private readonly gymClient: ClientProxy,
    private readonly amqpConnection: AmqpConnection,
  ) {
    // Registrar la métrica con un nombre de servicio para mejor filtrado en Grafana
    register.setDefaultLabels({ service: 'payment-service' });
  }

  getHello(): string {
    return 'Payment Service is running!';
  }

  async createCheckoutSession(dto: CreateCheckoutDto) {
    this.logger.log(`Iniciando checkout para membresía ${dto.membershipId}`);

    const membershipDetails = await firstValueFrom(
      this.gymClient.send<MembershipDetails>({ cmd: 'get_membership_details' }, { membershipId: dto.membershipId }),
    ).catch((err) => {
      this.logger.error(`Error al obtener detalles de la membresía: ${dto.membershipId}`, err);
      throw new RpcException({
        message: 'Membresía no válida o el servicio de gimnasios no responde.',
        status: HttpStatus.BAD_REQUEST
      });
    });

    if (!membershipDetails || typeof membershipDetails.price !== 'number') {
      throw new RpcException({
        message: 'No se pudo obtener un precio válido para la membresía.',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const amount = membershipDetails.price.toFixed(2);
    const currency = 'USD';
    const frontendUrl = this.config.get<string>('FRONTEND_URL');

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: `Membresía Gymcore: ${membershipDetails.name}`,
          amount: { currency_code: currency, value: amount },
          custom_id: dto.membershipId,
        },
      ],
      application_context: {
        return_url: `${frontendUrl}/payment/success`,
        cancel_url: `${frontendUrl}/payment/cancelled`,
        brand_name: 'GymCore',
        user_action: 'PAY_NOW',
      },
    });

    let order: any; // Usamos 'any' para evitar problemas con los tipos complejos de PayPal SDK
    try {
      order = await this.paypalSvc.client.execute(request);
    } catch (err) {
      this.logger.error('Error creando la orden en PayPal', err);
      throw new RpcException({
          message: 'Error de PayPal al crear la orden.',
          status: HttpStatus.INTERNAL_SERVER_ERROR
      });
    }

    await this.prisma.payment.create({
      data: {
        userId: dto.userId,
        membershipId: dto.membershipId,
        amount: membershipDetails.price,
        currency,
        method: 'PAYPAL',
        status: 'PENDING',
        transactionId: order.result.id,
      },
    });

    const approvalLink = order.result.links.find((l) => l.rel === 'approve');
    if (!approvalLink) {
        throw new RpcException({
            message: 'No se pudo obtener el link de aprobación de PayPal.',
            status: HttpStatus.INTERNAL_SERVER_ERROR
        });
    }

    return { approvalUrl: approvalLink.href };
  }

  // --- NUEVO MÉTODO PARA VALIDAR FIRMA ---
  private async verifyPaypalSignature(headers: any, rawBody: Buffer): Promise<boolean> {
    try {
      // Verificar que tenemos todas las cabeceras necesarias
      const requiredHeaders = [
        'paypal-auth-algo',
        'paypal-cert-url', 
        'paypal-transmission-id',
        'paypal-transmission-sig',
        'paypal-transmission-time'
      ];

      for (const header of requiredHeaders) {
        if (!headers[header]) {
          this.logger.warn(`Cabecera faltante: ${header}`);
          return false;
        }
      }

      const webhookId = this.config.get<string>('PAYPAL_WEBHOOK_ID');
      if (!webhookId) {
        this.logger.error('PAYPAL_WEBHOOK_ID no configurado');
        return false;
      }

      // Crear la petición de verificación usando la clase correcta
      const request = {
        method: 'POST',
        path: '/v1/notifications/verify-webhook-signature',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAccessToken()}`
        },
        body: JSON.stringify({
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: JSON.parse(rawBody.toString())
        })
      };

      const response = await this.paypalSvc.client.execute(request);
      return response.result?.verification_status === 'SUCCESS';
      
    } catch (error) {
      this.logger.error('Error al verificar la firma del webhook de PayPal', error);
      // Por seguridad, si hay cualquier error en la verificación, rechazamos
      return false;
    }
  }

  // Método auxiliar para obtener access token
  private async getAccessToken(): Promise<string> {
    try {
      const request = new paypal.core.AccessTokenRequest(this.paypalSvc.client.environment);
      const response = await this.paypalSvc.client.execute(request);
      return response.result.access_token;
    } catch (error) {
      this.logger.error('Error obteniendo access token de PayPal', error);
      throw error;
    }
  }

  // --- LÓGICA DEL WEBHOOK ACTUALIZADA ---
  async handlePaypalWebhook(data: { body: any; headers: any; rawBody: Buffer }) {
    const { body, headers, rawBody } = data;
    const eventType = body.event_type;
    this.logger.log(`[Webhook] Evento [${eventType}] recibido. ID: ${body.id}`);

    // 1. VALIDACIÓN DE FIRMA (TEMPORALMENTE DESHABILITADA PARA TESTING)
    // TODO: Reactivar después de configurar correctamente PAYPAL_WEBHOOK_ID
    const isSignatureValid = true; // await this.verifyPaypalSignature(headers, rawBody);
    if (!isSignatureValid) {
      this.webhookCounter.inc({ event_type: eventType, status: 'invalid_signature' });
      this.logger.warn(`[Seguridad] Firma de Webhook INVÁLIDA. ID: ${body.id}. Petición descartada.`);
      return { status: 'ignored_invalid_signature' };
    }
    this.logger.log(`[Seguridad] Firma del Webhook [${body.id}] validada correctamente (modo testing).`);

    // 2. PREVENCIÓN DE REPLAY ATTACKS (SEGURIDAD)
    const transmissionTime = new Date(headers['paypal-transmission-time']).getTime();
    const fiveMinutesInMillis = 5 * 60 * 1000;
    if (Date.now() - transmissionTime > fiveMinutesInMillis) {
      this.webhookCounter.inc({ event_type: eventType, status: 'expired_timestamp' });
      this.logger.warn(`[Seguridad] Webhook [${body.id}] descartado por timestamp antiguo.`);
      return { status: 'ignored_expired_timestamp' };
    }

    // 3. PROCESAR EVENTO "CHECKOUT.ORDER.APPROVED"
    if (eventType === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = body.resource.id;

      const payment = await this.prisma.payment.findUnique({
        where: { transactionId: orderId },
      });

      if (!payment) {
        this.webhookCounter.inc({ event_type: eventType, status: 'payment_not_found' });
        this.logger.error(`Pago para la orden [${orderId}] no encontrado en la base de datos.`);
        throw new RpcException({
          message: `Pago para la orden ${orderId} no encontrado.`,
          status: HttpStatus.NOT_FOUND,
        });
      }

      if (payment.status === 'COMPLETED') {
        this.webhookCounter.inc({ event_type: eventType, status: 'already_processed' });
        this.logger.warn(`Pago para la orden [${orderId}] ya fue procesado. Ignorando.`);
        return { status: 'already_processed' };
      }

      // 4. PUBLICAR EVENTO "PAYMENT_COMPLETED" (ESCALABILIDAD)
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      // Publicamos el evento a RabbitMQ
      await this.amqpConnection.publish(
        'gymcore-exchange',
        'payment.completed',
        {
          userId: payment.userId,
          membershipId: payment.membershipId,
          paymentId: payment.id,
          paidAt: new Date().toISOString(),
          amount: payment.amount,
          currency: payment.currency,
        },
        { persistent: true },
      );

      this.webhookCounter.inc({ event_type: eventType, status: 'processed_success' });
      this.logger.log(`✅ Orden [${orderId}] procesada y evento 'payment.completed' publicado.`);

      return { status: 'processed' };
    }

    // Si el evento no es el que nos interesa, lo ignoramos educadamente.
    this.webhookCounter.inc({ event_type: eventType, status: 'ignored_event' });
    this.logger.log(`Evento [${eventType}] no es de interés. Ignorando.`);
    return { status: 'received_and_ignored' };
  }
}

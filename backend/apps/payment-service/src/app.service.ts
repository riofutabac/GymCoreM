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
import { randomBytes } from 'crypto';
// Usamos fetch nativo de Node.js 18+

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
    // Constructor limpio sin logs
    register.setDefaultLabels({ service: 'payment-service' });
  }

  getHello(): string {
    return 'Payment Service is running!';
  }

  async createCheckoutSession(dto: CreateCheckoutDto) {
    const membershipDetails = await firstValueFrom(
      this.gymClient.send<MembershipDetails>({ cmd: 'get_membership_details' }, { membershipId: dto.membershipId }),
    ).catch((err) => {
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

    let order: any;
    try {
      order = await this.paypalSvc.client.execute(request);
    } catch (err) {
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

  async createSaleCheckout(payload: { saleId: string; amount: number }) {
    const amount = payload.amount.toFixed(2);
    const currency = 'USD';
    const frontendUrl = this.config.get<string>('FRONTEND_URL');

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: `POS Sale ${payload.saleId}`,
          amount: { currency_code: currency, value: amount },
          custom_id: payload.saleId,
        },
      ],
      application_context: {
        return_url: `${frontendUrl}/pos/success`,
        cancel_url: `${frontendUrl}/pos/cancelled`,
        brand_name: 'GymCore POS',
        user_action: 'PAY_NOW',
      },
    });

    let order: any;
    try {
      order = await this.paypalSvc.client.execute(request);
    } catch (err) {
      throw new RpcException({
        message: 'Error de PayPal al crear la orden.',
        status: HttpStatus.INTERNAL_SERVER_ERROR
      });
    }

    // Guardar el pago en la base de datos
    await this.prisma.payment.create({
      data: {
        userId: null, // Para ventas POS no hay userId específico
        membershipId: null,
        saleId: payload.saleId, // Nueva columna para ventas POS
        amount: payload.amount,
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

  // --- VERIFICACIÓN DE FIRMA MANUAL CON FETCH ---
  private async verifyPaypalSignature(
    headers: Record<string, string>,
    rawBody: string
  ): Promise<boolean> {
    try {
      // 1) Validar que tenemos todas las cabeceras necesarias
      const requiredHeaders = [
        'paypal-transmission-id',
        'paypal-transmission-time',
        'paypal-cert-url',
        'paypal-auth-algo',
        'paypal-transmission-sig'
      ];

      for (const header of requiredHeaders) {
        if (!headers[header]) {
          return false;
        }
      }

      // 2) Obtener access token usando el SDK
      const accessTokenRequest = new paypal.core.AccessTokenRequest(this.paypalSvc.client.environment);
      const accessTokenResponse: any = await this.paypalSvc.client.execute(accessTokenRequest);
      const accessToken = accessTokenResponse.result.access_token;

      // 3) Verificar que tenemos el webhook ID configurado
      const webhookId = this.config.get<string>('PAYPAL_WEBHOOK_ID');
      if (!webhookId) {
        return false;
      }

      // 4) Determinar la URL de la API de PayPal
      const paypalApiUrl = this.config.get<string>('PAYPAL_API') || 'https://api-m.sandbox.paypal.com';

      // 5) Llamada manual a la API de verificación
      const response = await fetch(
        `${paypalApiUrl}/v1/notifications/verify-webhook-signature`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            transmission_id: headers['paypal-transmission-id'],
            transmission_time: headers['paypal-transmission-time'],
            cert_url: headers['paypal-cert-url'],
            auth_algo: headers['paypal-auth-algo'],
            transmission_sig: headers['paypal-transmission-sig'],
            webhook_id: webhookId,
            webhook_event: JSON.parse(rawBody),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json() as { message?: string; details?: any };
        return false;
      }

      const responseData = await response.json() as { verification_status: string };
      const { verification_status } = responseData;
      return verification_status === 'SUCCESS';
      
    } catch (error) {
      // Por seguridad, si hay cualquier error en la verificación, rechazamos
      return false;
    }
  }

  // --- LÓGICA DEL WEBHOOK SIMPLIFICADA ---
  async handlePaypalWebhook(data: { body: any; headers: any; rawBody: string }) {
    const { body, headers, rawBody } = data;
    const eventType = body.event_type;
    this.logger.log(`[Webhook] Evento ${eventType} recibido. ID: ${body.id}`);

    // 1. VALIDACIÓN DE FIRMA (CONFIGURABLE VÍA ENV)
    const skipSignatureCheck = this.config.get<string>('PAYPAL_SKIP_SIGNATURE') === 'true';
    let isSignatureValid = true;
    
    if (!skipSignatureCheck) {
      isSignatureValid = await this.verifyPaypalSignature(headers, rawBody);
      this.logger.log(`[Seguridad] Verificación de firma: ${isSignatureValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
    } else {
      this.logger.warn('[Seguridad] Verificación de firma OMITIDA (PAYPAL_SKIP_SIGNATURE=true)');
    }
    
    if (!isSignatureValid) {
      this.webhookCounter.inc({ event_type: eventType, status: 'invalid_signature' });
      this.logger.warn(`[Seguridad] Firma de Webhook INVÁLIDA. ID: ${body.id}. Petición descartada.`);
      return { status: 'ignored_invalid_signature' };
    }

    // 2. PREVENCIÓN DE REPLAY ATTACKS (SEGURIDAD)
    const transmissionTime = Date.parse(headers['paypal-transmission-time']);
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

      // 4. ACTUALIZAR PAGO Y PUBLICAR EVENTO
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      // Determinar el tipo de evento a publicar basado en el tipo de pago
      if (payment.saleId) {
        // Es una venta POS
        await this.amqpConnection.publish(
          'gymcore-exchange',
          'sale.completed',
          {
            saleId: payment.saleId,
            paymentId: payment.id,
            paidAt: new Date().toISOString(),
            amount: payment.amount,
            currency: payment.currency,
          },
          { persistent: true },
        );

        // --- EVENTO ADICIONAL PARA ANALYTICS CON ESTRUCTURA ESTÁNDAR ---
        const analyticsPayload = {
          paymentId: payment.id,
          amount: payment.amount,
          paymentMethod: 'PAYPAL',
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
          source: 'POS',
        };

        await this.amqpConnection.publish(
          'gymcore-exchange',
          'payment.completed',
          analyticsPayload,
          { persistent: true }
        );

        this.logger.log(`✅ Venta POS [${payment.saleId}] procesada y evento 'sale.completed' publicado.`);
        this.logger.log(`✅ Evento 'payment.completed' para analytics emitido por $${payment.amount} (PayPal POS)`);
      } else {
        // Es una membresía - enviar UN SOLO evento con toda la información necesaria
        await this.amqpConnection.publish(
          'gymcore-exchange',
          'payment.completed',
          {
            userId: payment.userId,
            membershipId: payment.membershipId, // ¡CLAVE! Esto marca que es una membresía
            paymentId: payment.id,
            paidAt: new Date().toISOString(),
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: 'PAYPAL',
            status: 'COMPLETED',
            timestamp: new Date().toISOString(),
            source: 'MEMBERSHIP',
          },
          { persistent: true },
        );

        this.logger.log(`✅ Membresía [${payment.membershipId}] procesada y evento 'payment.completed' publicado por $${payment.amount}`);
      }

      this.webhookCounter.inc({ event_type: eventType, status: 'processed_success' });

      return { status: 'processed' };
    }

    // Si el evento no es el que nos interesa, lo ignoramos educadamente.
    this.webhookCounter.inc({ event_type: eventType, status: 'ignored_event' });
    this.logger.log(`Evento [${eventType}] no es de interés. Ignorando.`);
    return { status: 'received_and_ignored' };
  }

  async getLastPendingPayment() {
    return this.prisma.payment.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createManualPayment(payload: {
    userId: string;
    membershipId: string;
    amount: number;
    method: string;
    reason?: string;
    activatedBy: string;
  }) {
    this.logger.log(`Creando registro de pago manual para membresía ${payload.membershipId}`);
    
    try {
      // Generar un transactionId más limpio y profesional
      const randomPart = randomBytes(6).toString('hex').toUpperCase(); // Genera 12 caracteres aleatorios
      const transactionId = `MANUAL-${randomPart}`; // Ejemplo: MANUAL-A1B2C3D4E5F6
      
      const payment = await this.prisma.payment.create({
        data: {
          userId: payload.userId,
          membershipId: payload.membershipId,
          amount: payload.amount,
          currency: 'USD',
          method: 'CASH',
          status: 'COMPLETED',
          completedAt: new Date(),
          transactionId: transactionId,
        },
      });

      this.logger.log(`Pago manual registrado: ${payment.id} por $${payment.amount}`);
      
      // NO publicar payment.completed para membresías manuales
      // Analytics Service ya procesa estos pagos via membership.activated.manually
    } catch (error) {
      this.logger.error(`❌ Error creando pago manual para membresía ${payload.membershipId}`, error);
      // Re-lanzar el error para que RabbitMQ pueda manejarlo (e.g., Dead Letter Queue)
      throw error;
    }
  }

  /**
   * Obtiene los ingresos totales en efectivo de un gimnasio específico en un rango de fechas
   * Incluye: membresías pagadas en efectivo + ventas POS en efectivo
   */
  async getCashRevenueForGym(gymId: string, startOfMonth: string, endOfMonth: string): Promise<{ totalCashRevenue: number }> {
    this.logger.log(`Calculando ingresos totales en efectivo para gym ${gymId} desde ${startOfMonth} hasta ${endOfMonth}`);

    try {
      // Obtener todos los pagos en efectivo completados en el rango de fechas
      const cashPayments = await this.prisma.payment.findMany({
        where: {
          method: 'CASH',
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(startOfMonth),
            lte: new Date(endOfMonth),
          },
        },
        select: {
          id: true,
          amount: true,
          membershipId: true,
          userId: true,
          completedAt: true,
        },
      });

      this.logger.log(`Encontrados ${cashPayments.length} pagos en efectivo en el período (membresías + POS)`);

      // Filtrar pagos que pertenecen al gimnasio específico
      let totalCashRevenue = 0;
      
      for (const payment of cashPayments) {
        try {
          // Si tiene membershipId, verificar que la membresía pertenece al gimnasio
          if (payment.membershipId) {
            const membershipInfo = await firstValueFrom(
              this.gymClient.send({ cmd: 'get_membership_gym' }, { membershipId: payment.membershipId })
            );
            
            if (membershipInfo?.gymId === gymId) {
              totalCashRevenue += payment.amount;
              this.logger.log(`Pago de membresía $${payment.amount} incluido para gym ${gymId}`);
            }
          }
          // Si tiene userId pero no membershipId, podría ser venta POS (userId = gymId) o usuario normal
          else if (payment.userId) {
            // Si el userId coincide con el gymId, es una venta POS
            if (payment.userId === gymId) {
              totalCashRevenue += payment.amount;
              this.logger.log(`Pago POS en efectivo $${payment.amount} incluido para gym ${gymId}`);
            } else {
              // Es un usuario normal, verificar que pertenece al gimnasio
              const userInfo = await firstValueFrom(
                this.gymClient.send({ cmd: 'get_user_gym' }, { userId: payment.userId })
              );
              
              if (userInfo?.gymId === gymId) {
                totalCashRevenue += payment.amount;
                this.logger.log(`Pago de usuario $${payment.amount} incluido para gym ${gymId}`);
              }
            }
          }
        } catch (error) {
          this.logger.warn(`Error verificando pago ${payment.id}:`, error);
          // Continuar con el siguiente pago
        }
      }

      this.logger.log(`Total ingresos en efectivo calculados para gym ${gymId}: $${totalCashRevenue} (membresías + POS)`);
      return { totalCashRevenue };

    } catch (error) {
      this.logger.error(`Error calculando ingresos en efectivo para gym ${gymId}:`, error);
      return { totalCashRevenue: 0 };
    }
  }

  /**
   * Crear un registro de Payment desde una venta POS (inventory-service)
   */
  async createPaymentFromPOSSale(eventData: any) {
    try {
      this.logger.log(`Creando registro de Payment desde venta POS: ${JSON.stringify(eventData)}`);

      // Validar que tenemos los datos necesarios
      if (!eventData.saleId || !eventData.amount || !eventData.paymentMethod || !eventData.gymId) {
        this.logger.error('Datos insuficientes en evento POS:', eventData);
        return;
      }

      // Verificar si ya existe un Payment para esta venta
      const existingPayment = await this.prisma.payment.findFirst({
        where: {
          saleId: eventData.saleId,
        },
      });

      if (existingPayment) {
        this.logger.log(`Payment ya existe para venta POS ${eventData.saleId}, omitiendo`);
        return;
      }

      // Crear el registro de Payment
      const payment = await this.prisma.payment.create({
        data: {
          amount: eventData.amount,
          method: eventData.paymentMethod, // 'CASH', 'CARD_PRESENT', etc.
          status: 'COMPLETED',
          completedAt: new Date(),
          transactionId: `POS-${eventData.saleId}`, // Referencia única para ventas POS
          saleId: eventData.saleId, // ID de la venta POS
          userId: eventData.gymId, // Usaremos userId para almacenar gymId para ventas POS
          membershipId: null, // Las ventas POS no tienen membershipId
        },
      });

      this.logger.log(`✅ Payment creado para venta POS: ${payment.id} (${payment.method}) por $${payment.amount}`);
      
      return payment;

    } catch (error) {
      this.logger.error('Error creando Payment desde venta POS:', error);
      throw error;
    }
  }
}

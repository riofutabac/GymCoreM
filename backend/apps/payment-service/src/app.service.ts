import { Injectable, Inject, HttpStatus, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { PaypalService } from './paypal/paypal.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import * as paypal from '@paypal/checkout-server-sdk';
import { firstValueFrom } from 'rxjs';

// Define una interfaz para la respuesta que esperas
interface MembershipDetails {
  id: string;
  name: string;
  price: number;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paypalSvc: PaypalService,
    private readonly config: ConfigService,
    @Inject('GYM_SERVICE') private readonly gymClient: ClientProxy,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  getHello(): string {
    return 'Payment Service is running!';
  }

  async createCheckoutSession(dto: CreateCheckoutDto) {
    this.logger.log(`Iniciando checkout para membresía ${dto.membershipId}`);

    // AQUÍ ESTÁ EL CAMBIO: Añade <MembershipDetails> para tipar la respuesta
    const membershipDetails = await firstValueFrom(
      this.gymClient.send<MembershipDetails>({ cmd: 'get_membership_details' }, { membershipId: dto.membershipId }),
    ).catch((err) => {
      this.logger.error(`Error al obtener detalles de la membresía: ${dto.membershipId}`, err);
      throw new RpcException({
        message: 'Membresía no válida o el servicio de gimnasios no responde.',
        status: HttpStatus.BAD_REQUEST
      });
    });

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

    let order: paypal.orders.OrdersGetResponse;
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

  async handlePaypalWebhook(payload: any, signature: string) {
    this.logger.log(`Webhook recibido: ${payload.event_type}`);
    if (payload.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = payload.resource.id;
      const payment = await this.prisma.payment.findUnique({
        where: { transactionId: orderId },
      });

      if (!payment || payment.status === 'COMPLETED') {
        this.logger.warn(`Pago no encontrado o ya procesado para la orden ${orderId}`);
        return { status: 'ignored' };
      }

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      this.logger.log(`Pago de la orden ${orderId} actualizado a COMPLETED.`);

      await this.amqpConnection.publish('gymcore-exchange', 'membership.paid', {
        userId: payment.userId,
        membershipId: payment.membershipId,
        paidAt: new Date().toISOString(),
      });
    }

    return { status: 'received' };
  }
}

import { Injectable, Inject, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { PaypalService } from './paypal/paypal.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import * as paypal from '@paypal/checkout-server-sdk';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paypalSvc: PaypalService,
    private readonly config: ConfigService,
    @Inject('GYM_SERVICE') private readonly gymClient: ClientProxy,
  ) {}

  getHello(): string {
    return 'Payment Service is running!';
  }

  async createCheckoutSession(dto: CreateCheckoutDto) {
    this.logger.log(`Iniciando checkout para membresía ${dto.membershipId}`);

    const membershipDetails = await firstValueFrom(
      this.gymClient.send({ cmd: 'get_membership_details' }, { membershipId: dto.membershipId }),
    ).catch((err) => {
      this.logger.error(`Membresía no encontrada: ${dto.membershipId}`, err);
      throw new HttpException('Membresía no válida', HttpStatus.BAD_REQUEST);
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
      throw new HttpException('Error de PayPal', HttpStatus.INTERNAL_SERVER_ERROR);
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
      throw new HttpException('Link de aprobación no encontrado', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return { approvalUrl: approvalLink.href };
  }

  async handlePaypalWebhook(payload: any, signature: string) {
    this.logger.log(`Webhook recibido: ${payload.event_type}`);
    // TODO: validar firma y actualizar estado
    return { status: 'received' };
  }
}

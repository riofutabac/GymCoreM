import { Injectable } from '@nestjs/common';
import * as paypal from '@paypal/checkout-server-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  private paypalClient: paypal.core.PayPalHttpClient;

  constructor(private config: ConfigService) {
    const clientId = this.config.get<string>('PAYPAL_CLIENT_ID') ?? '';
    const clientSecret = this.config.get<string>('PAYPAL_CLIENT_SECRET') ?? '';
    const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
    this.paypalClient = new paypal.core.PayPalHttpClient(environment);
  }

  async createCheckoutSession(amount: number, membershipId: string) {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      throw new Error('Invalid amount provided');
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount.toFixed(2),
          },
          custom_id: membershipId,
        },
      ],
    });
    const response = await this.paypalClient.execute(request);
    return response.result;
  }
}

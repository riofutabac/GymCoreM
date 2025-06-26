import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as paypal from '@paypal/checkout-server-sdk';

@Injectable()
export class PaypalService {
  public readonly client: paypal.core.PayPalHttpClient;

  constructor(private config: ConfigService) {
    const clientId = this.config.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.config.get<string>('PAYPAL_CLIENT_SECRET');
    const mode = this.config.get<'sandbox' | 'live'>('PAYPAL_MODE');

    if (!clientId || !clientSecret) {
      throw new HttpException('Credenciales de PayPal no configuradas.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const environment = mode === 'live'
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret);

    this.client = new paypal.core.PayPalHttpClient(environment);
  }
}
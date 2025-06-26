import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @MessagePattern({ cmd: 'create_checkout_session' })
  async createCheckoutSession(data: { amount: number; membershipId: string }) {
    return this.paymentsService.createCheckoutSession(
      data.amount,
      data.membershipId,
    );
  }
}

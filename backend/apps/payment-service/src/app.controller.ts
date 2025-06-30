import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

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

  @MessagePattern({ cmd: 'handle_paypal_webhook' })
  handleWebhook(@Payload() payload: { body: any; signature: string }) {
    return this.appService.handlePaypalWebhook(payload.body, payload.signature);
  }

  @Post('paypal/webhook')
  handleWebhookHttp(
    @Body() body: any,
    @Headers('paypal-transmission-sig') signature: string,
  ) {
    return this.appService.handlePaypalWebhook(body, signature);
  }
}

import { Controller, Get } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @MessagePattern({ cmd: 'export_sales_report' })
  async exportSalesReport(@Payload() payload: { managerId: string }) {
    return this.appService.exportSalesReport(payload.managerId);
  }
}

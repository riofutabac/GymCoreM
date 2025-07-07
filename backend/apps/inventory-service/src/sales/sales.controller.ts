import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Controller()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @MessagePattern({ cmd: 'sales_create' })
  create(@Payload() createSaleDto: CreateSaleDto) {
    return this.salesService.createSale(createSaleDto);
  }

  @MessagePattern({ cmd: 'sales_findOne' })
  findOne(@Payload() payload: { id: string; gymId: string }) {
    return this.salesService.findOne(payload.id, payload.gymId);
  }

  @MessagePattern({ cmd: 'sales_findAll' })
  findAll(@Payload() payload: { gymId: string }) {
    return this.salesService.findAll(payload.gymId);
  }
}
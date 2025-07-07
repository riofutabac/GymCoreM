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

  @MessagePattern({ cmd: 'sales_create_cash' })
  createCash(@Payload() createSaleDto: CreateSaleDto) {
    return this.salesService.createInstantSale(createSaleDto, 'CASH');
  }

  @MessagePattern({ cmd: 'sales_create_card_present' })
  createCardPresent(@Payload() createSaleDto: CreateSaleDto) {
    return this.salesService.createInstantSale(createSaleDto, 'CARD_PRESENT');
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
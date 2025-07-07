import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @MessagePattern({ cmd: 'products_create' })
  create(@Payload() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @MessagePattern({ cmd: 'products_findAll' })
  findAll(@Payload() payload: { gymId: string | null }) {
    return this.productsService.findAll(payload.gymId);
  }

  @MessagePattern({ cmd: 'products_findOne' })
  findOne(@Payload() payload: { id: string; gymId: string }) {
    return this.productsService.findOne(payload.id, payload.gymId);
  }

  @MessagePattern({ cmd: 'products_find_by_barcode' })
  findByBarcode(@Payload() payload: { barcode: string; gymId: string }) {
    return this.productsService.findByBarcode(payload.barcode, payload.gymId);
  }

  @MessagePattern({ cmd: 'products_update' })
  update(@Payload() payload: { id: string; updateProductDto: UpdateProductDto; gymId: string }) {
    return this.productsService.update(payload.id, payload.updateProductDto, payload.gymId);
  }

  @MessagePattern({ cmd: 'products_remove' })
  remove(@Payload() payload: { id: string; gymId: string }) {
    return this.productsService.remove(payload.id, payload.gymId);
  }
}
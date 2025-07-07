import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller()
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);
  
  constructor(private readonly productsService: ProductsService) {}

  @MessagePattern({ cmd: 'products_create' })
  async create(@Payload() createProductDto: CreateProductDto) {
    try {
      this.logger.log(`Creating product: ${createProductDto.name} for gym: ${createProductDto.gymId}`);
      const result = await this.productsService.create(createProductDto);
      this.logger.log(`Product created successfully: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error creating product: ${error.message}`, error.stack);
      throw error;
    }
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
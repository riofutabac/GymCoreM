import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    // Validar que no existe un producto con el mismo barcode
    const exists = await this.prisma.product.findFirst({
      where: { 
        barcode: createProductDto.barcode, 
        gymId: createProductDto.gymId, 
        deletedAt: null 
      },
    });
    
    if (exists) {
      throw new ConflictException('Barcode already exists');
    }

    const product = await this.prisma.product.create({
      data: createProductDto,
    });

    return new ProductDto(product);
  }

  async findAll(gymId: string | null) {
    const whereClause: any = {
      deletedAt: null,
    };
    
    // Si gymId es null, es un OWNER que puede ver todos los productos
    if (gymId !== null) {
      whereClause.gymId = gymId;
    }
    
    const products = await this.prisma.product.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return products.map(product => new ProductDto(product));
  }

  async findOne(id: string, gymId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        gymId,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return new ProductDto(product);
  }

  async findByBarcode(barcode: string, gymId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        barcode,
        gymId,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with barcode ${barcode} not found`);
    }

    return new ProductDto(product);
  }

  async update(id: string, updateProductDto: UpdateProductDto, gymId: string) {
    const product = await this.findOne(id, gymId);
    
    // Si se está actualizando el barcode, verificar que no exista otro producto con ese barcode
    if (updateProductDto.barcode && updateProductDto.barcode !== product.barcode) {
      const existsBarcode = await this.prisma.product.findFirst({
        where: {
          barcode: updateProductDto.barcode,
          gymId,
          deletedAt: null,
          id: { not: id },
        },
      });
      
      if (existsBarcode) {
        throw new ConflictException('Barcode already exists');
      }
    }
    
    const updatedProduct = await this.prisma.product.update({
      where: {
        id_version: {
          id: product.id,
          version: product.version,
        },
      },
      data: {
        ...updateProductDto,
        version: {
          increment: 1,
        },
      },
    });

    return new ProductDto(updatedProduct);
  }

  async remove(id: string, gymId: string) {
    const product = await this.findOne(id, gymId);
    
    const deletedProduct = await this.prisma.product.update({
      where: {
        id_version: {
          id: product.id,
          version: product.version,
        },
      },
      data: {
        deletedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    return new ProductDto(deletedProduct);
  }
}
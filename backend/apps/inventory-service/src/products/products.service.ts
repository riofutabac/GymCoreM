import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: createProductDto,
    });
  }

  async findAll(gymId: string) {
    return this.prisma.product.findMany({
      where: {
        gymId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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

    return product;
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

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, gymId: string) {
    const product = await this.findOne(id, gymId);
    
    return this.prisma.product.update({
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
  }

  async remove(id: string, gymId: string) {
    const product = await this.findOne(id, gymId);
    
    return this.prisma.product.update({
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
  }
}
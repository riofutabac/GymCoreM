import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async createSale(dto: CreateSaleDto) {
    this.logger.log(`Creating sale for gym ${dto.gymId}`);

    const sale = await this.prisma.sale.create({
      data: {
        gymId: dto.gymId,
        cashierId: dto.cashierId,
        totalAmount: dto.total,
        items: {
          create: dto.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Publicar evento sale.created
    await this.amqpConnection.publish('gymcore-exchange', 'sale.created', {
      saleId: sale.id,
      amount: sale.totalAmount,
      description: `POS sale ${sale.id}`,
    });

    this.logger.log(`Sale created: ${sale.id}`);
    return sale;
  }

  async findOne(id: string, gymId: string) {
    return this.prisma.sale.findFirst({
      where: {
        id,
        gymId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findAll(gymId: string) {
    return this.prisma.sale.findMany({
      where: {
        gymId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
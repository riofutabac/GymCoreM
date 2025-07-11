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
        paymentType: 'PAYPAL', // Para ventas PayPal asíncronas
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

  async createInstantSale(dto: CreateSaleDto, paymentType: 'CASH' | 'CARD_PRESENT') {
    this.logger.log(`Creating instant ${paymentType} sale for gym ${dto.gymId}`);

    return this.prisma.$transaction(async (tx) => {
      // 1. Descontar stock con optimistic locking
      for (const item of dto.items) {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: item.productId },
          select: { id: true, name: true, stock: true, version: true }
        });

        if (product.stock < item.quantity) {
          throw new Error(`Stock insuficiente para el producto ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}`);
        }

        // Actualizar stock con optimistic locking
        const updatedProduct = await tx.product.updateMany({
          where: {
            id: product.id,
            version: product.version, // Optimistic locking
          },
          data: {
            stock: { decrement: item.quantity },
            version: { increment: 1 },
          },
        });

        if (updatedProduct.count === 0) {
          throw new Error(`Error de concurrencia al actualizar stock del producto ${product.name}. Intente nuevamente.`);
        }
      }

      // 2. Crear venta como COMPLETED
      const sale = await tx.sale.create({
        data: {
          gymId: dto.gymId,
          cashierId: dto.cashierId,
          totalAmount: dto.total,
          paymentType,
          status: 'COMPLETED',
          completedAt: new Date(),
          paymentRef: dto.paymentRef || null,
          items: {
            create: dto.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      this.logger.log(`Instant ${paymentType} sale completed: ${sale.id}`);
      return sale;
    }).then(async (sale) => {
      // 3. Publicar evento para analytics (evento estándar payment.completed)
      const paymentCompletedPayload = {
        saleId: sale.id,
        amount: sale.totalAmount,
        paymentMethod: paymentType,
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
        source: 'POS',
      };

      await this.amqpConnection.publish(
        'gymcore-exchange', 
        'payment.completed', // Evento estándar que escucha analytics-service
        paymentCompletedPayload,
        { persistent: true }
      );

      this.logger.log(`✅ Evento 'payment.completed' emitido por venta POS #${sale.id} por $${sale.totalAmount} (${paymentType})`);

      // También mantener el evento específico para otros consumidores
      await this.amqpConnection.publish('gymcore-exchange', 'sale.completed', {
        saleId: sale.id,
        amount: sale.totalAmount,
        paymentType,
        description: `Instant ${paymentType} sale ${sale.id}`,
      });

      return sale;
    });
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
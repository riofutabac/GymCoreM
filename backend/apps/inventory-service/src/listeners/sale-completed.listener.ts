import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SaleCompletedListener {
  private readonly logger = new Logger(SaleCompletedListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'sale.completed',
    queue: 'inventory.sale.completed',
  })
  async handle(payload: { saleId: string; paymentId: string }) {
    this.logger.log(`Processing sale completion for sale ${payload.saleId}`);

    try {
      await this.prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findUniqueOrThrow({
          where: { id: payload.saleId },
          include: { items: true },
        });

        if (sale.status !== 'PENDING') {
          this.logger.warn(`Sale ${payload.saleId} is not pending, skipping`);
          return; // idempotencia
        }

        for (const item of sale.items) {
          const product = await tx.product.findUniqueOrThrow({
            where: { id: item.productId },
          });

          if (product.stock < item.quantity) {
            throw new Error(`Stock insuficiente para ${product.name}.`);
          }

          /* bloqueo optimista → condición (id,version) */
          await tx.product.update({
            where: { id_version: { id: product.id, version: product.version } },
            data: {
              stock: { decrement: item.quantity },
              version: { increment: 1 },
            },
          });
        }

        await tx.sale.update({
          where: { id: sale.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            paymentRef: payload.paymentId,
          },
        });

        this.logger.log(`Sale ${payload.saleId} completed successfully`);
      }, { maxWait: 5_000, timeout: 10_000 });

      // --- EMITIR EVENTO payment.completed PARA ANALYTICS ---
      const completedSale = await this.prisma.sale.findUnique({
        where: { id: payload.saleId },
        select: { totalAmount: true, paymentType: true }
      });

      if (completedSale) {
        const paymentCompletedPayload = {
          saleId: payload.saleId,
          amount: completedSale.totalAmount,
          paymentMethod: completedSale.paymentType || 'PAYPAL',
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
          source: 'POS',
        };

        await this.amqpConnection.publish(
          'gymcore-exchange',
          'payment.completed',
          paymentCompletedPayload,
          { persistent: true }
        );

        this.logger.log(`✅ Evento 'payment.completed' emitido por venta POS #${payload.saleId} por $${completedSale.totalAmount} (asíncrona)`);
      }
    } catch (error) {
      this.logger.error(`Error processing sale completion for ${payload.saleId}:`, error);
      throw error;
    }
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SaleCompletedListener {
  private readonly logger = new Logger(SaleCompletedListener.name);

  constructor(private readonly prisma: PrismaService) {}

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
    } catch (error) {
      this.logger.error(`Error processing sale completion for ${payload.saleId}:`, error);
      throw error;
    }
  }
}
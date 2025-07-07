import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { CreateSaleDto } from './dto/create-sale.dto';

describe('SalesService', () => {
  let service: SalesService;
  let prisma: PrismaService;
  let amqpConnection: AmqpConnection;

  const mockDto: CreateSaleDto = {
    gymId: 'gym-123',
    cashierId: 'cashier-456',
    items: [
      {
        productId: 'product-1',
        quantity: 2,
        price: 10.50,
      },
      {
        productId: 'product-2',
        quantity: 1,
        price: 25.00,
      },
    ],
    total: 46.00,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            sale: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
            product: {
              findUniqueOrThrow: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: AmqpConnection,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    prisma = module.get<PrismaService>(PrismaService);
    amqpConnection = module.get<AmqpConnection>(AmqpConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInstantSale', () => {
    // PRUEBA 1: Venta en efectivo exitosa
    it('should create an instant CASH sale with COMPLETED status', async () => {
      const mockSale = {
        id: 'sale-123',
        gymId: 'gym-123',
        cashierId: 'cashier-456',
        totalAmount: 46.00,
        paymentType: 'CASH',
        status: 'COMPLETED',
        completedAt: new Date(),
        items: [
          { productId: 'product-1', quantity: 2, price: 10.50 },
          { productId: 'product-2', quantity: 1, price: 25.00 },
        ],
      };

      const mockTx = {
        product: {
          findUniqueOrThrow: jest.fn()
            .mockResolvedValueOnce({ id: 'product-1', name: 'Product 1', stock: 10, version: 1 })
            .mockResolvedValueOnce({ id: 'product-2', name: 'Product 2', stock: 5, version: 1 }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        sale: {
          create: jest.fn().mockResolvedValue(mockSale),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await service.createInstantSale(mockDto, 'CASH');

      // Verificar que se consultó el stock de cada producto
      expect(mockTx.product.findUniqueOrThrow).toHaveBeenCalledTimes(2);
      expect(mockTx.product.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        select: { id: true, name: true, stock: true, version: true },
      });

      // Verificar que se actualizó el stock con optimistic locking
      expect(mockTx.product.updateMany).toHaveBeenCalledTimes(2);
      expect(mockTx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'product-1', version: 1 },
        data: { stock: { decrement: 2 }, version: { increment: 1 } },
      });

      // Verificar que la venta se creó como COMPLETED
      expect(mockTx.sale.create).toHaveBeenCalledWith({
        data: {
          gymId: 'gym-123',
          cashierId: 'cashier-456',
          totalAmount: 46.00,
          paymentType: 'CASH',
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          paymentRef: null,
          items: {
            create: [
              { productId: 'product-1', quantity: 2, price: 10.50 },
              { productId: 'product-2', quantity: 1, price: 25.00 },
            ],
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

      // Verificar que se publicó el evento
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'gymcore-exchange',
        'sale.completed',
        {
          saleId: 'sale-123',
          amount: 46.00,
          paymentType: 'CASH',
          description: 'Instant CASH sale sale-123',
        }
      );

      expect(result).toEqual(mockSale);
    });

    // PRUEBA 2: Venta con tarjeta exitosa con paymentRef
    it('should create an instant CARD_PRESENT sale with paymentRef', async () => {
      const dtoWithRef = { ...mockDto, paymentRef: 'voucher-ABC123' };
      const mockSale = {
        id: 'sale-456',
        paymentType: 'CARD_PRESENT',
        status: 'COMPLETED',
        paymentRef: 'voucher-ABC123',
      };

      const mockTx = {
        product: {
          findUniqueOrThrow: jest.fn()
            .mockResolvedValueOnce({ id: 'product-1', name: 'Product 1', stock: 10, version: 1 })
            .mockResolvedValueOnce({ id: 'product-2', name: 'Product 2', stock: 5, version: 1 }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        sale: {
          create: jest.fn().mockResolvedValue(mockSale),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await service.createInstantSale(dtoWithRef, 'CARD_PRESENT');

      expect(mockTx.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentType: 'CARD_PRESENT',
            paymentRef: 'voucher-ABC123',
            status: 'COMPLETED',
          }),
        })
      );

      expect(result).toEqual(mockSale);
    });

    // PRUEBA 3: Error de stock insuficiente
    it('should throw error if stock is insufficient', async () => {
      const mockTx = {
        product: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'product-1',
            name: 'Test Product',
            stock: 1, // Solo 1 en stock, pero necesitamos 2
            version: 1,
          }),
          updateMany: jest.fn(),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(service.createInstantSale(mockDto, 'CASH')).rejects.toThrow(
        'Stock insuficiente para el producto Test Product. Disponible: 1, Solicitado: 2'
      );

      // Verificar que no se intentó actualizar stock ni crear venta
      expect(mockTx.product.updateMany).not.toHaveBeenCalled();
    });

    // PRUEBA 4: Error de concurrencia (optimistic locking)
    it('should throw error on optimistic locking failure', async () => {
      const mockTx = {
        product: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'product-1',
            name: 'Concurrent Product',
            stock: 10,
            version: 1,
          }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }), // Simula fallo de optimistic lock
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(service.createInstantSale(mockDto, 'CASH')).rejects.toThrow(
        'Error de concurrencia al actualizar stock del producto Concurrent Product. Intente nuevamente.'
      );
    });

    // PRUEBA 5: Verificar rollback en transacción
    it('should rollback transaction if any step fails', async () => {
      const mockTx = {
        product: {
          findUniqueOrThrow: jest.fn()
            .mockResolvedValueOnce({ id: 'product-1', name: 'Product 1', stock: 10, version: 1 })
            .mockRejectedValueOnce(new Error('Product not found')), // Falla en segundo producto
          updateMany: jest.fn().mockResolvedValue({ count: 0 }), // Simular que no se actualizó nada
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(service.createInstantSale(mockDto, 'CASH')).rejects.toThrow('Product not found');

      // Verificar que no se publicó evento
      expect(amqpConnection.publish).not.toHaveBeenCalled();
    });
  });

  describe('createSale (PayPal flow)', () => {
    // PRUEBA 6: Venta PayPal pendiente
    it('should create PayPal sale with PENDING status', async () => {
      const mockSale = {
        id: 'sale-paypal-123',
        status: 'PENDING',
        paymentType: 'PAYPAL',
        totalAmount: 46.00, // Agregar el campo que necesita el servicio
      };

      (prisma.sale.create as jest.Mock).mockResolvedValue(mockSale);

      const result = await service.createSale(mockDto);

      expect(prisma.sale.create).toHaveBeenCalledWith({
        data: {
          gymId: 'gym-123',
          cashierId: 'cashier-456',
          totalAmount: 46.00,
          paymentType: 'PAYPAL',
          items: {
            create: [
              { productId: 'product-1', quantity: 2, price: 10.50 },
              { productId: 'product-2', quantity: 1, price: 25.00 },
            ],
          },
        },
        include: {
          items: true,
        },
      });

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'gymcore-exchange',
        'sale.created',
        {
          saleId: 'sale-paypal-123',
          amount: 46.00,
          description: 'POS sale sale-paypal-123',
        }
      );

      expect(result).toEqual(mockSale);
    });
  });

  describe('findOne', () => {
    it('should return sale by id and gymId', async () => {
      const mockSale = { id: 'sale-123', gymId: 'gym-123' };
      (prisma.sale.findFirst as jest.Mock).mockResolvedValue(mockSale);

      const result = await service.findOne('sale-123', 'gym-123');

      expect(prisma.sale.findFirst).toHaveBeenCalledWith({
        where: { id: 'sale-123', gymId: 'gym-123' },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      expect(result).toEqual(mockSale);
    });
  });

  describe('findAll', () => {
    it('should return all sales for a gym', async () => {
      const mockSales = [
        { id: 'sale-1', gymId: 'gym-123' },
        { id: 'sale-2', gymId: 'gym-123' },
      ];
      (prisma.sale.findMany as jest.Mock).mockResolvedValue(mockSales);

      const result = await service.findAll('gym-123');

      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: { gymId: 'gym-123' },
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

      expect(result).toEqual(mockSales);
    });
  });
});

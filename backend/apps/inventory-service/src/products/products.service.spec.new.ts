import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockProduct = {
    id: 'prod-1',
    name: 'Test Product',
    price: 10,
    stock: 100,
    barcode: '12345',
    version: 1,
    gymId: 'gym-1',
    deletedAt: null,
  };

  const mockPrismaService = {
    product: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const dto: CreateProductDto = {
        name: 'New Drink',
        price: 2.5,
        stock: 50,
        barcode: '67890',
        gymId: 'gym-1',
      };
      (mockPrismaService.product.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (mockPrismaService.product.create as jest.Mock).mockResolvedValue({
        ...mockProduct,
        ...dto,
      });

      const result = await service.create(dto);

      expect(mockPrismaService.product.create).toHaveBeenCalledWith({
        data: dto,
      });
      expect(result.name).toBe('New Drink');
    });

    it('should throw ConflictException if barcode already exists in the same gym', async () => {
      const dto: CreateProductDto = {
        name: 'New Drink',
        price: 2.5,
        stock: 50,
        barcode: '12345',
        gymId: 'gym-1',
      };
      (mockPrismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a product using optimistic locking', async () => {
      const updateDto = { name: 'Updated Product Name' };
      (mockPrismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );
      (mockPrismaService.product.update as jest.Mock).mockResolvedValue({
        ...mockProduct,
        ...updateDto,
        version: 2,
      });

      const result = await service.update('prod-1', updateDto, 'gym-1');

      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id_version: { id: 'prod-1', version: 1 } },
        data: { ...updateDto, version: { increment: 1 } },
      });
      expect(result.version).toBe(2);
    });

    it('should throw NotFoundException if product to update is not found', async () => {
      (mockPrismaService.product.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(
        service.update('prod-nonexistent', {}, 'gym-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft-delete a product by setting deletedAt', async () => {
      (mockPrismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );
      (mockPrismaService.product.update as jest.Mock).mockResolvedValue({
        ...mockProduct,
        deletedAt: new Date(),
      });

      await service.remove('prod-1', 'gym-1');

      expect(mockPrismaService.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return products for a specific gym', async () => {
      const products = [mockProduct];
      (mockPrismaService.product.findMany as jest.Mock).mockResolvedValue(
        products,
      );

      const result = await service.findAll('gym-1');

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { gymId: 'gym-1', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(products);
    });
  });

  describe('findOne', () => {
    it('should return a single product by ID', async () => {
      (mockPrismaService.product.findFirst as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      const result = await service.findOne('prod-1', 'gym-1');

      expect(mockPrismaService.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'prod-1', gymId: 'gym-1', deletedAt: null },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product is not found', async () => {
      (mockPrismaService.product.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findOne('prod-nonexistent', 'gym-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

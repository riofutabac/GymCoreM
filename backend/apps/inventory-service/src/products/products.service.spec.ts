import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockProduct = {
    id: 'product-123',
    gymId: 'gym-456',
    name: 'Test Product',
    description: 'A test product',
    price: 15.99,
    stock: 10,
    barcode: '1234567890123',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createDto: CreateProductDto = {
        gymId: 'gym-456',
        name: 'Test Product',
        description: 'A test product',
        price: 15.99,
        stock: 10,
        barcode: '1234567890123',
      };

      (prisma.product.create as jest.Mock).mockResolvedValue(mockProduct);

      const result = await service.create(createDto);

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: createDto,
      });
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findAll', () => {
    it('should return all products for a gym', async () => {
      const mockProducts = [mockProduct];
      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

      const result = await service.findAll('gym-456');

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          gymId: 'gym-456',
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockProducts);
    });
  });

  describe('findByBarcode', () => {
    it('should find product by barcode', async () => {
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(mockProduct);

      const result = await service.findByBarcode('1234567890123', 'gym-456');

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: {
          barcode: '1234567890123',
          gymId: 'gym-456',
          deletedAt: null,
        },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should return null if product not found', async () => {
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.findByBarcode('nonexistent', 'gym-456');

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should find product by id', async () => {
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(mockProduct);

      const result = await service.findOne('product-123', 'gym-456');

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'product-123',
          gymId: 'gym-456',
          deletedAt: null,
        },
      });
      expect(result).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    it('should update product', async () => {
      const updateDto: UpdateProductDto = {
        name: 'Updated Product',
        price: 19.99,
      };

      // Mock findOne to return the product
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(mockProduct);
      
      const updatedProduct = { ...mockProduct, ...updateDto };
      (prisma.product.update as jest.Mock).mockResolvedValue(updatedProduct);

      const result = await service.update('product-123', updateDto, 'gym-456');

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: {
          id_version: {
            id: 'product-123',
            version: 1,
          },
        },
        data: {
          ...updateDto,
          version: {
            increment: 1,
          },
        },
      });
      expect(result).toEqual(updatedProduct);
    });
  });

  describe('remove', () => {
    it('should soft delete product', async () => {
      // Mock findOne to return the product
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(mockProduct);
      
      const deletedProduct = { ...mockProduct, deletedAt: new Date() };
      (prisma.product.update as jest.Mock).mockResolvedValue(deletedProduct);

      const result = await service.remove('product-123', 'gym-456');

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: {
          id_version: {
            id: 'product-123',
            version: 1,
          },
        },
        data: {
          deletedAt: expect.any(Date),
          version: {
            increment: 1,
          },
        },
      });
      expect(result).toEqual(deletedProduct);
    });
  });
});

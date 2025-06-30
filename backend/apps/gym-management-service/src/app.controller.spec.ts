import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const mockPrismaService = {
      gym: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('getHello', () => {
    it('should return "Gym Management Service is running! 🚀"', () => {
      expect(appController.getHello()).toBe('Gym Management Service is running! 🚀');
    });
  });
});

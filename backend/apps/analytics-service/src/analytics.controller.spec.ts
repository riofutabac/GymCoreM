import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockAnalyticsService = {
    processNewUser: jest.fn(),
    processCompletedPayment: jest.fn(),
    getKPIs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('handleUserCreated', () => {
    it('debería procesar evento de usuario creado', async () => {
      const payload = { email: 'test@example.com' };

      await controller.handleUserCreated(payload);

      expect(service.processNewUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('handlePaymentCompleted', () => {
    it('debería procesar evento de pago completado', async () => {
      const payload = { amount: 29.99 };

      await controller.handlePaymentCompleted(payload);

      expect(service.processCompletedPayment).toHaveBeenCalledWith(29.99);
    });

    it('no debería procesar si amount no es número', async () => {
      const payload = { amount: 'invalid' as any };

      await controller.handlePaymentCompleted(payload);

      expect(service.processCompletedPayment).not.toHaveBeenCalled();
    });
  });

  describe('getKPIs', () => {
    it('debería retornar los KPIs del servicio', async () => {
      const mockKPIs = {
        totalUsers: 150,
        totalRevenue: '4580.75',
        newMembershipsToday: 10,
        lastUpdatedAt: new Date().toISOString(),
      };

      mockAnalyticsService.getKPIs.mockResolvedValue(mockKPIs);

      const result = await controller.getKPIs();

      expect(result).toEqual(mockKPIs);
      expect(service.getKPIs).toHaveBeenCalledTimes(1);
    });
  });
});

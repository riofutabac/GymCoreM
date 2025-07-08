import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { REDIS_CLIENT } from './redis.module';
import { Redis } from 'ioredis';

// Mock del cliente de Redis para no necesitar una instancia real durante las pruebas
const mockRedis = {
  pipeline: jest.fn(() => mockRedis), // Retorna el mismo objeto para chaining
  incr: jest.fn(() => mockRedis),
  incrbyfloat: jest.fn(() => mockRedis),
  expire: jest.fn(() => mockRedis),
  get: jest.fn(() => mockRedis),
  exec: jest.fn(),
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let redis: Redis;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: REDIS_CLIENT,
          useValue: mockRedis, // Usamos el mock en lugar del cliente real
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    redis = module.get<Redis>(REDIS_CLIENT);
    jest.clearAllMocks(); // Limpiamos los mocks antes de cada prueba
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('processNewUser', () => {
    it('debería llamar a redis pipeline con incr y expire para total_users', async () => {
      // Configuramos el mock para simular una ejecución exitosa
      mockRedis.exec.mockResolvedValue([
        [null, 'OK'], // Resultado del incr
        [null, 'OK'], // Resultado del expire
      ]);

      await service.processNewUser();

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockRedis.incr).toHaveBeenCalledWith('kpi:total_users');
      expect(mockRedis.expire).toHaveBeenCalledWith('kpi:total_users', 30);
      expect(mockRedis.exec).toHaveBeenCalled();
    });
  });

  describe('processCompletedPayment', () => {
    it('debería llamar a redis pipeline con incrbyfloat e incr para revenue y membresías', async () => {
      const amount = 29.99;
      
      // Configuramos el mock para simular una ejecución exitosa
      mockRedis.exec.mockResolvedValue([
        [null, 'OK'], // Resultado del incrbyfloat
        [null, 'OK'], // Resultado del expire para revenue
        [null, 'OK'], // Resultado del incr para memberships
        [null, 'OK'], // Resultado del expire para memberships
      ]);

      await service.processCompletedPayment(amount);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockRedis.incrbyfloat).toHaveBeenCalledWith('kpi:total_revenue', amount);
      expect(mockRedis.expire).toHaveBeenCalledWith('kpi:total_revenue', 30);
      expect(mockRedis.incr).toHaveBeenCalledWith('kpi:new_memberships_today');
      expect(mockRedis.expire).toHaveBeenCalledWith('kpi:new_memberships_today', 86400);
      expect(mockRedis.exec).toHaveBeenCalled();
    });
  });

  describe('getKPIs', () => {
    it('debería retornar los KPIs parseados correctamente desde Redis', async () => {
      // Simulamos una respuesta del pipeline de Redis
      mockRedis.exec.mockResolvedValue([
        [null, '150'], // Resultado para totalUsers
        [null, '4580.75'], // Resultado para totalRevenue  
        [null, '10'], // Resultado para newMembershipsToday
      ]);

      const kpis = await service.getKPIs();

      expect(kpis.totalUsers).toBe(150);
      expect(kpis.totalRevenue).toBe('4580.75');
      expect(kpis.newMembershipsToday).toBe(10);
      expect(kpis.lastUpdatedAt).toBeDefined();
      expect(typeof kpis.lastUpdatedAt).toBe('string');
      
      // Verificamos que se llamaron los métodos correctos del pipeline
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalledWith('kpi:total_users');
      expect(mockRedis.get).toHaveBeenCalledWith('kpi:total_revenue');
      expect(mockRedis.get).toHaveBeenCalledWith('kpi:new_memberships_today');
      expect(mockRedis.exec).toHaveBeenCalled();
    });

    it('debería manejar el caso cuando Redis devuelve null', async () => {
      // Simulamos cuando Redis devuelve null
      mockRedis.exec.mockResolvedValue(null);

      const kpis = await service.getKPIs();

      expect(kpis.totalUsers).toBe(0);
      expect(kpis.totalRevenue).toBe('0.00');
      expect(kpis.newMembershipsToday).toBe(0);
      expect(kpis.lastUpdatedAt).toBeDefined();
    });

    it('debería manejar valores null de Redis correctamente', async () => {
      // Simulamos cuando algunos valores son null
      mockRedis.exec.mockResolvedValue([
        [null, null], // Sin usuarios
        [null, null], // Sin revenue
        [null, null], // Sin membresías nuevas
      ]);

      const kpis = await service.getKPIs();

      expect(kpis.totalUsers).toBe(0);
      expect(kpis.totalRevenue).toBe('0.00');
      expect(kpis.newMembershipsToday).toBe(0);
    });
  });
});
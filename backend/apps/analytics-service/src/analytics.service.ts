import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

// Definimos constantes para las claves de Redis para evitar errores de tipeo
const KPI_KEYS = {
  TOTAL_USERS: 'kpi:total_users',
  TOTAL_REVENUE: 'kpi:total_revenue',
  NEW_MEMBERSHIPS_TODAY: 'kpi:new_memberships_today',
};
const TTL_SECONDS = 30; // 30 segundos de vida para las claves cacheadas

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Procesa la creación de un nuevo usuario.
   */
  async processNewUser(): Promise<void> {
    this.logger.log('Incrementando contador total de usuarios...');
    const pipeline = this.redis.pipeline();
    pipeline.incr(KPI_KEYS.TOTAL_USERS);
    pipeline.expire(KPI_KEYS.TOTAL_USERS, TTL_SECONDS);
    await pipeline.exec();
  }

  /**
   * Procesa un pago completado, actualizando ingresos y membresías.
   */
  async processCompletedPayment(amount: number): Promise<void> {
    this.logger.log(`Añadiendo $${amount} a los ingresos totales...`);
    const pipeline = this.redis.pipeline();
    pipeline.incrbyfloat(KPI_KEYS.TOTAL_REVENUE, amount);
    pipeline.expire(KPI_KEYS.TOTAL_REVENUE, TTL_SECONDS);

    // También podemos registrar una nueva membresía del día
    pipeline.incr(KPI_KEYS.NEW_MEMBERSHIPS_TODAY);
    pipeline.expire(KPI_KEYS.NEW_MEMBERSHIPS_TODAY, 86400); // Expira en 24 horas

    await pipeline.exec();
  }

  /**
   * Obtiene los KPIs actuales desde Redis.
   * Si una clave no existe, devuelve 0.
   */
  async getKPIs() {
    this.logger.log('Obteniendo KPIs desde Redis...');
    const pipeline = this.redis.pipeline();
    pipeline.get(KPI_KEYS.TOTAL_USERS);
    pipeline.get(KPI_KEYS.TOTAL_REVENUE);
    pipeline.get(KPI_KEYS.NEW_MEMBERSHIPS_TODAY);

    const results = await pipeline.exec();

    if (!results) {
      return {
        totalUsers: 0,
        totalRevenue: '0.00',
        newMembershipsToday: 0,
        lastUpdatedAt: new Date().toISOString(),
      };
    }

    const [usersResult, revenueResult, newMembershipsResult] = results;

    return {
      totalUsers: parseInt((usersResult[1] as string) || '0', 10),
      totalRevenue: parseFloat((revenueResult[1] as string) || '0').toFixed(2),
      newMembershipsToday: parseInt(
        (newMembershipsResult[1] as string) || '0',
        10,
      ),
      lastUpdatedAt: new Date().toISOString(),
    };
  }
}

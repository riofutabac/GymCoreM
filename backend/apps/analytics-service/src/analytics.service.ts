import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.module';
import { PrismaService } from './prisma/prisma.service';

// Definimos constantes para las claves de Redis para evitar errores de tipeo
const KPI_KEYS = {
  TOTAL_USERS: 'kpi:total_users',
  TOTAL_REVENUE: 'kpi:total_revenue',
  NEW_MEMBERSHIPS_TODAY: 'kpi:new_memberships_today',
  GLOBAL_TRENDS: 'trends:global', // Nueva clave para tendencias globales
};
const TTL_SECONDS = 30; // 30 segundos de vida para las claves cacheadas
const TRENDS_TTL_SECONDS = 3600; // 1 hora para datos de tendencias (más costosos de calcular)

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Procesa la creación de un nuevo usuario.
   */
  async processNewUser(): Promise<void> {
    this.logger.log('Incrementando contador total de usuarios...');
    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    const pipeline = this.redis.pipeline();
    pipeline.incr(KPI_KEYS.TOTAL_USERS);
    pipeline.expire(KPI_KEYS.TOTAL_USERS, TTL_SECONDS);
    await pipeline.exec();

    // Actualizar tabla de resumen diario
    try {
      await this.prisma.dailyAnalyticsSummary.upsert({
        where: { date: new Date(today) },
        update: { newUsers: { increment: 1 } },
        create: { 
          date: new Date(today), 
          newUsers: 1,
          revenue: 0,
          membershipsSold: 0
        },
      });
      this.logger.log(`✅ Resumen diario actualizado: +1 usuario para ${today}`);
    } catch (error) {
      this.logger.error('Error actualizando resumen diario de usuarios:', error);
    }
  }

  /**
   * Procesa un pago completado, actualizando ingresos y membresías.
   */
  async processCompletedPayment(amount: number): Promise<void> {
    this.logger.log(`Añadiendo $${amount} a los ingresos totales...`);
    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    const pipeline = this.redis.pipeline();
    pipeline.incrbyfloat(KPI_KEYS.TOTAL_REVENUE, amount);
    pipeline.expire(KPI_KEYS.TOTAL_REVENUE, TTL_SECONDS);

    // También podemos registrar una nueva membresía del día
    pipeline.incr(KPI_KEYS.NEW_MEMBERSHIPS_TODAY);
    pipeline.expire(KPI_KEYS.NEW_MEMBERSHIPS_TODAY, 86400); // Expira en 24 horas

    await pipeline.exec();

    // Actualizar tabla de resumen diario
    try {
      await this.prisma.dailyAnalyticsSummary.upsert({
        where: { date: new Date(today) },
        update: { 
          revenue: { increment: amount },
          membershipsSold: { increment: 1 }
        },
        create: { 
          date: new Date(today), 
          newUsers: 0,
          revenue: amount,
          membershipsSold: 1
        },
      });
      this.logger.log(`✅ Resumen diario actualizado: +$${amount} ingresos para ${today}`);
    } catch (error) {
      this.logger.error('Error actualizando resumen diario de pagos:', error);
    }
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

  /**
   * Obtiene las tendencias globales para el dashboard del Owner.
   * Incluye datos históricos de los últimos 6 meses sobre crecimiento
   * de usuarios y ingresos.
   */
  async getGlobalTrends() {
    this.logger.log('Solicitando tendencias globales...');
    // Intentar obtener datos cacheados primero
    const cachedData = await this.redis.get(KPI_KEYS.GLOBAL_TRENDS);

    if (cachedData) {
      this.logger.log('Sirviendo tendencias globales desde caché...');
      return JSON.parse(cachedData);
    }

    this.logger.log('Calculando tendencias globales desde la tabla de resumen...');
    
    try {
      // Calcular fecha de hace 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      sixMonthsAgo.setHours(0, 0, 0, 0); // Inicio del día

      // Consultar datos agregados de la tabla de resumen
      const aggregatedData = await this.prisma.dailyAnalyticsSummary.findMany({
        where: { 
          date: { gte: sixMonthsAgo } 
        },
        orderBy: { date: 'asc' },
        select: {
          date: true,
          newUsers: true,
          revenue: true,
          membershipsSold: true,
        }
      });

      // Agrupar por mes para las tendencias
      const monthlyData = this.aggregateDataByMonth(aggregatedData);
      
      // Calcular crecimiento comparado al mes anterior
      const growthComparison = this.calculateGrowthComparison(monthlyData);
      
      const trends = {
        monthlyGrowth: monthlyData,
        comparedToLastMonth: growthComparison,
        totalDataPoints: aggregatedData.length,
        lastUpdatedAt: new Date().toISOString(),
      };

      // Cachear el resultado por 1 hora
      await this.redis.set(
        KPI_KEYS.GLOBAL_TRENDS, 
        JSON.stringify(trends), 
        'EX', 
        TRENDS_TTL_SECONDS
      );

      this.logger.log(`✅ Tendencias calculadas con ${aggregatedData.length} puntos de datos`);
      return trends;

    } catch (error) {
      this.logger.error('Error calculando tendencias globales:', error);
      
      // Fallback a datos simulados si hay error con la DB
      this.logger.warn('Usando datos simulados como fallback...');
      return this.getFallbackTrends();
    }
  }

  /**
   * Agrupa los datos diarios por mes
   */
  private aggregateDataByMonth(dailyData: any[]) {
    const monthlyMap = new Map();

    dailyData.forEach(day => {
      const monthKey = day.date.toISOString().substring(0, 7); // YYYY-MM
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          newUsers: 0,
          revenue: 0,
          membershipsSold: 0,
        });
      }

      const monthData = monthlyMap.get(monthKey);
      monthData.newUsers += day.newUsers;
      monthData.revenue += day.revenue;
      monthData.membershipsSold += day.membershipsSold;
    });

    return Array.from(monthlyMap.values());
  }

  /**
   * Calcula el crecimiento comparado al mes anterior
   */
  private calculateGrowthComparison(monthlyData: any[]) {
    if (monthlyData.length < 2) {
      return {
        userGrowth: '0%',
        revenueGrowth: '0%',
      };
    }

    const lastMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData[monthlyData.length - 2];

    const userGrowth = previousMonth.newUsers > 0 
      ? (((lastMonth.newUsers - previousMonth.newUsers) / previousMonth.newUsers) * 100).toFixed(1)
      : '0';

    const revenueGrowth = previousMonth.revenue > 0 
      ? (((lastMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100).toFixed(1)
      : '0';

    return {
      userGrowth: `${userGrowth}%`,
      revenueGrowth: `${revenueGrowth}%`,
    };
  }

  /**
   * Datos de fallback en caso de error
   */
  private getFallbackTrends() {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    const monthlyData = [];
    for (let i = 0; i < 6; i++) {
      const month = new Date(sixMonthsAgo);
      month.setMonth(month.getMonth() + i);
      
      monthlyData.push({
        month: month.toISOString().substring(0, 7), // formato YYYY-MM
        newUsers: 50 + Math.floor(Math.random() * 100), // Simulamos datos crecientes
        revenue: 1000 + (i * 500) + Math.floor(Math.random() * 1000),
        membershipsSold: 30 + Math.floor(Math.random() * 50),
      });
    }
    
    return {
      monthlyGrowth: monthlyData,
      comparedToLastMonth: {
        userGrowth: '8.5%',
        revenueGrowth: '12.3%',
      },
      fallbackMode: true,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  /**
   * Maneja las actualizaciones de gimnasio invalidando caché
   */
  async handleGymUpdate(): Promise<void> {
    this.logger.log('Invalidando caché de tendencias globales debido a una actualización de gimnasio...');
    // Simplemente borramos la clave de la caché.
    // En la próxima petición se recalculará con los datos frescos.
    await this.redis.del(KPI_KEYS.GLOBAL_TRENDS);
    this.logger.log('✅ Caché de tendencias invalidado');
  }

  /**
   * Maneja la desactivación de un gimnasio invalidando todas las cachés relevantes
   */
  async handleGymDeactivation(gymId: string): Promise<void> {
    this.logger.log(`Procesando desactivación del gimnasio ${gymId}...`);
    
    try {
      // Invalidar múltiples cachés ya que un gimnasio desactivado afecta muchos KPIs
      const pipeline = this.redis.pipeline();
      
      // Invalidar tendencias globales
      pipeline.del(KPI_KEYS.GLOBAL_TRENDS);
      
      // Invalidar KPIs actuales (podrían cambiar si excluimos el gimnasio desactivado)
      pipeline.del(KPI_KEYS.TOTAL_USERS);
      pipeline.del(KPI_KEYS.TOTAL_REVENUE);
      pipeline.del(KPI_KEYS.NEW_MEMBERSHIPS_TODAY);
      
      await pipeline.exec();
      
      this.logger.log(`✅ Cachés invalidados debido a desactivación del gimnasio ${gymId}`);
    } catch (error) {
      this.logger.error(`Error invalidando cachés para gimnasio desactivado ${gymId}:`, error);
    }
  }

  /**
   * Maneja la actualización de perfil de usuario
   */
  async handleUserProfileUpdate(): Promise<void> {
    this.logger.log('Procesando actualización de perfil de usuario...');
    
    try {
      // Invalidar cachés de usuarios ya que el perfil cambió
      const pipeline = this.redis.pipeline();
      pipeline.del(KPI_KEYS.TOTAL_USERS);
      pipeline.del(KPI_KEYS.GLOBAL_TRENDS);
      
      await pipeline.exec();
      
      this.logger.log(`✅ Cachés invalidados debido a actualización de perfil de usuario`);
    } catch (error) {
      this.logger.error(`Error invalidando cachés para actualización de perfil:`, error);
    }
  }

  /**
   * Maneja el cambio de rol de usuario
   */
  async handleUserRoleUpdate(): Promise<void> {
    this.logger.log('Procesando cambio de rol de usuario...');
    
    try {
      // Los cambios de rol pueden afectar estadísticas por tipo de usuario
      const pipeline = this.redis.pipeline();
      pipeline.del(KPI_KEYS.TOTAL_USERS);
      pipeline.del(KPI_KEYS.GLOBAL_TRENDS);
      
      await pipeline.exec();
      
      this.logger.log(`✅ Cachés invalidados debido a cambio de rol de usuario`);
    } catch (error) {
      this.logger.error(`Error invalidando cachés para cambio de rol:`, error);
    }
  }

  /**
   * Maneja la activación de membresía
   */
  async handleMembershipActivation(payload: { userId: string; membershipType: string; gymId?: string }): Promise<void> {
    this.logger.log(`Procesando activación de membresía tipo ${payload.membershipType} para usuario ${payload.userId}...`);
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Incrementar contador de membresías activadas hoy
      const pipeline = this.redis.pipeline();
      pipeline.incr(KPI_KEYS.NEW_MEMBERSHIPS_TODAY);
      pipeline.expire(KPI_KEYS.NEW_MEMBERSHIPS_TODAY, TTL_SECONDS);
      
      // También invalidar tendencias globales
      pipeline.del(KPI_KEYS.GLOBAL_TRENDS);
      
      await pipeline.exec();

      // Actualizar tabla de resumen diario
      await this.prisma.dailyAnalyticsSummary.upsert({
        where: { date: new Date(today) },
        update: { membershipsSold: { increment: 1 } },
        create: { 
          date: new Date(today), 
          newUsers: 0,
          revenue: 0,
          membershipsSold: 1
        },
      });
      
      this.logger.log(`✅ Membresía activada procesada para ${payload.userId}, resumen diario actualizado para ${today}`);
    } catch (error) {
      this.logger.error(`Error procesando activación de membresía:`, error);
    }
  }
}

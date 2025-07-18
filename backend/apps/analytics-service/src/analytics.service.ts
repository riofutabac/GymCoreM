import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.module';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('GYM_SERVICE') private readonly gymClient: ClientProxy,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
    private readonly prisma: PrismaService,
  ) {}

  // --- FUNCIÓN PARA INVALIDAR LA CACHÉ ---
  // La llamaremos cada vez que los datos cambien.
  private async invalidateKpiCache() {
    this.logger.log('Invalidando caché de KPIs y Global Trends...');
    await this.redis.del('kpis', 'global-trends');
    this.logger.log('✅ Caché invalidada.');
  }

  /**
   * Procesa la creación de un nuevo usuario.
   */
  async processNewUser(): Promise<void> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await this.prisma.dailyAnalyticsSummary.upsert({
      where: { date: today },
      update: { newUsers: { increment: 1 } },
      create: { 
        date: today, 
        newUsers: 1, 
        revenue: 0, 
        membershipsSold: 0
      },
    });
    this.logger.log(`✅ Resumen diario actualizado: +1 usuario`);
    await this.invalidateKpiCache(); // ¡CORRECCIÓN CLAVE!
  }

  /**
   * Procesa un pago completado, actualizando ingresos y membresías.
   * Incluye protección de idempotencia para evitar procesamientos duplicados.
   * ⚠️ IMPORTANTE: No procesa pagos de membresías que ya fueron procesados.
   */
  async processCompletedPayment(amount: number, eventId?: string, isMembership: boolean = false): Promise<void> {
    // 🚫 EVITAR DUPLICACIÓN: No procesar pagos de membresías
    // que ya fueron procesados via membership.activated.manually
    if (isMembership) {
      this.logger.log(`⚠️ Ignorando payment.completed con isMembership=true (eventId: ${eventId}) - ya procesado via membership event`);
      return;
    }

    // --- PROTECCIÓN DE IDEMPOTENCIA ---
    if (eventId) {
      const alreadyProcessed = await this.redis.get(`processed:${eventId}`);
      if (alreadyProcessed) {
        this.logger.warn(`Evento ${eventId} ya fue procesado. Ignorando para evitar duplicación.`);
        return;
      }
    }
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    await this.prisma.dailyAnalyticsSummary.upsert({
      where: { date: today },
      update: { 
        revenue: { increment: amount }, 
        membershipsSold: { increment: isMembership ? 1 : 0 } // CORRECCIÓN: Solo incrementa si es membresía
      },
      create: { 
        date: today, 
        newUsers: 0, 
        revenue: amount, 
        membershipsSold: isMembership ? 1 : 0 // CORRECCIÓN: Solo crea con 1 si es membresía
      },
    });

    // --- MARCAR EVENTO COMO PROCESADO ---
    if (eventId) {
      await this.redis.setex(`processed:${eventId}`, 3600 * 24, '1'); // 24 horas de TTL
    }

    // CORRECCIÓN: Log mejorado para distinguir tipos de pago
    if (isMembership) {
      this.logger.log(`✅ Resumen diario actualizado: +$${amount} y +1 membresía`);
    } else {
      this.logger.log(`✅ Resumen diario actualizado: +$${amount} (Venta POS)`);
    }
    await this.invalidateKpiCache(); // ¡CORRECCIÓN CLAVE!
  }

  async getKpis() {
    const cacheKey = 'kpis';
    try {
      const cachedKpis = await this.redis.get(cacheKey);
      if (cachedKpis) {
        this.logger.log('Obteniendo KPIs desde Redis...');
        return JSON.parse(cachedKpis);
      }
    } catch (error) {
      this.logger.warn('Error accediendo a Redis:', error);
    }

    this.logger.log('Calculando KPIs desde la base de datos...');

    try {
      // CORRECCIÓN: Usamos aggregate para SUMAR, no para contar filas.
      const aggregation = await this.prisma.dailyAnalyticsSummary.aggregate({
        _sum: {
          newUsers: true,
          revenue: true,
          membershipsSold: true,
        },
      });

      this.logger.log(`[DEBUG-KPIs] Agregación desde dailyAnalyticsSummary: ${JSON.stringify(aggregation)}`);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      const todaysSummary = await this.prisma.dailyAnalyticsSummary.findUnique({
          where: { date: today }
      });

      const kpis = {
        // Usamos los valores sumados. Si son null, ponemos 0.
        totalUsers: aggregation._sum.newUsers || 0,
        totalRevenue: (aggregation._sum.revenue || 0).toFixed(2),
        newMembershipsToday: todaysSummary?.membershipsSold || 0,
        lastUpdatedAt: new Date().toISOString(),
      };

      this.logger.log(`[DEBUG-KPIs] KPIs calculados: ${JSON.stringify(kpis)}`);
      await this.redis.set(cacheKey, JSON.stringify(kpis), 'EX', 3600);
      this.logger.log('KPIs guardados en Redis.');
      return kpis;

    } catch (error) {
      this.logger.error('[ERROR-KPIs] Fallo al calcular KPIs desde la DB', error);
      // Devolver ceros en caso de error para no romper el frontend
      return { totalUsers: 0, totalRevenue: '0.00', newMembershipsToday: 0, lastUpdatedAt: new Date().toISOString() };
    }
  }

  /**
   * Obtiene KPIs específicos para el gimnasio de un manager
   */
  async getKpisForGym(managerId: string) {
    this.logger.log(`Calculando KPIs para manager ${managerId}`);
    
    try {
      // Obtener información del manager desde auth-service
      const managerData = await firstValueFrom(
        this.authClient.send({ cmd: 'get_user_info' }, { userId: managerId })
      );

      if (!managerData || !managerData.gymId) {
        this.logger.error(`Manager ${managerId} no tiene gimnasio asignado`);
        return {
          activeMembers: 0,
          newMembersLast30Days: 0,
          membershipsExpiringNext7Days: 0,
          cashRevenueThisMonth: 0,
          lastUpdatedAt: new Date().toISOString(),
        };
      }

      const gymId = managerData.gymId;
      this.logger.log(`Manager pertenece al gimnasio ${gymId}`);

      // Calcular fechas para las consultas
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Obtener estadísticas de membresías desde gym-service
      const membershipStats = await firstValueFrom(
        this.gymClient.send({ cmd: 'get_membership_stats' }, { 
          gymId,
          today: today.toISOString(),
          startOfMonth: startOfMonth.toISOString()
        })
      );

      // Obtener ingresos totales en efectivo del mes actual del gimnasio específico
      // Incluye: membresías pagadas en efectivo + ventas POS en efectivo
      let cashRevenueThisMonth = 0;
      
      try {
        const paymentStats = await firstValueFrom(
          this.paymentClient.send({ cmd: 'get_cash_revenue_for_gym' }, { 
            gymId,
            startOfMonth: startOfMonth.toISOString(),
            endOfMonth: today.toISOString()
          })
        );
        cashRevenueThisMonth = paymentStats?.totalCashRevenue || 0;
        this.logger.log(`Ingresos totales en efectivo calculados para gym ${gymId}: $${cashRevenueThisMonth} (membresías + POS)`);
      } catch (error) {
        this.logger.warn(`No se pudieron obtener ingresos en efectivo para gym ${gymId}:`, error);
        cashRevenueThisMonth = 0;
      }

      const gymKpis = {
        activeMembers: membershipStats?.activeMembers || 0,
        newMembersLast30Days: membershipStats?.newMembersLast30Days || 0,
        membershipsExpiringNext7Days: membershipStats?.membershipsExpiringNext7Days || 0,
        cashRevenueThisMonth,
        lastUpdatedAt: new Date().toISOString(),
      };

      this.logger.log(`KPIs reales para gym ${gymId} calculados: ${JSON.stringify(gymKpis)}`);
      return gymKpis;
    } catch (error) {
      this.logger.error('Error calculando KPIs del gimnasio:', error);
      return {
        activeMembers: 0,
        newMembersLast30Days: 0,
        membershipsExpiringNext7Days: 0,
        cashRevenueThisMonth: 0,
        lastUpdatedAt: new Date().toISOString(),
      };
    }
  }

  async getGlobalTrends() {
    const cacheKey = 'global-trends';
    try {
      const cachedTrends = await this.redis.get(cacheKey);
      if (cachedTrends) {
        this.logger.log('Obteniendo Global Trends desde Redis...');
        return JSON.parse(cachedTrends);
      }
    } catch (error) {
      this.logger.error('Error al leer Global Trends desde Redis', error);
    }

    this.logger.log('Calculando Global Trends desde la base de datos...');
    
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // Obtener datos sin groupBy para evitar problemas con campos inexistentes
      const rawData = await this.prisma.dailyAnalyticsSummary.findMany({
        where: {
          date: { gte: lastMonth }
        },
        select: {
          date: true,
          revenue: true,
          newUsers: true,
          membershipsSold: true,
        },
        orderBy: {
          date: 'desc',
        },
      });

      this.logger.log(`[DEBUG-Trends] Data obtenida desde dailyAnalyticsSummary: ${JSON.stringify(rawData)}`);

      // Agrupar manualmente por mes
      const monthlyMap = new Map();
      rawData.forEach(record => {
        const monthKey = record.date.toISOString().substring(0, 7); // YYYY-MM
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthKey,
            revenue: 0,
            newUsers: 0,
            membershipsSold: 0,
          });
        }

        const monthData = monthlyMap.get(monthKey);
        monthData.revenue += record.revenue || 0;
        monthData.newUsers += record.newUsers || 0;
        monthData.membershipsSold += record.membershipsSold || 0;
      });

      const monthlyGrowth = Array.from(monthlyMap.values());
      this.logger.log(`[DEBUG-Trends] Data agrupada por mes: ${JSON.stringify(monthlyGrowth)}`);

      const result = {
        monthlyGrowth,
        comparedToLastMonth: { userGrowth: "0%", revenueGrowth: "0%" }, // Lógica de comparación simplificada
        totalDataPoints: rawData.length,
        lastUpdatedAt: new Date().toISOString(),
      };

      await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
      this.logger.log('Global Trends guardados en Redis.');
      return result;

    } catch (error) {
      this.logger.error('[ERROR-Trends] Fallo al calcular Global Trends desde la DB', error);
      // Devolver estructura vacía en caso de error
      return { monthlyGrowth: [], comparedToLastMonth: { userGrowth: '0%', revenueGrowth: '0%' }, totalDataPoints: 0, lastUpdatedAt: new Date().toISOString() };
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
    this.logger.log('Gym actualizado - invalidando caché...');
    await this.invalidateKpiCache();
  }

  /**
   * Maneja la desactivación de un gimnasio invalidando todas las cachés relevantes
   */
  async handleGymDeactivation(gymId: string): Promise<void> {
    this.logger.log(`Procesando desactivación del gimnasio ${gymId}...`);
    await this.invalidateKpiCache();
  }

  /**
   * Maneja la actualización de perfil de usuario
   */
  async handleUserProfileUpdate(): Promise<void> {
    this.logger.log('Perfil de usuario actualizado - invalidando caché...');
    await this.invalidateKpiCache();
  }

  /**
   * Maneja el cambio de rol de usuario
   */
  async handleUserRoleUpdate(): Promise<void> {
    this.logger.log('Rol de usuario actualizado - invalidando caché...');
    await this.invalidateKpiCache();
  }

  /**
   * Procesa la activación manual de una membresía
   */
  async processMembershipActivation(payload: { 
    userId: string; 
    membershipId: string; 
    amount: number; 
    activatedBy: string;
    gymId?: string;
  }): Promise<void> {
    this.logger.log(`Procesando activación de membresía ${payload.membershipId} por $${payload.amount}`);
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Actualizar resumen diario con el ingreso y membresía vendida
    await this.prisma.dailyAnalyticsSummary.upsert({
      where: { date: today },
      update: { 
        revenue: { increment: payload.amount },
        membershipsSold: { increment: 1 }
      },
      create: { 
        date: today, 
        newUsers: 0, 
        revenue: payload.amount, 
        membershipsSold: 1
      },
    });
    
    this.logger.log(`✅ Resumen diario actualizado: +$${payload.amount} ingresos, +1 membresía`);
    await this.invalidateKpiCache();
  }

  /**
   * Procesa la renovación manual de una membresía
   */
  async processMembershipRenewal(payload: { 
    userId: string; 
    membershipId: string; 
    amount: number; 
    renewedBy: string;
    gymId?: string;
  }): Promise<void> {
    this.logger.log(`Procesando renovación de membresía ${payload.membershipId} por $${payload.amount}`);
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Actualizar resumen diario con el ingreso (renovaciones cuentan como ingresos)
    await this.prisma.dailyAnalyticsSummary.upsert({
      where: { date: today },
      update: { 
        revenue: { increment: payload.amount },
        // Las renovaciones no cuentan como nuevas membresías vendidas
      },
      create: { 
        date: today, 
        newUsers: 0, 
        revenue: payload.amount, 
        membershipsSold: 0
      },
    });
    
    this.logger.log(`✅ Resumen diario actualizado: +$${payload.amount} ingresos por renovación`);
    await this.invalidateKpiCache();
  }
}

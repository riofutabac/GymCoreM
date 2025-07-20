import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from './prisma/prisma.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { PublicGymDto } from './dto/public-gym.dto';
import { AdminGymDto } from './dto/admin-gym.dto';
import { Role } from '../prisma/generated/gym-client';

interface UserPayload {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  gymId?: string;
}

interface RoleUpdatePayload {
  userId: string;
  newRole: string;
  gymId?: string;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  public async handleUserCreated(data: UserPayload): Promise<void> {
    this.logger.log(`📝 Sincronizando usuario: ${data.email}`);
    try {
      await this.createLocalUser(data);
      this.logger.log(`✅ Usuario ${data.email} sincronizado`);
    } catch (error: any) {
      this.logger.error(`❌ Error sincronizando ${data.email}:`, error);
      throw error; // Re-lanzamos para que RabbitMQ sepa que falló
    }
  }

  public async handleUserRoleUpdated(data: RoleUpdatePayload): Promise<void> {
    this.logger.log(`🔄 Actualizando rol usuario: ${data.userId}`);
    try {
      await this.updateLocalUserRole(data);
      this.logger.log(`✅ Rol actualizado para ${data.userId}`);
    } catch (error: any) {
      this.logger.error(`❌ Error actualizando rol ${data.userId}:`, error);
      throw error; // Re-lanzamos para que RabbitMQ sepa que falló
    }
  }

  getHello(): string {
    return 'Gym Management Service is running! 🚀';
  }

  async createGym(createGymDto: CreateGymDto) {
    const newGym = await this.prisma.gym.create({
      data: createGymDto,
    });

    // --- EMITIR EVENTO gym.created PARA ANALYTICS ---
    await this.amqpConnection.publish(
      'gymcore-exchange',
      'gym.created',
      { 
        gymId: newGym.id, 
        name: newGym.name, 
        timestamp: new Date().toISOString() 
      },
      { persistent: true }
    );
    this.logger.log(`✅ Evento 'gym.created' emitido para el gimnasio ${newGym.name}`);

    return newGym;
  }

  async deactivateGym(id: string) {
    this.logger.log(`Desactivando gimnasio ${id}`);
    
    try {
      // Verificar que el gimnasio existe y no está ya desactivado
      const existingGym = await this.prisma.gym.findUnique({
        where: { id },
        select: { id: true, name: true, isActive: true, deletedAt: true }
      });

      if (!existingGym) {
        throw new Error(`Gimnasio con ID ${id} no encontrado`);
      }

      if (existingGym.deletedAt) {
        throw new Error(`El gimnasio ${existingGym.name} ya está desactivado`);
      }

      // Realizar soft-delete
      const deactivatedGym = await this.prisma.gym.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      this.logger.log(`Gimnasio ${deactivatedGym.name} desactivado exitosamente`);
      
      // Publicar evento crítico gym.deactivated para otros servicios
      const eventPayload = {
        gymId: deactivatedGym.id,
        gymName: deactivatedGym.name,
        deactivatedAt: deactivatedGym.deletedAt,
        timestamp: new Date().toISOString(),
      };
      
      await this.amqpConnection.publish(
        'gymcore-exchange',
        'gym.deactivated',
        eventPayload,
        { persistent: true }
      );
      
      this.logger.log(`✅ Evento 'gym.deactivated' publicado para gimnasio ${deactivatedGym.id}`);

      return deactivatedGym;
    } catch (error: any) {
      this.logger.error(`Error desactivando gimnasio ${id}:`, error);
      throw error;
    }
  }

  async updateGym(id: string, data: { name?: string; isActive?: boolean }) {
    this.logger.log(`Actualizando gimnasio ${id} con datos:`, data);

    try {
      const updatedGym = await this.prisma.gym.update({
        where: { id },
        data,
      });

      this.logger.log(`Gimnasio ${id} actualizado exitosamente`);

      // Publicar evento gym.updated para otros servicios
      const eventPayload = {
        gymId: updatedGym.id,
        updatedFields: Object.keys(data), // e.g., ['name', 'isActive']
        updatedData: data,
        timestamp: new Date().toISOString(),
      };
      
      await this.amqpConnection.publish(
        'gymcore-exchange',
        'gym.updated',
        eventPayload,
        { persistent: true }
      );
      
      this.logger.log(`✅ Evento 'gym.updated' publicado para gimnasio ${updatedGym.id}`);

      return updatedGym;
    } catch (error: any) {
      this.logger.error(`Error actualizando gimnasio ${id}:`, error);
      throw error;
    }
  }

  async createLocalUser(data: UserPayload) {
    return this.prisma.user.upsert({
      where: { id: data.id },
      update: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role ?? 'MEMBER',
        gymId: data.gymId,
      },
      create: {
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role ?? 'MEMBER',
        gymId: data.gymId,
      },
    });
  }

  async updateLocalUserRole(data: {
    userId: string;
    newRole: string;
    gymId?: string;
  }) {
    return this.prisma.user.update({
      where: { id: data.userId },
      data: {
        role: data.newRole as Role,
        ...(data.gymId && { gymId: data.gymId }),
      },
    });
  }

  async updateLocalUserProfile(data: {
    userId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }) {
    return this.prisma.user.update({
      where: { id: data.userId },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email && { email: data.email }),
      },
    });
  }

  async findAllGyms(): Promise<AdminGymDto[]> {
    // Devolver TODOS los gimnasios (activos e inactivos)
    const gyms = await this.prisma.gym.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    return gyms.map(({ id, name, uniqueCode, isActive, createdAt, deletedAt }) => ({
      id,
      name,
      uniqueCode,
      isActive,
      createdAt,
      deletedAt,
    }));
  }

  async findAllPublicGyms(): Promise<PublicGymDto[]> {
    // También solo gimnasios activos
    const gyms = await this.prisma.gym.findMany({
      where: { 
        isActive: true // Solo gimnasios activos
      },
    });
    return gyms.map(({ name }) => ({ name }));
  }

  async countActiveGyms(): Promise<number> {
    return this.prisma.gym.count({ 
      where: { 
        isActive: true,
        deletedAt: null // Excluir gimnasios con soft-delete
      } 
    });
  }

  async reactivateGym(id: string) {
    this.logger.log(`Reactivando gimnasio ${id}`);
    
    try {
      // Verificar que el gimnasio existe y está desactivado
      const existingGym = await this.prisma.gym.findUnique({
        where: { id },
        select: { id: true, name: true, isActive: true, deletedAt: true }
      });

      if (!existingGym) {
        throw new Error(`Gimnasio con ID ${id} no encontrado`);
      }

      if (existingGym.isActive && !existingGym.deletedAt) {
        throw new Error(`El gimnasio ${existingGym.name} ya está activo`);
      }

      // Reactivar el gimnasio
      const reactivatedGym = await this.prisma.gym.update({
        where: { id },
        data: {
          isActive: true,
          deletedAt: null,
        },
      });

      this.logger.log(`Gimnasio ${reactivatedGym.name} reactivado exitosamente`);
      
      // Publicar evento gym.reactivated para otros servicios
      const eventPayload = {
        gymId: reactivatedGym.id,
        gymName: reactivatedGym.name,
        reactivatedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };
      
      await this.amqpConnection.publish(
        'gymcore-exchange',
        'gym.reactivated',
        eventPayload,
        { persistent: true }
      );
      
      this.logger.log(`✅ Evento 'gym.reactivated' publicado para gimnasio ${reactivatedGym.id}`);

      return reactivatedGym;
    } catch (error: any) {
      this.logger.error(`Error reactivando gimnasio ${id}:`, error);
      throw error;
    }
  }

  /**
   * Exporta un reporte CSV de miembros para un manager específico
   */
  async exportMembersReport(managerId: string) {
    this.logger.log(`Generando reporte de miembros para manager ${managerId}`);
    
    try {
      // Obtener el gymId del manager
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: { gymId: true, role: true }
      });

      if (!manager || !manager.gymId) {
        throw new Error('Manager no encontrado o no asignado a un gimnasio');
      }

      if (manager.role !== 'MANAGER' && manager.role !== 'OWNER') {
        throw new Error('Usuario no autorizado para generar reportes');
      }

      // Obtener todos los miembros del gimnasio
      const members = await this.prisma.user.findMany({
        where: {
          gymId: manager.gymId,
          role: 'MEMBER'
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Generar CSV
      const csvHeaders = 'ID,Nombre,Apellido,Email,Fecha de Registro\n';
      const csvRows = members.map(member => 
        `${member.id},"${member.firstName}","${member.lastName}","${member.email}","${member.createdAt.toISOString()}"`
      ).join('\n');
      
      const csvData = csvHeaders + csvRows;

      this.logger.log(`Reporte generado con ${members.length} miembros`);
      
      return {
        csvData,
        filename: `reporte_miembros_${new Date().toISOString().split('T')[0]}.csv`,
        totalMembers: members.length
      };
    } catch (error: any) {
      this.logger.error('Error generando reporte de miembros:', error);
      throw error;
    }
  }

  async getMembershipStats(gymId: string, todayString: string, startOfMonthString: string) {
    try {
      const today = new Date(todayString);
      const startOfMonth = new Date(startOfMonthString);
      const last30Days = new Date();
      last30Days.setDate(today.getDate() - 30);
      const next7Days = new Date();
      next7Days.setDate(today.getDate() + 7);

      // Contar miembros activos del gimnasio
      const activeMembers = await this.prisma.membership.count({
        where: {
          gymId: gymId,
          endDate: {
            gte: today
          },
          status: 'ACTIVE'
        }
      });

      // Miembros nuevos en los últimos 30 días
      const newMembersLast30Days = await this.prisma.membership.count({
        where: {
          gymId: gymId,
          startDate: {
            gte: last30Days
          }
        }
      });

      // Membresías que expiran en los próximos 7 días
      const membershipsExpiringNext7Days = await this.prisma.membership.count({
        where: {
          gymId: gymId,
          endDate: {
            gte: today,
            lte: next7Days
          },
          status: 'ACTIVE'
        }
      });

      const stats = {
        activeMembers,
        newMembersLast30Days,
        membershipsExpiringNext7Days
      };

      return stats;
    } catch (error: any) {
      this.logger.error(`Error calculando estadísticas para gym ${gymId}:`, error);
      return {
        activeMembers: 0,
        newMembersLast30Days: 0,
        membershipsExpiringNext7Days: 0
      };
    }
  }

  /**
   * Obtiene la información del gimnasio al que pertenece una membresía
   */
  async getMembershipGym(membershipId: string) {
    try {
      const membership = await this.prisma.membership.findUnique({
        where: { id: membershipId },
        select: { gymId: true },
      });

      if (!membership) {
        this.logger.warn(`Membresía ${membershipId} no encontrada`);
        return null;
      }

      return { gymId: membership.gymId };
    } catch (error: any) {
      this.logger.error(`Error obteniendo gym de membresía ${membershipId}:`, error);
      return null;
    }
  }

  /**
   * Obtiene la información del gimnasio al que pertenece un usuario
   */
  async getUserGym(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { gymId: true },
      });

      if (!user) {
        this.logger.warn(`Usuario ${userId} no encontrado`);
        return null;
      }

      return { gymId: user.gymId };
    } catch (error: any) {
      this.logger.error(`Error obteniendo gym de usuario ${userId}:`, error);
      return null;
    }
  }
}

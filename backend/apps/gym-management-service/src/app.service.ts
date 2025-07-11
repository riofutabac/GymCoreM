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
    } catch (error) {
      this.logger.error(`❌ Error sincronizando ${data.email}:`, error);
      throw error; // Re-lanzamos para que RabbitMQ sepa que falló
    }
  }

  public async handleUserRoleUpdated(data: RoleUpdatePayload): Promise<void> {
    this.logger.log(`🔄 Actualizando rol usuario: ${data.userId}`);
    try {
      await this.updateLocalUserRole(data);
      this.logger.log(`✅ Rol actualizado para ${data.userId}`);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

  async findAllGyms(): Promise<AdminGymDto[]> {
    // Solo gimnasios activos (usando isActive por ahora)
    const gyms = await this.prisma.gym.findMany({
      where: {
        isActive: true // Solo gimnasios activos
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return gyms.map(({ id, name, uniqueCode, isActive, createdAt }) => ({
      id,
      name,
      uniqueCode,
      isActive,
      createdAt,
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
}

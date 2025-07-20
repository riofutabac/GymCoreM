import { Injectable, Logger } from '@nestjs/common';
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

  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.gym.create({
      data: createGymDto,
    });
  }

  async findAllGyms(): Promise<AdminGymDto[]> {
    const gyms = await this.prisma.gym.findMany();
    return gyms.map(({ id, name, uniqueCode, isActive, createdAt }) => ({
      id,
      name,
      uniqueCode,
      isActive,
      createdAt,
    }));
  }

  async findAllPublicGyms(): Promise<PublicGymDto[]> {
    const gyms = await this.prisma.gym.findMany({
      where: { isActive: true },
    });
    return gyms.map(({ name }) => ({ name }));
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
}

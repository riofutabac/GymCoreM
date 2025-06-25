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

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly prisma: PrismaService) {}

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
    return gyms.map((gym) => ({
      id: gym.id,
      name: gym.name,
      uniqueCode: gym.uniqueCode,
      isActive: gym.isActive,
      createdAt: gym.createdAt,
    }));
  }

  async findAllPublicGyms(): Promise<PublicGymDto[]> {
    const gyms = await this.prisma.gym.findMany({
      where: { isActive: true },
    });
    return gyms.map((gym) => ({
      name: gym.name,
    }));
  }

  async createLocalUser(data: UserPayload) {
    this.logger.log(`Sincronizando nuevo usuario: ${data.email} con gymId: ${data.gymId}`);
    return this.prisma.user.upsert({
      where: { id: data.id },
      update: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'MEMBER',
        gymId: data.gymId,
      },
      create: {
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'MEMBER',
        gymId: data.gymId,
      },
    });
  }

  async updateLocalUserRole(data: { userId: string; newRole: string; gymId?: string }) {
    this.logger.log(`Actualizando rol/gym del usuario local ${data.userId} a rol ${data.newRole} y gymId ${data.gymId}`);
    try {
      await this.prisma.user.update({
        where: { id: data.userId },
        data: {
          role: data.newRole as Role,
          ...(data.gymId && { gymId: data.gymId }),
        },
      });
      this.logger.log(`💾 Rol/gym del usuario local ${data.userId} actualizado.`);
    } catch (error) {
      this.logger.error(`❌ No se pudo actualizar el rol/gym para el usuario local ${data.userId}:`, error.message);
    }
  }
}
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { PublicGymDto } from './dto/public-gym.dto';
import { AdminGymDto } from './dto/admin-gym.dto';

@Injectable()
export class AppService {
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

  async createLocalUser(data: { id: string; email: string; firstName?: string; lastName?: string }) {
    return this.prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });
  }
}
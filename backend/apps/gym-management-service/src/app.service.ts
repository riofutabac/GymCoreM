import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { CreateGymDto } from './dto/create-gym.dto';

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

  async findAllGyms() {
    return this.prisma.gym.findMany();
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
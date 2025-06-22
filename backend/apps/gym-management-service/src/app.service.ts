import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateGymDto } from './dto/create-gym.dto';

@Injectable()
export class AppService {
  private prisma = new PrismaClient();

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
}
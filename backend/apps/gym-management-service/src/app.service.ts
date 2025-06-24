import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { CreateGymDto } from './dto/create-gym.dto';
import { ActivateMembershipDto } from './dto/activate-membership.dto';

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

  async activateMembership(activateMembershipDto: ActivateMembershipDto) {
    const { membershipId, managerId } = activateMembershipDto;

    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundException(
        `La membresía con ID "${membershipId}" no fue encontrada.`,
      );
    }

    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + 30);

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: {
        status: MembershipStatus.ACTIVE,
        endDate: newEndDate,
        activatedById: managerId,
        updatedAt: new Date(),
      },
    });
  }
}
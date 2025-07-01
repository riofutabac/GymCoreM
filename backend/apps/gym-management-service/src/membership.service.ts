import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from './prisma/prisma.service';
import { ActivateMembershipDto } from './dto/activate-membership.dto';
import { RenewMembershipDto } from './dto/renew-membership.dto';
import { Role } from '../prisma/generated/gym-client';

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(private readonly prisma: PrismaService) {}

  async activate(dto: ActivateMembershipDto, managerId: string) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (start >= end) {
      throw new BadRequestException('startDate must be before endDate');
    }

    await this.validatePermissions(managerId, dto.userId, dto.gymId);

    const existing = await this.prisma.membership.findFirst({
      where: { userId: dto.userId, gymId: dto.gymId, status: 'ACTIVE', endDate: { gt: new Date() } },
    });

    if (existing) {
      throw new ConflictException('User already has active membership');
    }

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          userId: dto.userId,
          gymId: dto.gymId,
          startDate: start,
          endDate: end,
          status: 'ACTIVE',
          activatedById: managerId,
        },
      });

      await tx.membershipLog.create({
        data: {
          membershipId: membership.id,
          action: 'ACTIVATED',
          performedById: managerId,
          reason: dto.reason ?? 'Manual activation',
          details: { startDate: dto.startDate, endDate: dto.endDate },
        },
      });

      return membership;
    });
  }

  async renew(dto: RenewMembershipDto, managerId: string) {
    const membership = await this.prisma.membership.findUnique({ where: { id: dto.membershipId } });
    if (!membership) throw new NotFoundException('Membership not found');

    const newEnd = new Date(dto.newEndDate);
    if (newEnd <= membership.endDate) {
      throw new BadRequestException('newEndDate must be after current endDate');
    }

    await this.validatePermissions(managerId, membership.userId, membership.gymId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.membership.update({
        where: { id: membership.id },
        data: { endDate: newEnd, status: 'ACTIVE' },
      });

      await tx.membershipLog.create({
        data: {
          membershipId: membership.id,
          action: 'RENEWED',
          performedById: managerId,
          reason: dto.reason ?? 'Manual renewal',
          details: { oldEndDate: membership.endDate, newEndDate: newEnd },
        },
      });

      return updated;
    });
  }

  private async validatePermissions(managerId: string, userId: string, gymId: string) {
    const [manager, user, gym] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: managerId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.gym.findUnique({ where: { id: gymId } }),
    ]);

    if (!manager) throw new NotFoundException('Manager not found');
    if (!user) throw new NotFoundException('User not found');
    if (!gym) throw new NotFoundException('Gym not found');

    const allowedRoles: Role[] = [Role.MANAGER, Role.OWNER];
    if (!allowedRoles.includes(manager.role)) {
      throw new ForbiddenException('Insufficient role to perform this action');
    }

    if (manager.role === Role.MANAGER && manager.gymId !== gymId) {
      throw new ForbiddenException('Manager can only operate in their assigned gym');
    }
  }

  async processPaidMembership(payload: { userId: string; membershipId: string; paidAt: string }) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: payload.membershipId },
    });

    if (!membership) {
      this.logger.error(`[Error] Membresía con ID ${payload.membershipId} no fue encontrada en la base de datos.`);
      // Al lanzar un error, el consumidor @RabbitSubscribe lo capturará y activará la lógica de reintento.
      throw new NotFoundException(`Membresía ${payload.membershipId} no encontrada.`);
    }

    const today = new Date();
    let newExpirationDate: Date;

    // Lógica para extender la membresía:
    // Si la membresía ya está activa y su fecha de fin es en el futuro,
    // se le suma un mes a su fecha de fin actual (renovación).
    if (membership.status === 'ACTIVE' && membership.endDate > today) {
      newExpirationDate = new Date(membership.endDate);
      newExpirationDate.setMonth(newExpirationDate.getMonth() + 1);
      this.logger.log(`Renovando membresía ${membership.id}.`);
    } else {
      // Si la membresía está expirada o pendiente, se activa por un mes desde hoy.
      newExpirationDate = new Date();
      newExpirationDate.setMonth(today.getMonth() + 1);
      this.logger.log(`Activando membresía ${membership.id}.`);
    }

    await this.prisma.membership.update({
      where: { id: payload.membershipId },
      data: {
        status: 'ACTIVE',
        endDate: newExpirationDate,
      },
    });

    this.logger.log(`Nueva fecha de expiración para ${membership.id}: ${newExpirationDate.toISOString()}`);
  }

  async joinGym(uniqueCode: string, userId: string) {
    this.logger.log(`Usuario ${userId} intenta unirse a gimnasio con código ${uniqueCode}`);

    // 1. Buscar el gimnasio por su código único
    const gym = await this.prisma.gym.findUnique({
      where: { uniqueCode },
    });

    if (!gym) {
      this.logger.warn(`Gimnasio no encontrado con código: ${uniqueCode}`);
      throw new RpcException({ status: 404, message: 'Gimnasio no encontrado con ese código.' });
    }

    this.logger.log(`Gimnasio encontrado: ${gym.name} (ID: ${gym.id})`);

    // 2. Verificar que el usuario no tenga ya una membresía en este gimnasio
    const existingMembership = await this.prisma.membership.findFirst({
      where: {
        userId,
        gymId: gym.id,
      },
    });

    if (existingMembership) {
      this.logger.warn(`Usuario ${userId} ya tiene membresía ${existingMembership.id} en gimnasio ${gym.id} con estado ${existingMembership.status}`);
      throw new RpcException({ status: 409, message: 'El usuario ya es miembro de este gimnasio.' });
    }

    // 3. Crear la membresía en estado PENDIENTE
    const now = new Date();
    const newMembership = await this.prisma.membership.create({
      data: {
        userId,
        gymId: gym.id,
        status: 'PENDING_PAYMENT',
        // Ponemos fechas temporales, se actualizarán con el pago
        startDate: now,
        endDate: now,
      },
    });

    this.logger.log(`Membresía ${newMembership.id} creada para usuario ${userId} en gimnasio ${gym.id} con estado PENDING_PAYMENT.`);

    // 4. Devolver el ID de la nueva membresía
    return {
      message: 'Te has unido al gimnasio exitosamente. Ahora puedes proceder al pago.',
      membershipId: newMembership.id,
      gymName: gym.name,
    };
  }
}

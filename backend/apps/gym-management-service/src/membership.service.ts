import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from './prisma/prisma.service';
import { ActivateMembershipDto } from './dto/activate-membership.dto';
import { RenewMembershipDto } from './dto/renew-membership.dto';
import { Role } from '../prisma/generated/gym-client';

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async activate(dto: ActivateMembershipDto, managerId: string) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin.');
    }

    // 1. OBTENER DATOS DEL MANAGER QUE HACE LA PETICIÓN (VALIDACIÓN DE SEGURIDAD)
    const manager = await this.prisma.user.findUnique({ where: { id: managerId } });
    if (!manager) {
      throw new NotFoundException('Manager no encontrado');
    }
    if (!manager.gymId) {
      throw new ForbiddenException('No tienes permisos o no estás asignado a un gimnasio.');
    }

    // 2. LA VALIDACIÓN DE SEGURIDAD CLAVE
    // Buscamos una membresía que cumpla TRES condiciones a la vez:
    //   a) Pertenece al `userId` que se quiere activar.
    //   b) Está asociada al `gymId` DEL MANAGER que está logueado.
    //   c) Su estado es 'PENDING_PAYMENT'.
    const pendingMembership = await this.prisma.membership.findFirst({
      where: {
        userId: dto.userId,
        gymId: manager.gymId, // <-- ¡ESTA ES LA "FLAG" DE SEGURIDAD!
        status: 'PENDING_PAYMENT',
      },
    });

    // 3. SI NO SE ENCUENTRA, SE RECHAZA LA OPERACIÓN
    if (!pendingMembership) {
      throw new NotFoundException(
        `Acción denegada. No se encontró una membresía pendiente para este usuario en tu gimnasio. El usuario debe usar el "código de invitación" del gimnasio primero.`
      );
    }

    // 4. SI LA VALIDACIÓN PASA, PROCEDEMOS CON LA ACTIVACIÓN
    return this.prisma.$transaction(async (tx) => {
      // Actualizar la membresía a ACTIVA (no crear una nueva)
      const activatedMembership = await tx.membership.update({
        where: { id: pendingMembership.id },
        data: {
          status: 'ACTIVE',
          startDate: startDate,
          endDate: endDate,
          activatedById: managerId,
        },
      });

      // Crear el log de auditoría
      await tx.membershipLog.create({
        data: {
          membershipId: activatedMembership.id,
          action: 'ACTIVATED',
          performedById: managerId,
          reason: dto.reason ?? 'Activación manual (pago en efectivo)',
          details: { startDate: dto.startDate, endDate: dto.endDate, amount: dto.amount },
        },
      });

      // Emitir el evento para que Payment Service cree el pago
      const eventPayload = {
        userId: dto.userId,
        membershipId: activatedMembership.id,
        amount: dto.amount,
        method: 'CASH', // Método para activación manual
        reason: dto.reason ?? 'Activación manual (pago en efectivo)',
        activatedBy: managerId,
      };

      await this.amqpConnection.publish(
        'gymcore-exchange',
        'membership.activated.manually',
        eventPayload,
        { persistent: true }
      );
      
      this.logger.log(`Evento 'membership.activated.manually' emitido para membresía ${activatedMembership.id}`);

      // Evento base para analytics
      await this.amqpConnection.publish(
        'gymcore-exchange',
        'membership.activated',
        {
          userId: dto.userId,
          membershipType: 'MANUAL_CASH',
          gymId: activatedMembership.membership?.gymId,
          activatedAt: new Date().toISOString(),
        },
        { persistent: true }
      );
      
      this.logger.log(`Evento 'membership.activated' emitido para analytics`);

      // También emitir evento para notificación por email
      const notificationPayload = {
        membershipId: activatedMembership.id,
        userId: dto.userId,
        activationDate: new Date().toISOString(),
        membershipType: 'Activación Manual (Efectivo)',
      };

      await this.amqpConnection.publish(
        'gymcore-exchange',
        'membership.activated.notification',
        notificationPayload,
        { persistent: true }
      );

      this.logger.log(`Evento de notificación emitido para membresía ${activatedMembership.id}`);

      return activatedMembership;
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
      throw new NotFoundException(`Membresía ${payload.membershipId} no encontrada.`);
    }

    // La fecha de inicio siempre será la fecha del pago (paidAt)
    const startDate = new Date(payload.paidAt);
    let endDate: Date;

    // Si la membresía ya está activa y no ha expirado, extendemos desde la fecha actual de fin
    if (membership.status === 'ACTIVE' && membership.endDate && membership.endDate > new Date()) {
      this.logger.log(`Renovando membresía ${membership.id} - extendiéndo desde fecha actual de fin`);
      endDate = new Date(membership.endDate);
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      // Primera activación o reactivación - 30 días desde la fecha de pago
      this.logger.log(`Activando membresía ${membership.id} - 30 días desde fecha de pago`);
      endDate = new Date(startDate);
      endDate.setMonth(startDate.getMonth() + 1);
    }

    await this.prisma.membership.update({
      where: { id: payload.membershipId },
      data: {
        status: 'ACTIVE',
        startDate: startDate,
        endDate: endDate,
        // Indicamos que fue activado automáticamente por el sistema de pagos
        activatedById: null, // Sistema automático, no un manager específico
      },
    });

    this.logger.log(`✅ Membresía ${membership.id} procesada. Inicio: ${startDate.toISOString()}, Fin: ${endDate.toISOString()}`);
  }

  async joinGym(uniqueCode: string, userId: string) {
    this.logger.log(`Usuario ${userId} intenta unirse a gimnasio con código ${uniqueCode}`);

    // 1. Buscar el gimnasio por su código único
    const gym = await this.prisma.gym.findUnique({
      where: { uniqueCode },
    });

    if (!gym) {
      this.logger.warn(`Gimnasio no encontrado con código: ${uniqueCode}`);
      throw new RpcException({ 
        status: 404, 
        message: 'Gimnasio no encontrado con ese código.' 
      });
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
      throw new RpcException({ 
        status: 409, 
        message: 'El usuario ya es miembro de este gimnasio.' 
      });
    }

    // 3. Crear la membresía y actualizar el gymId del usuario en una transacción
    return this.prisma.$transaction(async (tx) => {
      // ⚠️ IMPORTANTE: Las fechas 2000-01-01 son placeholders que se filtran en analytics
      // TODO: Migrar esquema para permitir startDate/endDate nullable y usar null
      // TODO: Alternativamente, añadir campo isPlaceholder: boolean para filtrar en reportes
      const placeholderDate = new Date('2000-01-01T00:00:00.000Z'); // Fecha claramente placeholder
      
      const newMembership = await tx.membership.create({
        data: {
          userId,
          gymId: gym.id,
          status: 'PENDING_PAYMENT',
          // Fechas placeholder que se actualizarán cuando se complete el pago
          startDate: placeholderDate,
          endDate: placeholderDate,
        },
      });

      // ← NUEVO: Actualizar el gymId en la tabla user de este servicio
      await tx.user.update({
        where: { id: userId },
        data: { gymId: gym.id },
      });

      this.logger.log(
        `Membresía ${newMembership.id} creada y gymId ${gym.id} asignado al usuario ${userId}.`,
      );

      // 4. Devolver el ID de la nueva membresía con el gymId incluido
      return {
        message:
          'Te has unido al gimnasio exitosamente. Ahora puedes proceder al pago.',
        membershipId: newMembership.id,
        gymName: gym.name,
        gymId: gym.id, // ← Incluir gymId en la respuesta para usar en el API Gateway
      };
    });
  }
}

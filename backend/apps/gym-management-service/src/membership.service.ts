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

  private async invalidateCache(userId: string) {
    this.logger.log(`[Cache Invalidation] Emitting event for user ${userId}`);
    await this.amqpConnection.publish('gymcore-exchange', 'membership.updated', { userId });
  }
  
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
    this.logger.log(`🔄 Iniciando activación de membresía para usuario ${dto.userId}`);
    this.logger.log(`📅 Fechas de membresía - Inicio: ${startDate.toISOString()}, Fin: ${endDate.toISOString()}`);
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

      // Invalidate cache after successful activation
      await this.invalidateCache(dto.userId);

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
        gymId: manager.gymId, // ← Incluir gymId para Analytics
      };

      await this.amqpConnection.publish(
        'gymcore-exchange',
        'membership.activated.manually',
        eventPayload,
        { persistent: true }
      );
      
      this.logger.log(`Evento 'membership.activated.manually' emitido para membresía ${activatedMembership.id}`);

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

      // Log final con resumen completo de la membresía activada
      this.logger.log(`✅ MEMBRESÍA ACTIVADA EXITOSAMENTE:`);
      this.logger.log(`   • ID Membresía: ${activatedMembership.id}`);
      this.logger.log(`   • Usuario ID: ${dto.userId}`);
      this.logger.log(`   • Fecha de Inicio: ${startDate.toLocaleDateString('es-ES')} (${startDate.toISOString()})`);
      this.logger.log(`   • Fecha de Fin: ${endDate.toLocaleDateString('es-ES')} (${endDate.toISOString()})`);
      this.logger.log(`   • Duración: ${Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} días`);
      this.logger.log(`   • Monto: $${dto.amount || 0} USD`);
      this.logger.log(`   • Activado por Manager: ${managerId}`);

      return activatedMembership;
    });
  }

  /**
   * Verifica si un usuario tiene una membresía activa en este momento.
   * @param userId - El ID del usuario a verificar.
   * @returns El objeto de la membresía si está activa, de lo contrario null.
   */
  async getActiveMembership(userId: string) {
    this.logger.log(`Buscando membresía activa para el usuario: ${userId}`);
    const now = new Date();
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: userId,
        status: 'ACTIVE', // Solo membresías con estado ACTIVO
        startDate: { lte: now }, // La fecha de inicio ya pasó
        endDate: { gte: now }, // La fecha de fin aún no ha llegado
      },
    });
    return membership;
  }
  
  async renew(dto: RenewMembershipDto, managerId: string) {
    const membership = await this.prisma.membership.findUnique({ where: { id: dto.membershipId } });
    if (!membership) throw new NotFoundException('Membership not found');

    const newEnd = new Date(dto.newEndDate);
    const today = new Date();
    
    // Validación mejorada: permitir renovar membresías expiradas
    // Solo validar que la nueva fecha de fin sea posterior a hoy
    if (newEnd <= today) {
      throw new BadRequestException('La nueva fecha de finalización debe ser posterior a hoy');
    }

    await this.validatePermissions(managerId, membership.userId, membership.gymId);

    this.logger.log(`🔄 Iniciando renovación de membresía ${dto.membershipId}`);
    this.logger.log(`📅 Nueva fecha de finalización: ${newEnd.toISOString()}`);

    return this.prisma.$transaction(async (tx) => {
      // Determinar la fecha de inicio para la renovación
      let startDate: Date;
      if (membership.endDate && membership.endDate > today) {
        // Si la membresía aún está activa, extender desde la fecha actual de fin
        startDate = membership.endDate;
      } else {
        // Si la membresía está expirada, comenzar desde hoy
        startDate = today;
      }

      const updated = await tx.membership.update({
        where: { id: membership.id },
        data: { 
          endDate: newEnd, 
          startDate: startDate,
          status: 'ACTIVE',
          activatedById: managerId 
        },
      });

      await this.invalidateCache(membership.userId);

      await tx.membershipLog.create({
        data: {
          membershipId: membership.id,
          action: 'RENEWED',
          performedById: managerId,
          reason: dto.reason ?? 'Renovación manual (pago en efectivo)',
          details: { 
            oldEndDate: membership.endDate, 
            newEndDate: newEnd,
            newStartDate: startDate,
            wasExpired: membership.endDate <= today,
            amount: dto.amount
          },
        },
      });

      // Si se especifica un monto, emitir evento para crear registro de pago
      if (dto.amount) {
        const eventPayload = {
          userId: membership.userId,
          membershipId: membership.id,
          amount: dto.amount,
          method: 'CASH',
          reason: dto.reason ?? 'Renovación manual (pago en efectivo)',
          renewedBy: managerId,
          gymId: membership.gymId, // ← Incluir gymId para Analytics
        };

        await this.amqpConnection.publish(
          'gymcore-exchange',
          'membership.renewed.manually',
          eventPayload,
          { persistent: true }
        );
        
        this.logger.log(`Evento 'membership.renewed.manually' emitido para membresía ${membership.id}`);
      }

      this.logger.log(`✅ MEMBRESÍA RENOVADA EXITOSAMENTE:`);
      this.logger.log(`   • ID Membresía: ${updated.id}`);
      this.logger.log(`   • Nueva fecha de inicio: ${startDate.toLocaleDateString('es-ES')}`);
      this.logger.log(`   • Nueva fecha de fin: ${newEnd.toLocaleDateString('es-ES')}`);
      this.logger.log(`   • Renovado por Manager: ${managerId}`);

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

    // 🛠️ CORRECCIÓN: Evitar procesar membresías ya activadas manualmente
    if (membership.status === 'ACTIVE' && membership.activatedById) {
      this.logger.warn(`⚠️ Membresía ${payload.membershipId} ya fue activada manualmente por manager ${membership.activatedById}. Ignorando evento de pago automático.`);
      return; // Salir sin hacer nada
    }

    // --- CORRECCIÓN DE LÓGICA DE FECHAS ---
    let startDate: Date;
    let endDate: Date;

    // La fecha de pago siempre debe ser una fecha válida
    const paymentDate = new Date(payload.paidAt);
    
    // Validación crítica: asegurarnos que la fecha de pago es válida
    if (isNaN(paymentDate.getTime())) {
      this.logger.error(`Error crítico: Fecha de pago inválida recibida: ${payload.paidAt}`);
      throw new Error('Fecha de pago inválida proporcionada.');
    }

    // Si la membresía ya está activa y no ha expirado, extendemos desde la fecha de fin actual.
    if (membership.status === 'ACTIVE' && membership.endDate && new Date() < membership.endDate) {
      this.logger.log(`Renovando membresía ${membership.id}. Extendiendo desde la fecha de fin actual.`);
      startDate = new Date(membership.endDate); // La nueva fecha de inicio es el fin de la anterior
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      // Es una primera activación o una reactivación de una membresía expirada.
      // La fecha de inicio es la fecha del pago.
      this.logger.log(`Activando membresía ${membership.id}. Iniciando desde la fecha de pago.`);
      startDate = paymentDate;
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    }
    
    // Validación final: nos aseguramos de que las fechas calculadas son válidas
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      this.logger.error(`Error crítico: Fechas inválidas calculadas para membresía ${membership.id}`);
      this.logger.error(`startDate: ${startDate}, endDate: ${endDate}`);
      throw new Error('No se pudo calcular una fecha de inicio/fin válida.');
    }
    // --- FIN DE LA CORRECCIÓN ---

    await this.prisma.membership.update({
      where: { id: payload.membershipId },
      data: {
        status: 'ACTIVE',
        startDate: startDate, // Usamos la fecha corregida y validada
        endDate: endDate,     // Usamos la fecha corregida y validada
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

  async ban(membershipId: string, managerId: string, reason?: string) {
    const membership = await this.prisma.membership.findUnique({ where: { id: membershipId }});
    if (!membership) throw new NotFoundException('Membresía no encontrada');

    // ⛔ solo el manager/owner del mismo gym
    await this.validatePermissions(managerId, membership.userId, membership.gymId);

    if (membership.status === 'BANNED') {
      throw new ConflictException('La membresía ya está baneada');
    }

    return this.prisma.$transaction(async tx => {
      const banned = await tx.membership.update({
        where: { id: membershipId },
        data : { status: 'BANNED' },
      });

      await this.invalidateCache(membership.userId);

      await tx.membershipLog.create({
        data: {
          membershipId,
          action: 'BANNED',
          performedById: managerId,
          reason: reason ?? 'Baneo manual del socio',
        },
      });

      // 🚪 Notificar a biometric-service para invalidar huella / QR
      await this.amqpConnection.publish(
        'gymcore-exchange',
        'membership.banned',
        { membershipId, userId: membership.userId, gymId: membership.gymId },
        { persistent: true },
      );

      return banned;
    });
  }

  async getMemberDashboard(userId: string) {
    this.logger.log(`Buscando información de dashboard para el usuario: ${userId}`);

    const membership = await this.prisma.membership.findFirst({
      where: { userId },
      include: {
        gym: true, // Incluir datos del gimnasio asociado
      },
    });

    if (!membership) {
      this.logger.warn(`No se encontró membresía para el usuario ${userId}`);
      throw new RpcException({
        status: 404,
        message: 'No se encontró ninguna membresía para este usuario.',
      });
    }

    this.logger.log(`Membresía encontrada ${membership.id} para el usuario ${userId}`);

    // Devolver un objeto limpio y estructurado para el frontend
    return {
      membershipId: membership.id,
      status: membership.status,
      startDate: membership.startDate,
      endDate: membership.endDate,
      gym: {
        id: membership.gym.id,
        name: membership.gym.name,
      },
    };
  }

  async getMyMembership(userId: string) {
    this.logger.log(`Buscando membresía actual para el usuario: ${userId}`);

    // Primero verificamos si el usuario está asociado a un gimnasio
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gymId: true }
    });
    
    if (!user?.gymId) {
      this.logger.warn(`El usuario ${userId} no está asociado a ningún gimnasio`);
      return { hasGym: false };
    }
    
    // Buscamos la membresía más reciente del usuario en su gimnasio
    const membership = await this.prisma.membership.findFirst({
      where: { 
        userId,
        gymId: user.gymId 
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
            uniqueCode: true
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!membership) {
      this.logger.warn(`No se encontró membresía para el usuario ${userId} en el gimnasio ${user.gymId}`);
      return { 
        hasGym: true,
        gymId: user.gymId,
        hasMembership: false 
      };
    }

    // Verificar si la membresía está activa (no expirada)
    const now = new Date();
    const isExpired = membership.status === 'ACTIVE' && membership.endDate < now;
    
    if (isExpired) {
      this.logger.log(`La membresía ${membership.id} del usuario ${userId} está expirada`);
    }

    return {
      hasGym: true,
      hasMembership: true,
      membershipId: membership.id,
      status: isExpired ? 'EXPIRED' : membership.status,
      startDate: membership.startDate,
      endDate: membership.endDate,
      isExpired,
      gym: membership.gym,
      user: membership.user
    };
  }
  
  async updateMemberProfile(userId: string, data: { firstName?: string; lastName?: string }) {
    this.logger.log(`Actualizando perfil de miembro para el usuario: ${userId}`);
    
    // Verificar si el usuario existe y es un miembro
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, gymId: true }
    });
    
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }
    
    if (!user.gymId) {
      throw new BadRequestException(`El usuario no está asociado a ningún gimnasio`);
    }
    
    // Buscar la membresía actual del usuario
    const membership = await this.prisma.membership.findFirst({
      where: { 
        userId,
        gymId: user.gymId 
      }
    });
    
    if (!membership) {
      throw new NotFoundException(`No se encontró membresía para el usuario en el gimnasio`);
    }
    
    // Actualizar los datos del miembro en la tabla de membresía
    try {
      const updatedMembership = await this.prisma.membership.update({
        where: { id: membership.id },
        data: {
          user: {
            update: {
              firstName: data.firstName,
              lastName: data.lastName
            }
          }
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
      
      this.logger.log(`Perfil de miembro actualizado exitosamente para el usuario ${userId}`);
      
      return {
        success: true,
        user: updatedMembership.user
      };
    } catch (error: any) {
      this.logger.error(`Error al actualizar perfil de miembro: ${error.message}`);
      throw new RpcException({
        status: 500,
        message: 'Error al actualizar el perfil del miembro'
      });
    }
  }
}

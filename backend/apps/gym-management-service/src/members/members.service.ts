import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import { RpcException, ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto, UpdateMemberDto, ListMembersDto } from './dto';
import { Role } from '../../../gym-management-service/prisma/generated/gym-client';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async list(gymId: string, dto: ListMembersDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;
    
    // Construir filtros
    const where: any = {
      gymId,
      role: 'MEMBER',
    };

    // Filtro por estado (activo/eliminado)
    if (dto.status === 'active') {
      where.deletedAt = null;
    } else if (dto.status === 'deleted') {
      where.deletedAt = { not: null };
    } else {
      // Por defecto, solo mostrar activos
      where.deletedAt = null;
    }

    // Filtro de búsqueda
    if (dto.search) {
      where.OR = [
        { firstName: { contains: dto.search, mode: 'insensitive' } },
        { lastName: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

 const [items, total] = await Promise.all([
  this.prisma.user.findMany({
    where,
    skip,
    take: dto.limit,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      memberships: {
        // Remover el filtro de status: 'ACTIVE' para incluir BANNED y otros estados
        orderBy: {
          endDate: 'desc'
        },
        take: 1,
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  }),
  this.prisma.user.count({ where }),
]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, gymId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        gymId,
        role: 'MEMBER',
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new RpcException({
        status: 404,
        message: 'Socio no encontrado',
      });
    }

    return user;
  }

  async create(gymId: string, dto: CreateMemberDto) {
    this.logger.log(`Creando socio ${dto.email} para gym ${gymId}`);
    
    try {
      // 1) Verificar que el email no existe en este gym
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          gymId,
          deletedAt: null,
        },
      });

      if (existingUser) {
        throw new RpcException({
          status: 409,
          message: 'Ya existe un socio con este email en el gimnasio',
        });
      }

      // 2) Crear en auth-service con contraseña temporal
      const payload = {
        ...dto,
        gymId,
        role: dto.role || 'MEMBER',
        password: this.generateTempPassword(),
      };

      const created = await firstValueFrom(
        this.authClient.send({ cmd: 'register' }, payload)
      );

      this.logger.log(`Socio ${dto.email} creado exitosamente`);
      return created;

    } catch (err) {
      this.logger.error(`Error creando socio ${dto.email}:`, err);
      if (err instanceof RpcException) {
        throw err;
      }
      throw new RpcException({
        status: 500,
        message: 'Error interno del servidor',
      });
    }
  }

  async update(id: string, gymId: string, dto: UpdateMemberDto) {
    // Verificar que el socio existe
    const currentUser = await this.findOne(id, gymId);

    try {
      // Verificar si el email ha cambiado
      const emailChanged = dto.email && dto.email !== currentUser.email;

      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          ...dto,
          role: dto.role ? dto.role as Role : undefined,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Si el email cambió, emitir evento para sincronizar con auth-service
      if (emailChanged) {
        await this.amqpConnection.publish(
          'gymcore-exchange',
          'user.email.updated',
          { 
            userId: id, 
            newEmail: dto.email 
          },
          { persistent: true }
        );
        this.logger.log(`📤 Evento user.email.updated publicado para usuario ${id}`);
      }

      this.logger.log(`Socio ${id} actualizado exitosamente`);
      return updated;

    } catch (err) {
      this.logger.error(`Error actualizando socio ${id}:`, err);
      throw new RpcException({
        status: 500,
        message: 'Error actualizando el socio',
      });
    }
  }

  async remove(id: string, gymId: string) {
    // Verificar que el socio existe
    await this.findOne(id, gymId);

    try {
      const deleted = await this.prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          deletedAt: true,
        },
      });

      this.logger.log(`Socio ${id} eliminado exitosamente`);
      return deleted;

    } catch (err) {
      this.logger.error(`Error eliminando socio ${id}:`, err);
      throw new RpcException({
        status: 500,
        message: 'Error eliminando el socio',
      });
    }
  }

 async changeRole(
    managerId: string,
    targetUserId: string,
    role: 'MEMBER' | 'RECEPTIONIST',
  ) {
    const validRoles = ['MEMBER', 'RECEPTIONIST'];
    if (!validRoles.includes(role))
      throw new BadRequestException('Rol no permitido');

    // se delega al auth-service
    return firstValueFrom(
      this.authClient.send(
        { cmd: 'assign_role' },
        { managerId, targetUserId, role },
      ),
    );
  }

  @EventPattern('user.role.updated')
  async onUserRoleUpdated(
    @Payload() data: { userId: string; newRole: string },
  ) {
    this.logger.log(`🔄 Sincronizando rol para usuario ${data.userId}: ${data.newRole}`);
    try {
      await this.prisma.user.update({
        where: { id: data.userId },
        data: { role: data.newRole as any },
      });
      this.logger.log(`✅ Rol sincronizado para usuario ${data.userId}`);
    } catch (error) {
      this.logger.error(`❌ Error sincronizando rol para usuario ${data.userId}:`, error);
      // Dependiendo de la estrategia de manejo de errores, podrías reintentar o loguear más detalles
    }
  }

  /** Importación masiva */
  async bulkCreate(gymId: string, members: CreateMemberDto[]) {
    this.logger.log(`Iniciando importación masiva de ${members.length} socios para gym ${gymId}`);
    
    const results = await Promise.allSettled(
      members.map(dto => this.create(gymId, dto))
    );

    const errors = results
      .map((r, i) => {
        if (r.status === 'rejected') {
          return {
            row: i + 1,
            email: members[i].email,
            error: r.reason?.message ?? 'Error desconocido',
          };
        }
        return null;
      })
      .filter(x => x !== null);

    const successCount = results.length - errors.length;

    this.logger.log(`Importación completada: ${successCount}/${members.length} exitosos`);
    
    return {
      total: members.length,
      successCount,
      errorCount: errors.length,
      errors,
    };
  }

  private generateTempPassword(): string {
    return Math.random().toString(36).slice(-8) + '!';
  }

  async joinGym(userId: string, uniqueCode: string) {
    this.logger.log(`Usuario ${userId} intentando unirse al gimnasio con código ${uniqueCode}`);
    
    try {
      // 1. Buscar el gimnasio por código único
      const gym = await this.prisma.gym.findUnique({
        where: { uniqueCode },
        select: {
          id: true,
          name: true,
          uniqueCode: true,
        },
      });

      if (!gym) {
        throw new RpcException({
          status: 404,
          message: 'Código de gimnasio inválido',
        });
      }

      // 2. Verificar si el usuario ya pertenece a un gimnasio
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { gymId: true },
      });

      if (existingUser?.gymId) {
        throw new RpcException({
          status: 409,
          message: 'Ya perteneces a un gimnasio',
        });
      }

      // 3. Asignar el usuario al gimnasio
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { 
          gymId: gym.id,
          role: 'MEMBER',
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          gymId: true,
          role: true,
        },
      });

      // 4. Emitir evento para sincronizar con auth-service
      await this.amqpConnection.publish(
        'gymcore-exchange',
        'user.gym.assigned',
        { 
          userId, 
          gymId: gym.id,
          gymName: gym.name 
        },
        { persistent: true }
      );

      this.logger.log(`✅ Usuario ${userId} se unió exitosamente al gimnasio ${gym.name}`);
      
      return {
        success: true,
        message: `Te has unido exitosamente a ${gym.name}`,
        gym: {
          id: gym.id,
          name: gym.name,
        },
        user: updatedUser,
      };

    } catch (err) {
      this.logger.error(`Error al unir usuario ${userId} al gimnasio:`, err);
      if (err instanceof RpcException) {
        throw err;
      }
      throw new RpcException({
        status: 500,
        message: 'Error interno al unirse al gimnasio',
      });
    }
  }

  async findMemberById(userId: string) {
    this.logger.log(`Obteniendo perfil completo para usuario ${userId}`);
    
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          gymId: true,
          createdAt: true,
          updatedAt: true,
          gym: {
            select: {
              id: true,
              name: true,
              uniqueCode: true,
            },
          },
          memberships: {
            where: {
              status: { in: ['ACTIVE', 'PENDING_PAYMENT', 'EXPIRED'] }
            },
            orderBy: {
              endDate: 'desc'
            },
            take: 1,
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              // El campo amount no existe en el modelo Membership
            }
          }
        },
      });

      if (!user) {
        throw new RpcException({
          status: 404,
          message: 'Usuario no encontrado',
        });
      }

      // Formatear respuesta con campos normalizados para estandarizar el contrato de datos
      const membership = user.memberships[0] || null;
      const response = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        gymId: user.gymId,
        hasGym: !!user.gymId,
        gym: user.gym,
        // Incluimos la membresía original para compatibilidad
        membership: membership,
        // Campos normalizados para acceso directo en el frontend
        membershipStatus: membership?.status || null,
        membershipStartDate: membership?.startDate || null,
        membershipEndDate: membership?.endDate || null,
        membershipId: membership?.id || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      this.logger.log(`✅ Perfil obtenido para usuario ${userId}`);
      return response;

    } catch (err) {
      this.logger.error(`Error obteniendo perfil de usuario ${userId}:`, err);
      if (err instanceof RpcException) {
        throw err;
      }
      throw new RpcException({
        status: 500,
        message: 'Error obteniendo perfil de usuario',
      });
    }
  }

  async updateMemberProfile(userId: string, data: { firstName?: string; lastName?: string; email?: string }) {
    this.logger.log(`Actualizando perfil local para usuario ${userId}`);
    
    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          updatedAt: true,
        },
      });

      this.logger.log(`✅ Perfil local actualizado para usuario ${userId}`);
      return updated;

    } catch (err) {
      this.logger.error(`Error actualizando perfil local de usuario ${userId}:`, err);
      throw new RpcException({
        status: 500,
        message: 'Error actualizando perfil local',
      });
    }
  }
}

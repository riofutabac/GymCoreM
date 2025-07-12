import { Injectable, Logger, Inject } from '@nestjs/common';
import { RpcException, ClientProxy } from '@nestjs/microservices';
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
    select: { // <-- AÑADIR ESTO
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      memberships: {
        where: {
          status: 'ACTIVE'
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

  async changeRole(id: string, gymId: string, role: string) {
    // Verificar que el usuario existe en el gimnasio (sin filtrar por rol específico)
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        gymId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new RpcException({
        status: 404,
        message: 'Usuario no encontrado en este gimnasio',
      });
    }

    // Validar el rol
    const validRoles = ['MEMBER', 'RECEPTIONIST'];
    if (!validRoles.includes(role)) {
      throw new RpcException({
        status: 400,
        message: 'Rol no válido. Los roles permitidos son: MEMBER, RECEPTIONIST',
      });
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          role: role as any,
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

      // Emitir evento para sincronizar con auth-service
      await this.amqpConnection.publish(
        'gymcore-exchange',
        'user.role.updated',
        { 
          userId: id, 
          newRole: role,
          gymId: gymId 
        },
        { persistent: true }
      );
      this.logger.log(`📤 Evento user.role.updated publicado para usuario ${id}`);

      this.logger.log(`Rol de socio ${id} cambiado a ${role} exitosamente`);
      return updated;

    } catch (err) {
      this.logger.error(`Error cambiando rol de socio ${id}:`, err);
      throw new RpcException({
        status: 500,
        message: 'Error cambiando el rol del socio',
      });
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
}

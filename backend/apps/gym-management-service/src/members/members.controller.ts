import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto, ListMembersDto } from './dto';

@Controller()
export class MembersController {
  private readonly logger = new Logger(MembersController.name);

  constructor(private readonly membersService: MembersService) {}

  @MessagePattern({ cmd: 'members_list' })
  async list(@Payload() payload: { gymId: string; dto: ListMembersDto }) {
    this.logger.log(`Listando socios para gym ${payload.gymId}`);
    return this.membersService.list(payload.gymId, payload.dto);
  }

  @MessagePattern({ cmd: 'members_get' })
  async get(@Payload() payload: { gymId: string; id: string }) {
    this.logger.log(`Obteniendo socio ${payload.id} para gym ${payload.gymId}`);
    return this.membersService.findOne(payload.id, payload.gymId);
  }

  @MessagePattern({ cmd: 'members_create' })
  async create(@Payload() payload: { gymId: string; dto: CreateMemberDto }) {
    this.logger.log(`Creando socio para gym ${payload.gymId}`);
    return this.membersService.create(payload.gymId, payload.dto);
  }

  @MessagePattern({ cmd: 'members_update' })
  async update(@Payload() payload: { gymId: string; id: string; dto: UpdateMemberDto }) {
    this.logger.log(`Actualizando socio ${payload.id} para gym ${payload.gymId}`);
    return this.membersService.update(payload.id, payload.gymId, payload.dto);
  }

  @MessagePattern({ cmd: 'members_remove' })
  async remove(@Payload() payload: { gymId: string; id: string }) {
    this.logger.log(`Eliminando socio ${payload.id} para gym ${payload.gymId}`);
    return this.membersService.remove(payload.id, payload.gymId);
  }

  @MessagePattern({ cmd: 'members_change_role' })
  async changeRole(@Payload() payload: { gymId: string; id: string; role: string }) {
    this.logger.log(`Cambiando rol de socio ${payload.id} a ${payload.role} para gym ${payload.gymId}`);
    return this.membersService.changeRole(payload.id, payload.gymId, payload.role);
  }

  @MessagePattern({ cmd: 'members_bulk_create' })
  async bulkCreate(@Payload() payload: { gymId: string; members: CreateMemberDto[] }) {
    this.logger.log(`Importación masiva de ${payload.members.length} socios para gym ${payload.gymId}`);
    return this.membersService.bulkCreate(payload.gymId, payload.members);
  }
}

import { Controller, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';
import { ActivateMembershipDto } from './dto/activate-membership.dto';
import { RenewMembershipDto } from './dto/renew-membership.dto';
import { MembershipService } from './membership.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly membershipService: MembershipService,
  ) {}

  @MessagePattern({ cmd: 'get_hello' })
  getHello(): string {
    return this.appService.getHello();
  }

  @MessagePattern({ cmd: 'create_gym' })
  createGym(@Payload() createGymDto: CreateGymDto) {
    return this.appService.createGym(createGymDto);
  }

  @MessagePattern({ cmd: 'find_all_gyms' })
  findAllGyms() {
    return this.appService.findAllGyms();
  }

  @MessagePattern({ cmd: 'find_all_public_gyms' })
  findAllPublicGyms() {
    return this.appService.findAllPublicGyms();
  }

  @MessagePattern({ cmd: 'update_gym' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateGym(@Payload() payload: { id: string; data: UpdateGymDto }) {
    this.logger.log(`Actualizando gimnasio ${payload.id}`);
    return this.appService.updateGym(payload.id, payload.data);
  }

  @MessagePattern({ cmd: 'deactivate_gym' })
  deactivateGym(@Payload() payload: { id: string }) {
    this.logger.log(`Desactivando gimnasio ${payload.id}`);
    return this.appService.deactivateGym(payload.id);
  }

  @MessagePattern({ cmd: 'reactivate_gym' })
  reactivateGym(@Payload() payload: { id: string }) {
    this.logger.log(`Reactivando gimnasio ${payload.id}`);
    return this.appService.reactivateGym(payload.id);
  }

  @MessagePattern({ cmd: 'activate_membership' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  activateMembership(@Payload() payload: { dto: ActivateMembershipDto; managerId: string }) {
    return this.membershipService.activate(payload.dto, payload.managerId);
  }

  @MessagePattern({ cmd: 'renew_membership' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  renewMembership(@Payload() payload: { dto: RenewMembershipDto; managerId: string }) {
    return this.membershipService.renew(payload.dto, payload.managerId);
  }

  @MessagePattern({ cmd: 'get_membership_details' })
  getMembershipDetails(@Payload() data: { membershipId: string }) {
    return {
      id: data.membershipId,
      name: 'Membresía Premium',
      price: 29.99,
    };
  }

  @MessagePattern({ cmd: 'join_gym' })
  joinGym(@Payload() payload: { uniqueCode: string; userId: string }) {
    return this.membershipService.joinGym(payload.uniqueCode, payload.userId);
  }

  @MessagePattern({ cmd: 'count_active_gyms' })
  async countActiveGyms() {
    return this.appService.countActiveGyms();
  }

  @MessagePattern({ cmd: 'export_members_report' })
  async exportMembersReport(@Payload() payload: { managerId: string }) {
    this.logger.log(`Exportando reporte de miembros para manager ${payload.managerId}`);
    return this.appService.exportMembersReport(payload.managerId);
  }

  @MessagePattern({ cmd: 'get_membership_stats' })
  async getMembershipStats(@Payload() payload: { gymId: string; today: string; startOfMonth: string }) {
    this.logger.log(`Obteniendo estadísticas de membresías para gym ${payload.gymId}`);
    return this.appService.getMembershipStats(payload.gymId, payload.today, payload.startOfMonth);
  }

  @MessagePattern({ cmd: 'ban_membership' })
  banMembership(@Payload() p: { membershipId: string; managerId: string; reason?: string }) {
    return this.membershipService.ban(p.membershipId, p.managerId, p.reason);
  }

  @MessagePattern({ cmd: 'get_membership_gym' })
  async getMembershipGym(@Payload() payload: { membershipId: string }) {
    this.logger.log(`Obteniendo información de gimnasio para membresía ${payload.membershipId}`);
    return this.appService.getMembershipGym(payload.membershipId);
  }

  @MessagePattern({ cmd: 'get_user_gym' })
  async getUserGym(@Payload() payload: { userId: string }) {
    this.logger.log(`Obteniendo información de gimnasio para usuario ${payload.userId}`);
    return this.appService.getUserGym(payload.userId);
  }
}
import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AppService } from './app.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { ActivateMembershipDto } from './dto/activate-membership.dto';
import { RenewMembershipDto } from './dto/renew-membership.dto';
import { MembershipService } from './membership.service';
import { Role } from '../prisma/generated/gym-client';

interface UserEventPayload {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  gymId?: string;
}

interface RoleUpdatePayload {
  userId: string;
  newRole: string;
  gymId?: string;
}

@Controller()
export class AppController {
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

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'user.created',
    queue: 'gym-management.user.created',
  })
  handleUserCreated(data: UserEventPayload) {
    return this.appService.createLocalUser(data);
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'user.role.updated',
    queue: 'gym-management.user.role.updated',
  })
  handleUserRoleUpdated(data: RoleUpdatePayload) {
    console.log(`🎧 Evento 'user_role_updated' recibido para el usuario ${data.userId}`);
    return this.appService.updateLocalUserRole(data);
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
    // Aquí, idealmente, llamarías a un método en tu `membershipService`
    // Por ahora, podemos simular la respuesta que el `payment-service` espera.
    // Futuro: return this.membershipService.getDetailsById(data.membershipId);
    
    console.log(`Buscando detalles para la membresía: ${data.membershipId}`);
    
    // Simulación de una membresía encontrada en la base de datos
    // En una implementación real, esto vendría de this.prisma.membership.findUnique(...)
    return {
      id: data.membershipId,
      name: 'Membresía Premium',
      price: 29.99, // El precio REAL que no puede ser manipulado por el cliente
    };
  }
}
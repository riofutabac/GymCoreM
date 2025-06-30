import { Controller, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
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

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'user.created',
    queue: 'gym-management.user.created',
  })
  async handleUserCreated(data: UserEventPayload) {
    this.logger.log(`🎧 Evento 'user.created' recibido para el email: ${data.email}`);
    this.logger.debug(`Payload completo recibido:`, JSON.stringify(data));
    try {
      await this.appService.createLocalUser(data);
      this.logger.log(`✅ Usuario ${data.email} sincronizado exitosamente en Gym-Management.`);
    } catch (error) {
      this.logger.error(`❌ Fallo al procesar el evento 'user.created' para ${data.email}`, error.stack);
      // Es crucial manejar el error para que RabbitMQ no entre en un bucle.
      // Aquí podrías enviar el mensaje a una "dead-letter queue" o simplemente ignorarlo para este caso.
    }
  }

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'user.role.updated',
    queue: 'gym-management.user.role.updated',
  })
  async handleUserRoleUpdated(data: RoleUpdatePayload) {
    this.logger.log(`🎧 Evento 'user.role.updated' recibido para el usuario ${data.userId}`);
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
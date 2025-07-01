import { Controller, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AppService } from './app.service';
import { CreateGymDto } from './dto/create-gym.dto';
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

  @RabbitSubscribe({
    exchange: 'gymcore-exchange',
    routingKey: 'payment.completed',
    queue: 'gym-management.payment.completed',
    queueOptions: {
      durable: true,
    },
  })
  public async handlePaymentCompleted(payload: {
    userId: string;
    membershipId: string;
    paidAt: string;
  }) {
    this.logger.log(
      `[EVENTO RECIBIDO] payment.completed para membresía ${payload.membershipId}`,
    );

    try {
      await this.membershipService.processPaidMembership(payload);
      this.logger.log(
        `✅ Membresía ${payload.membershipId} activada exitosamente`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error activando membresía ${payload.membershipId}:`,
        error,
      );
      throw error; // Re-lanzar para que RabbitMQ maneje el reintento
    }
  }

  @MessagePattern({ cmd: 'join_gym' })
  joinGym(@Payload() payload: { uniqueCode: string; userId: string }) {
    return this.membershipService.joinGym(payload.uniqueCode, payload.userId);
  }
}
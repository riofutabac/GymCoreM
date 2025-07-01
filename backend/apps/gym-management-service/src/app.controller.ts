import { Controller, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RabbitSubscribe, Nack, AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AppService } from './app.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { ActivateMembershipDto } from './dto/activate-membership.dto';
import { RenewMembershipDto } from './dto/renew-membership.dto';
import { MembershipService } from './membership.service';

const MAX_RETRIES = 3;

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly membershipService: MembershipService,
    private readonly amqp: AmqpConnection,
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
      // Conecta esta cola con el exchange de mensajes muertos
      deadLetterExchange: 'gymcore-dead-letter-exchange',
      deadLetterRoutingKey: 'payment.completed.dead', // Identificador para los mensajes fallidos de esta cola
    },
  })
  public async handlePaymentCompleted(
    payload: { userId: string; membershipId: string; paidAt: string },
    raw: any, // El segundo argumento da acceso a metadatos del mensaje
  ) {
    const headers = raw.properties.headers || {};
    const retryCount = (headers['x-retry-count'] || 0) + 1;

    this.logger.log(`[Intento #${retryCount}] Procesando 'payment.completed' para membresía ${payload.membershipId}`);

    try {
      await this.membershipService.processPaidMembership(payload);
      this.logger.log(`✅ Membresía ${payload.membershipId} procesada exitosamente.`);
      // Si no hay error, el mensaje se confirma (ack) automáticamente.
    } catch (error) {
      this.logger.error(`[Intento #${retryCount}] Falló el procesamiento para ${payload.membershipId}`, error.stack);

      if (retryCount >= MAX_RETRIES) {
        this.logger.error(`[DLQ] Límite de ${MAX_RETRIES} reintentos alcanzado. Enviando a la Dead Letter Queue.`);
        // Nack(false) => "No Re-encolar". RabbitMQ lo enviará a la DLQ configurada.
        return new Nack(false);
      } else {
        this.logger.warn(`[Reintento] Programando reintento #${retryCount + 1} en 10 segundos.`);
        // Publicamos una copia del mensaje con un delay y el contador de reintentos actualizado.
        await this.amqp.publish('gymcore-exchange', 'payment.completed', payload, {
          expiration: 10000, // 10 segundos
          headers: { 'x-retry-count': retryCount },
          persistent: true,
        });
        // Al no hacer Nack, el mensaje original se considera procesado y se elimina,
        // evitando duplicados. El reintento es una copia nueva.
      }
    }
  }
}
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { AppService } from './app.service';
import { CreateGymDto } from './dto/create-gym.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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

  @EventPattern('user_created')
  handleUserCreated(
    @Payload() data: { id: string; email: string; firstName?: string; lastName?: string },
  ) {
    return this.appService.createLocalUser(data);
  }
}
// backend/apps/auth-service/src/app.controller.ts (VERSIÓN CORREGIDA)

import { Controller, ValidationPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern({ cmd: 'get_health' }) // Para verificar que está vivo
  getHealth(): string {
    return this.appService.getHello();
  }

  @MessagePattern({ cmd: 'register' })
  registerUser(@Payload(new ValidationPipe()) registerUserDto: RegisterUserDto) {
    return this.appService.registerUser(registerUserDto);
  }

  @MessagePattern({ cmd: 'login' })
  loginUser(@Payload(new ValidationPipe()) loginUserDto: LoginUserDto) {
    return this.appService.loginUser(loginUserDto);
  }

  @MessagePattern({ cmd: 'change_role' })
  changeRole(@Payload() data: { userId: string; newRole: string; gymId?: string }) {
    return this.appService.changeRole(data.userId, data.newRole, data.gymId);
  }

  @MessagePattern({ cmd: 'enroll_biometric' })
  enrollBiometric(@Payload() data: { userId: string; template: string }) {
    return this.appService.enrollBiometric(data.userId, data.template);
  }

  @MessagePattern({ cmd: 'get_user_by_id' })
  getUserById(@Payload() data: { userId: string }) {
    return this.appService.getUserById(data.userId);
  }

  @MessagePattern({ cmd: 'get_user_by_template' })
  getUserByTemplate(@Payload() data: { template: string }) {
    return this.appService.getUserByTemplate(data.template);
  }
}
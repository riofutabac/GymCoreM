// backend/apps/auth-service/src/app.controller.ts (VERSIÓN CORREGIDA)

import { Controller, ValidationPipe } from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
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

  @MessagePattern({ cmd: 'get_user_info' })
  async getUserInfo(@Payload() data: { userId: string }) {
    return this.appService.findUserById(data.userId);
  }

  @MessagePattern({ cmd: 'get_staff_users' })
  async getStaffUsers() {
    // Devuelve usuarios que son OWNER, MANAGER o RECEPTIONIST
    return this.appService.findUsersByRole(['OWNER', 'MANAGER', 'RECEPTIONIST']);
  }

  @MessagePattern({ cmd: 'update_user_profile' })
  async updateUserProfile(@Payload() payload: { userId: string; data: { firstName?: string; lastName?: string } }) {
    return this.appService.updateUserProfile(payload.userId, payload.data);
  }

  @MessagePattern({ cmd: 'request_password_reset' })
  async requestPasswordReset(@Payload() data: { email: string }) {
    return this.appService.requestPasswordReset(data.email);
  }

  @MessagePattern({ cmd: 'list_users' })
  async listAllUsers() {
    // Devuelve TODOS los usuarios
    return this.appService.findAllUsers();
  }
  
  @MessagePattern({ cmd: 'update_user' })
  async updateUser(@Payload() payload: { id: string; firstName?: string; lastName?: string; role?: string; gymId?: string }) {
    const { id, ...data } = payload;
    return this.appService.updateUser(id, data);
  }

  @MessagePattern({ cmd: 'get_staff_for_gym' })
  async getStaffForGym(@Payload() data: { managerId: string }) {
    return this.appService.getStaffByGym(data.managerId);
  }

  @MessagePattern({ cmd: 'assign_role' })
  async assignRole(@Payload() data: { managerId: string; targetUserId: string; role: string }) {
    return this.appService.assignRoleInGym(data.managerId, data.targetUserId, data.role);
  }

  @EventPattern('user.email.updated')
  async handleUserEmailUpdate(@Payload() data: { userId: string; newEmail: string }) {
    return this.appService.updateUserAuthEmail(data.userId, data.newEmail);
  }

  @MessagePattern({ cmd: 'reset_password' })
  async resetPassword(@Payload() data: { email: string }) {
    return this.appService.sendPasswordReset(data.email);
  }
}
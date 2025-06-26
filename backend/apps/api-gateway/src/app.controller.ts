// backend/apps/api-gateway/src/app.controller.ts (VERSIÓN CORREGIDA)
import {
  Controller,
  Get,
  Post,
  Inject,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { ActivateMembershipDto } from './dto/activate-membership.dto';
import { RenewMembershipDto } from './dto/renew-membership.dto';

@Controller('v1') // Prefijo para todas las rutas de este controlador
export class AppController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('GYM_SERVICE') private readonly gymClient: ClientProxy,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
  ) {}

  @Post('auth/register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: any) {
    return this.authClient.send({ cmd: 'register' }, body);
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    try {
      // Convertimos la respuesta del microservicio en una Promesa
      const response = await firstValueFrom(
        this.authClient.send({ cmd: 'login' }, body),
      );
      return response;
    } catch (error) {
      // Si el microservicio lanza un error, lo atrapamos aquí
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.message || 'Internal server error';
      // Y lanzamos una excepción HTTP estándar que NestJS sí entiende a la perfección
      throw new HttpException(message, status);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Post('gyms')
  @HttpCode(HttpStatus.CREATED)
  createGym(@Body() body: any) {
    return this.gymClient.send({ cmd: 'create_gym' }, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Get('gyms')
  @HttpCode(HttpStatus.OK)
  findAllGyms() {
    return this.gymClient.send({ cmd: 'find_all_gyms' }, {});
  }

  @Get('public/gyms')
  @HttpCode(HttpStatus.OK)
  findAllPublicGyms() {
    return this.gymClient.send({ cmd: 'find_all_public_gyms' }, {});
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Post('users/:id/role')
  changeUserRole(@Param('id') userId: string, @Body() body: { role: string }) {
    return this.authClient.send({ cmd: 'change_role' }, { userId, newRole: body.role });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Post('memberships/activate')
  @HttpCode(HttpStatus.CREATED)
  async activateMembership(@Body() dto: ActivateMembershipDto, @Req() req) {
    const managerId = req.user.sub;
    return this.gymClient.send({ cmd: 'activate_membership' }, { dto, managerId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Post('memberships/renew')
  @HttpCode(HttpStatus.OK)
  async renewMembership(@Body() dto: RenewMembershipDto, @Req() req) {
    const managerId = req.user.sub;
    return this.gymClient.send({ cmd: 'renew_membership' }, { dto, managerId });
  }

  @UseGuards(JwtAuthGuard)
  @Post('payments/create-checkout-session')
  @HttpCode(HttpStatus.CREATED)
  createCheckoutSession(@Body() body: any, @Req() req) {
    const payload = {
      membershipId: body.membershipId,
      userId: req.user.sub,
    };
    return this.paymentClient.send({ cmd: 'create_checkout_session' }, payload);
  }
}
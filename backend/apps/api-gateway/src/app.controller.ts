// backend/apps/api-gateway/src/app.controller.ts (VERSIÓN CORREGIDA)
import {
  Controller,
  Get,
  Post,
  Inject,
  Body,
  Patch,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Controller('v1') // Prefijo para todas las rutas de este controlador
export class AppController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('GYM_SERVICE') private readonly gymClient: ClientProxy,
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

  @UseGuards(JwtAuthGuard)
  @Post('gyms')
  @HttpCode(HttpStatus.CREATED)
  createGym(@Body() body: any) {
    return this.gymClient.send({ cmd: 'create_gym' }, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('gyms')
  @HttpCode(HttpStatus.OK)
  findAllGyms() {
    return this.gymClient.send({ cmd: 'find_all_gyms' }, {});
  }

  @UseGuards(JwtAuthGuard)
  @Patch('memberships/:id/activate')
  @HttpCode(HttpStatus.OK)
  activateMembership(@Param('id') membershipId: string, @Request() req: any) {
    const managerId = req.user.sub;
    const payload = {
      membershipId,
      managerId,
    };

    return this.gymClient.send({ cmd: 'activate_membership' }, payload);
  }
}
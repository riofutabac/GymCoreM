// backend/apps/api-gateway/src/app.controller.ts (VERSIÓN CORREGIDA)
import {
  Controller,
  Get,
  Post,
  Inject,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
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
  login(@Body() body: any) {
    return this.authClient.send({ cmd: 'login' }, body);
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
}
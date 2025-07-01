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
  UsePipes,
  ValidationPipe,
  All,
  Headers,
  Logger, // <-- AÑADE ESTO
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { ActivateMembershipDto } from './dto/activate-membership.dto';
import { RenewMembershipDto } from './dto/renew-membership.dto';
import { CreateCheckoutSessionDto } from './create-checkout-session.dto';
import { JoinGymDto } from './dto/join-gym.dto';

@Controller('v1') // Prefijo para todas las rutas de este controlador
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('GYM_SERVICE') private readonly gymClient: ClientProxy,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
  ) {}

  @Post('auth/register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.authClient.send({ cmd: 'register' }, body),
      );
      return response;
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.message || 'Internal server error';
      throw new HttpException(message, status);
    }
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
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.message || 'Internal server error';
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
  changeUserRole(@Param('id') userId: string, @Body() body: { role: string; gymId?: string }) {
    return this.authClient.send({ cmd: 'change_role' }, { 
      userId, 
      newRole: body.role,
      gymId: body.gymId,
    });
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
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @Req() req: any,
  ) {
    try {
      this.logger.log(`🛒 Creando checkout para membresía ${dto.membershipId} - Usuario: ${req.user.sub}`);
      
      const payload = { userId: req.user.sub, membershipId: dto.membershipId };
      const response = await firstValueFrom(
        this.paymentClient.send({ cmd: 'create_checkout_session' }, payload),
      );
      
      this.logger.log(`✅ Checkout creado exitosamente. PayPal URL: ${response.approvalUrl}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error creando checkout para membresía ${dto.membershipId}:`, error);
      const status = error?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error?.message || 'Internal server error';
      throw new HttpException(message, status);
    }
  }

  // --- WEBHOOK PAYPAL CON VERIFICACIÓN DE FIRMA ---
  @All('payments/paypal/webhook')
  @HttpCode(HttpStatus.OK) // Siempre respondemos 200 a PayPal para que no reintente
  async paypalWebhookProxy(@Req() req: any, @Headers() headers: any): Promise<any> {
    try {
      this.logger.log(`🔔 Webhook PayPal recibido. Event: ${req.body?.event_type || 'unknown'}`);
      
      // Reenviamos el cuerpo, las cabeceras y el rawBody convertido a string UTF-8
      return await firstValueFrom(
        this.paymentClient.send(
          { cmd: 'handle_paypal_webhook' },
          {
            body: req.body,
            headers,
            rawBody: req.rawBody.toString('utf8'), // ← CONVERSIÓN A STRING PARA VERIFICACIÓN
          },
        ),
      );
    } catch (err: any) {
      // Manejar errores RPC correctamente
      const status = typeof err.status === 'number' ? err.status : HttpStatus.INTERNAL_SERVER_ERROR;
      const message = err.message || 'Error en webhook';
      
      this.logger.error('❌ Error en webhook PayPal:', err);
      
      throw new HttpException(message, status);
    }
  }

  // --- AÑADE ESTE NUEVO MÉTODO COMPLETO ---
  @UseGuards(JwtAuthGuard) // <-- Protegido, necesitamos saber qué usuario es
  @Post('gyms/join')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async joinGym(@Body() dto: JoinGymDto, @Req() req: any) {
    const userId = req.user.sub; // Obtenemos el ID del usuario del token JWT
    const payload = { uniqueCode: dto.uniqueCode, userId };
    
    return await firstValueFrom(
      this.gymClient.send({ cmd: 'join_gym' }, payload),
    );
  }
}
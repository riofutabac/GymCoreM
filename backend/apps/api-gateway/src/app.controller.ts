// backend/apps/api-gateway/src/app.controller.ts (VERSIÓN CORREGIDA)
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Inject,
  Body,
  Param,
  Req,
  Res,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  All,
  Headers,
  Logger, // <-- AÑADE ESTO
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as ExcelJS from 'exceljs';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { GymManagerGuard } from './auth/gym-manager.guard';
import { Roles } from './auth/roles.decorator';
import { ActivateMembershipDto } from './dto/activate-membership.dto';
import { RenewMembershipDto } from './dto/renew-membership.dto';
import { CreateCheckoutSessionDto } from './create-checkout-session.dto';
import { JoinGymDto } from './dto/join-gym.dto';
import { ListMembersDto, CreateMemberDto, UpdateMemberDto } from './dto';

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

  // ─── GESTIÓN DE MIEMBROS ─────────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard, GymManagerGuard)
  @Roles('MANAGER', 'OWNER')
  @Get('members')
  async listMembers(@Query() q: ListMembersDto, @Req() req: any) {
    const gymId = req.gymId;
    return firstValueFrom(
      this.gymClient.send({ cmd: 'members_list' }, { gymId, dto: q }),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, GymManagerGuard)
  @Roles('MANAGER', 'OWNER')
  @Get('members/:id')
  getMember(@Param('id') id: string, @Req() req: any) {
    return firstValueFrom(
      this.gymClient.send({ cmd: 'members_get' }, { gymId: req.gymId, id }),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, GymManagerGuard)
  @Roles('MANAGER', 'OWNER')
  @Post('members')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createMember(@Body() dto: CreateMemberDto, @Req() req: any) {
    return firstValueFrom(
      this.gymClient.send({ cmd: 'members_create' }, { gymId: req.gymId, dto }),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, GymManagerGuard)
  @Roles('MANAGER', 'OWNER')
  @Put('members/:id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateMember(@Param('id') id: string, @Body() dto: UpdateMemberDto, @Req() req: any) {
    return firstValueFrom(
      this.gymClient.send({ cmd: 'members_update' }, { gymId: req.gymId, id, dto }),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, GymManagerGuard)
  @Roles('MANAGER', 'OWNER')
  @Delete('members/:id')
  deleteMember(@Param('id') id: string, @Req() req: any) {
    return firstValueFrom(
      this.gymClient.send({ cmd: 'members_remove' }, { gymId: req.gymId, id }),
    );
  }

  // ─── IMPORTACIÓN MASIVA CSV ───────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard, GymManagerGuard)
  @Roles('MANAGER', 'OWNER')
  @Post('members/import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: './uploads' }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten archivos CSV'), false);
        }
      },
    }),
  )
  async importMembers(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('Archivo CSV es requerido');
    }

    const rows: any[] = [];
    return new Promise((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(csv.parse({ headers: true }))
        .on('error', (error) => {
          fs.unlinkSync(file.path); // Limpiar archivo temporal
          reject(error);
        })
        .on('data', (row) => rows.push(row))
        .on('end', async () => {
          try {
            fs.unlinkSync(file.path); // Limpiar archivo temporal
            const report = await firstValueFrom(
              this.gymClient.send(
                { cmd: 'members_bulk_create' },
                { gymId: req.gymId, members: rows },
              ),
            );
            resolve(report);
          } catch (error) {
            reject(error);
          }
        });
    });
  }

  // ─── EXPORTACIÓN A EXCEL ──────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard, GymManagerGuard)
  @Roles('MANAGER', 'OWNER')
  @Get('members/export')
  async exportMembers(@Query() q: ListMembersDto, @Req() req: any, @Res() res: any) {
    try {
      // Exportar todos los miembros sin paginación
      const exportQuery = { ...q, page: 1, limit: 10000 };
      const { items } = await firstValueFrom(
        this.gymClient.send({ cmd: 'members_list' }, { gymId: req.gymId, dto: exportQuery }),
      );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="socios-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      );

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
      const worksheet = workbook.addWorksheet('Socios');

      // Configurar columnas
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 36 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Nombre', key: 'firstName', width: 20 },
        { header: 'Apellido', key: 'lastName', width: 20 },
        { header: 'Fecha de Creación', key: 'createdAt', width: 20 },
      ];

      // Añadir filas
      for (const member of items) {
        worksheet.addRow({
          ...member,
          createdAt: member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '',
        }).commit();
      }

      await workbook.commit();
      this.logger.log(`✅ Exportación Excel completada: ${items.length} socios`);
      
    } catch (error) {
      this.logger.error('❌ Error en exportación Excel:', error);
      if (!res.headersSent) {
        throw new HttpException('Error exportando datos', HttpStatus.INTERNAL_SERVER_ERROR);
      }
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
// backend/apps/api-gateway/src/app.controller.ts (VERSIÓN FINAL)

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
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as ExcelJS from 'exceljs';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { GymManagerGuard } from './auth/gym-manager.guard';
import { Roles } from './auth/roles.decorator';
import { ActivateMembershipDto } from './dto/activate-membership.dto';
import { RenewMembershipDto } from './dto/renew-membership.dto';
import { CreateCheckoutSessionDto } from './create-checkout-session.dto';
import { JoinGymDto } from './dto/join-gym.dto';
import { ListMembersDto, CreateMemberDto, UpdateMemberDto } from './dto';
import { UpdateGymDto, AssignManagerDto } from './dto/gym.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

// --- Interfaces para tipar los objetos ---
interface UserWithGymName {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  gymId?: string;
  gymName?: string;
  createdAt: string;
}

interface Gym {
  id: string;
  name: string;
}

@Controller() // main.ts usa setGlobalPrefix('api/v1')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('GYM_SERVICE') private readonly gymClient: ClientProxy,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy,
    @Inject('ANALYTICS_SERVICE') private readonly analyticsClient: ClientProxy,
    @Inject('BIOMETRIC_SERVICE') private readonly biometricClient: ClientProxy,
  ) {}

  // ─── AUTHENTICATION & PROFILE ───────────────────────────────────────────────────

  @Post('auth/register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: any) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'register' }, body));
    } catch (error) {
      throw new HttpException(error.message || 'Internal server error', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any, @Res({ passthrough: true }) res: any) {
    try {
      const response = await firstValueFrom(this.authClient.send({ cmd: 'login' }, body));
      if (response.access_token) {
        const isProd = process.env.NODE_ENV === 'production';
        const oneDay = 24 * 60 * 60 * 1000;
        // JWT
        res.cookie('jwt_token', response.access_token, {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          maxAge: oneDay,
        });
        // User role
        if (response.user?.role) {
          res.cookie('user_role', response.user.role.toLowerCase(), {
            httpOnly: false,
            secure: isProd,
            sameSite: 'lax',
            maxAge: oneDay,
          });
        }
        // User name
        if (response.user) {
          const fullName = `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim();
          if (fullName) {
            res.cookie('user_name', fullName, {
              httpOnly: false,
              secure: isProd,
              sameSite: 'lax',
              maxAge: oneDay,
            });
          }
        }
        // User email
        if (response.user?.email) {
          res.cookie('user_email', response.user.email, {
            httpOnly: false,
            secure: isProd,
            sameSite: 'lax',
            maxAge: oneDay,
          });
        }
      }
      return response;
    } catch (error) {
      throw new HttpException(error.message || 'Internal server error', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: any) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('jwt_token', '', { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 0 });
    res.cookie('user_role', '', { httpOnly: false, secure: isProd, sameSite: 'lax', maxAge: 0 });
    res.cookie('user_name', '', { httpOnly: false, secure: isProd, sameSite: 'lax', maxAge: 0 });
    res.cookie('user_email', '', { httpOnly: false, secure: isProd, sameSite: 'lax', maxAge: 0 });
    return { message: 'Logged out successfully' };
  }

  @Post('auth/forgot-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    this.logger.log(`Solicitando reseteo de contraseña para ${body.email}`);
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'request_password_reset' }, body));
    } catch (error) {
      throw new HttpException(error.message || 'Internal server error', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth/me')
  @HttpCode(HttpStatus.OK)
  async getMe(@Req() req: any) {
    const user = req.user;
    const userRole = user.app_metadata?.role || user.user_metadata?.role || user.role;
    const roleForFrontend = userRole ? userRole.toLowerCase() : 'member';
    return {
      id: user.sub || user.id,
      email: user.email,
      role: roleForFrontend,
      firstName: user.user_metadata?.firstName,
      lastName: user.user_metadata?.lastName,
      name:
        user.user_metadata?.firstName && user.user_metadata?.lastName
          ? `${user.user_metadata.firstName} ${user.user_metadata.lastName}`
          : user.email?.split('@')[0],
      gymId: user.app_metadata?.gymId,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateCurrentUserProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    const userId = req.user.sub;
    this.logger.log(`Usuario ${userId} actualizando su perfil.`);
    try {
      return await firstValueFrom(
        this.authClient.send({ cmd: 'update_user_profile' }, { userId, data: body }),
      );
    } catch (error) {
      throw new HttpException(error.message || 'Internal server error', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── MEMBER DASHBOARD ───────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('member/dashboard')
  @HttpCode(HttpStatus.OK)
  async getMemberDashboard(@Req() req: any) {
    const userId = req.user.sub;
    this.logger.log(`Solicitando dashboard para el miembro ${userId}`);
    try {
      return await firstValueFrom(this.gymClient.send({ cmd: 'get_member_dashboard' }, { userId }));
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener los datos del dashboard',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── MEMBER OPERATIONS ─────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('members/join-gym')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async joinGymOperation(@Body() body: JoinGymDto, @Req() req: any) {
    const userId = req.user.sub;
    this.logger.log(`Usuario ${userId} intentando unirse a gimnasio con código ${body.gymCode}`);
    try {
      return await firstValueFrom(
        this.gymClient.send({ cmd: 'join_gym' }, { userId, gymCode: body.gymCode }),
      );
    } catch (error) {
      this.logger.error(`Error en gym-service al unirse: ${JSON.stringify(error)}`);
      throw new HttpException(error.message || 'Error al unirse al gimnasio', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('members/profile')
  @HttpCode(HttpStatus.OK)
  async getMemberProfile(@Req() req: any) {
    const userId = req.user.sub;
    this.logger.log(`Obteniendo perfil completo para usuario ${userId}`);
    try {
      return await firstValueFrom(
        this.gymClient.send({ cmd: 'members_get_profile' }, { userId }),
      );
    } catch (error) {
      this.logger.error(`Error en gym-service al obtener perfil: ${JSON.stringify(error)}`);
      throw new HttpException(error.message || 'Error al obtener el perfil del miembro', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put('members/profile')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateMemberProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    const userId = req.user.sub;
    this.logger.log(`Actualizando perfil de miembro para usuario ${userId}`);
    try {
      await firstValueFrom(
        this.authClient.send({ cmd: 'update_profile' }, { userId, data: body }),
      );
      return await firstValueFrom(
        this.gymClient.send({ cmd: 'members_update_profile' }, { userId, ...body }),
      );
    } catch (error) {
      this.logger.error(`Error actualizando perfil: ${JSON.stringify(error)}`);
      throw new HttpException(error.message || 'Error al actualizar el perfil del miembro', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── GYM MANAGEMENT (OWNER) ───────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Post('gyms')
  @HttpCode(HttpStatus.CREATED)
  async createGym(@Body() body: any) {
    return this.gymClient.send({ cmd: 'create_gym' }, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Get('gyms')
  @HttpCode(HttpStatus.OK)
  async findAllGyms() {
    return this.gymClient.send({ cmd: 'find_all_gyms' }, {});
  }

  @Get('public/gyms')
  @HttpCode(HttpStatus.OK)
  async findAllPublicGyms() {
    return this.gymClient.send({ cmd: 'find_all_public_gyms' }, {});
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Put('gyms/:id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateGym(@Param('id') id: string, @Body() body: UpdateGymDto) {
    this.logger.log(`Actualizando gimnasio ${id}`);
    try {
      return await firstValueFrom(
        this.gymClient.send({ cmd: 'update_gym' }, { id, data: body }),
      );
    } catch (error) {
      this.logger.error(`Error actualizando gimnasio: ${error.message || error}`);
      throw new HttpException('No se pudo actualizar el gimnasio', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Delete('gyms/:id')
  @HttpCode(HttpStatus.OK)
  async deactivateGym(@Param('id') id: string) {
    this.logger.log(`Desactivando gimnasio ${id}`);
    try {
      return await firstValueFrom(
        this.gymClient.send({ cmd: 'deactivate_gym' }, { id }),
      );
    } catch (error) {
      this.logger.error(`Error desactivando gimnasio: ${error.message || error}`);
      throw new HttpException('No se pudo desactivar el gimnasio', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Post('users/:id/role')
  async changeUserRole(@Param('id') userId: string, @Body() body: { role: string; gymId?: string }) {
    return this.authClient.send({ cmd: 'change_role' }, {
      userId,
      newRole: body.role,
      gymId: body.gymId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Post('gyms/:gymId/assign-manager')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async assignManagerToGym(@Param('gymId') gymId: string, @Body() body: AssignManagerDto) {
    this.logger.log(`Asignando manager ${body.userId} al gimnasio ${gymId}`);
    try {
      return await firstValueFrom(
        this.authClient.send({ cmd: 'change_role' }, {
          userId: body.userId,
          newRole: 'MANAGER',
          gymId,
        }),
      );
    } catch (error) {
      this.logger.error(`Error asignando manager: ${error.message || error}`);
      throw new HttpException('No se pudo asignar el manager al gimnasio', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── MEMBERSHIP ACTIVATION & RENEW ─────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Post('memberships/activate')
  @HttpCode(HttpStatus.CREATED)
  async activateMembership(@Body() dto: ActivateMembershipDto, @Req() req: any) {
    const managerId = req.user.sub;
    try {
      return await firstValueFrom(
        this.gymClient.send({ cmd: 'activate_membership' }, { dto, managerId }),
      );
    } catch (error: any) {
      throw new HttpException(error.message || 'Error activando membresía', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Post('memberships/renew')
  @HttpCode(HttpStatus.OK)
  async renewMembership(@Body() dto: RenewMembershipDto, @Req() req: any) {
    const managerId = req.user.sub;
    try {
      return await firstValueFrom(this.gymClient.send({ cmd: 'renew_membership' }, { dto, managerId }));
    } catch (error) {
      this.logger.error(`Error renewing membership: ${error.message || error}`);
      throw new HttpException('Error renewing membership', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── PAYMENTS ──────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('payments/create-checkout-session')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createCheckoutSession(@Body() dto: CreateCheckoutSessionDto, @Req() req: any) {
    try {
      this.logger.log(`🛒 Creando checkout para membresía ${dto.membershipId} - Usuario: ${req.user.sub}`);
      const response = await firstValueFrom(
        this.paymentClient.send({ cmd: 'create_checkout_session' }, {
          userId: req.user.sub,
          membershipId: dto.membershipId,
        }),
      );
      return { url: response.approvalUrl };
    } catch (error) {
      this.logger.error(`❌ Error creando checkout: ${error.message || error}`);
      throw new HttpException(error.message || 'Internal server error', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @All('payments/paypal/webhook')
  @HttpCode(HttpStatus.OK)
  async paypalWebhookProxy(@Req() req: any, @Headers() headers: any) {
    try {
      this.logger.log(`🔔 Webhook PayPal recibido. Event: ${req.body?.event_type || 'unknown'}`);
      return await firstValueFrom(
        this.paymentClient.send({ cmd: 'handle_paypal_webhook' }, {
          body: req.body,
          headers,
          rawBody: req.rawBody.toString('utf8'),
        }),
      );
    } catch (error: any) {
      this.logger.error('❌ Error en webhook PayPal:', error);
      throw new HttpException(error.message || 'Error en webhook', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── GESTIÓN DE MIEMBROS ────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard, GymManagerGuard)
  @Roles('MANAGER', 'OWNER')
  @Get('members')
  @HttpCode(HttpStatus.OK)
  async listMembers(@Query() q: ListMembersDto, @Req() req: any) {
    return await firstValueFrom(
      this.gymClient.send({ cmd: 'members_list' }, { gymId: req.gymId, dto: q }),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, GymManagerGuard)
  @Roles('MANAGER', 'OWNER')
  @Get('members/:id')
  @HttpCode(HttpStatus.OK)
  async getMember(@Param('id') id: string, @Req() req: any) {
    return await firstValueFrom(
      this.gymClient.send({ cmd: 'members_get' }, { gymId: req.gymId, id }),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, GymManagerGuard)
  @Roles('MANAGER', 'OWNER')
  @Post('members')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createMember(@Body() dto: CreateMemberDto, @Req() req: any) {
    return await firstValueFrom(
      this.gymClient.send({ cmd: 'members_create' }, { gymId: req.gymId, dto }),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, GymManagerGuard)
  @Roles('MANAGER', 'OWNER')
  @Put('members/:id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateMember(@Param('id') id: string, @Body() dto: UpdateMemberDto, @Req() req: any) {
    return await firstValueFrom(
      this.gymClient.send({ cmd: 'members_update' }, { gymId: req.gymId, id, dto }),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, GymManagerGuard)
  @Roles('MANAGER', 'OWNER')
  @Delete('members/:id')
  @HttpCode(HttpStatus.OK)
  async deleteMember(@Param('id') id: string, @Req() req: any) {
    return await firstValueFrom(
      this.gymClient.send({ cmd: 'members_remove' }, { gymId: req.gymId, id }),
    );
  }

  // ─── RESETEAR CONTRASEÑA DE MIEMBRO ───────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard, GymManagerGuard)
  @Roles('MANAGER', 'OWNER')
  @Post('members/reset-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async resetMemberPassword(@Body() data: { email: string }) {
    return await firstValueFrom(this.authClient.send({ cmd: 'reset_password' }, data));
  }

  // ─── CAMBIAR ROL DE MIEMBRO ───────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Put('staff/:id/role')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async changeStaffRole(@Param('id') userId: string, @Body() body: { role: string }, @Req() req: any) {
    const managerId = req.user.sub;
    return await firstValueFrom(
      this.authClient.send({ cmd: 'assign_role' }, { managerId, targetUserId: userId, role: body.role }),
    );
  }

  // === KPIs & STAFF PARA MANAGER/OWNER ===

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @Get('analytics/kpis/my-gym')
  @HttpCode(HttpStatus.OK)
  async getManagerKpis(@Req() req: any) {
    const managerId = req.user.sub;
    return this.analyticsClient.send({ cmd: 'get_kpis_for_gym' }, { managerId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Get('staff/my-gym')
  @HttpCode(HttpStatus.OK)
  async getGymStaff(@Req() req: any) {
    const managerId = req.user.sub;
    return this.authClient.send({ cmd: 'get_staff_for_gym' }, { managerId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @Post('staff/assign')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async assignStaff(@Req() req: any, @Body() body: { userId: string; role: 'RECEPTIONIST' }) {
    if (body.role !== 'RECEPTIONIST') {
      throw new HttpException('Managers can only assign the RECEPTIONIST role', HttpStatus.BAD_REQUEST);
    }
    const managerId = req.user.sub;
    return this.authClient.send({ cmd: 'assign_role' }, {
      managerId,
      targetUserId: body.userId,
      role: body.role,
    });
  }

  // === REPORTES PARA MANAGER ===

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Get('reports/members/export')
  @HttpCode(HttpStatus.OK)
  async exportMembersReport(@Req() req: any, @Res() res: any) {
    const managerId = req.user.sub;
    try {
      const result = await firstValueFrom(this.gymClient.send({ cmd: 'export_members_report' }, { managerId }));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte_miembros.csv"');
      res.send(result.csvData);
    } catch (error) {
      this.logger.error('Error exportando reporte de miembros:', error);
      throw new HttpException('Error generando el reporte', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Get('reports/sales/export')
  @HttpCode(HttpStatus.OK)
  async exportSalesReport(@Req() req: any, @Res() res: any) {
    const managerId = req.user.sub;
    try {
      const result = await firstValueFrom(this.inventoryClient.send({ cmd: 'export_sales_report' }, { managerId }));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte_ventas.csv"');
      res.send(result.csvData);
    } catch (error) {
      this.logger.error('Error exportando reporte de ventas:', error);
      throw new HttpException('Error generando el reporte', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // === ANALYTICS COMBINADO ===

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Get('analytics/kpis')
  @HttpCode(HttpStatus.OK)
  async getAnalyticsKpis() {
    try {
      const [kpisFromAnalytics, activeGyms] = await Promise.all([
        firstValueFrom(this.analyticsClient.send({ cmd: 'get_kpis' }, {})),
        firstValueFrom(this.gymClient.send({ cmd: 'count_active_gyms' }, {})),
      ]);
      return {
        ...kpisFromAnalytics,
        totalRevenue: parseFloat(kpisFromAnalytics.totalRevenue) || 0,
        totalGyms: activeGyms,
      };
    } catch (error) {
      this.logger.error('Error fetching combined KPIs:', error);
      throw new HttpException('No se pudieron cargar los KPIs combinados.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Get('analytics/global-trends')
  @HttpCode(HttpStatus.OK)
  async getAnalyticsGlobalTrends() {
    try {
      const rawData = await firstValueFrom(this.analyticsClient.send({ cmd: 'get_global_trends' }, {}));
      return {
        monthlyRevenue: rawData.monthlyGrowth.map((item: any) => ({
          month: item.month,
          revenue: item.revenue || 0,
        })),
        membershipStats: [
          { name: 'Vendidas este mes', value: rawData.monthlyGrowth[0]?.membershipsSold ?? 0, color: '#8884d8' },
          { name: 'Nuevos usuarios', value: rawData.monthlyGrowth[0]?.newUsers ?? 0, color: '#82ca9d' },
        ],
        monthlyGrowth: parseFloat(rawData.comparedToLastMonth.revenueGrowth) || 0,
        lastUpdatedAt: rawData.lastUpdatedAt,
      };
    } catch (error) {
      this.logger.error('Error fetching global trends:', error);
      throw new HttpException('No se pudieron cargar las tendencias globales.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
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
          fs.unlinkSync(file.path);
          reject(error);
        })
        .on('data', (row) => rows.push(row))
        .on('end', async () => {
          try {
            fs.unlinkSync(file.path);
            const report = await firstValueFrom(
              this.gymClient.send({ cmd: 'members_bulk_create' }, { gymId: req.gymId, members: rows }),
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
  async exportMembersExcel(@Query() q: ListMembersDto, @Req() req: any, @Res() res: any) {
    try {
      const exportQuery = { ...q, page: 1, limit: 10000 };
      const { items } = await firstValueFrom(
        this.gymClient.send({ cmd: 'members_list' }, { gymId: req.gymId, dto: exportQuery }),
      );
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="socios-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      );
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
      const worksheet = workbook.addWorksheet('Socios');
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 36 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Nombre', key: 'firstName', width: 20 },
        { header: 'Apellido', key: 'lastName', width: 20 },
        { header: 'Fecha de Creación', key: 'createdAt', width: 20 },
      ];
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

  // ─── JOIN GYM NUEVO ───────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('gyms/join')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async joinGymController(@Body() dto: JoinGymDto, @Req() req: any) {
    const userId = req.user.sub;
    const payload = { uniqueCode: dto.uniqueCode, userId };
    const result = await firstValueFrom(this.gymClient.send({ cmd: 'join_gym' }, payload));
    if (result.gymId) {
      try {
        await firstValueFrom(
          this.authClient.send(
            { cmd: 'change_role' },
            {
              userId,
              newRole: req.user.app_metadata?.role || 'MEMBER',
              gymId: result.gymId,
            },
          ),
        );
        this.logger.log(`gymId ${result.gymId} propagado al Auth Service para usuario ${userId}`);
      } catch (error) {
        this.logger.warn(`Error propagando gymId al Auth Service: ${error.message}`);
      }
    }
    return result;
  }

  // ─── RUTAS POS ────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Get('pos/products/:barcode')
  @HttpCode(HttpStatus.OK)
  async findProductByBarcode(@Param('barcode') barcode: string, @Req() req: any) {
    const gymId = req.user.app_metadata?.gymId;
    if (!gymId) throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
    try {
      return await firstValueFrom(this.inventoryClient.send({ cmd: 'products_find_by_barcode' }, { barcode, gymId }));
    } catch {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Post('pos/sales')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createSale(@Body() dto: any, @Req() req: any) {
    const gymId = req.user.app_metadata?.gymId;
    if (!gymId) throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
    try {
      const sale = await firstValueFrom(
        this.inventoryClient.send({ cmd: 'sales_create' }, { ...dto, gymId, cashierId: req.user.sub }),
      );
      const checkout = await firstValueFrom(
        this.paymentClient.send({ cmd: 'create_sale_checkout' }, { saleId: sale.id, amount: sale.totalAmount }),
      );
      return { saleId: sale.id, approvalUrl: checkout.approvalUrl };
    } catch (error) {
      throw new HttpException(error.message || 'Error creating sale', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Post('pos/sales/cash')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createCashSale(@Body() dto: any, @Req() req: any) {
    const gymId = req.user.app_metadata?.gymId;
    if (!gymId) throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
    try {
      const sale = await firstValueFrom(
        this.inventoryClient.send({ cmd: 'sales_create_cash' }, { ...dto, gymId, cashierId: req.user.sub }),
      );
      return { saleId: sale.id, status: 'COMPLETED', message: 'Venta en efectivo completada exitosamente' };
    } catch (error) {
      throw new HttpException(error.message || 'Error creating cash sale', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Post('pos/sales/card-present')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createCardSale(@Body() dto: any, @Req() req: any) {
    const gymId = req.user.app_metadata?.gymId;
    if (!gymId) throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
    try {
      const sale = await firstValueFrom(
        this.inventoryClient.send({ cmd: 'sales_create_card_present' }, { ...dto, gymId, cashierId: req.user.sub }),
      );
      return { saleId: sale.id, status: 'COMPLETED', message: 'Venta con tarjeta completada exitosamente' };
    } catch (error) {
      throw new HttpException(error.message || 'Error creating card sale', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Get('pos/products')
  @HttpCode(HttpStatus.OK)
  async findAllProducts(@Req() req: any) {
    const gymId = req.user.app_metadata?.gymId;
    if (!gymId) throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
    return this.inventoryClient.send({ cmd: 'products_findAll' }, { gymId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Get('pos/sales')
  @HttpCode(HttpStatus.OK)
  async findAllSales(@Req() req: any) {
    const gymId = req.user.app_metadata?.gymId;
    if (!gymId) throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
    return this.inventoryClient.send({ cmd: 'sales_findAll' }, { gymId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Get('pos/sales/:id')
  @HttpCode(HttpStatus.OK)
  async findOneSale(@Param('id') id: string, @Req() req: any) {
    const gymId = req.user.app_metadata?.gymId;
    if (!gymId) throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
    return this.inventoryClient.send({ cmd: 'sales_findOne' }, { id, gymId });
  }

  // ─── INVENTORY MANAGEMENT (MANAGER/OWNER) ─────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Get('inventory/products')
  @HttpCode(HttpStatus.OK)
  async listInventoryProducts(@Req() req: any) {
    const role = req.user.app_metadata?.role;
    const gymId = role === 'OWNER' ? null : req.user.app_metadata?.gymId;
    if (role !== 'OWNER' && !gymId) {
      throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
    }
    return this.inventoryClient.send({ cmd: 'products_findAll' }, { gymId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Post('inventory/products')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createInventoryProduct(@Body() dto: any, @Req() req: any) {
    const role = req.user.app_metadata?.role;
    const gymId = role === 'OWNER' ? dto.gymId : req.user.app_metadata?.gymId;
    if (role !== 'OWNER' && !gymId) {
      throw new HttpException('Manager must be assigned to a gym', HttpStatus.FORBIDDEN);
    }
    return this.inventoryClient.send({ cmd: 'products_create' }, { ...dto, gymId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Put('inventory/products/:id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateInventoryProduct(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const role = req.user.app_metadata?.role;
    const gymId = role === 'OWNER' ? dto.gymId : req.user.app_metadata?.gymId;
    if (role !== 'OWNER' && !gymId) {
      throw new HttpException('Manager must be assigned to a gym', HttpStatus.FORBIDDEN);
    }
    return this.inventoryClient.send({ cmd: 'products_update' }, { id, updateProductDto: dto, gymId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Delete('inventory/products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeInventoryProduct(@Param('id') id: string, @Req() req: any) {
    const gymId = req.user.app_metadata?.gymId;
    if (req.user.app_metadata?.role !== 'OWNER' && !gymId) {
      throw new HttpException('Manager must be assigned to a gym', HttpStatus.FORBIDDEN);
    }
    return this.inventoryClient.send({ cmd: 'products_remove' }, { id, gymId });
  }

  // === STAFF & USERS (OWNER) ===

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Get('staff')
  @HttpCode(HttpStatus.OK)
  async listStaff(): Promise<UserWithGymName[]> {
    try {
      const staffUsers = await firstValueFrom(this.authClient.send({ cmd: 'get_staff_users' }, {}));
      if (!staffUsers?.length) return [];
      const gyms: Gym[] = await firstValueFrom(this.gymClient.send({ cmd: 'find_all_gyms' }, {}));
      const gymMap = new Map(gyms.map(g => [g.id, g.name]));
      return staffUsers.map(user => ({
        ...user,
        gymName: user.gymId ? gymMap.get(user.gymId) || 'Gimnasio no encontrado' : 'Ninguno asignado',
      }));
    } catch (error) {
      this.logger.error('Error fetching staff:', error);
      throw new HttpException('No se pudo cargar la lista de personal.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Get('users')
  @HttpCode(HttpStatus.OK)
  async listAllUsers() {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'list_users' }, {}));
    } catch (error) {
      this.logger.error('Error fetching all users:', error);
      throw new HttpException('No se pudo obtener la lista de usuarios.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Put('users/:id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateUserProfileOwner(@Param('id') userId: string, @Body() body: { firstName?: string; lastName?: string }) {
    this.logger.log(`Actualizando perfil de usuario ${userId}`);
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'update_user_profile' }, { userId, data: body }));
    } catch (error) {
      this.logger.error(`Error actualizando perfil de usuario: ${error.message || error}`);
      throw new HttpException('No se pudo actualizar el perfil del usuario', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── BIOMETRIC ENDPOINTS ───────────────────────────────────────────────────────

  @Get('biometric/ping')
  @HttpCode(HttpStatus.OK)
  async pingBiometricService() {
    try {
      this.logger.log('Enviando PING al Biometric Service...');
      return await firstValueFrom(this.biometricClient.send({ cmd: 'ping_arduino' }, {}));
    } catch (error) {
      this.logger.error('Error durante el ping al Biometric Service', error);
      throw new HttpException('No se pudo comunicar con el servicio biométrico.', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('biometric/health')
  @HttpCode(HttpStatus.OK)
  async getBiometricServiceHealth() {
    try {
      this.logger.log('Consultando estado de salud del Biometric Service...');
      return await firstValueFrom(this.biometricClient.send({ cmd: 'get_health' }, {}));
    } catch (error) {
      this.logger.error('Error consultando estado de salud del Biometric Service', error);
      throw new HttpException('No se pudo obtener el estado del servicio biométrico.', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Post('biometric/enroll')
  @HttpCode(HttpStatus.CREATED)
  async enrollFingerprint(@Body() body: { userId: string }, @Req() req: any) {
    try {
      const currentUser = req.user;
      if (body.userId !== currentUser.sub) {
        const targetUser = await firstValueFrom(this.authClient.send({ cmd: 'get_user_by_id' }, { userId: body.userId }));
        if (!targetUser) throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
        if (targetUser.role !== 'MEMBER') throw new HttpException('Solo puedes registrar huellas de usuarios con rol MEMBER', HttpStatus.FORBIDDEN);
        if (targetUser.gymId !== currentUser.app_metadata?.gymId) throw new HttpException('Solo puedes registrar huellas de MEMBERs de tu mismo gimnasio', HttpStatus.FORBIDDEN);
      }
      this.logger.log(`Iniciando enrolamiento biométrico para: ${body.userId}`);
      return await firstValueFrom(
        this.biometricClient.send({ cmd: 'enroll_fingerprint' }, { userId: body.userId }),
      );
    } catch (error) {
      this.logger.error('Error enrolling fingerprint', error);
      throw new HttpException(error.message || 'Error al registrar la huella dactilar', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Delete('biometric/delete/:userId/:fingerprintId')
  @HttpCode(HttpStatus.OK)
  async deleteFingerprint(@Param('userId') userId: string, @Param('fingerprintId') fingerprintId: string, @Req() req: any) {
    try {
      const currentUser = req.user;
      if (userId !== currentUser.sub) {
        const targetUser = await firstValueFrom(this.authClient.send({ cmd: 'get_user_by_id' }, { userId })); 
        if (!targetUser) throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
        if (targetUser.role !== 'MEMBER') throw new HttpException('Solo puedes eliminar huellas de usuarios con rol MEMBER', HttpStatus.FORBIDDEN);
        if (targetUser.gymId !== currentUser.gymId) throw new HttpException('Solo puedes eliminar huellas de MEMBERs de tu mismo gimnasio', HttpStatus.FORBIDDEN);
      }
      return await firstValueFrom(
        this.biometricClient.send(
          { cmd: 'delete_fingerprint' },
          { userId, fingerprintId: parseInt(fingerprintId, 10), deletedBy: req.user.sub },
        ),
      );
    } catch (error) {
      this.logger.error('Error deleting fingerprint', error);
      throw new HttpException(error.message || 'Error al eliminar la huella dactilar', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Get('biometric/list/:userId')
  @HttpCode(HttpStatus.OK)
  async listFingerprints(@Param('userId') userId: string, @Req() req: any) {
    try {
      const currentUser = req.user;
      if (userId !== currentUser.sub) {
        const targetUser = await firstValueFrom(this.authClient.send({ cmd: 'get_user_by_id' }, { userId }));
        if (!targetUser) throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
        if (targetUser.role !== 'MEMBER') throw new HttpException('Solo puedes ver huellas de usuarios con rol MEMBER', HttpStatus.FORBIDDEN);
        if (targetUser.gymId !== currentUser.gymId) throw new HttpException('Solo puedes ver huellas de MEMBERs de tu mismo gimnasio', HttpStatus.FORBIDDEN);
      }
      return await firstValueFrom(this.biometricClient.send({ cmd: 'list_fingerprints' }, { userId }));
    } catch (error) {
      this.logger.error('Error listing fingerprints', error);
      throw new HttpException(error.message || 'Error al obtener las huellas dactilares', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Post('biometric/verify')
  @HttpCode(HttpStatus.OK)
  async verifyFingerprint(@Body() body: { userId: string; fingerprintId: number }) {
    try {
      return await firstValueFrom(
        this.biometricClient.send({ cmd: 'verify_fingerprint' }, { userId: body.userId, fingerprintId: body.fingerprintId }),
      );
    } catch (error) {
      this.logger.error('Error verifying fingerprint', error);
      throw new HttpException(error.message || 'Error al verificar la huella dactilar', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── GYM REACTIVATION & MEMBERSHIP BAN ────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Put('gyms/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateGym(@Param('id') id: string) {
    this.logger.log(`Reactivando gimnasio ${id}`);
    try {
      return await firstValueFrom(this.gymClient.send({ cmd: 'reactivate_gym' }, { id }));
    } catch (error) {
      this.logger.error(`Error reactivando gimnasio: ${error.message || error}`);
      throw new HttpException('No se pudo reactivar el gimnasio', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Post('memberships/:id/ban')
  @HttpCode(HttpStatus.OK)
  async banMembership(
    @Param('id') membershipId: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const managerId = req.user.sub;
    try {
      return await firstValueFrom(
        this.gymClient.send({ cmd: 'ban_membership' }, { membershipId, managerId, reason: body.reason }),
      );
    } catch (error: any) {
      this.logger.error(`Error banneando membresía: ${error.message || error}`);
      throw new HttpException(error.message || 'Error banneando membresía', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

} // class AppController

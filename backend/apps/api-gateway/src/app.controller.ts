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

// --- Interfaces para tipar los objetos ---
interface UserWithGymName {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  gymId?: string;
  gymName?: string; // Campo que vamos a añadir
  createdAt: string;
}

interface Gym {
  id: string;
  name: string;
}

@Controller() // Sin prefijo ya que main.ts usa setGlobalPrefix('api/v1')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('GYM_SERVICE') private readonly gymClient: ClientProxy,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy,
    @Inject('ANALYTICS_SERVICE') private readonly analyticsClient: ClientProxy,
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
  async login(@Body() body: any, @Res({ passthrough: true }) res: any) {
    try {
      // Convertimos la respuesta del microservicio en una Promesa
      const response = await firstValueFrom(
        this.authClient.send({ cmd: 'login' }, body),
      );

      // 🔐 Configurar cookies HTTP-Only seguras
      if (response.access_token) {
        const isProd = process.env.NODE_ENV === 'production';
        const oneDay = 24 * 60 * 60 * 1000; // 24 horas

        // JWT token - siempre httpOnly para seguridad
        res.cookie('jwt_token', response.access_token, {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          maxAge: oneDay,
        });

        // Rol del usuario - accesible desde JS para UI/ruteo (convertir a minúsculas)
        if (response.user?.role) {
          res.cookie('user_role', response.user.role.toLowerCase(), {
            httpOnly: false, // UI necesita leer esto
            secure: isProd,
            sameSite: 'lax',
            maxAge: oneDay,
          });
        }

        // Nombre del usuario - accesible desde JS para mostrar en UI
        if (response.user) {
          const fullName = `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim();
          if (fullName) {
            res.cookie('user_name', fullName, {
              httpOnly: false, // UI necesita leer esto
              secure: isProd,
              sameSite: 'lax',
              maxAge: oneDay,
            });
          }
        }

        // Email del usuario - accesible desde JS para mostrar en UI
        if (response.user?.email) {
          res.cookie('user_email', response.user.email, {
            httpOnly: false, // UI necesita leer esto
            secure: isProd,
            sameSite: 'lax',
            maxAge: oneDay,
          });
        }
      }

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
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error actualizando gimnasio: ${errorMessage}`);
      throw new HttpException(
        'No se pudo actualizar el gimnasio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error desactivando gimnasio: ${errorMessage}`);
      throw new HttpException(
        'No se pudo desactivar el gimnasio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
  @Roles('OWNER')
  @Post('gyms/:gymId/assign-manager')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async assignManagerToGym(
    @Param('gymId') gymId: string,
    @Body() body: AssignManagerDto
  ) {
    this.logger.log(`Asignando manager ${body.userId} al gimnasio ${gymId}`);
    try {
      // Reutilizamos la lógica existente de change_role
      return await firstValueFrom(
        this.authClient.send({ cmd: 'change_role' }, {
          userId: body.userId,
          newRole: 'MANAGER',
          gymId: gymId,
        }),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error asignando manager: ${errorMessage}`);
      throw new HttpException(
        'No se pudo asignar el manager al gimnasio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Post('memberships/activate')
  @HttpCode(HttpStatus.CREATED)
  async activateMembership(@Body() dto: ActivateMembershipDto, @Req() req) {
    const managerId = req.user.sub;

    // Ya no necesitamos manipular el gymId aquí
    // El servicio se encargará de la validación de seguridad usando el managerId
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

    // 1) Crear la membresía en gym-service (esto ahora también actualiza el gymId local)
    const result = await firstValueFrom(
      this.gymClient.send({ cmd: 'join_gym' }, payload),
    );

    // 2) Actualizar el gymId en Auth-Service para que aparezca en futuros JWTs
    if (result.gymId) {
      try {
        await firstValueFrom(
          this.authClient.send(
            { cmd: 'change_role' },
            {
              userId,
              newRole: req.user.app_metadata?.role || 'MEMBER', // Mantener el rol actual
              gymId: result.gymId, // Usar el gymId del resultado
            },
          ),
        );
        this.logger.log(
          `gymId ${result.gymId} propagado al Auth Service para usuario ${userId}`,
        );
      } catch (error) {
        this.logger.warn(
          `Error propagando gymId al Auth Service: ${error.message}`,
        );
        // No fallar el join si solo falla la propagación del gymId
      }
    }

    return result;
  }

  // ─── RUTAS POS (POINT OF SALE) ─────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Get('pos/products/:barcode')
  @HttpCode(HttpStatus.OK)
  async findProductByBarcode(@Param('barcode') barcode: string, @Req() req: any) {
    try {
      const gymId = req.user.app_metadata?.gymId;
      
      if (!gymId) {
        throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
      }
      
      const response = await firstValueFrom(
        this.inventoryClient.send(
          { cmd: 'products_find_by_barcode' },
          { barcode, gymId }
        )
      );
      return response;
    } catch (error) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Post('pos/sales')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createSale(@Body() dto: any, @Req() req: any) {
    try {
      const gymId = req.user.app_metadata?.gymId;
      
      if (!gymId) {
        throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
      }
      
      // Crear la venta en el inventory service
      const sale = await firstValueFrom(
        this.inventoryClient.send(
          { cmd: 'sales_create' },
          {
            ...dto,
            gymId,
            cashierId: req.user.sub
          }
        )
      );

      // Crear checkout session en payment service
      const checkout = await firstValueFrom(
        this.paymentClient.send(
          { cmd: 'create_sale_checkout' },
          {
            saleId: sale.id,
            amount: sale.totalAmount
          }
        )
      );

      return {
        saleId: sale.id,
        approvalUrl: checkout.approvalUrl
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error creating sale',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Post('pos/sales/cash')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createCashSale(@Body() dto: any, @Req() req: any) {
    try {
      const gymId = req.user.app_metadata?.gymId;
      
      if (!gymId) {
        throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
      }
      
      const sale = await firstValueFrom(
        this.inventoryClient.send(
          { cmd: 'sales_create_cash' },
          {
            ...dto,
            gymId,
            cashierId: req.user.sub
          }
        )
      );

      return {
        saleId: sale.id,
        status: 'COMPLETED',
        message: 'Venta en efectivo completada exitosamente'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error creating cash sale',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Post('pos/sales/card-present')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createCardSale(@Body() dto: any, @Req() req: any) {
    try {
      const gymId = req.user.app_metadata?.gymId;
      
      if (!gymId) {
        throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
      }
      
      const sale = await firstValueFrom(
        this.inventoryClient.send(
          { cmd: 'sales_create_card_present' },
          {
            ...dto,
            gymId,
            cashierId: req.user.sub
          }
        )
      );

      return {
        saleId: sale.id,
        status: 'COMPLETED',
        message: 'Venta con tarjeta completada exitosamente'
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error creating card sale',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Get('pos/products')
  @HttpCode(HttpStatus.OK)
  async findAllProducts(@Req() req: any) {
    const gymId = req.user.app_metadata?.gymId;
      
    if (!gymId) {
      throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
    }
    
    return this.inventoryClient.send(
      { cmd: 'products_findAll' },
      { gymId }
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Get('pos/sales')
  @HttpCode(HttpStatus.OK)
  async findAllSales(@Req() req: any) {
    const gymId = req.user.app_metadata?.gymId;
      
    if (!gymId) {
      throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
    }
    
    return this.inventoryClient.send(
      { cmd: 'sales_findAll' },
      { gymId }
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  @Get('pos/sales/:id')
  @HttpCode(HttpStatus.OK)
  async findOneSale(@Param('id') id: string, @Req() req: any) {
    const gymId = req.user.app_metadata?.gymId;
      
    if (!gymId) {
      throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
    }
    
    return this.inventoryClient.send(
      { cmd: 'sales_findOne' },
      { id, gymId }
    );
  }

  // ─── GESTIÓN DE INVENTARIO (MANAGER/OWNER) ─────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Get('inventory/products')
  @HttpCode(HttpStatus.OK)
  async listProducts(@Req() req: any) {
    // Los OWNER pueden ver productos de todos los gimnasios, los MANAGER solo del suyo
    const gymId = req.user.app_metadata?.role === 'OWNER' ? null : req.user.app_metadata?.gymId;
    
    if (req.user.app_metadata?.role !== 'OWNER' && !gymId) {
      throw new HttpException('User must be assigned to a gym', HttpStatus.FORBIDDEN);
    }
    
    return this.inventoryClient.send(
      { cmd: 'products_findAll' },
      { gymId }
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Post('inventory/products')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createProduct(@Body() dto: any, @Req() req: any) {
    // Consistent gymId extraction for both OWNER and MANAGER
    const gymId = req.user.app_metadata?.role === 'OWNER' ? dto.gymId : req.user.app_metadata?.gymId;
    
    if (req.user.app_metadata?.role !== 'OWNER' && !gymId) {
      throw new HttpException('Manager must be assigned to a gym', HttpStatus.FORBIDDEN);
    }
    
    return this.inventoryClient.send(
      { cmd: 'products_create' },
      { ...dto, gymId }
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Put('inventory/products/:id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateProduct(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    // Consistent gymId extraction for both OWNER and MANAGER
    const gymId = req.user.app_metadata?.role === 'OWNER' ? dto.gymId : req.user.app_metadata?.gymId;
    
    if (req.user.app_metadata?.role !== 'OWNER' && !gymId) {
      throw new HttpException('Manager must be assigned to a gym', HttpStatus.FORBIDDEN);
    }
    
    return this.inventoryClient.send(
      { cmd: 'products_update' },
      { id, updateProductDto: dto, gymId },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'OWNER')
  @Delete('inventory/products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeProduct(@Param('id') id: string, @Req() req: any) {
    // Consistent gymId extraction for both OWNER and MANAGER
    const gymId = req.user.app_metadata?.gymId;
    
    if (req.user.app_metadata?.role !== 'OWNER' && !gymId) {
      throw new HttpException('Manager must be assigned to a gym', HttpStatus.FORBIDDEN);
    }
    
    return this.inventoryClient.send(
      { cmd: 'products_remove' },
      { id, gymId },
    );
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: any) {
    const isProd = process.env.NODE_ENV === 'production';
    
    // Limpiar todas las cookies de autenticación
    res.cookie('jwt_token', '', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 0, // Expira inmediatamente
    });

    res.cookie('user_role', '', {
      httpOnly: false, // Consistente con login
      secure: isProd,
      sameSite: 'lax',
      maxAge: 0,
    });

    res.cookie('user_name', '', {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 0,
    });

    res.cookie('user_email', '', {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 0,
    });

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth/me')
  @HttpCode(HttpStatus.OK)
  async getMe(@Req() req: any) {
    // El usuario ya está disponible gracias al JwtAuthGuard
    const user = req.user;
    
    // Priorizar app_metadata.role (autorativo) y convertir a minúsculas para el frontend
    const userRole = user.app_metadata?.role || user.user_metadata?.role || user.role;
    const roleForFrontend = userRole ? userRole.toLowerCase() : 'member';
    
    return {
      id: user.sub || user.id,
      email: user.email,
      role: roleForFrontend, // Usar el rol correctamente extraído y convertido
      firstName: user.user_metadata?.firstName,
      lastName: user.user_metadata?.lastName,
      name: user.user_metadata?.firstName && user.user_metadata?.lastName 
        ? `${user.user_metadata.firstName} ${user.user_metadata.lastName}`
        : user.email?.split('@')[0],
      gymId: user.app_metadata?.gymId, // Incluir gymId si está disponible
    };
  }

  // === NUEVO ENDPOINT PARA LISTAR TODO EL PERSONAL (STAFF) ===
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Get('staff')
  @HttpCode(HttpStatus.OK)
  async listStaff(): Promise<UserWithGymName[]> {
    try {
      // 1. Pedimos al Auth Service todos los usuarios con rol de staff.
      const staffUsers: Omit<UserWithGymName, 'gymName'>[] =
        await firstValueFrom(this.authClient.send({ cmd: 'get_staff_users' }, {}));

      // 2. Si hay staff, pedimos al Gym Service todos los gimnasios para mapear el nombre.
      if (!staffUsers || staffUsers.length === 0) {
        return [];
      }
      
      const gyms: Gym[] = await firstValueFrom(
        this.gymClient.send({ cmd: 'find_all_gyms' }, {}),
      );

      // 3. Creamos un mapa para buscar nombres de gimnasio por ID eficientemente.
      const gymMap = new Map(gyms.map(g => [g.id, g.name]));

      // 4. Combinamos la información: añadimos 'gymName' a cada usuario.
      const enrichedStaff = staffUsers.map(user => ({
        ...user,
        gymName: user.gymId ? gymMap.get(user.gymId) || 'Gimnasio no encontrado' : 'Ninguno asignado',
      }));

      return enrichedStaff;

    } catch (error) {
      console.error('Error fetching staff:', error);
      throw new HttpException('No se pudo cargar la lista de personal.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  // === NUEVO ENDPOINT PARA LISTAR TODOS LOS USUARIOS (CRUD) ===
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Get('users')
  @HttpCode(HttpStatus.OK)
  async listAllUsers() {
    try {
       const users = await firstValueFrom(this.authClient.send({ cmd: 'list_users' }, {}));
       return users;
    } catch (error) {
       console.error('Error fetching all users:', error);
       throw new HttpException('No se pudo obtener la lista de usuarios.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // --- STAFF USERS ENDPOINT (OWNER ONLY) ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Get('staff')
  @HttpCode(HttpStatus.OK)
  async getStaffUsers() {
    this.logger.log('Solicitando lista de usuarios administrativos...');
    try {
      return await firstValueFrom(
        this.authClient.send({ cmd: 'get_staff_users' }, {}),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error obteniendo usuarios administrativos: ${errorMessage}`);
      throw new HttpException(
        'No se pudo obtener la lista de usuarios administrativos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // --- UPDATE USER PROFILE ENDPOINT (OWNER ONLY) ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Put('users/:id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateUserProfile(
    @Param('id') userId: string, 
    @Body() body: { firstName?: string; lastName?: string }
  ) {
    this.logger.log(`Actualizando perfil de usuario ${userId}`);
    try {
      return await firstValueFrom(
        this.authClient.send({ cmd: 'update_user_profile' }, { userId, data: body }),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error actualizando perfil de usuario: ${errorMessage}`);
      throw new HttpException(
        'No se pudo actualizar el perfil del usuario',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // --- PASSWORD RESET ENDPOINT (OWNER ONLY) ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Post('auth/request-password-reset')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async requestPasswordReset(@Body() body: { email: string }) {
    this.logger.log(`Solicitando reseteo de contraseña para ${body.email}`);
    try {
      return await firstValueFrom(
        this.authClient.send({ cmd: 'request_password_reset' }, { email: body.email }),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error procesando reseteo de contraseña: ${errorMessage}`);
      throw new HttpException(
        'No se pudo procesar la solicitud de reseteo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // === NUEVO ENDPOINT PARA LOS KPIs PRINCIPALES ===
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @Get('analytics/kpis')
  @HttpCode(HttpStatus.OK)
  async getAnalyticsKpis() {
    try {
      // Peticiones en paralelo para más eficiencia
      const [kpisFromAnalytics, activeGyms] = await Promise.all([
        firstValueFrom(this.analyticsClient.send({ cmd: 'get_kpis' }, {})),
        firstValueFrom(this.gymClient.send({ cmd: 'count_active_gyms' }, {})),
      ]);

      // Unimos los resultados
      return {
        ...kpisFromAnalytics,
        totalRevenue: parseFloat(kpisFromAnalytics.totalRevenue) || 0,
        totalGyms: activeGyms, // Añadimos el contador de gimnasios
      };
    } catch (error) {
      this.logger.error('Error fetching combined KPIs:', error);
      throw new HttpException('No se pudieron cargar los KPIs combinados.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  // === NUEVO ENDPOINT PARA LAS GRÁFICAS DEL DASHBOARD ===
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Get('analytics/global-trends')
  @HttpCode(HttpStatus.OK)
  async getAnalyticsGlobalTrends() {
    try {
      const rawData = await firstValueFrom(
        this.analyticsClient.send({ cmd: 'get_global_trends' }, {}),
      );

      // Transformamos la data para que coincida con lo que espera el frontend
      return {
        monthlyRevenue: rawData.monthlyGrowth.map((item: any) => ({
          month: item.month,
          revenue: item.revenue || 0,
        })),
        membershipStats: [
          { name: 'Vendidas este mes', value: rawData.monthlyGrowth[0]?.membershipsSold ?? 0, color: '#8884d8' },
          { name: 'Nuevos usuarios', value: rawData.monthlyGrowth[0]?.newUsers ?? 0, color: '#82ca9d' },
        ],
        // Aseguramos que el crecimiento sea un número
        monthlyGrowth: parseFloat(rawData.comparedToLastMonth.revenueGrowth) || 0,
        lastUpdatedAt: rawData.lastUpdatedAt,
      };
    } catch (error) {
      console.error('Error fetching global trends:', error);
      throw new HttpException('No se pudieron cargar las tendencias globales.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Put('gyms/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateGym(@Param('id') id: string) {
    this.logger.log(`Reactivando gimnasio ${id}`);
    try {
      return await firstValueFrom(
        this.gymClient.send({ cmd: 'reactivate_gym' }, { id }),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error reactivando gimnasio: ${errorMessage}`);
      throw new HttpException(
        'No se pudo reactivar el gimnasio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
import { Controller, Get, Post, Body, HttpException, HttpStatus, Delete, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth(): Promise<{ status: string; service: string; arduino: { connected: boolean; port: string | null; error: string | null; sensor?: { healthy: boolean; response?: string; error?: string } } }> {
    return await this.appService.getHealth();
  }

  @Get('ping')
  async pingArduino(): Promise<{ success: boolean; message: string; response?: string; error?: string }> {
    return await this.appService.pingArduino();
  }

  @Post('enroll')
  async startEnrollment(@Body() body: { userId: string }) {
    try {
      const result = await this.appService.startEnrollment(body.userId);
      return { success: true, message: 'Huella registrada exitosamente.', data: result };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Error desconocido',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('reset')
  async resetFingerprints() {
    try {
      const result = await this.appService.resetFingerprints();
      return { success: true, message: 'Huellas reseteadas exitosamente.', data: result };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Error desconocido',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('count')
  async countFingerprints() {
    try {
      const result = await this.appService.countFingerprints();
      return { success: true, message: 'Conteo de huellas exitoso.', data: result };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Error desconocido',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('fingerprint/:id')
  async deleteFingerprint(@Param('id') id: string) {
    try {
      const fingerprintId = parseInt(id);
      if (isNaN(fingerprintId) || fingerprintId < 1 || fingerprintId > 127) {
        throw new HttpException('ID de huella inválido. Debe estar entre 1 y 127.', HttpStatus.BAD_REQUEST);
      }
      
      const result = await this.appService.deleteFingerprint(fingerprintId);
      return { success: true, message: `Huella ID ${fingerprintId} eliminada exitosamente.`, data: result };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Error desconocido',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

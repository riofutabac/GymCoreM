import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
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
}

import { Controller, Get } from '@nestjs/common';
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
}

import { Controller, Get, Query } from '@nestjs/common';
import { MongoLogService } from './mongo-log.service';

@Controller('logs')
export class LogsController {
  constructor(private readonly mongoLogService: MongoLogService) {}

  @Get('search')
  async searchLogs(
    @Query('context') context?: string,
    @Query('level') level?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    try {
      const logs = await this.mongoLogService.searchLogs({
        context,
        level,
        startDate,
        endDate,
        search,
      });
      
      return {
        success: true,
        count: logs.length,
        logs,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        logs: [],
      };
    }
  }

  @Get('stats')
  async getStats() {
    // Aquí puedes agregar estadísticas de logs
    return {
      message: 'Usa MongoDB Compass para ver estadísticas detalladas',
      mongodbCompassUrl: 'mongodb://localhost:27017/gymcore-logs',
    };
  }
}

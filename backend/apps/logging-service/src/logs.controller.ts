import { Controller, Get, Query } from '@nestjs/common';
import { AppElasticsearchService } from './elasticsearch.service';

@Controller('logs')
export class LogsController {
  constructor(private readonly elasticsearchService: AppElasticsearchService) {}

  @Get('search')
  async searchLogs(
    @Query('context') context?: string,
    @Query('level') level?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    try {
      // Por ahora retornamos un mensaje indicando que se usa Kibana para búsquedas
      return {
        success: true,
        message: 'Para búsquedas avanzadas de logs, usa Kibana en http://localhost:5601',
        kibanaUrl: 'http://localhost:5601',
        elasticsearchIndex: 'gymcore-logs',
        filters: {
          context,
          level,
          startDate,
          endDate,
          search,
        },
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
    // Estadísticas de logs via Kibana/Elasticsearch
    return {
      success: true,
      message: 'Usa Kibana para ver estadísticas detalladas de logs',
      kibanaUrl: 'http://localhost:5601',
      elasticsearchUrl: 'http://localhost:9200',
      elasticsearchIndex: 'gymcore-logs',
    };
  }
}

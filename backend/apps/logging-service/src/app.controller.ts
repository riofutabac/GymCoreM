import { Controller, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AppService } from './app.service';
import { CreateLogDto } from './dto/log.dto';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @RabbitSubscribe({
    exchange: 'gymcore-logs-exchange',
    routingKey: '#', // '#' escucha todos los logs, sin importar su routing key
    queue: 'logging-service.logs',
    queueOptions: { durable: true },
  })
  public async handleLog(payload: CreateLogDto) {
    try {
      // Logueamos en la consola del propio servicio para depuración
      this.logger.log(`📝 [${payload.level.toUpperCase()}] [${payload.context}] ${payload.message}`);
      
      // Indexamos en Elasticsearch (si está disponible)
      await this.appService.handleLog(payload);
      
      // Confirmamos que se procesó
      this.logger.debug(`✅ Log procesado correctamente`);
    } catch (error: any) {
      this.logger.error(`❌ Error procesando log: ${error.message}`);
    }
  }
}
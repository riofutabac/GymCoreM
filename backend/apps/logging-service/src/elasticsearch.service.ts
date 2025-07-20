import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { CreateLogDto } from './dto/log.dto';

@Injectable()
export class AppElasticsearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppElasticsearchService.name);
  private readonly INDEX_NAME = 'gymcore-logs';
  private isElasticsearchAvailable = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private lastReconnectLog = 0;

  constructor(private readonly esService: ElasticsearchService) {}

  async onModuleInit() {
    try {
      // Intentamos conectar con un timeout más corto
      await Promise.race([
        this.createIndexIfNotExists(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de conexión a Elasticsearch')), 5000)
        )
      ]);
      
      this.isElasticsearchAvailable = true;
      this.logger.log('✅ Elasticsearch conectado correctamente');
    } catch (error: any) {
      this.logger.warn('⚠️ Elasticsearch no está disponible. Los logs se mostrarán solo en consola.');
      this.logger.warn(`Error: ${error.message}`);
      this.isElasticsearchAvailable = false;
      
      // No lanzamos el error para que el servicio continúe funcionando
      // Iniciamos intentos de reconexión cada 30 segundos
      this.startReconnectionAttempts();
    }
  }

  private startReconnectionAttempts() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }

    this.reconnectInterval = setInterval(async () => {
      if (!this.isElasticsearchAvailable) {
        try {
          await this.createIndexIfNotExists();
          this.isElasticsearchAvailable = true;
          this.logger.log('✅ Elasticsearch reconectado correctamente');
          
          // Detenemos los intentos de reconexión
          if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
          }
        } catch (error) {
          // Silencioso: solo logueamos cada 5 minutos para no saturar
          const now = Date.now();
          if (!this.lastReconnectLog || now - this.lastReconnectLog > 300000) {
            this.logger.debug('🔄 Intentando reconectar a Elasticsearch...');
            this.lastReconnectLog = now;
          }
        }
      }
    }, 30000); // Cada 30 segundos
  }

  private async createIndexIfNotExists() {
    const indexExists = await this.esService.indices.exists({ index: this.INDEX_NAME });
    if (!indexExists) {
      this.logger.log(`Índice "${this.INDEX_NAME}" no encontrado. Creándolo...`);
      await this.esService.indices.create({ index: this.INDEX_NAME });
    }
  }

  async indexLog(log: CreateLogDto) {
    if (!this.isElasticsearchAvailable) {
      // Si Elasticsearch no está disponible, simplemente no indexamos
      return;
    }

    try {
      await this.esService.index({
        index: this.INDEX_NAME,
        document: {
          ...log,
          '@timestamp': log.timestamp,
        },
      });
    } catch (error: any) {
      this.logger.error('Error indexando log en Elasticsearch:', error.message);
      // Marcamos como no disponible si hay errores de conexión
      this.isElasticsearchAvailable = false;
      
      // Reiniciamos los intentos de reconexión
      this.startReconnectionAttempts();
    }
  }

  // Método para limpiar recursos al destruir el servicio
  onModuleDestroy() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }
}
import { Injectable, ConsoleLogger, Inject, Optional } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

// Definimos aquí el enum para no tener que importar desde otro servicio
enum LogLevel {
  INFO = 'log',
  ERROR = 'error',
  WARN = 'warn',
  DEBUG = 'debug',
}

@Injectable()
export class AmqpLogger extends ConsoleLogger {
  constructor(
    // Es opcional inyectarlo, así el logger no falla si RabbitMQ no está disponible
    @Optional() @Inject(AmqpConnection) private readonly amqpConnection: AmqpConnection,
  ) {
    super();
  }

  private async publishLog(level: LogLevel, message: any, context?: string, stack?: string) {
    // Solo intentar publicar si la conexión existe
    if (!this.amqpConnection) return;

    try {
      // Verificar si la conexión está realmente disponible
      const channel = this.amqpConnection.channel;
      if (!channel) return;

      const routingKey = `log.${level}.${context || this.context || 'unknown'}`;
      await this.amqpConnection.publish('gymcore-logs-exchange', routingKey, {
        context: context || this.context,
        level,
        message: typeof message === 'string' ? message : JSON.stringify(message, null, 2),
        stack,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Si hay error al publicar, simplemente no hacer nada
      // para que el servicio siga funcionando
    }
  }

  log(message: any, context?: string) {
    super.log(message, context);
    void this.publishLog(LogLevel.INFO, message, context);
  }

  error(message: any, stack?: string, context?: string) {
    super.error(message, stack, context);
    void this.publishLog(LogLevel.ERROR, message, context, stack);
  }

  warn(message: any, context?: string) {
    super.warn(message, context);
    void this.publishLog(LogLevel.WARN, message, context);
  }

  debug(message: any, context?: string) {
    super.debug(message, context);
    void this.publishLog(LogLevel.DEBUG, message, context);
  }
}

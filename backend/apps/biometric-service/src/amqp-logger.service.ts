import { Injectable, ConsoleLogger, Inject } from '@nestjs/common';
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
    @Inject(AmqpConnection) private readonly amqpConnection: AmqpConnection,
  ) {
    super();
  }

  private publishLog(level: LogLevel, message: any, context?: string, stack?: string) {
    if (!this.amqpConnection) return; // No hacer nada si la conexión no existe

    const routingKey = `log.${level}.${context || this.context || 'unknown'}`;
    this.amqpConnection.publish('gymcore-logs-exchange', routingKey, {
      context: context || this.context,
      level,
      message: typeof message === 'string' ? message : JSON.stringify(message, null, 2),
      stack,
      timestamp: new Date().toISOString(),
    });
  }

  log(message: any, context?: string) {
    super.log(message, context);
    this.publishLog(LogLevel.INFO, message, context);
  }

  error(message: any, stack?: string, context?: string) {
    super.error(message, stack, context);
    this.publishLog(LogLevel.ERROR, message, context, stack);
  }

  warn(message: any, context?: string) {
    super.warn(message, context);
    this.publishLog(LogLevel.WARN, message, context);
  }

  debug(message: any, context?: string) {
    super.debug(message, context);
    this.publishLog(LogLevel.DEBUG, message, context);
  }
}

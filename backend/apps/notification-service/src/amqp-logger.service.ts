import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class AmqpLogger implements LoggerService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  private async publishLog(level: LogLevel, message: any, context?: string) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message: typeof message === 'object' ? JSON.stringify(message) : message,
        context: context || 'NotificationService',
        service: 'notification-service',
        pid: process.pid,
      };

      // Enviar al exchange de logs
      await this.amqpConnection.publish(
        'gymcore-logs-exchange',
        'log.created',
        logEntry
      );

      // También mostrar en consola para desarrollo
      const timestamp = new Date().toLocaleString();
      const coloredLevel = this.getColoredLevel(level);
      console.log(`[${timestamp}] ${coloredLevel} [${logEntry.context}] ${logEntry.message}`);
    } catch (error) {
      // Si falla el envío a RabbitMQ, al menos mostramos en consola
      console.error('Error enviando log a RabbitMQ:', error);
      console.log(`[NotificationService] ${level.toUpperCase()}: ${message}`);
    }
  }

  private getColoredLevel(level: LogLevel): string {
    const colors: Record<string, string> = {
      error: '\x1b[31m',   // Rojo
      warn: '\x1b[33m',    // Amarillo
      log: '\x1b[32m',     // Verde
      debug: '\x1b[36m',   // Cian
      verbose: '\x1b[35m', // Magenta
      fatal: '\x1b[41m'    // Fondo rojo
    };
    const reset = '\x1b[0m';
    return `${colors[level] || ''}${level.toUpperCase()}${reset}`;
  }

  log(message: any, context?: string) {
    this.publishLog('log', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    const errorMessage = trace ? `${message} - ${trace}` : message;
    this.publishLog('error', errorMessage, context);
  }

  warn(message: any, context?: string) {
    this.publishLog('warn', message, context);
  }

  debug(message: any, context?: string) {
    this.publishLog('debug', message, context);
  }

  verbose(message: any, context?: string) {
    this.publishLog('verbose', message, context);
  }
}

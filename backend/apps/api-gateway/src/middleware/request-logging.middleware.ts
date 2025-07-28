import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AmqpLogger } from '../amqp-logger.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: AmqpLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { ip, method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      const logMessage = {
        ip,
        method,
        url: originalUrl,
        statusCode,
        responseTime: `${responseTime}ms`,
        userAgent,
      };

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} - ${responseTime}ms - IP: ${ip}`,
        'RequestLogger'
      );
    });

    next();
  }
}
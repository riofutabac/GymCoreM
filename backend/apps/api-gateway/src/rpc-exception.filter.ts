// backend/apps/api-gateway/src/rpc-exception.filter.ts

import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';

@Catch() // Captura TODOS los errores
export class CustomRpcExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ocurrió un error inesperado en un servicio interno.';

    if (exception instanceof RpcException) {
      const result = this.handleRpcException(exception);
      httpStatus = result.status;
      message = result.message;
    } else if (exception instanceof HttpException) {
      const result = this.handleHttpException(exception);
      httpStatus = result.status;
      message = result.message;
    } else {
      // Manejo de errores genéricos
      if (typeof exception?.message === 'string') {
        message = exception.message;
      }
      if (typeof exception?.status === 'number') {
        httpStatus = exception.status;
      }
    }

    response.status(httpStatus).json({
      statusCode: httpStatus,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private handleRpcException(exception: RpcException): { status: number; message: string } {
    const rpcError = exception.getError();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ocurrió un error inesperado en un servicio interno.';

    if (typeof rpcError === 'object' && rpcError !== null) {
      const errorObj = rpcError as Record<string, unknown>;

      if (typeof errorObj.status === 'number' && errorObj.status >= 100 && errorObj.status < 600) {
        status = errorObj.status;
      }
      if (typeof errorObj.message === 'string') {
        message = errorObj.message;
      } else if (typeof errorObj.error === 'string') {
        message = errorObj.error;
      }
    } else if (typeof rpcError === 'string') {
      message = rpcError;
    }

    return { status, message };
  }

  private handleHttpException(exception: HttpException): { status: number; message: string } {
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();
    let message = 'Error interno';

    if (typeof errorResponse === 'string') {
      message = errorResponse;
    } else if (
      typeof errorResponse === 'object' &&
      errorResponse !== null &&
      'message' in errorResponse &&
      typeof (errorResponse as any).message === 'string'
    ) {
      message = (errorResponse as any).message;
    }

    return { status, message };
  }
}

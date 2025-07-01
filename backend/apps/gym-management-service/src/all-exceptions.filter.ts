import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch()
export class AllExceptionsFilter extends BaseRpcExceptionFilter {
  catch(exception: any, _host: ArgumentsHost): Observable<any> {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Si es una HttpException de NestJS (NotFoundException, BadRequestException, etc.)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        message = (response as { message?: string }).message || message;
      }
    }
    // Si ya es una RpcException, la dejamos pasar tal como está
    else if (exception instanceof RpcException) {
      return super.catch(exception, _host);
    }
    // Para cualquier otro error
    else if (exception?.message) {
      message = exception.message;
    }

    // Convertimos a RpcException con el formato correcto
    const rpcException = new RpcException({
      status,
      message,
    });

    return super.catch(rpcException, _host);
  }
}

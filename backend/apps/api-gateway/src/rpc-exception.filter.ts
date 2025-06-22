import { Catch, RpcExceptionFilter, ArgumentsHost, HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch(RpcException)
export class CustomRpcExceptionFilter implements RpcExceptionFilter<RpcException> {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    const rpcError = exception.getError();

    let statusCode = 500;
    let message = 'Internal server error';

    // Check if the error has the expected { status, message } structure
    if (typeof rpcError === 'object' && rpcError.hasOwnProperty('status') && rpcError.hasOwnProperty('message')) {
        statusCode = Number(rpcError['status']);
        message = String(rpcError['message']);
    }

    // Return HTTP exception wrapped in Observable error
    return throwError(() => new HttpException(message, statusCode));
  }
}

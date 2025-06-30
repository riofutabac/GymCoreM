import { Catch, RpcExceptionFilter, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch(RpcException)
export class CustomRpcExceptionFilter implements RpcExceptionFilter<RpcException> {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    const rpcError = exception.getError();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An internal server error occurred.';

    // Check if rpcError is an object and not null
    if (typeof rpcError === 'object' && rpcError !== null) {
      
      // ONLY use rpcError.status IF IT'S A VALID HTTP status code number
      if (typeof rpcError['status'] === 'number' && rpcError['status'] >= 100 && rpcError['status'] < 600) {
        httpStatus = rpcError['status'];
      }
      
      // Use the message if available
      if (typeof rpcError['message'] === 'string') {
        message = rpcError['message'];
      }

    } else if (typeof rpcError === 'string') {
      // If the error is just a string
      message = rpcError;
    }

    // Now we're sure httpStatus is a valid number before throwing the exception
    return throwError(() => new HttpException({
      statusCode: httpStatus,
      message,
    }, httpStatus));
  }
}

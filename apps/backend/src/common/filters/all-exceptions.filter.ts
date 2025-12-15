import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (typeof exception.getResponse() === 'string'
          ? exception.getResponse()
          : (exception.getResponse() as any)?.message ||
          (exception.getResponse() as any)?.error ||
          'Internal server error')
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    const apiResponse: ApiResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(apiResponse);
  }
}


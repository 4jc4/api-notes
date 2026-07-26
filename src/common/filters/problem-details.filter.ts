import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred';

    if (exception instanceof ZodValidationException) {
      status = HttpStatus.BAD_REQUEST;
      title = 'Validation Error';

      const zodError = exception.getZodError();
      detail =
        zodError instanceof ZodError
          ? zodError.issues
              .map((i) => `${i.path.join('.')}: ${i.message}`)
              .join('; ')
          : 'Validation failed';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      title = exception.message;
      detail = title;
    }

    response.status(status).json({
      type: `https://api-notes.dev/errors/${status}`,
      title,
      status,
      detail,
      instance: request.url,
    });
  }
}

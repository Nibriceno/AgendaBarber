import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import type {
  Request,
  Response,
} from 'express';

@Catch()
export class AllExceptionsFilter
  implements ExceptionFilter
{
  private readonly logger =
    new Logger(AllExceptionsFilter.name);

  catch(
    exception: unknown,
    host: ArgumentsHost,
  ) {
    const context =
      host.switchToHttp();

    const response =
      context.getResponse<Response>();

    const request =
      context.getRequest<Request>();

    if (
      exception instanceof HttpException
    ) {
      const status =
        exception.getStatus();

      const exceptionResponse =
        exception.getResponse();

      /*
       * Las excepciones HTTP controladas
       * conservan sus mensajes.
       *
       * Ej:
       * 400 validación
       * 401 autenticación
       * 403 permisos
       * 404 recurso inexistente
       * 409 conflicto
       * 429 rate limit
       */
      if (
        typeof exceptionResponse ===
        'string'
      ) {
        response
          .status(status)
          .json({
            statusCode: status,
            message:
              exceptionResponse,
            path:
              request.url,
            timestamp:
              new Date()
                .toISOString(),
          });

        return;
      }

      if (
        typeof exceptionResponse ===
          'object' &&
        exceptionResponse !== null
      ) {
        response
          .status(status)
          .json({
            ...exceptionResponse,

            path:
              request.url,

            timestamp:
              new Date()
                .toISOString(),
          });

        return;
      }
    }

    /*
     * Excepción inesperada.
     *
     * Se registra internamente para poder
     * diagnosticarla, pero NO devolvemos
     * stack trace, SQL, rutas internas,
     * secretos ni mensajes técnicos al cliente.
     */
    this.logger.error(
      `Unhandled exception ${request.method} ${request.url}`,
      exception instanceof Error
        ? exception.stack
        : String(exception),
    );

    response
      .status(
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
      .json({
        statusCode:
          HttpStatus.INTERNAL_SERVER_ERROR,

        message:
          'Error interno del servidor',

        path:
          request.url,

        timestamp:
          new Date()
            .toISOString(),
      });
  }
}

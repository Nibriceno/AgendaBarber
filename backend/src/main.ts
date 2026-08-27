import {
  ValidationPipe,
} from '@nestjs/common';

import {
  ConfigService,
} from '@nestjs/config';

import {
  NestFactory,
} from '@nestjs/core';

import helmet from 'helmet';

import { AppModule } from './app.module';

import {
  AllExceptionsFilter,
} from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const nodeEnv =
    process.env.NODE_ENV ??
    'development';

  const app =
    await NestFactory.create(
      AppModule,
      {
        /*
         * En producción evitamos logs
         * debug y verbose.
         *
         * Seguimos conservando:
         * - errores
         * - warnings
         * - logs operacionales
         */
        logger:
          nodeEnv ===
          'production'
            ? [
                'error',
                'warn',
                'log',
              ]
            : [
                'error',
                'warn',
                'log',
                'debug',
                'verbose',
              ],
      },
    );

  const configService =
    app.get(ConfigService);

  /*
   * Cabeceras HTTP de seguridad.
   */
  app.use(
    helmet(),
  );

  const frontendUrl =
    configService.getOrThrow<string>(
      'FRONTEND_URL',
    );

  const allowedOrigins =
    frontendUrl
      .split(',')
      .map((origin) =>
        origin.trim(),
      )
      .filter(Boolean);

  /*
   * CORS restringido exclusivamente
   * a los frontends configurados.
   */
  app.enableCors({
    origin:
      allowedOrigins,

    credentials:
      true,

    methods: [
      'GET',
      'POST',
      'PATCH',
      'DELETE',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',

      /*
       * Necesario para consultar,
       * cancelar y reprogramar
       * reservas guest.
       */
      'X-Booking-Token',
    ],
  });

  /*
   * Protección global contra:
   *
   * - propiedades inesperadas
   * - mass assignment
   * - DTOs inválidos
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:
        true,

      forbidNonWhitelisted:
        true,

      transform:
        true,

      transformOptions: {
        enableImplicitConversion:
          false,
      },
    }),
  );

  /*
   * Manejo global de excepciones.
   *
   * Las excepciones HTTP controladas
   * mantienen su mensaje.
   *
   * Los errores inesperados devuelven
   * un 500 genérico sin filtrar:
   *
   * - stack traces
   * - errores SQL
   * - rutas internas
   * - secretos
   */
  app.useGlobalFilters(
    new AllExceptionsFilter(),
  );

  /*
   * Permite cierre ordenado cuando
   * el proceso recibe señales como
   * SIGTERM o SIGINT.
   */
  app.enableShutdownHooks();

  const port =
    configService.getOrThrow<number>(
      'PORT',
    );

  await app.listen(
    port,
  );
}

bootstrap();

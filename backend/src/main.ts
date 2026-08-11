import {
  ValidationPipe,
} from '@nestjs/common';

import { NestFactory } from '@nestjs/core';

import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app =
    await NestFactory.create(
      AppModule,
    );

  app.use(
    helmet(),
  );

  app.enableCors({
    origin:
      process.env.FRONTEND_URL ??
      'http://localhost:5173',

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PATCH',
      'DELETE',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,

      transformOptions: {
        enableImplicitConversion:
          false,
      },
    }),
  );

  const port =
    Number(
      process.env.PORT,
    ) || 3000;

  await app.listen(port);
}

bootstrap();

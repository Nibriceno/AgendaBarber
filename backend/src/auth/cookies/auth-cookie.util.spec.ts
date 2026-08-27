import type { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  setSessionCookies,
} from './auth-cookie.util';

describe('auth cookie utilities', () => {
  function createResponse() {
    return {
      cookie: jest.fn(),
    } as unknown as Response;
  }

  function createConfig(publicAppUrl: string) {
    return {
      get: jest.fn(() => publicAppUrl),
    } as unknown as ConfigService;
  }

  it('crea cookies HttpOnly, SameSite y Secure cuando la aplicación usa HTTPS', () => {
    const response = createResponse();

    setSessionCookies({
      response,
      configService: createConfig('https://agenda.example.com'),
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      refreshTokenMaxAgeMs: 60_000,
      csrfToken: 'csrf-token',
    });

    expect(response.cookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      'access-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
      }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        path: '/auth',
        maxAge: 60_000,
      }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      CSRF_TOKEN_COOKIE,
      'csrf-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        path: '/',
        maxAge: 60_000,
      }),
    );
  });

  it('permite cookies locales por HTTP para el entorno Docker de desarrollo', () => {
    const response = createResponse();

    setSessionCookies({
      response,
      configService: createConfig('http://localhost:3001'),
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      refreshTokenMaxAgeMs: 60_000,
      csrfToken: 'csrf-token',
    });

    expect(response.cookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      'access-token',
      expect.objectContaining({ secure: false }),
    );
  });
});

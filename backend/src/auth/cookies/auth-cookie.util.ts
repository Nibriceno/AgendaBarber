import type { CookieOptions, Request, Response } from 'express';
import type { ConfigService } from '@nestjs/config';

export const ACCESS_TOKEN_COOKIE = 'ab_access';
export const REFRESH_TOKEN_COOKIE = 'ab_refresh';
export const CSRF_TOKEN_COOKIE = 'ab_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export function getRequestCookie(
  request: Pick<Request, 'headers'>,
  name: string,
): string | undefined {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(';')) {
    const separatorIndex = cookie.indexOf('=');

    if (separatorIndex < 0) continue;

    const cookieName = cookie.slice(0, separatorIndex).trim();

    if (cookieName !== name) continue;

    const rawValue = cookie.slice(separatorIndex + 1).trim();

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function baseCookieOptions(configService: ConfigService): CookieOptions {
  const publicAppUrl = configService.get<string>('PUBLIC_APP_URL');
  const usesHttps = publicAppUrl?.startsWith('https://') ?? false;

  return {
    httpOnly: true,
    secure: usesHttps,
    sameSite: 'lax',
  };
}

export function setSessionCookies({
  response,
  configService,
  accessToken,
  refreshToken,
  refreshTokenMaxAgeMs,
  csrfToken,
}: {
  response: Response;
  configService: ConfigService;
  accessToken: string;
  refreshToken: string;
  refreshTokenMaxAgeMs: number;
  csrfToken: string;
}) {
  const baseOptions = baseCookieOptions(configService);

  response.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseOptions,
    path: '/',
  });
  response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseOptions,
    path: '/auth',
    maxAge: refreshTokenMaxAgeMs,
  });
  response.cookie(CSRF_TOKEN_COOKIE, csrfToken, {
    ...baseOptions,
    path: '/',
    maxAge: refreshTokenMaxAgeMs,
  });
}

export function setCsrfCookie(
  response: Response,
  configService: ConfigService,
  csrfToken: string,
  maxAge: number,
) {
  response.cookie(CSRF_TOKEN_COOKIE, csrfToken, {
    ...baseCookieOptions(configService),
    path: '/',
    maxAge,
  });
}

export function clearSessionCookies(
  response: Response,
  configService: ConfigService,
) {
  const baseOptions = baseCookieOptions(configService);

  response.clearCookie(ACCESS_TOKEN_COOKIE, { ...baseOptions, path: '/' });
  response.clearCookie(REFRESH_TOKEN_COOKIE, { ...baseOptions, path: '/auth' });
  response.clearCookie(CSRF_TOKEN_COOKIE, { ...baseOptions, path: '/' });
}

import type { CookieOptions, Request, Response } from 'express';
import type { ConfigService } from '@nestjs/config';

export const ACCESS_TOKEN_COOKIE = 'ab_access';
export const REFRESH_TOKEN_COOKIE = 'ab_refresh';
export const CSRF_TOKEN_COOKIE = 'ab_csrf';
export const PLATFORM_ACCESS_TOKEN_COOKIE = 'ab_platform_access';
export const PLATFORM_REFRESH_TOKEN_COOKIE = 'ab_platform_refresh';
export const PLATFORM_CSRF_TOKEN_COOKIE = 'ab_platform_csrf';
export const CSRF_HEADER = 'x-csrf-token';

type SessionCookieDefinition = {
  accessName: string;
  accessPath: string;
  refreshName: string;
  refreshPath: string;
  csrfName: string;
  csrfPath: string;
};

const TENANT_SESSION_COOKIES: SessionCookieDefinition = {
  accessName: ACCESS_TOKEN_COOKIE,
  accessPath: '/',
  refreshName: REFRESH_TOKEN_COOKIE,
  refreshPath: '/auth',
  csrfName: CSRF_TOKEN_COOKIE,
  csrfPath: '/',
};

const PLATFORM_SESSION_COOKIES: SessionCookieDefinition = {
  accessName: PLATFORM_ACCESS_TOKEN_COOKIE,
  accessPath: '/platform',
  refreshName: PLATFORM_REFRESH_TOKEN_COOKIE,
  refreshPath: '/platform/auth',
  csrfName: PLATFORM_CSRF_TOKEN_COOKIE,
  csrfPath: '/platform',
};

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
  setNamedSessionCookies(
    TENANT_SESSION_COOKIES,
    response,
    configService,
    accessToken,
    refreshToken,
    refreshTokenMaxAgeMs,
    csrfToken,
  );
}

export function setPlatformSessionCookies({
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
  setNamedSessionCookies(
    PLATFORM_SESSION_COOKIES,
    response,
    configService,
    accessToken,
    refreshToken,
    refreshTokenMaxAgeMs,
    csrfToken,
  );
}

function setNamedSessionCookies(
  definition: SessionCookieDefinition,
  response: Response,
  configService: ConfigService,
  accessToken: string,
  refreshToken: string,
  refreshTokenMaxAgeMs: number,
  csrfToken: string,
) {
  const baseOptions = baseCookieOptions(configService);

  response.cookie(definition.accessName, accessToken, {
    ...baseOptions,
    path: definition.accessPath,
  });
  response.cookie(definition.refreshName, refreshToken, {
    ...baseOptions,
    path: definition.refreshPath,
    maxAge: refreshTokenMaxAgeMs,
  });
  response.cookie(definition.csrfName, csrfToken, {
    ...baseOptions,
    path: definition.csrfPath,
    maxAge: refreshTokenMaxAgeMs,
  });
}

export function setCsrfCookie(
  response: Response,
  configService: ConfigService,
  csrfToken: string,
  maxAge: number,
) {
  setNamedCsrfCookie(
    response,
    configService,
    CSRF_TOKEN_COOKIE,
    '/',
    csrfToken,
    maxAge,
  );
}

export function setPlatformCsrfCookie(
  response: Response,
  configService: ConfigService,
  csrfToken: string,
  maxAge: number,
) {
  setNamedCsrfCookie(
    response,
    configService,
    PLATFORM_CSRF_TOKEN_COOKIE,
    '/platform',
    csrfToken,
    maxAge,
  );
}

function setNamedCsrfCookie(
  response: Response,
  configService: ConfigService,
  name: string,
  path: string,
  csrfToken: string,
  maxAge: number,
) {
  response.cookie(name, csrfToken, {
    ...baseCookieOptions(configService),
    path,
    maxAge,
  });
}

export function clearSessionCookies(
  response: Response,
  configService: ConfigService,
) {
  clearNamedSessionCookies(response, configService, TENANT_SESSION_COOKIES);
}

export function clearPlatformSessionCookies(
  response: Response,
  configService: ConfigService,
) {
  clearNamedSessionCookies(response, configService, PLATFORM_SESSION_COOKIES);
}

function clearNamedSessionCookies(
  response: Response,
  configService: ConfigService,
  definition: SessionCookieDefinition,
) {
  const baseOptions = baseCookieOptions(configService);

  response.clearCookie(definition.accessName, {
    ...baseOptions,
    path: definition.accessPath,
  });
  response.clearCookie(definition.refreshName, {
    ...baseOptions,
    path: definition.refreshPath,
  });
  response.clearCookie(definition.csrfName, {
    ...baseOptions,
    path: definition.csrfPath,
  });
}

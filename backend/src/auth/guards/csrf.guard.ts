import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

import {
  ACCESS_TOKEN_COOKIE,
  CSRF_HEADER,
  CSRF_TOKEN_COOKIE,
  PLATFORM_ACCESS_TOKEN_COOKIE,
  PLATFORM_CSRF_TOKEN_COOKIE,
  PLATFORM_REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getRequestCookie,
} from '../cookies/auth-cookie.util';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const isPlatformRequest = request.path?.startsWith('/platform') ?? false;
    const accessCookie = isPlatformRequest
      ? PLATFORM_ACCESS_TOKEN_COOKIE
      : ACCESS_TOKEN_COOKIE;
    const refreshCookie = isPlatformRequest
      ? PLATFORM_REFRESH_TOKEN_COOKIE
      : REFRESH_TOKEN_COOKIE;
    const csrfCookie = isPlatformRequest
      ? PLATFORM_CSRF_TOKEN_COOKIE
      : CSRF_TOKEN_COOKIE;

    const usesCookieAuthentication = Boolean(
      getRequestCookie(request, accessCookie) ||
        getRequestCookie(request, refreshCookie),
    );

    if (!usesCookieAuthentication) return true;

    const cookieToken = getRequestCookie(request, csrfCookie);
    const headerValue = request.headers[CSRF_HEADER];
    const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException('Validación CSRF requerida.');
    }

    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);

    if (
      cookieBuffer.length !== headerBuffer.length ||
      !timingSafeEqual(cookieBuffer, headerBuffer)
    ) {
      throw new ForbiddenException('Token CSRF inválido.');
    }

    return true;
  }
}

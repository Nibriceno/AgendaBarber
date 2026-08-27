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
  REFRESH_TOKEN_COOKIE,
  getRequestCookie,
} from '../cookies/auth-cookie.util';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const usesCookieAuthentication = Boolean(
      getRequestCookie(request, ACCESS_TOKEN_COOKIE) ||
        getRequestCookie(request, REFRESH_TOKEN_COOKIE),
    );

    if (!usesCookieAuthentication) return true;

    const cookieToken = getRequestCookie(request, CSRF_TOKEN_COOKIE);
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

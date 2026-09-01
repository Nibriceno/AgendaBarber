import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformRole } from '@prisma/client';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import { PrismaService } from '../../prisma/prisma.service';
import {
  PLATFORM_ACCESS_TOKEN_COOKIE,
  getRequestCookie,
} from '../../auth/cookies/auth-cookie.util';
import { getPlatformJwtSecret } from '../platform-jwt.config';

type PlatformJwtPayload = {
  tokenType: 'platform';
  sub: number;
  role: PlatformRole;
  authVersion: number;
  sessionId: string;
};

@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(
  Strategy,
  'platform-jwt',
) {
  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          getRequestCookie(request, PLATFORM_ACCESS_TOKEN_COOKIE) ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: getPlatformJwtSecret(configService),
    });
  }

  async validate(payload: PlatformJwtPayload) {
    if (payload.tokenType !== 'platform' || !payload.sessionId) {
      throw new UnauthorizedException('Sesión de plataforma inválida.');
    }

    const user = await this.prisma.platformUser.findFirst({
      where: {
        id: payload.sub,
        isActive: true,
        deletedAt: null,
        authSessions: {
          some: {
            id: payload.sessionId,
            authVersion: payload.authVersion,
            revokedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
        },
      },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
        email: true,
        authVersion: true,
      },
    });

    if (!user || user.authVersion !== payload.authVersion) {
      throw new UnauthorizedException('Sesión de plataforma inválida.');
    }

    return {
      sessionId: payload.sessionId,
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  }
}

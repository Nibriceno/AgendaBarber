import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service';

import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  getRequestCookie,
} from '../cookies/auth-cookie.util';
import {
  isBusinessBillingRestricted,
  isBusinessOperational,
} from '../../businesses/business-status';

type JwtPayload = {
  tokenType: 'tenant';
  sub: number;
  businessId: number;
  role: UserRole;
  authVersion?: number;
  sessionId: string;
  customerIdentityId?: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,

    configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET no está configurado.');
    }

    super({
      passReqToCallback: true,
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          getRequestCookie(request, ACCESS_TOKEN_COOKIE) ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),

      ignoreExpiration: false,

      secretOrKey: secret,
    });
  }

  async validate(request: Request, payload: JwtPayload) {
    if (payload.tokenType !== 'tenant' || !payload.sessionId) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,

        businessId: payload.businessId,

        isActive: true,

        deletedAt: null,

        authSessions: {
          some: {
            id: payload.sessionId,
            authVersion: payload.authVersion ?? 0,
            revokedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
        },
      },

      select: {
        id: true,
        businessId: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        authVersion: true,
        customerIdentityId: true,

        business: {
          select: {
            slug: true,
            status: true,
            statusReason: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    const billingRestricted =
      user.role === UserRole.ADMIN &&
      isBusinessBillingRestricted(user.business);
    if (
      user.role !== UserRole.CLIENT &&
      !isBusinessOperational(user.business)
    ) {
      if (!billingRestricted || !this.isBillingRecoveryRequest(request)) {
        throw new UnauthorizedException('Sesión inválida.');
      }
    }

    if ((payload.authVersion ?? 0) !== user.authVersion) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    return {
      sessionId: payload.sessionId,
      id: user.id,
      businessId: user.businessId,
      businessSlug: user.business.slug,
      customerIdentityId: user.customerIdentityId,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      billingRestricted,
    };
  }

  private isBillingRecoveryRequest(request: Request) {
    const path = request.path.toLowerCase();
    return path === '/auth/me' || path.startsWith('/subscriptions');
  }
}

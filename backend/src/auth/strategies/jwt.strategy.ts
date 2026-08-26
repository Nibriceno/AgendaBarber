import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service';

import { UserRole } from '@prisma/client';

type JwtPayload = {
  sub: number;
  businessId: number;
  role: UserRole;
  authVersion?: number;
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
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,

        businessId: payload.businessId,

        isActive: true,

        deletedAt: null,
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

        business: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    if ((payload.authVersion ?? 0) !== user.authVersion) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    return {
      id: user.id,
      businessId: user.businessId,
      businessSlug: user.business.slug,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
    };
  }
}

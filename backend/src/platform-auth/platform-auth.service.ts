import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PlatformRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { PlatformLoginDto } from './dto/platform-login.dto';

type PlatformSessionUserData = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: PlatformRole;
  authVersion: number;
};

export type PlatformSessionResponse = {
  accessToken: string;
  refreshToken: string;
  user: Omit<PlatformSessionUserData, 'authVersion'>;
};

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: PlatformLoginDto): Promise<PlatformSessionResponse> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.platformUser.findFirst({
      where: {
        email,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        passwordHash: true,
        role: true,
        authVersion: true,
      },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    await this.prisma.platformUser.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    return this.createSession(user);
  }

  async refreshSession(refreshToken: string): Promise<PlatformSessionResponse> {
    const parsedToken = this.parseRefreshToken(refreshToken);

    if (!parsedToken) {
      throw new UnauthorizedException('Sesión de plataforma inválida.');
    }

    const session = await this.prisma.platformAuthSession.findFirst({
      where: {
        id: parsedToken.sessionId,
      },
      select: {
        id: true,
        refreshTokenHash: true,
        authVersion: true,
        expiresAt: true,
        revokedAt: true,
        platformUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            authVersion: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    const now = new Date();
    const isUsable =
      session &&
      !session.revokedAt &&
      session.expiresAt > now &&
      session.authVersion === session.platformUser.authVersion &&
      session.platformUser.isActive &&
      !session.platformUser.deletedAt;

    if (!isUsable) {
      throw new UnauthorizedException('Sesión de plataforma inválida o vencida.');
    }

    const presentedHash = this.hashRefreshToken(refreshToken);

    if (!this.hashesMatch(presentedHash, session.refreshTokenHash)) {
      await this.prisma.platformAuthSession.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      throw new UnauthorizedException('Sesión de plataforma inválida.');
    }

    const rotatedRefreshToken = this.createRefreshToken(session.id);
    const rotatedHash = this.hashRefreshToken(rotatedRefreshToken);
    const rotated = await this.prisma.platformAuthSession.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: session.refreshTokenHash,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        refreshTokenHash: rotatedHash,
      },
    });

    if (rotated.count !== 1) {
      throw new UnauthorizedException('La sesión ya fue renovada.');
    }

    return {
      accessToken: await this.signAccessToken(
        session.platformUser,
        session.id,
      ),
      refreshToken: rotatedRefreshToken,
      user: this.toSessionUser(session.platformUser),
    };
  }

  async logout(refreshToken?: string) {
    const parsedToken = refreshToken
      ? this.parseRefreshToken(refreshToken)
      : null;

    if (parsedToken && refreshToken) {
      await this.prisma.platformAuthSession.updateMany({
        where: {
          id: parsedToken.sessionId,
          refreshTokenHash: this.hashRefreshToken(refreshToken),
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    return {
      message: 'Sesión de plataforma cerrada correctamente.',
    };
  }

  private async createSession(
    user: PlatformSessionUserData,
  ): Promise<PlatformSessionResponse> {
    const sessionId = randomUUID();
    const refreshToken = this.createRefreshToken(sessionId);

    await this.prisma.platformAuthSession.create({
      data: {
        id: sessionId,
        platformUserId: user.id,
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        authVersion: user.authVersion,
        expiresAt: new Date(Date.now() + this.getRefreshTokenTtlMs()),
      },
      select: {
        id: true,
      },
    });

    return {
      accessToken: await this.signAccessToken(user, sessionId),
      refreshToken,
      user: this.toSessionUser(user),
    };
  }

  private signAccessToken(user: PlatformSessionUserData, sessionId: string) {
    return this.jwtService.signAsync({
      tokenType: 'platform',
      sub: user.id,
      role: user.role,
      authVersion: user.authVersion,
      sessionId,
    });
  }

  private toSessionUser(user: PlatformSessionUserData) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
  }

  private createRefreshToken(sessionId: string): string {
    return `${sessionId}.${randomBytes(32).toString('base64url')}`;
  }

  private parseRefreshToken(
    refreshToken: string,
  ): { sessionId: string } | null {
    const [sessionId, secret, unexpectedPart] = refreshToken.split('.');

    if (
      unexpectedPart !== undefined ||
      !sessionId ||
      !secret ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        sessionId,
      ) ||
      !/^[A-Za-z0-9_-]{43}$/.test(secret)
    ) {
      return null;
    }

    return { sessionId };
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken, 'utf8').digest('hex');
  }

  private hashesMatch(firstHash: string, secondHash: string): boolean {
    const first = Buffer.from(firstHash, 'hex');
    const second = Buffer.from(secondHash, 'hex');

    return first.length === second.length && timingSafeEqual(first, second);
  }

  private getRefreshTokenTtlMs(): number {
    const days =
      this.configService.get<number>('PLATFORM_REFRESH_TOKEN_EXPIRES_DAYS') ??
      this.configService.get<number>('REFRESH_TOKEN_EXPIRES_DAYS') ??
      14;

    return days * 24 * 60 * 60 * 1000;
  }
}

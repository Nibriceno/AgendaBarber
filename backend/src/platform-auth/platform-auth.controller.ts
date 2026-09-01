import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';

import {
  PLATFORM_CSRF_TOKEN_COOKIE,
  PLATFORM_REFRESH_TOKEN_COOKIE,
  clearPlatformSessionCookies,
  getRequestCookie,
  setPlatformCsrfCookie,
  setPlatformSessionCookies,
} from '../auth/cookies/auth-cookie.util';
import { CurrentPlatformUser } from './decorators/current-platform-user.decorator';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { PlatformJwtAuthGuard } from './guards/platform-jwt-auth.guard';
import type { PlatformAuthUser } from './interfaces/platform-auth-user.interface';
import {
  PlatformAuthService,
  PlatformSessionResponse,
} from './platform-auth.service';

@Controller('platform/auth')
export class PlatformAuthController {
  constructor(
    private readonly platformAuthService: PlatformAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Post('login')
  async login(
    @Body() dto: PlatformLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.platformAuthService.login(dto);
    const csrfToken = this.createCsrfToken();

    this.writeSessionCookies(response, session, csrfToken);

    return {
      user: session.user,
      csrfToken,
    };
  }

  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = getRequestCookie(
      request,
      PLATFORM_REFRESH_TOKEN_COOKIE,
    );

    try {
      const session = await this.platformAuthService.refreshSession(
        refreshToken ?? '',
      );
      const csrfToken =
        getRequestCookie(request, PLATFORM_CSRF_TOKEN_COOKIE) ??
        this.createCsrfToken();

      this.writeSessionCookies(response, session, csrfToken);

      return {
        user: session.user,
        csrfToken,
      };
    } catch (error) {
      clearPlatformSessionCookies(response, this.configService);
      throw error;
    }
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.platformAuthService.logout(
      getRequestCookie(request, PLATFORM_REFRESH_TOKEN_COOKIE),
    );

    clearPlatformSessionCookies(response, this.configService);

    return result;
  }

  @Get('csrf')
  csrf(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const csrfToken =
      getRequestCookie(request, PLATFORM_CSRF_TOKEN_COOKIE) ??
      this.createCsrfToken();

    setPlatformCsrfCookie(
      response,
      this.configService,
      csrfToken,
      this.getRefreshTokenTtlMs(),
    );

    return { csrfToken };
  }

  @Get('me')
  @UseGuards(PlatformJwtAuthGuard)
  me(
    @CurrentPlatformUser()
    currentUser: PlatformAuthUser,
  ) {
    return {
      id: currentUser.id,
      role: currentUser.role,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
    };
  }

  private writeSessionCookies(
    response: Response,
    session: PlatformSessionResponse,
    csrfToken: string,
  ) {
    setPlatformSessionCookies({
      response,
      configService: this.configService,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      refreshTokenMaxAgeMs: this.getRefreshTokenTtlMs(),
      csrfToken,
    });
  }

  private createCsrfToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private getRefreshTokenTtlMs(): number {
    const days =
      this.configService.get<number>('PLATFORM_REFRESH_TOKEN_EXPIRES_DAYS') ??
      this.configService.get<number>('REFRESH_TOKEN_EXPIRES_DAYS') ??
      14;

    return days * 24 * 60 * 60 * 1000;
  }
}

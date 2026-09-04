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
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';

import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { CurrentUser } from './decorators/current-user.decorator';

import type { AuthUser } from './interfaces/auth-user.interface';
import {
  CSRF_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearSessionCookies,
  getRequestCookie,
  setCsrfCookie,
  setSessionCookies,
} from './cookies/auth-cookie.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /*
   * LOGIN
   *
   * Protección contra fuerza bruta:
   * máximo 5 intentos por minuto por IP.
   *
   * Tanto credenciales correctas como incorrectas
   * consumen intentos.
   */
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Post('login')
  async login(
    @Body()
    loginDto: LoginDto,

    @Res({ passthrough: true })
    response: Response,
  ) {
    const session = await this.authService.login(loginDto);
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
    const refreshToken = getRequestCookie(request, REFRESH_TOKEN_COOKIE);

    if (!refreshToken) {
      clearSessionCookies(response, this.configService);
      return this.authService.refreshSession('');
    }

    try {
      const session = await this.authService.refreshSession(refreshToken);
      const csrfToken =
        getRequestCookie(request, CSRF_TOKEN_COOKIE) ?? this.createCsrfToken();

      this.writeSessionCookies(response, session, csrfToken);

      return {
        user: session.user,
        csrfToken,
      };
    } catch (error) {
      clearSessionCookies(response, this.configService);
      throw error;
    }
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logout(
      getRequestCookie(request, REFRESH_TOKEN_COOKIE),
    );

    clearSessionCookies(response, this.configService);

    return result;
  }

  @Get('csrf')
  csrf(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const csrfToken =
      getRequestCookie(request, CSRF_TOKEN_COOKIE) ?? this.createCsrfToken();

    setCsrfCookie(
      response,
      this.configService,
      csrfToken,
      this.getRefreshTokenTtlMs(),
    );

    return { csrfToken };
  }

  /*
   * REGISTRO
   *
   * También lo limitamos porque es un endpoint
   * público que escribe en la base de datos.
   */
  @Throttle({
    default: {
      limit: 3,
      ttl: 60_000,
    },
  })
  @Post('register')
  register(
    @Body()
    registerDto: RegisterDto,
  ) {
    return this.authService.register(registerDto);
  }

  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Post('verify-email')
  verifyEmail(
    @Body()
    verifyEmailDto: VerifyEmailDto,
  ) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Throttle({
    default: {
      limit: 3,
      ttl: 60_000,
    },
  })
  @Post('resend-verification')
  resendVerification(
    @Body()
    resendVerificationDto: ResendVerificationDto,
  ) {
    return this.authService.resendVerification(resendVerificationDto);
  }

  @Throttle({
    default: {
      limit: 3,
      ttl: 5 * 60_000,
    },
  })
  @Post('forgot-password')
  forgotPassword(
    @Body()
    forgotPasswordDto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Post('reset-password')
  resetPassword(
    @Body()
    resetPasswordDto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  /*
   * Usuario autenticado actual.
   *
   * Sigue protegido mediante JWT.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(
    @CurrentUser()
    currentUser: AuthUser,
  ) {
    return {
      id: currentUser.id,
      businessId: currentUser.businessId,
      businessSlug: currentUser.businessSlug,
      customerIdentityId: currentUser.customerIdentityId,
      role: currentUser.role,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      phone: currentUser.phone,
      email: currentUser.email,
      billingRestricted: currentUser.billingRestricted ?? false,
    };
  }

  private writeSessionCookies(
    response: Response,
    session: Awaited<ReturnType<AuthService['login']>>,
    csrfToken: string,
  ) {
    setSessionCookies({
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
      this.configService.get<number>('REFRESH_TOKEN_EXPIRES_DAYS') ?? 14;

    return days * 24 * 60 * 60 * 1000;
  }
}

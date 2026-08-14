import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  Throttle,
} from '@nestjs/throttler';

import { AuthService } from './auth.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { CurrentUser } from './decorators/current-user.decorator';

import type { AuthUser } from './interfaces/auth-user.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
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
  login(
    @Body()
    loginDto: LoginDto,
  ) {
    return this.authService.login(
      loginDto,
    );
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
    return this.authService.register(
      registerDto,
    );
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
    return currentUser;
  }
}
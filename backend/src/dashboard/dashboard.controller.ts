import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import {
  UserRole,
} from '@prisma/client';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

import {
  Roles,
} from '../auth/decorators/roles.decorator';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';

import {
  RolesGuard,
} from '../auth/guards/roles.guard';

import type {
  AuthUser,
} from '../auth/interfaces/auth-user.interface';

import {
  DashboardService,
} from './dashboard.service';

@Controller('dashboard')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  @Get('summary')
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
  )
  getSummary(
    @CurrentUser()
    currentUser: AuthUser,
  ) {
    return this.dashboardService.getSummary(
      currentUser.businessId,
    );
  }
}

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  findMine(@CurrentUser() currentUser: AuthUser) {
    return this.subscriptionsService.getMine(currentUser);
  }

  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @Post()
  create(
    @CurrentUser() currentUser: AuthUser,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.create(currentUser, dto);
  }

  @Throttle({ default: { limit: 3, ttl: 10 * 60_000 } })
  @Post('me/cancel')
  cancel(@CurrentUser() currentUser: AuthUser) {
    return this.subscriptionsService.cancelAtPeriodEnd(currentUser);
  }

  @Throttle({ default: { limit: 3, ttl: 10 * 60_000 } })
  @Post('me/reactivate')
  reactivate(@CurrentUser() currentUser: AuthUser) {
    return this.subscriptionsService.reactivate(currentUser);
  }
}

import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AvailabilityService } from './availability.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  check(
    @CurrentUser()
    currentUser: AuthUser,

    @Query()
    dto: CheckAvailabilityDto,
  ) {
    return this.availabilityService.check(
      currentUser.businessId,
      dto,
    );
  }
}
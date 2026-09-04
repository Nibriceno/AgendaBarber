import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { GetOnboardingStatusDto } from './dto/get-onboarding-status.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @Post()
  create(@Body() dto: CreateOnboardingDto) {
    return this.onboardingService.create(dto);
  }

  @Throttle({ default: { limit: 30, ttl: 10 * 60_000 } })
  @Get(':id')
  getStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetOnboardingStatusDto,
  ) {
    return this.onboardingService.getStatus(id, query.token);
  }
}

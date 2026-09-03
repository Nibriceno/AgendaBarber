import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CreatePlanRequestDto } from './dto/create-plan-request.dto';
import { CreatePlanCheckoutDto } from './dto/create-plan-checkout.dto';
import { PlanPaymentsService } from './plan-payments.service';
import { PlanRequestsService } from './plan-requests.service';

@Controller('plan-requests')
export class PublicPlanRequestsController {
  constructor(
    private readonly planRequestsService: PlanRequestsService,
    private readonly planPaymentsService: PlanPaymentsService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @Post()
  create(@Body() dto: CreatePlanRequestDto) {
    return this.planRequestsService.create(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @Post(':id/checkout')
  createCheckout(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePlanCheckoutDto,
  ) {
    return this.planPaymentsService.createCheckout(id, dto.checkoutToken);
  }
}

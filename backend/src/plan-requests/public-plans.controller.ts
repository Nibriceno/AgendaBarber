import { Controller, Get, Param, Query } from '@nestjs/common';

import { PlanQuoteQueryDto } from './dto/plan-quote-query.dto';
import { PlanPricingService } from './plan-pricing.service';

@Controller('plans')
export class PublicPlansController {
  constructor(private readonly planPricingService: PlanPricingService) {}

  @Get()
  findAll() {
    return this.planPricingService.getPublicPlans();
  }

  @Get(':plan/quote')
  quote(@Param('plan') plan: string, @Query() query: PlanQuoteQueryDto) {
    return this.planPricingService.quote(plan, query.promoCode);
  }
}

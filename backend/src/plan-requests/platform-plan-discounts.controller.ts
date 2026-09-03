import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PlatformRole } from '@prisma/client';

import { PlatformRoles } from '../platform-auth/decorators/platform-roles.decorator';
import { PlatformJwtAuthGuard } from '../platform-auth/guards/platform-jwt-auth.guard';
import { PlatformRolesGuard } from '../platform-auth/guards/platform-roles.guard';
import { CreatePlanDiscountDto } from './dto/create-plan-discount.dto';
import { UpdatePlanDiscountDto } from './dto/update-plan-discount.dto';
import { PlanPricingService } from './plan-pricing.service';

@Controller('platform/plan-discounts')
@UseGuards(PlatformJwtAuthGuard, PlatformRolesGuard)
@PlatformRoles(PlatformRole.SUPER_ADMIN)
export class PlatformPlanDiscountsController {
  constructor(private readonly planPricingService: PlanPricingService) {}

  @Get()
  findAll() {
    return this.planPricingService.findAllDiscounts();
  }

  @Post()
  create(@Body() dto: CreatePlanDiscountDto) {
    return this.planPricingService.createDiscount(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanDiscountDto,
  ) {
    return this.planPricingService.updateDiscount(id, dto);
  }
}

import { Module } from '@nestjs/common';

import { PlatformAuthModule } from '../platform-auth/platform-auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformPlanRequestsController } from './platform-plan-requests.controller';
import { PlatformPlanDiscountsController } from './platform-plan-discounts.controller';
import { PlanPaymentsController } from './plan-payments.controller';
import { PlanPaymentsService } from './plan-payments.service';
import { PlanPricingService } from './plan-pricing.service';
import { PlanRequestsService } from './plan-requests.service';
import { PublicPlansController } from './public-plans.controller';
import { PublicPlanRequestsController } from './public-plan-requests.controller';

@Module({
  imports: [PrismaModule, PlatformAuthModule],
  controllers: [
    PublicPlanRequestsController,
    PublicPlansController,
    PlatformPlanRequestsController,
    PlatformPlanDiscountsController,
    PlanPaymentsController,
  ],
  providers: [PlanRequestsService, PlanPricingService, PlanPaymentsService],
  exports: [PlanPricingService],
})
export class PlanRequestsModule {}

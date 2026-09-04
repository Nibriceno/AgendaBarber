import { Module } from '@nestjs/common';

import { PaymentsModule } from '../payments/payments.module';
import { PlanRequestsModule } from '../plan-requests/plan-requests.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionsController } from './subscriptions.controller';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';

@Module({
  imports: [PrismaModule, PaymentsModule, PlanRequestsModule],
  controllers: [SubscriptionsController, OnboardingController],
  providers: [
    SubscriptionsService,
    OnboardingService,
    SubscriptionLifecycleService,
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

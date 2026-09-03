import { Module } from '@nestjs/common';

import { PaymentsModule } from '../payments/payments.module';
import { PlanRequestsModule } from '../plan-requests/plan-requests.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [PrismaModule, PaymentsModule, PlanRequestsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

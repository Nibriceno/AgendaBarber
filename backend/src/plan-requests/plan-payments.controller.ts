import {
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { PlanPaymentsService } from './plan-payments.service';

@Controller('payments')
export class PlanPaymentsController {
  constructor(private readonly planPaymentsService: PlanPaymentsService) {}

  @Get('plan-checkouts/:id')
  getStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.planPaymentsService.getCheckoutStatus(id);
  }

  @Throttle({ default: { limit: 1_000, ttl: 60_000 } })
  @Post('mercado-pago/webhook')
  webhook(
    @Headers('x-signature') xSignature: string | string[] | undefined,
    @Headers('x-request-id') xRequestId: string | string[] | undefined,
    @Query('data.id') dataId: string | string[] | undefined,
    @Query('type') type: string | undefined,
  ) {
    return this.planPaymentsService.processWebhook({
      xSignature,
      xRequestId,
      dataId,
      type,
    });
  }
}

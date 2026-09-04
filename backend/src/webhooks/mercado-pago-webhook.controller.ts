import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { MercadoPagoWebhookService } from './mercado-pago-webhook.service';

@Controller('webhooks')
export class MercadoPagoWebhookController {
  constructor(private readonly webhooks: MercadoPagoWebhookService) {}

  @HttpCode(200)
  @Throttle({ default: { limit: 1_000, ttl: 60_000 } })
  @Post('mercadopago')
  receive(
    @Headers('x-signature') xSignature: string | string[] | undefined,
    @Headers('x-request-id') xRequestId: string | string[] | undefined,
    @Query('data.id') queryDataId: string | string[] | undefined,
    @Query('type') queryType: string | string[] | undefined,
    @Query('topic') queryTopic: string | string[] | undefined,
    @Body() body: Record<string, unknown> | undefined,
  ) {
    return this.webhooks.receive({
      xSignature,
      xRequestId,
      queryDataId,
      queryType,
      queryTopic,
      body,
    });
  }
}

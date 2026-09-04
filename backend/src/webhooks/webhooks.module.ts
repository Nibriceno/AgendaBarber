import { Module } from '@nestjs/common';

import { PaymentsModule } from '../payments/payments.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MercadoPagoBillingSyncService } from './mercado-pago-billing-sync.service';
import { MercadoPagoWebhookController } from './mercado-pago-webhook.controller';
import { MercadoPagoWebhookService } from './mercado-pago-webhook.service';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [MercadoPagoWebhookController],
  providers: [MercadoPagoWebhookService, MercadoPagoBillingSyncService],
})
export class WebhooksModule {}

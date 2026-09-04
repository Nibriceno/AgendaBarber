import { Module } from '@nestjs/common';

import { MercadoPagoWebhookVerifier } from './mercado-pago-webhook-verifier';
import { MercadoPagoSubscriptionProvider } from './providers/mercado-pago-subscription.provider';
import { SUBSCRIPTION_PAYMENT_PROVIDER } from './providers/payment-provider.interface';

@Module({
  providers: [
    MercadoPagoSubscriptionProvider,
    MercadoPagoWebhookVerifier,
    {
      provide: SUBSCRIPTION_PAYMENT_PROVIDER,
      useExisting: MercadoPagoSubscriptionProvider,
    },
  ],
  exports: [SUBSCRIPTION_PAYMENT_PROVIDER, MercadoPagoWebhookVerifier],
})
export class PaymentsModule {}

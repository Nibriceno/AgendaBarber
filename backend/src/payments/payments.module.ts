import { Module } from '@nestjs/common';

import { MercadoPagoSubscriptionProvider } from './providers/mercado-pago-subscription.provider';
import { SUBSCRIPTION_PAYMENT_PROVIDER } from './providers/payment-provider.interface';

@Module({
  providers: [
    MercadoPagoSubscriptionProvider,
    {
      provide: SUBSCRIPTION_PAYMENT_PROVIDER,
      useExisting: MercadoPagoSubscriptionProvider,
    },
  ],
  exports: [SUBSCRIPTION_PAYMENT_PROVIDER],
})
export class PaymentsModule {}

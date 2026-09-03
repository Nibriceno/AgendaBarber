import {
  BillingInterval,
  PaymentProvider,
  SubscriptionStatus,
} from '@prisma/client';

export const SUBSCRIPTION_PAYMENT_PROVIDER = Symbol(
  'SUBSCRIPTION_PAYMENT_PROVIDER',
);

export type CreateProviderSubscriptionInput = {
  idempotencyKey: string;
  externalReference: string;
  payerEmail: string;
  reason: string;
  amount: number;
  currency: string;
  interval: BillingInterval;
  intervalCount: number;
  backUrl: string;
};

export type ProviderSubscriptionSnapshot = {
  provider: PaymentProvider;
  providerSubscriptionId: string;
  providerPayerId: string | null;
  status: SubscriptionStatus;
  rawStatus: string | null;
  rawStatusDetail: string | null;
  authorizationUrl: string | null;
  paymentMethodId: string | null;
  nextPaymentAt: Date | null;
  providerUpdatedAt: Date | null;
};

export interface SubscriptionPaymentProvider {
  createSubscription(
    input: CreateProviderSubscriptionInput,
  ): Promise<ProviderSubscriptionSnapshot>;

  getSubscription(
    providerSubscriptionId: string,
  ): Promise<ProviderSubscriptionSnapshot>;
}

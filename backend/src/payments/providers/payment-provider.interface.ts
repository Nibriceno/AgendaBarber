import {
  BillingInterval,
  PaymentProvider,
  SubscriptionPaymentStatus,
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
  externalReference: string | null;
  applicationId: string | null;
  collectorId: string | null;
  amount: number | null;
  currency: string | null;
  status: SubscriptionStatus;
  rawStatus: string | null;
  rawStatusDetail: string | null;
  authorizationUrl: string | null;
  paymentMethodId: string | null;
  nextPaymentAt: Date | null;
  providerUpdatedAt: Date | null;
};

export type ProviderInvoiceSnapshot = {
  providerInvoiceId: string;
  providerSubscriptionId: string | null;
  providerPaymentId: string | null;
  externalReference: string | null;
  amount: number | null;
  currency: string | null;
  rawStatus: string | null;
  debitDate: Date | null;
  providerUpdatedAt: Date | null;
};

export type ProviderPaymentSnapshot = {
  providerPaymentId: string;
  externalReference: string | null;
  collectorId: string | null;
  amount: number | null;
  currency: string | null;
  status: SubscriptionPaymentStatus;
  rawStatus: string | null;
  rawStatusDetail: string | null;
  paymentMethodId: string | null;
  cardLastFourDigits: string | null;
  liveMode: boolean | null;
  createdAt: Date | null;
  paidAt: Date | null;
  providerUpdatedAt: Date | null;
};

export class ProviderResourceNotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} ${id} no existe en el proveedor.`);
    this.name = ProviderResourceNotFoundError.name;
  }
}

export interface SubscriptionPaymentProvider {
  createSubscription(
    input: CreateProviderSubscriptionInput,
  ): Promise<ProviderSubscriptionSnapshot>;

  getSubscription(
    providerSubscriptionId: string,
  ): Promise<ProviderSubscriptionSnapshot>;

  cancelSubscription(
    providerSubscriptionId: string,
  ): Promise<ProviderSubscriptionSnapshot>;

  getInvoice(providerInvoiceId: string): Promise<ProviderInvoiceSnapshot>;

  findInvoiceByPaymentId(
    providerPaymentId: string,
  ): Promise<ProviderInvoiceSnapshot | null>;

  getPayment(providerPaymentId: string): Promise<ProviderPaymentSnapshot>;
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  BillingInterval,
  BusinessStatus,
  PaymentProvider,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';

import { MercadoPagoBillingSyncService } from './mercado-pago-billing-sync.service';

describe('MercadoPagoBillingSyncService', () => {
  const subscription = {
    id: 'd84e8f5a-55e3-44b5-bf02-2ad8a86b2d95',
    businessId: 20,
    planId: 1,
    provider: PaymentProvider.MERCADO_PAGO,
    providerSubscriptionId: 'preapproval-123',
    providerApplicationId: 'app-1',
    providerCollectorId: 'collector-1',
    providerUpdatedAt: new Date('2026-09-03T10:00:00.000Z'),
    status: SubscriptionStatus.PENDING,
    activeKey: 'MERCADO_PAGO:20',
    amount: 19_990,
    currency: 'CLP',
    interval: BillingInterval.MONTH,
    intervalCount: 1,
    pastDueAt: null,
    canceledAt: null,
    business: {
      status: BusinessStatus.PENDING,
      statusReason: null,
      deletedAt: null,
      inactivatedAt: null,
    },
  };
  const providerSubscription = {
    provider: PaymentProvider.MERCADO_PAGO,
    providerSubscriptionId: 'preapproval-123',
    providerPayerId: 'payer-1',
    externalReference: subscription.id,
    applicationId: 'app-1',
    collectorId: 'collector-1',
    amount: 19_990,
    currency: 'CLP',
    status: SubscriptionStatus.ACTIVE,
    rawStatus: 'authorized',
    rawStatusDetail: null,
    authorizationUrl: null,
    paymentMethodId: 'visa',
    nextPaymentAt: new Date('2026-10-03T12:00:00.000Z'),
    providerUpdatedAt: new Date('2026-09-03T12:00:00.000Z'),
  };
  const invoice = {
    providerInvoiceId: 'invoice-1',
    providerSubscriptionId: 'preapproval-123',
    providerPaymentId: '987654',
    externalReference: subscription.id,
    amount: 19_990,
    currency: 'CLP',
    rawStatus: 'approved',
    debitDate: new Date('2026-09-03T12:00:00.000Z'),
    providerUpdatedAt: new Date('2026-09-03T12:00:00.000Z'),
  };
  const payment = {
    providerPaymentId: '987654',
    externalReference: subscription.id,
    collectorId: 'collector-1',
    amount: 19_990,
    currency: 'CLP',
    status: SubscriptionPaymentStatus.APPROVED,
    rawStatus: 'approved',
    rawStatusDetail: 'accredited',
    paymentMethodId: 'visa',
    cardLastFourDigits: '1234',
    liveMode: false,
    createdAt: new Date('2026-09-03T12:00:00.000Z'),
    paidAt: new Date('2026-09-03T12:01:00.000Z'),
    providerUpdatedAt: new Date('2026-09-03T12:01:00.000Z'),
  };
  const transaction = {
    subscriptionPayment: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    subscription: { update: jest.fn(), findUnique: jest.fn() },
    business: { findUnique: jest.fn(), update: jest.fn() },
    planRequest: { updateMany: jest.fn() },
  };
  const prisma = {
    subscription: { findUnique: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof transaction) => unknown) =>
      Promise.resolve(callback(transaction)),
    ),
  };
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        MERCADO_PAGO_USE_SANDBOX: true,
        SUBSCRIPTION_GRACE_PERIOD_DAYS: 5,
      };
      return values[key] ?? fallback;
    }),
  };
  const provider = {
    createSubscription: jest.fn(),
    getSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    getInvoice: jest.fn(),
    findInvoiceByPaymentId: jest.fn(),
    getPayment: jest.fn(),
  };
  let service: MercadoPagoBillingSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MercadoPagoBillingSyncService(
      prisma as never,
      config as never,
      provider,
    );
    provider.getSubscription.mockResolvedValue(providerSubscription);
    provider.getInvoice.mockResolvedValue(invoice);
    provider.getPayment.mockResolvedValue(payment);
    prisma.subscription.findUnique.mockResolvedValue(subscription);
    transaction.subscriptionPayment.findUnique.mockResolvedValue(null);
    transaction.business.findUnique.mockResolvedValue(subscription.business);
    transaction.planRequest.updateMany.mockResolvedValue({ count: 0 });
  });

  it('records an approved invoice and activates its subscription and business', async () => {
    await expect(
      service.process(
        'subscription_authorized_payment',
        invoice.providerInvoiceId,
      ),
    ).resolves.toBe('processed');

    expect(transaction.subscriptionPayment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          providerPaymentId: payment.providerPaymentId,
          status: SubscriptionPaymentStatus.APPROVED,
          amount: 19_990,
        }),
      }),
    );
    expect(transaction.subscription.update).toHaveBeenCalledWith({
      where: { id: subscription.id },
      data: expect.objectContaining({
        status: SubscriptionStatus.ACTIVE,
        pastDueAt: null,
        graceEndsAt: null,
      }),
    });
    expect(transaction.business.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: expect.objectContaining({ status: BusinessStatus.ACTIVE }),
    });
  });

  it('confirms onboarding payment but keeps the draft business private', async () => {
    transaction.business.findUnique.mockResolvedValue({
      ...subscription.business,
      planRequest: { status: 'CHECKOUT_PENDING' },
    });

    await service.process(
      'subscription_authorized_payment',
      invoice.providerInvoiceId,
    );

    expect(transaction.planRequest.updateMany).toHaveBeenCalledWith({
      where: {
        businessId: 20,
        status: { in: ['NEW', 'CHECKOUT_PENDING'] },
      },
      data: { status: 'PAID' },
    });
    expect(transaction.business.update).not.toHaveBeenCalled();
  });

  it('restores a past-due subscription after a successful retry', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      ...subscription,
      status: SubscriptionStatus.PAST_DUE,
      pastDueAt: new Date('2026-09-01T12:00:00.000Z'),
    });

    await service.process(
      'subscription_authorized_payment',
      invoice.providerInvoiceId,
    );

    expect(transaction.subscription.update).toHaveBeenCalledWith({
      where: { id: subscription.id },
      data: expect.objectContaining({
        status: SubscriptionStatus.ACTIVE,
        pastDueAt: null,
        graceEndsAt: null,
      }),
    });
  });

  it('does not apply an older payment snapshot over a newer stored payment', async () => {
    transaction.subscriptionPayment.findUnique.mockResolvedValue({
      providerUpdatedAt: new Date('2026-09-04T12:00:00.000Z'),
    });

    await service.process(
      'subscription_authorized_payment',
      invoice.providerInvoiceId,
    );

    expect(transaction.subscriptionPayment.upsert).not.toHaveBeenCalled();
    expect(transaction.subscription.update).not.toHaveBeenCalled();
  });

  it('does not reactivate a canceled subscription when an older approved payment event arrives', async () => {
    provider.getSubscription.mockResolvedValue({
      ...providerSubscription,
      status: SubscriptionStatus.CANCELED,
      rawStatus: 'cancelled',
      providerUpdatedAt: new Date('2026-09-04T12:00:00.000Z'),
    });

    await service.process(
      'subscription_authorized_payment',
      invoice.providerInvoiceId,
    );

    expect(transaction.subscription.update).toHaveBeenCalledWith({
      where: { id: subscription.id },
      data: expect.objectContaining({
        status: SubscriptionStatus.CANCELED,
        activeKey: null,
      }),
    });
    expect(transaction.business.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: expect.objectContaining({ status: BusinessStatus.SUSPENDED }),
    });
  });

  it('moves a rejected recurring payment to grace without suspending the business', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      ...subscription,
      status: SubscriptionStatus.ACTIVE,
    });
    provider.getPayment.mockResolvedValue({
      ...payment,
      status: SubscriptionPaymentStatus.REJECTED,
      rawStatus: 'rejected',
      paidAt: null,
    });

    await service.process(
      'subscription_authorized_payment',
      invoice.providerInvoiceId,
    );

    expect(transaction.subscription.update).toHaveBeenCalledWith({
      where: { id: subscription.id },
      data: expect.objectContaining({
        status: SubscriptionStatus.PAST_DUE,
        pastDueAt: expect.any(Date),
        graceEndsAt: expect.any(Date),
      }),
    });
    expect(transaction.business.update).not.toHaveBeenCalled();
  });

  it('keeps paid access when Mercado Pago confirms a scheduled cancellation', async () => {
    const currentPeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000);
    prisma.subscription.findUnique.mockResolvedValue({
      ...subscription,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd,
      cancelAtPeriodEnd: true,
    });
    transaction.subscription.findUnique.mockResolvedValue({
      ...subscription,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd,
      cancelAtPeriodEnd: true,
    });
    provider.getSubscription.mockResolvedValue({
      ...providerSubscription,
      status: SubscriptionStatus.CANCELED,
      rawStatus: 'cancelled',
      nextPaymentAt: null,
    });

    await service.process('subscription_preapproval', 'preapproval-123');

    expect(transaction.subscription.update).toHaveBeenCalledWith({
      where: { id: subscription.id },
      data: expect.objectContaining({
        status: SubscriptionStatus.ACTIVE,
        activeKey: 'MERCADO_PAGO:20',
        canceledAt: null,
        nextPaymentAt: null,
      }),
    });
    expect(transaction.business.update).not.toHaveBeenCalled();
  });
});

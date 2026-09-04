/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { NotFoundException } from '@nestjs/common';
import {
  BillingInterval,
  PaymentProvider,
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
    business: { findUnique: jest.fn(), update: jest.fn() },
    subscription: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(
      (callback: (client: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    ),
  };
  const config = {
    getOrThrow: jest.fn().mockReturnValue('https://agendaya.cl'),
    get: jest.fn().mockReturnValue(false),
  };
  const pricing = { quote: jest.fn() };
  const provider = {
    createSubscription: jest.fn(),
    getSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    getInvoice: jest.fn(),
    findInvoiceByPaymentId: jest.fn(),
    getPayment: jest.fn(),
  };
  const currentUser: AuthUser = {
    id: 10,
    businessId: 20,
    businessSlug: 'estudio-aurora',
    role: UserRole.ADMIN,
    firstName: 'Ana',
    lastName: 'Pérez',
    phone: '+56911111111',
    email: 'ana@example.com',
  };
  let service: SubscriptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubscriptionsService(
      prisma as never,
      config as never,
      pricing as never,
      provider,
    );
    prisma.user.findFirst.mockResolvedValue({
      id: 10,
      email: 'ana@example.com',
      business: { name: 'Estudio Aurora' },
    });
    provider.createSubscription.mockResolvedValue({
      provider: PaymentProvider.MERCADO_PAGO,
      providerSubscriptionId: 'preapproval-123',
      providerPayerId: null,
      externalReference: null,
      applicationId: null,
      collectorId: null,
      amount: null,
      currency: null,
      status: SubscriptionStatus.PENDING,
      rawStatus: 'pending',
      rawStatusDetail: null,
      authorizationUrl: 'https://www.mercadopago.cl/subscriptions/checkout',
      paymentMethodId: null,
      nextPaymentAt: null,
      providerUpdatedAt: null,
    });
    prisma.subscription.updateMany.mockResolvedValue({ count: 1 });
    prisma.business.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      statusReason: null,
      deletedAt: null,
      inactivatedAt: null,
    });
  });

  it.each([
    [SubscriptionPlan.ESSENTIAL, 1, 19_990],
    [SubscriptionPlan.PRO, 2, 29_990],
  ])(
    'creates a pending %s subscription from server pricing',
    async (code, planId, amount) => {
      pricing.quote.mockResolvedValue({
        id: planId,
        name: code === SubscriptionPlan.PRO ? 'Equipo' : 'Esencial',
        basePrice: amount,
        discountAmount: 0,
        finalPrice: amount,
        currency: 'CLP',
        interval: BillingInterval.MONTH,
        intervalCount: 1,
        discount: null,
      });
      const createdSubscription = {
        id: `subscription-${planId}`,
        businessId: 20,
        planId,
        provider: PaymentProvider.MERCADO_PAGO,
        providerSubscriptionId: null,
        status: SubscriptionStatus.PENDING,
        amount,
        currency: 'CLP',
        interval: BillingInterval.MONTH,
        intervalCount: 1,
      };
      prisma.subscription.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...createdSubscription,
          plan: { name: code === SubscriptionPlan.PRO ? 'Equipo' : 'Esencial' },
          business: { name: 'Estudio Aurora' },
          ownerUser: { email: 'ana@example.com' },
        });
      prisma.subscription.create.mockResolvedValue(createdSubscription);
      prisma.subscription.findUniqueOrThrow.mockResolvedValue({
        ...createdSubscription,
        providerSubscriptionId: 'preapproval-123',
      });
      prisma.subscription.findFirst.mockResolvedValue({
        id: `subscription-${planId}`,
        status: SubscriptionStatus.PENDING,
        amount,
        plan: { code },
        payments: [],
      });

      const result = await service.create(currentUser, { planCode: code });

      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessId: 20,
          ownerUserId: 10,
          planId,
          amount,
          currency: 'CLP',
          activeKey: 'MERCADO_PAGO:20',
        }),
      });
      expect(provider.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          externalReference: `subscription-${planId}`,
          payerEmail: 'ana@example.com',
          amount,
        }),
      );
      expect(result.plan.code).toBe(code);
    },
  );

  it('reuses an existing provider subscription when the user clicks twice', async () => {
    pricing.quote.mockResolvedValue({
      id: 1,
      name: 'Esencial',
      basePrice: 19_990,
      discountAmount: 0,
      finalPrice: 19_990,
      currency: 'CLP',
      interval: BillingInterval.MONTH,
      intervalCount: 1,
      discount: null,
    });
    prisma.subscription.findUnique
      .mockResolvedValueOnce({
        id: 'subscription-existing',
        businessId: 20,
        planId: 1,
        providerSubscriptionId: 'preapproval-existing',
        status: SubscriptionStatus.PENDING,
      })
      .mockResolvedValueOnce({
        id: 'subscription-existing',
        businessId: 20,
        planId: 1,
        providerSubscriptionId: 'preapproval-existing',
        status: SubscriptionStatus.PENDING,
        plan: { name: 'Esencial' },
        business: { name: 'Estudio Aurora' },
        ownerUser: { email: 'ana@example.com' },
      });
    prisma.subscription.findFirst.mockResolvedValue({
      id: 'subscription-existing',
      plan: { code: SubscriptionPlan.ESSENTIAL },
      payments: [],
    });

    await service.create(currentUser, {
      planCode: SubscriptionPlan.ESSENTIAL,
    });

    expect(prisma.subscription.create).not.toHaveBeenCalled();
    expect(provider.createSubscription).not.toHaveBeenCalled();
  });

  it('never accepts a business id from the request when consulting a subscription', async () => {
    prisma.subscription.findFirst.mockResolvedValue(null);

    await expect(service.getMine(currentUser)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.subscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: 20 } }),
    );
  });

  it('stops provider renewals while preserving the already paid period', async () => {
    const currentPeriodEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1_000);
    const subscription = {
      id: 'subscription-active',
      businessId: 20,
      status: SubscriptionStatus.ACTIVE,
      providerSubscriptionId: 'preapproval-123',
      currentPeriodEnd,
      cancellationRequestedAt: null,
      activeKey: 'MERCADO_PAGO:20',
      plan: { code: SubscriptionPlan.ESSENTIAL },
    };
    prisma.subscription.findFirst
      .mockResolvedValueOnce(subscription)
      .mockResolvedValueOnce({
        ...subscription,
        cancelAtPeriodEnd: true,
        plan: { code: SubscriptionPlan.ESSENTIAL },
        payments: [],
      });
    provider.cancelSubscription.mockResolvedValue({
      providerPayerId: 'payer-1',
      applicationId: 'app-1',
      collectorId: 'collector-1',
      rawStatus: 'cancelled',
      rawStatusDetail: null,
      providerUpdatedAt: new Date(),
      paymentMethodId: 'visa',
    });

    const result = await service.cancelAtPeriodEnd(currentUser);

    expect(provider.cancelSubscription).toHaveBeenCalledWith('preapproval-123');
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'subscription-active',
          businessId: 20,
        }),
        data: expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          cancelAtPeriodEnd: true,
          nextPaymentAt: null,
        }),
      }),
    );
    expect(prisma.business.update).not.toHaveBeenCalled();
    expect(result.cancelAtPeriodEnd).toBe(true);
  });
});

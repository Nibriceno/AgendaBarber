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
    subscription: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const config = {
    getOrThrow: jest.fn().mockReturnValue('https://agendaya.cl'),
  };
  const pricing = { quote: jest.fn() };
  const provider = {
    createSubscription: jest.fn(),
    getSubscription: jest.fn(),
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
      status: SubscriptionStatus.PENDING,
      rawStatus: 'pending',
      rawStatusDetail: null,
      authorizationUrl: 'https://www.mercadopago.cl/subscriptions/checkout',
      paymentMethodId: null,
      nextPaymentAt: null,
      providerUpdatedAt: null,
    });
    prisma.subscription.updateMany.mockResolvedValue({ count: 1 });
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
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.subscription.create.mockResolvedValue({
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
    prisma.subscription.findUnique.mockResolvedValue({
      id: 'subscription-existing',
      businessId: 20,
      planId: 1,
      providerSubscriptionId: 'preapproval-existing',
      status: SubscriptionStatus.PENDING,
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
});

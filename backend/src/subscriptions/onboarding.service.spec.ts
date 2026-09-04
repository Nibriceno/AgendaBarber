/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  BillingInterval,
  BusinessCategory,
  BusinessStatus,
  LeadContactPreference,
  PlanRequestStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';

import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  const transaction = {
    business: { create: jest.fn() },
    user: { create: jest.fn() },
    planRequest: { create: jest.fn() },
    subscription: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(
      (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
    planRequest: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const config = { getOrThrow: jest.fn(() => 'https://agendaya.cl') };
  const pricing = { quote: jest.fn() };
  const subscriptions = { authorizeExistingSubscription: jest.fn() };
  const dto = {
    plan: SubscriptionPlan.ESSENTIAL,
    teamSize: 2,
    businessName: 'Estudio Aurora',
    businessCategory: BusinessCategory.HAIR_SALON,
    desiredSlug: 'estudio-aurora',
    contactName: 'Ana Pérez',
    email: 'ana@example.com',
    phone: '+56 9 1111 2222',
    contactPreference: LeadContactPreference.WHATSAPP,
    acceptedTerms: true as const,
    idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
    onboardingToken: 'a'.repeat(43),
  };
  const persisted = {
    id: 31,
    businessId: 8,
    desiredSlug: 'estudio-aurora',
    status: PlanRequestStatus.CHECKOUT_PENDING,
    onboardingTokenHash:
      '66d34fba71f8f450f7e45598853e53bfc23bbd129027cbb131a2f4ffd7878cd0',
    business: {
      id: 8,
      name: 'Estudio Aurora',
      slug: 'estudio-aurora',
      status: BusinessStatus.PENDING,
      subscriptions: [
        {
          id: 'subscription-1',
          status: SubscriptionStatus.PENDING,
          amount: 19_990,
          currency: 'CLP',
          authorizationUrl: 'https://mercadopago.cl/checkout',
          plan: { code: SubscriptionPlan.ESSENTIAL, name: 'Esencial' },
          payments: [],
        },
      ],
    },
  };
  let service: OnboardingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OnboardingService(
      prisma as never,
      config as never,
      pricing as never,
      subscriptions as never,
    );
    pricing.quote.mockResolvedValue({
      id: 1,
      basePrice: 19_990,
      discountAmount: 0,
      finalPrice: 19_990,
      currency: 'CLP',
      interval: BillingInterval.MONTH,
      intervalCount: 1,
      minimumTeamSize: 1,
      maximumTeamSize: 5,
      discount: null,
    });
    transaction.business.create.mockResolvedValue({ id: 8 });
    transaction.user.create.mockResolvedValue({ id: 12 });
    prisma.planRequest.updateMany.mockResolvedValue({ count: 1 });
    subscriptions.authorizeExistingSubscription.mockResolvedValue({});
  });

  it('creates a private tenant and subscription before opening Mercado Pago', async () => {
    prisma.planRequest.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persisted)
      .mockResolvedValueOnce(persisted);

    const result = await service.create(dto);

    expect(transaction.business.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: 'estudio-aurora',
        status: BusinessStatus.PENDING,
      }),
    });
    expect(transaction.subscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amount: 19_990, ownerUserId: 12 }),
    });
    expect(subscriptions.authorizeExistingSubscription).toHaveBeenCalledWith(
      'subscription-1',
      expect.stringContaining('/suscripcion/resultado?request=31&token='),
    );
    expect(result.subscription.authorizationUrl).toContain('mercadopago.cl');
  });

  it('rejects an idempotency key paired with a different secret', async () => {
    prisma.planRequest.findUnique.mockResolvedValue({
      ...persisted,
      onboardingTokenHash: '0'.repeat(64),
    });

    await expect(service.create(dto)).rejects.toThrow('Acceso no autorizado.');
    expect(transaction.business.create).not.toHaveBeenCalled();
  });
});

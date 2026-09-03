/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException } from '@nestjs/common';
import {
  BusinessCategory,
  LeadContactPreference,
  PlanRequestStatus,
  SubscriptionPlan,
} from '@prisma/client';

import { PlanRequestsService } from './plan-requests.service';

describe('PlanRequestsService', () => {
  const prisma = {
    planRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    ),
  };
  const pricing = {
    quote: jest.fn().mockResolvedValue({
      plan: SubscriptionPlan.ESSENTIAL,
      name: 'Esencial',
      basePrice: 19_990,
      discountAmount: 0,
      finalPrice: 19_990,
      minimumTeamSize: 1,
      maximumTeamSize: 5,
      discount: null,
    }),
  };
  let service: PlanRequestsService;

  beforeEach(() => {
    jest.clearAllMocks();
    pricing.quote.mockResolvedValue({
      plan: SubscriptionPlan.ESSENTIAL,
      name: 'Esencial',
      basePrice: 19_990,
      discountAmount: 0,
      finalPrice: 19_990,
      minimumTeamSize: 1,
      maximumTeamSize: 5,
      discount: null,
    });
    service = new PlanRequestsService(prisma as never, pricing as never);
  });

  const request = {
    plan: SubscriptionPlan.ESSENTIAL,
    teamSize: 3,
    businessName: 'Estudio Aurora',
    businessCategory: BusinessCategory.HAIR_SALON,
    desiredSlug: 'estudio-aurora',
    contactName: 'Ana Díaz',
    email: 'ana@example.com',
    phone: '+56912345678',
    contactPreference: LeadContactPreference.WHATSAPP,
    acceptedTerms: true,
  };

  it('stores the authoritative plan price instead of trusting the client', async () => {
    prisma.planRequest.create.mockResolvedValue({
      id: 12,
      plan: SubscriptionPlan.ESSENTIAL,
      monthlyPrice: 19_990,
      basePrice: 19_990,
      discountAmount: 0,
      discount: null,
      createdAt: new Date(),
    });

    await service.create(request);

    expect(prisma.planRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        plan: SubscriptionPlan.ESSENTIAL,
        basePrice: 19_990,
        discountAmount: 0,
        monthlyPrice: 19_990,
        teamSize: 3,
      }),
      select: expect.any(Object),
    });
    expect(pricing.quote).toHaveBeenCalledWith(
      SubscriptionPlan.ESSENTIAL,
      undefined,
    );
  });

  it('freezes a validated promotional price in the request', async () => {
    pricing.quote.mockResolvedValue({
      plan: SubscriptionPlan.ESSENTIAL,
      name: 'Esencial',
      basePrice: 19_990,
      discountAmount: 2_000,
      finalPrice: 17_990,
      minimumTeamSize: 1,
      maximumTeamSize: 5,
      discount: { id: 4, code: 'LANZAMIENTO' },
    });
    prisma.planRequest.create.mockResolvedValue({
      id: 13,
      plan: SubscriptionPlan.ESSENTIAL,
      monthlyPrice: 17_990,
      basePrice: 19_990,
      discountAmount: 2_000,
      discount: { id: 4, name: 'Lanzamiento' },
      createdAt: new Date(),
    });

    await service.create({ ...request, promoCode: 'LANZAMIENTO' });

    expect(prisma.planRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        basePrice: 19_990,
        discountAmount: 2_000,
        monthlyPrice: 17_990,
        discountId: 4,
        promoCode: 'LANZAMIENTO',
        checkoutTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      select: expect.any(Object),
    });
  });

  it('rejects a team size that does not belong to the selected plan', async () => {
    await expect(service.create({ ...request, teamSize: 8 })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.planRequest.create).not.toHaveBeenCalled();
  });

  it('tracks when a request is contacted', async () => {
    prisma.planRequest.findUnique.mockResolvedValue({ id: 12 });
    prisma.planRequest.update.mockResolvedValue({
      id: 12,
      status: PlanRequestStatus.CONTACTED,
    });

    await service.updateStatus(12, PlanRequestStatus.CONTACTED);

    expect(prisma.planRequest.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: expect.objectContaining({
        status: PlanRequestStatus.CONTACTED,
        contactedAt: expect.any(Date),
      }),
    });
  });
});

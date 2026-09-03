/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException } from '@nestjs/common';
import { PlanDiscountType, SubscriptionPlan } from '@prisma/client';

import { PlanPricingService } from './plan-pricing.service';

describe('PlanPricingService', () => {
  const prisma = {
    plan: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    planDiscount: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  let service: PlanPricingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlanPricingService(prisma as never);
    prisma.plan.findUnique.mockResolvedValue({
      id: 1,
      code: SubscriptionPlan.ESSENTIAL,
      name: 'Esencial',
      description: 'Plan inicial',
      priceAmount: 19_990,
      currency: 'CLP',
      interval: 'MONTH',
      intervalCount: 1,
      minimumTeamSize: 1,
      maximumTeamSize: 5,
      features: [],
      limits: null,
      active: true,
    });
  });

  it('applies only the best automatic discount', async () => {
    prisma.planDiscount.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Diez por ciento',
        type: PlanDiscountType.PERCENTAGE,
        value: 10,
        code: null,
        autoApply: true,
      },
      {
        id: 2,
        name: 'Tres mil',
        type: PlanDiscountType.FIXED_AMOUNT,
        value: 3_000,
        code: null,
        autoApply: true,
      },
    ]);

    const quote = await service.quote(SubscriptionPlan.ESSENTIAL);

    expect(quote.discount?.id).toBe(2);
    expect(quote.discountAmount).toBe(3_000);
    expect(quote.finalPrice).toBe(16_990);
  });

  it('normalizes and validates a promotional code on the server', async () => {
    prisma.planDiscount.findFirst.mockResolvedValue({
      id: 3,
      name: 'Bienvenida',
      type: PlanDiscountType.PERCENTAGE,
      value: 20,
      code: 'BIENVENIDA',
      autoApply: false,
    });

    const quote = await service.quote(
      SubscriptionPlan.ESSENTIAL,
      ' bienvenida ',
    );

    expect(prisma.planDiscount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          planId: 1,
          code: 'BIENVENIDA',
          autoApply: false,
        }),
      }),
    );
    expect(quote.finalPrice).toBe(15_992);
  });

  it('rejects an unknown promotional code', async () => {
    prisma.planDiscount.findFirst.mockResolvedValue(null);

    await expect(
      service.quote(SubscriptionPlan.ESSENTIAL, 'NO-EXISTE'),
    ).rejects.toThrow(BadRequestException);
  });
});

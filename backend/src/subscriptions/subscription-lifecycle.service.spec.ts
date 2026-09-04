/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BusinessStatus, SubscriptionStatus } from '@prisma/client';

import { SubscriptionLifecycleService } from './subscription-lifecycle.service';

describe('SubscriptionLifecycleService', () => {
  const transaction = {
    subscription: { updateMany: jest.fn() },
    business: { findUnique: jest.fn(), update: jest.fn() },
  };
  const prisma = {
    subscription: { findMany: jest.fn() },
    $transaction: jest.fn(
      (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  };
  const service = new SubscriptionLifecycleService(prisma as never);
  const now = new Date('2026-09-10T12:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.subscription.updateMany.mockResolvedValue({ count: 1 });
    transaction.business.findUnique.mockResolvedValue({
      status: BusinessStatus.ACTIVE,
      statusReason: null,
      deletedAt: null,
      inactivatedAt: null,
      planRequest: null,
    });
  });

  it('finalizes a cancellation only after the paid period ends', async () => {
    prisma.subscription.findMany.mockResolvedValue([
      { id: 'subscription-1', businessId: 20 },
    ]);

    await expect(service.finalizeScheduledCancellations(now)).resolves.toBe(1);

    expect(transaction.subscription.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'subscription-1',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { lte: now },
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
        },
      },
      data: {
        status: SubscriptionStatus.CANCELED,
        activeKey: null,
        authorizationUrl: null,
        canceledAt: now,
      },
    });
    expect(transaction.business.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: expect.objectContaining({ status: BusinessStatus.SUSPENDED }),
    });
  });

  it('suspends a past-due tenant after grace without deleting its data', async () => {
    prisma.subscription.findMany.mockResolvedValue([
      { id: 'subscription-2', businessId: 21 },
    ]);

    await expect(service.suspendExpiredGracePeriods(now)).resolves.toBe(1);

    expect(transaction.subscription.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'subscription-2',
        status: SubscriptionStatus.PAST_DUE,
        graceEndsAt: { lte: now },
        cancelAtPeriodEnd: false,
      },
      data: { status: SubscriptionStatus.SUSPENDED },
    });
    expect(transaction.business.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: expect.objectContaining({
        status: BusinessStatus.SUSPENDED,
      }),
    });
  });

  it('does not overwrite a manual platform suspension', async () => {
    prisma.subscription.findMany.mockResolvedValue([
      { id: 'subscription-3', businessId: 22 },
    ]);
    transaction.business.findUnique.mockResolvedValue({
      status: BusinessStatus.SUSPENDED,
      statusReason: 'Revisión manual de la plataforma',
      deletedAt: null,
      inactivatedAt: null,
      planRequest: null,
    });

    await service.suspendExpiredGracePeriods(now);

    expect(transaction.business.update).not.toHaveBeenCalled();
  });
});

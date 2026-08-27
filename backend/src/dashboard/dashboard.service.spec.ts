import {
  NotFoundException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service';

import {
  DashboardService,
} from './dashboard.service';

describe('DashboardService', () => {
  const prisma = {
    business: {
      findFirst: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    appointmentService: {
      groupBy: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    barber: {
      findMany: jest.fn(),
    },
  };

  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();

    service =
      new DashboardService(
        prisma as unknown as PrismaService,
      );
  });

  it('rejects an inactive or foreign business before querying metrics', async () => {
    prisma.business.findFirst.mockResolvedValue(
      null,
    );

    await expect(
      service.getSummary(91),
    ).rejects.toThrow(
      NotFoundException,
    );

    expect(
      prisma.appointment.findMany,
    ).not.toHaveBeenCalled();
  });

  it('scopes every dashboard query to the authenticated business', async () => {
    prisma.business.findFirst.mockResolvedValue({
      id: 17,
      timezone:
        'America/Santiago',
      currency: 'CLP',
    });

    prisma.appointment.findMany.mockResolvedValue(
      [],
    );

    prisma.appointment.groupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    prisma.appointment.aggregate
      .mockResolvedValueOnce({
        _sum: {
          totalPrice: null,
        },
      })
      .mockResolvedValueOnce({
        _count: {
          _all: 0,
        },
        _sum: {
          totalPrice: null,
        },
      });

    prisma.user.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);

    prisma.appointmentService.groupBy.mockResolvedValue(
      [],
    );

    prisma.barber.findMany.mockResolvedValue(
      [],
    );

    const result =
      await service.getSummary(
        17,
      );

    expect(result.clients).toEqual({
      total: 3,
      newThisMonth: 1,
    });

    expect(
      prisma.appointment.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        where:
          expect.objectContaining({
            businessId: 17,
            endAt: {
              gt: expect.any(Date),
            },
          }),
      }),
    );

    for (const call of prisma.user.count.mock.calls) {
      expect(call[0].where.businessId).toBe(
        17,
      );
    }

    expect(
      prisma.appointmentService.groupBy,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          appointment:
            expect.objectContaining({
              businessId: 17,
            }),
        },
      }),
    );
  });
});

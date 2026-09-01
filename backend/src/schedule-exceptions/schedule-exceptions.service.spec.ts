import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ScheduleExceptionsService } from './schedule-exceptions.service';

describe('ScheduleExceptionsService tenant isolation', () => {
  let service: ScheduleExceptionsService;

  const prisma = {
    barber: {
      findFirst: jest.fn(),
    },
    scheduleException: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScheduleExceptionsService(
      prisma as unknown as PrismaService,
    );
  });

  it('lists exceptions through barbers from the authenticated business', async () => {
    prisma.scheduleException.findMany.mockResolvedValue([]);

    await expect(service.findAll(7)).resolves.toEqual([]);

    expect(prisma.scheduleException.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          barber: {
            businessId: 7,
            isActive: true,
            deletedAt: null,
          },
        },
      }),
    );
  });

  it('does not expose an exception from another business', async () => {
    prisma.scheduleException.findFirst.mockResolvedValue(null);

    await expect(service.findOne(7, 99)).rejects.toThrow(
      new NotFoundException('Excepción de horario no encontrada.'),
    );

    expect(prisma.scheduleException.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 99,
          barber: {
            businessId: 7,
            isActive: true,
            deletedAt: null,
          },
        },
      }),
    );
  });

  it('does not update an exception outside the authenticated business', async () => {
    prisma.scheduleException.findFirst.mockResolvedValue(null);

    await expect(
      service.update(7, 99, {
        reason: 'Ataque cross-tenant',
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.scheduleException.update).not.toHaveBeenCalled();
  });
});

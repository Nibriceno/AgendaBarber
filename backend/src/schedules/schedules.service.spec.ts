import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SchedulesService } from './schedules.service';

describe('SchedulesService tenant isolation', () => {
  let service: SchedulesService;

  const prisma = {
    barber: {
      findFirst: jest.fn(),
    },
    schedule: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SchedulesService(prisma as unknown as PrismaService);
  });

  it('lists schedules through barbers from the authenticated business', async () => {
    prisma.schedule.findMany.mockResolvedValue([]);

    await expect(service.findAll(7)).resolves.toEqual([]);

    expect(prisma.schedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          barber: {
            businessId: 7,
            isActive: true,
            deletedAt: null,
          },
        },
      }),
    );
  });

  it('does not expose a schedule whose barber belongs to another business', async () => {
    prisma.schedule.findFirst.mockResolvedValue(null);

    await expect(service.findOne(7, 99)).rejects.toThrow(
      new NotFoundException('Horario no encontrado.'),
    );

    expect(prisma.schedule.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 99,
          isActive: true,
          barber: {
            businessId: 7,
            isActive: true,
            deletedAt: null,
          },
        },
      }),
    );
  });

  it('does not update a schedule outside the authenticated business', async () => {
    prisma.schedule.findFirst.mockResolvedValue(null);

    await expect(
      service.update(7, 99, {
        startMinute: 600,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.schedule.update).not.toHaveBeenCalled();
  });
});

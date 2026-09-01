import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { BarberServicesService } from './barber-services.service';

describe('BarberServicesService tenant isolation', () => {
  let service: BarberServicesService;

  const prisma = {
    barber: {
      findFirst: jest.fn(),
    },
    service: {
      findFirst: jest.fn(),
    },
    barberService: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BarberServicesService(
      prisma as unknown as PrismaService,
    );
  });

  it('requires both the barber and service to belong to the business', async () => {
    prisma.barberService.findMany.mockResolvedValue([]);

    await expect(service.findAll(7)).resolves.toEqual([]);

    expect(prisma.barberService.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          barber: {
            businessId: 7,
            isActive: true,
            deletedAt: null,
          },
          service: {
            businessId: 7,
            isActive: true,
            deletedAt: null,
          },
        },
      }),
    );
  });

  it('does not expose an assignment from another business', async () => {
    prisma.barberService.findFirst.mockResolvedValue(null);

    await expect(service.findOne(7, 99)).rejects.toThrow(
      new NotFoundException('Servicio del barbero no encontrado.'),
    );

    expect(prisma.barberService.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 99,
          isActive: true,
          barber: {
            businessId: 7,
            isActive: true,
            deletedAt: null,
          },
          service: {
            businessId: 7,
            isActive: true,
            deletedAt: null,
          },
        },
      }),
    );
  });

  it('does not update an assignment outside the authenticated business', async () => {
    prisma.barberService.findFirst.mockResolvedValue(null);

    await expect(
      service.update(7, 99, {
        customDurationMinutes: 45,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.barberService.update).not.toHaveBeenCalled();
  });
});

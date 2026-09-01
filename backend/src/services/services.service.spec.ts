import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ServicesService } from './services.service';

describe('ServicesService tenant isolation', () => {
  let service: ServicesService;

  const prisma = {
    business: {
      findFirst: jest.fn(),
    },
    service: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ServicesService(prisma as unknown as PrismaService);
  });

  it('lists only active services from the authenticated business', async () => {
    prisma.business.findFirst.mockResolvedValue({ id: 7 });
    prisma.service.findMany.mockResolvedValue([]);

    await expect(service.findAll(7)).resolves.toEqual([]);

    expect(prisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: 7,
          deletedAt: null,
          isActive: true,
        },
      }),
    );
  });

  it('does not query services when the authenticated business is inactive', async () => {
    prisma.business.findFirst.mockResolvedValue(null);

    await expect(service.findAll(7)).rejects.toThrow(NotFoundException);

    expect(prisma.service.findMany).not.toHaveBeenCalled();
  });

  it('queries a service by id and authenticated business id', async () => {
    prisma.service.findFirst.mockResolvedValue({
      id: 21,
      businessId: 7,
    });

    await expect(service.findOne(7, 21)).resolves.toEqual({
      id: 21,
      businessId: 7,
    });

    expect(prisma.service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 21,
          businessId: 7,
          deletedAt: null,
          isActive: true,
        },
      }),
    );
  });

  it('does not update a service outside the authenticated business', async () => {
    prisma.service.findFirst.mockResolvedValue(null);

    await expect(
      service.update(7, 99, {
        name: 'Ataque cross-tenant',
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.service.update).not.toHaveBeenCalled();
  });
});

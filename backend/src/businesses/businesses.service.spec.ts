import { NotFoundException } from '@nestjs/common';
import { BusinessStatus } from '@prisma/client';

import { BusinessesService } from './businesses.service';

describe('BusinessesService tenant isolation', () => {
  const prisma = {
    business: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const service = new BusinessesService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('limits the list to the authenticated active business', async () => {
    prisma.business.findMany.mockResolvedValue([]);

    await service.findAll(7);

    expect(prisma.business.findMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        status: BusinessStatus.ACTIVE,
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  });

  it('rejects an id from another tenant without querying the database', async () => {
    await expect(service.findOne(7, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.business.findFirst).not.toHaveBeenCalled();
  });

  it('updates only an active authenticated business', async () => {
    prisma.business.findFirst
      .mockResolvedValueOnce({
        id: 7,
        name: 'Nombre anterior',
      })
      .mockResolvedValueOnce({
        id: 7,
        name: 'Nombre nuevo',
      });
    prisma.business.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.update(7, 7, {
      name: 'Nombre nuevo',
    });

    expect(prisma.business.updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        status: BusinessStatus.ACTIVE,
        deletedAt: null,
      },
      data: {
        name: 'Nombre nuevo',
      },
    });
    expect(result).toEqual({
      id: 7,
      name: 'Nombre nuevo',
    });
  });

  it('rejects updates outside the authenticated tenant', async () => {
    await expect(
      service.update(7, 99, {
        name: 'Ataque cross-tenant',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.business.updateMany).not.toHaveBeenCalled();
  });

  it('updates social links only for the active authenticated business', async () => {
    prisma.business.findFirst
      .mockResolvedValueOnce({
        id: 7,
        name: 'AgendaBarber',
        instagramUrl: null,
      })
      .mockResolvedValueOnce({
        id: 7,
        name: 'AgendaBarber',
        instagramUrl: 'https://instagram.com/agenda-barber',
      });
    prisma.business.updateMany.mockResolvedValue({ count: 1 });

    await service.updateSocialLinks(7, {
      instagramUrl: 'https://instagram.com/agenda-barber',
    });

    expect(prisma.business.updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        status: BusinessStatus.ACTIVE,
        deletedAt: null,
      },
      data: {
        instagramUrl: 'https://instagram.com/agenda-barber',
      },
    });
  });
});

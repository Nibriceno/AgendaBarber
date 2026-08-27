import { NotFoundException } from '@nestjs/common';

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

  it('limita el listado al businessId autenticado', async () => {
    prisma.business.findMany.mockResolvedValue([]);

    await service.findAll(7);

    expect(prisma.business.findMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  });

  it('rechaza consultar un id de otro tenant sin consultar la base', async () => {
    await expect(service.findOne(7, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.business.findFirst).not.toHaveBeenCalled();
  });

  it('actualiza solamente el negocio autenticado', async () => {
    prisma.business.findFirst
      .mockResolvedValueOnce({
        id: 7,
        name: 'Nombre anterior',
      })
      .mockResolvedValueOnce({
        id: 7,
        name: 'Nombre nuevo',
      });

    prisma.business.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await service.update(7, 7, {
      name: 'Nombre nuevo',
    });

    expect(prisma.business.updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
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

  it('rechaza actualizar un negocio de otro tenant', async () => {
    await expect(
      service.update(7, 99, {
        name: 'Ataque cross-tenant',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.business.updateMany).not.toHaveBeenCalled();
  });

  it('actualiza enlaces sociales solo en el negocio autenticado', async () => {
    prisma.business.findFirst
      .mockResolvedValueOnce({
        id: 7,
        name: 'AgendaBarber',
        instagramUrl: null,
        twitterUrl: null,
        facebookUrl: null,
        whatsappUrl: null,
      })
      .mockResolvedValueOnce({
        id: 7,
        name: 'AgendaBarber',
        instagramUrl: 'https://instagram.com/agenda-barber',
        twitterUrl: null,
        facebookUrl: null,
        whatsappUrl: null,
      });

    prisma.business.updateMany.mockResolvedValue({ count: 1 });

    await service.updateSocialLinks(7, {
      instagramUrl: 'https://instagram.com/agenda-barber',
    });

    expect(prisma.business.updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        deletedAt: null,
      },
      data: {
        instagramUrl: 'https://instagram.com/agenda-barber',
      },
    });
  });

  it('rechaza eliminar un negocio de otro tenant', async () => {
    await expect(service.remove(7, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.business.updateMany).not.toHaveBeenCalled();
  });
});

import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { BarbersService } from './barbers.service';

describe('BarbersService', () => {
  let service: BarbersService;

  const prisma = {
    business: {
      findFirst: jest.fn(),
    },
    barber: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new BarbersService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('filters the query by the authenticated business', async () => {
      prisma.business.findFirst.mockResolvedValue({
        id: 27,
      });
      prisma.barber.findMany.mockResolvedValue([]);

      await expect(service.findAll(27)).resolves.toEqual([]);

      expect(prisma.business.findFirst).toHaveBeenCalledWith({
        where: {
          id: 27,
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      expect(prisma.barber.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            businessId: 27,
            deletedAt: null,
            isActive: true,
          },
        }),
      );
    });

    it('does not query barbers for an inactive tenant', async () => {
      prisma.business.findFirst.mockResolvedValue(null);

      await expect(service.findAll(27)).rejects.toThrow(NotFoundException);

      expect(prisma.barber.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('queries by barber id and authenticated business id', async () => {
      prisma.barber.findFirst.mockResolvedValue({
        id: 41,
        businessId: 27,
      });

      await expect(service.findOne(27, 41)).resolves.toEqual({
        id: 41,
        businessId: 27,
      });

      expect(prisma.barber.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 41,
            businessId: 27,
            deletedAt: null,
            isActive: true,
          },
        }),
      );
    });

    it('returns not found when the barber is outside the tenant', async () => {
      prisma.barber.findFirst.mockResolvedValue(null);

      await expect(service.findOne(27, 99)).rejects.toThrow(
        new NotFoundException('Barbero no encontrado.'),
      );
    });
  });
});

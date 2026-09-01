import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService tenant isolation', () => {
  let service: CategoriesService;

  const prisma = {
    business: {
      findFirst: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoriesService(prisma as unknown as PrismaService);
  });

  it('lists only active categories from the authenticated business', async () => {
    prisma.business.findFirst.mockResolvedValue({ id: 7 });
    prisma.category.findMany.mockResolvedValue([]);

    await expect(service.findAll(7)).resolves.toEqual([]);

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: 7,
          deletedAt: null,
          isActive: true,
        },
      }),
    );
  });

  it('does not query categories when the authenticated business is inactive', async () => {
    prisma.business.findFirst.mockResolvedValue(null);

    await expect(service.findAll(7)).rejects.toThrow(NotFoundException);

    expect(prisma.category.findMany).not.toHaveBeenCalled();
  });

  it('queries a category by id and authenticated business id', async () => {
    prisma.category.findFirst.mockResolvedValue({
      id: 13,
      businessId: 7,
    });

    await expect(service.findOne(7, 13)).resolves.toEqual({
      id: 13,
      businessId: 7,
    });

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: {
        id: 13,
        businessId: 7,
        deletedAt: null,
        isActive: true,
      },
    });
  });

  it('does not update a category outside the authenticated business', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.update(7, 99, {
        name: 'Ataque cross-tenant',
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.category.update).not.toHaveBeenCalled();
  });
});

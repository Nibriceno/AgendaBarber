import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    businessId: number,
    dto: CreateCategoryDto,
  ) {
    await this.validateBusiness(
      businessId,
    );

    await this.validateDuplicatedName(
      businessId,
      dto.name,
    );

    return this.prisma.category.create({
      data: {
        businessId,
        name: dto.name.trim(),
        description:
          dto.description?.trim() ??
          null,
        displayOrder:
          dto.displayOrder ?? 0,
        isActive:
          dto.isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },

      orderBy: [
        {
          displayOrder: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  async findOne(
    id: number,
  ) {
    const category =
      await this.prisma.category.findFirst({
        where: {
          id,
          deletedAt: null,
          isActive: true,
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Categoría no encontrada.',
      );
    }

    return category;
  }

  async update(
    businessId: number,
    id: number,
    dto: UpdateCategoryDto,
  ) {
    const category =
      await this.findOwnedCategory(
        businessId,
        id,
      );

    if (
      dto.name !== undefined
    ) {
      await this.validateDuplicatedName(
        businessId,
        dto.name,
        id,
      );
    }

    return this.prisma.category.update({
      where: {
        id: category.id,
      },

      data: {
        ...(dto.name !==
          undefined && {
          name: dto.name.trim(),
        }),

        ...(dto.description !==
          undefined && {
          description:
            dto.description.trim() ||
            null,
        }),

        ...(dto.displayOrder !==
          undefined && {
          displayOrder:
            dto.displayOrder,
        }),

        ...(dto.isActive !==
          undefined && {
          isActive:
            dto.isActive,
        }),
      },
    });
  }

  async remove(
    businessId: number,
    id: number,
  ) {
    const category =
      await this.findOwnedCategory(
        businessId,
        id,
      );

    return this.prisma.category.update({
      where: {
        id: category.id,
      },

      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }

  private async findOwnedCategory(
    businessId: number,
    id: number,
  ) {
    const category =
      await this.prisma.category.findFirst({
        where: {
          id,
          businessId,
          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Categoría no encontrada.',
      );
    }

    return category;
  }

  private async validateBusiness(
    businessId: number,
  ) {
    const business =
      await this.prisma.business.findFirst({
        where: {
          id: businessId,
          deletedAt: null,
          isActive: true,
        },

        select: {
          id: true,
        },
      });

    if (!business) {
      throw new NotFoundException(
        'Barbería no encontrada o inactiva.',
      );
    }
  }

  private async validateDuplicatedName(
    businessId: number,
    name: string,
    excludedCategoryId?: number,
  ) {
    const normalizedName =
      name.trim();

    const existingCategory =
      await this.prisma.category.findFirst({
        where: {
          businessId,
          name: normalizedName,
          deletedAt: null,

          ...(excludedCategoryId !==
            undefined && {
            id: {
              not:
                excludedCategoryId,
            },
          }),
        },

        select: {
          id: true,
        },
      });

    if (existingCategory) {
      throw new ConflictException(
        'Ya existe una categoría con este nombre.',
      );
    }
  }
}
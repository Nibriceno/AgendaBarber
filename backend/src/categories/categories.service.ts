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

  async create(createCategoryDto: CreateCategoryDto) {
    const business = await this.prisma.business.findFirst({
      where: {
        id: createCategoryDto.businessId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!business) {
      throw new NotFoundException(
        `Business with ID ${createCategoryDto.businessId} not found`,
      );
    }

    const existingCategory = await this.prisma.category.findFirst({
      where: {
        businessId: createCategoryDto.businessId,
        name: {
          equals: createCategoryDto.name,
          mode: 'insensitive',
        },
        deletedAt: null,
      },
    });

    if (existingCategory) {
      throw new ConflictException(
        'A category with this name already exists',
      );
    }

    return this.prisma.category.create({
      data: createCategoryDto,
      include: {
        business: true,
      },
    });
  }

  findAll() {
    return this.prisma.category.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        business: true,
        services: {
          where: {
            deletedAt: null,
            isActive: true,
          },
        },
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

  async findOne(id: number) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        business: true,
        services: {
          where: {
            deletedAt: null,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with ID ${id} not found`,
      );
    }

    return category;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    const currentCategory = await this.findOne(id);

    const businessId =
      updateCategoryDto.businessId ?? currentCategory.businessId;

    if (updateCategoryDto.businessId) {
      const business = await this.prisma.business.findFirst({
        where: {
          id: updateCategoryDto.businessId,
          deletedAt: null,
          isActive: true,
        },
      });

      if (!business) {
        throw new NotFoundException(
          `Business with ID ${updateCategoryDto.businessId} not found`,
        );
      }
    }

    if (updateCategoryDto.name) {
      const duplicatedCategory =
        await this.prisma.category.findFirst({
          where: {
            id: {
              not: id,
            },
            businessId,
            name: {
              equals: updateCategoryDto.name,
              mode: 'insensitive',
            },
            deletedAt: null,
          },
        });

      if (duplicatedCategory) {
        throw new ConflictException(
          'A category with this name already exists',
        );
      }
    }

    return this.prisma.category.update({
      where: {
        id,
      },
      data: updateCategoryDto,
      include: {
        business: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.category.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }
}
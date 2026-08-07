import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(createServiceDto: CreateServiceDto) {
    const business = await this.prisma.business.findFirst({
      where: {
        id: createServiceDto.businessId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!business) {
      throw new NotFoundException(
        `Business with ID ${createServiceDto.businessId} not found`,
      );
    }

    const category = await this.prisma.category.findFirst({
      where: {
        id: createServiceDto.categoryId,
        businessId: createServiceDto.businessId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with ID ${createServiceDto.categoryId} not found`,
      );
    }

    const existingService = await this.prisma.service.findFirst({
      where: {
        businessId: createServiceDto.businessId,
        name: {
          equals: createServiceDto.name,
          mode: 'insensitive',
        },
        deletedAt: null,
      },
    });

    if (existingService) {
      throw new ConflictException(
        'A service with this name already exists',
      );
    }

    return this.prisma.service.create({
      data: createServiceDto,
      include: {
        category: true,
        business: true,
      },
    });
  }

  findAll() {
    return this.prisma.service.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        category: true,
        business: true,
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
    const service = await this.prisma.service.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        category: true,
        business: true,
      },
    });

    if (!service) {
      throw new NotFoundException(
        `Service with ID ${id} not found`,
      );
    }

    return service;
  }

  async update(
    id: number,
    updateServiceDto: UpdateServiceDto,
  ) {
    const currentService = await this.findOne(id);

    const businessId =
      updateServiceDto.businessId ?? currentService.businessId;

    if (updateServiceDto.businessId) {
      const business = await this.prisma.business.findFirst({
        where: {
          id: updateServiceDto.businessId,
          deletedAt: null,
          isActive: true,
        },
      });

      if (!business) {
        throw new NotFoundException(
          `Business with ID ${updateServiceDto.businessId} not found`,
        );
      }
    }

    if (updateServiceDto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: updateServiceDto.categoryId,
          businessId,
          deletedAt: null,
          isActive: true,
        },
      });

      if (!category) {
        throw new NotFoundException(
          `Category with ID ${updateServiceDto.categoryId} not found`,
        );
      }
    }

    if (updateServiceDto.name) {
      const duplicatedService =
        await this.prisma.service.findFirst({
          where: {
            id: {
              not: id,
            },
            businessId,
            name: {
              equals: updateServiceDto.name,
              mode: 'insensitive',
            },
            deletedAt: null,
          },
        });

      if (duplicatedService) {
        throw new ConflictException(
          'A service with this name already exists',
        );
      }
    }

    return this.prisma.service.update({
      where: {
        id,
      },
      data: updateServiceDto,
      include: {
        category: true,
        business: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.service.update({
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
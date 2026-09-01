import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_BUSINESS_WHERE } from '../businesses/business-status';

import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    businessId: number,
    dto: CreateServiceDto,
  ) {
    await this.validateBusiness(
      businessId,
    );

    await this.validateCategory(
      businessId,
      dto.categoryId,
    );

    await this.validateDuplicatedName(
      businessId,
      dto.name,
    );

    return this.prisma.service.create({
      data: {
        businessId,

        categoryId:
          dto.categoryId,

        name:
          dto.name.trim(),

        description:
          dto.description?.trim() ??
          null,

        durationMinutes:
          dto.durationMinutes,

        bufferBefore:
          dto.bufferBefore ?? 0,

        bufferAfter:
          dto.bufferAfter ?? 0,

        price:
          new Prisma.Decimal(
            dto.price,
          ),

        displayOrder:
          dto.displayOrder ?? 0,

        isActive:
          dto.isActive ?? true,
      },

      include: {
        category: true,
      },
    });
  }

  async findAll(
    businessId: number,
  ) {
    await this.validateBusiness(
      businessId,
    );

    return this.prisma.service.findMany({
      where: {
        businessId,
        deletedAt: null,
        isActive: true,
      },

      include: {
        category: true,
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
    businessId: number,
    id: number,
  ) {
    const service =
      await this.prisma.service.findFirst({
        where: {
          id,
          businessId,
          deletedAt: null,
          isActive: true,
        },

        include: {
          category: true,
        },
      });

    if (!service) {
      throw new NotFoundException(
        'Servicio no encontrado.',
      );
    }

    return service;
  }

  async update(
    businessId: number,
    id: number,
    dto: UpdateServiceDto,
  ) {
    const currentService =
      await this.findOwnedService(
        businessId,
        id,
      );

    if (
      dto.categoryId !==
      undefined
    ) {
      await this.validateCategory(
        businessId,
        dto.categoryId,
      );
    }

    if (
      dto.name !== undefined
    ) {
      await this.validateDuplicatedName(
        businessId,
        dto.name,
        id,
      );
    }

    return this.prisma.service.update({
      where: {
        id:
          currentService.id,
      },

      data: {
        ...(dto.categoryId !==
          undefined && {
          categoryId:
            dto.categoryId,
        }),

        ...(dto.name !==
          undefined && {
          name:
            dto.name.trim(),
        }),

        ...(dto.description !==
          undefined && {
          description:
            dto.description.trim() ||
            null,
        }),

        ...(dto.durationMinutes !==
          undefined && {
          durationMinutes:
            dto.durationMinutes,
        }),

        ...(dto.bufferBefore !==
          undefined && {
          bufferBefore:
            dto.bufferBefore,
        }),

        ...(dto.bufferAfter !==
          undefined && {
          bufferAfter:
            dto.bufferAfter,
        }),

        ...(dto.price !==
          undefined && {
          price:
            new Prisma.Decimal(
              dto.price,
            ),
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

      include: {
        category: true,
      },
    });
  }

  async remove(
    businessId: number,
    id: number,
  ) {
    const service =
      await this.findOwnedService(
        businessId,
        id,
      );

    /*
     * Soft delete.
     *
     * No borramos físicamente porque
     * puede existir historial de
     * reservas asociado al servicio.
     */
    return this.prisma.service.update({
      where: {
        id:
          service.id,
      },

      data: {
        isActive: false,
        deletedAt: new Date(),
      },

      include: {
        category: true,
      },
    });
  }

  private async findOwnedService(
    businessId: number,
    id: number,
  ) {
    const service =
      await this.prisma.service.findFirst({
        where: {
          id,
          businessId,
          deletedAt: null,
        },

        select: {
          id: true,
          businessId: true,
          categoryId: true,
          name: true,
        },
      });

    if (!service) {
      /*
       * No decimos si el ID existe
       * en otra barbería.
       *
       * Esto evita filtrar información
       * entre tenants.
       */
      throw new NotFoundException(
        'Servicio no encontrado.',
      );
    }

    return service;
  }

  private async validateBusiness(
    businessId: number,
  ) {
    const business =
      await this.prisma.business.findFirst({
        where: {
          id: businessId,
          ...ACTIVE_BUSINESS_WHERE,
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

  private async validateCategory(
    businessId: number,
    categoryId: number,
  ) {
    const category =
      await this.prisma.category.findFirst({
        where: {
          id: categoryId,
          businessId,
          deletedAt: null,
          isActive: true,
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
  }

  private async validateDuplicatedName(
    businessId: number,
    name: string,
    excludedServiceId?: number,
  ) {
    const normalizedName =
      name.trim();

    const existingService =
      await this.prisma.service.findFirst({
        where: {
          businessId,
          name: normalizedName,
          deletedAt: null,

          ...(excludedServiceId !==
            undefined && {
            id: {
              not:
                excludedServiceId,
            },
          }),
        },

        select: {
          id: true,
        },
      });

    if (existingService) {
      throw new ConflictException(
        'Ya existe un servicio con este nombre.',
      );
    }
  }
}

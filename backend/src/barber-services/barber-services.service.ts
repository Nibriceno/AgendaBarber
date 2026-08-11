import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateBarberServiceDto } from './dto/create-barber-service.dto';
import { UpdateBarberServiceDto } from './dto/update-barber-service.dto';

@Injectable()
export class BarberServicesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    businessId: number,
    dto: CreateBarberServiceDto,
  ) {
    await this.validateBarber(
      businessId,
      dto.barberId,
    );

    await this.validateService(
      businessId,
      dto.serviceId,
    );

    await this.validateDuplicate(
      dto.barberId,
      dto.serviceId,
    );

    return this.prisma.barberService.create({
      data: {
        barberId:
          dto.barberId,

        serviceId:
          dto.serviceId,

        customPrice:
          dto.customPrice !== undefined
            ? new Prisma.Decimal(
                dto.customPrice,
              )
            : null,

        customDurationMinutes:
          dto.customDurationMinutes ??
          null,

        isActive:
          dto.isActive ?? true,
      },

      include: {
        barber: true,
        service: true,
      },
    });
  }

  async findAll() {
    return this.prisma.barberService.findMany({
      where: {
        isActive: true,

        barber: {
          isActive: true,
          deletedAt: null,
        },

        service: {
          isActive: true,
          deletedAt: null,
        },
      },

      include: {
        barber: true,
        service: true,
      },

      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(
    id: number,
  ) {
    const barberService =
      await this.prisma.barberService.findFirst({
        where: {
          id,
          isActive: true,

          barber: {
            isActive: true,
            deletedAt: null,
          },

          service: {
            isActive: true,
            deletedAt: null,
          },
        },

        include: {
          barber: true,
          service: true,
        },
      });

    if (!barberService) {
      throw new NotFoundException(
        'Servicio del barbero no encontrado.',
      );
    }

    return barberService;
  }

  async update(
    businessId: number,
    id: number,
    dto: UpdateBarberServiceDto,
  ) {
    const current =
      await this.findOwnedBarberService(
        businessId,
        id,
      );

    const barberId =
      dto.barberId ??
      current.barberId;

    const serviceId =
      dto.serviceId ??
      current.serviceId;

    if (
      dto.barberId !==
      undefined
    ) {
      await this.validateBarber(
        businessId,
        dto.barberId,
      );
    }

    if (
      dto.serviceId !==
      undefined
    ) {
      await this.validateService(
        businessId,
        dto.serviceId,
      );
    }

    if (
      barberId !== current.barberId ||
      serviceId !== current.serviceId
    ) {
      await this.validateDuplicate(
        barberId,
        serviceId,
        id,
      );
    }

    return this.prisma.barberService.update({
      where: {
        id: current.id,
      },

      data: {
        ...(dto.barberId !==
          undefined && {
          barberId:
            dto.barberId,
        }),

        ...(dto.serviceId !==
          undefined && {
          serviceId:
            dto.serviceId,
        }),

        ...(dto.customPrice !==
          undefined && {
          customPrice:
            new Prisma.Decimal(
              dto.customPrice,
            ),
        }),

        ...(dto.customDurationMinutes !==
          undefined && {
          customDurationMinutes:
            dto.customDurationMinutes,
        }),

        ...(dto.isActive !==
          undefined && {
          isActive:
            dto.isActive,
        }),
      },

      include: {
        barber: true,
        service: true,
      },
    });
  }

  async remove(
    businessId: number,
    id: number,
  ) {
    const barberService =
      await this.findOwnedBarberService(
        businessId,
        id,
      );

    return this.prisma.barberService.update({
      where: {
        id:
          barberService.id,
      },

      data: {
        isActive: false,
      },

      include: {
        barber: true,
        service: true,
      },
    });
  }

  private async validateBarber(
    businessId: number,
    barberId: number,
  ) {
    const barber =
      await this.prisma.barber.findFirst({
        where: {
          id: barberId,
          businessId,
          isActive: true,
          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

    if (!barber) {
      throw new NotFoundException(
        'Barbero no encontrado.',
      );
    }
  }

  private async validateService(
    businessId: number,
    serviceId: number,
  ) {
    const service =
      await this.prisma.service.findFirst({
        where: {
          id: serviceId,
          businessId,
          isActive: true,
          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

    if (!service) {
      throw new NotFoundException(
        'Servicio no encontrado.',
      );
    }
  }

  private async validateDuplicate(
    barberId: number,
    serviceId: number,
    excludedId?: number,
  ) {
    const existing =
      await this.prisma.barberService.findFirst({
        where: {
          barberId,
          serviceId,

          ...(excludedId !==
            undefined && {
            id: {
              not: excludedId,
            },
          }),
        },

        select: {
          id: true,
          isActive: true,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Este servicio ya está asignado al barbero.',
      );
    }
  }

  private async findOwnedBarberService(
    businessId: number,
    id: number,
  ) {
    const barberService =
      await this.prisma.barberService.findFirst({
        where: {
          id,

          barber: {
            businessId,
            deletedAt: null,
          },

          service: {
            businessId,
            deletedAt: null,
          },
        },

        select: {
          id: true,
          barberId: true,
          serviceId: true,
          customDurationMinutes: true,
          customPrice: true,
          isActive: true,
        },
      });

    if (!barberService) {
      throw new NotFoundException(
        'Servicio del barbero no encontrado.',
      );
    }

    return barberService;
  }
}
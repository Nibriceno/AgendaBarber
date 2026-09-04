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

    const existing =
      await this.prisma.barberService.findFirst({
        where: {
          barberId: dto.barberId,
          serviceId: dto.serviceId,
        },

        select: {
          id: true,
          isActive: true,
        },
      });

    if (existing?.isActive) {
      throw new ConflictException(
        'Este servicio ya está asignado al barbero.',
      );
    }

    /*
     * Si la relación ya existía pero fue desactivada,
     * la reutilizamos en vez de crear otra.
     *
     * Esto es necesario porque BarberService tiene:
     *
     * @@unique([barberId, serviceId])
     */
    if (existing) {
      return this.prisma.barberService.update({
        where: {
          id: existing.id,
        },

        data: {
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

  async findAll(
    businessId: number,
  ) {
    return this.prisma.barberService.findMany({
      where: {
        isActive: true,

        barber: {
          businessId,
          isActive: true,
          deletedAt: null,
        },

        service: {
          businessId,
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
async findByBarber(
  businessId: number,
  barberId: number,
) {
  await this.validateBarber(
    businessId,
    barberId,
  );

  return this.prisma.barberService.findMany({
    where: {
      barberId,
      isActive: true,

      barber: {
        businessId,
        isActive: true,
        deletedAt: null,
      },

      service: {
        businessId,
        isActive: true,
        deletedAt: null,
      },
    },

    include: {
      service: true,
    },

    orderBy: {
      id: 'asc',
    },
  });
}
  async findOne(
    businessId: number,
    id: number,
  ) {
    const barberService =
      await this.prisma.barberService.findFirst({
        where: {
          id,
          isActive: true,

          barber: {
            businessId,
            isActive: true,
            deletedAt: null,
          },

          service: {
            businessId,
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
      dto.barberId !== undefined
    ) {
      await this.validateBarber(
        businessId,
        dto.barberId,
      );
    }

    if (
      dto.serviceId !== undefined
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
        ...(dto.barberId !== undefined && {
          barberId:
            dto.barberId,
        }),

        ...(dto.serviceId !== undefined && {
          serviceId:
            dto.serviceId,
        }),

        ...(dto.customPrice !== undefined && {
          customPrice:
            dto.customPrice === null
              ? null
              : new Prisma.Decimal(
                  dto.customPrice,
                ),
        }),

        ...(dto.customDurationMinutes !== undefined && {
          customDurationMinutes:
            dto.customDurationMinutes,
        }),

        ...(dto.isActive !== undefined && {
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
        id: barberService.id,
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

          ...(excludedId !== undefined && {
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
        existing.isActive
          ? 'Este servicio ya está asignado al barbero.'
          : 'Ya existe una asignación inactiva para este servicio. Reactívala en lugar de crear una nueva.',
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

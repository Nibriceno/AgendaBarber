import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  DayOfWeek,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    businessId: number,
    dto: CreateScheduleDto,
  ) {
    await this.validateBarber(
      businessId,
      dto.barberId,
    );

    this.validateTimeRange(
      dto.startMinute,
      dto.endMinute,
    );

    await this.validateOverlap(
      dto.barberId,
      dto.dayOfWeek,
      dto.startMinute,
      dto.endMinute,
    );

    return this.prisma.schedule.create({
      data: {
        barberId:
          dto.barberId,

        dayOfWeek:
          dto.dayOfWeek,

        startMinute:
          dto.startMinute,

        endMinute:
          dto.endMinute,

        isActive:
          dto.isActive ?? true,
      },
    });
  }

  async findAll(
    businessId: number,
  ) {
    return this.prisma.schedule.findMany({
      where: {
        isActive: true,

        barber: {
          businessId,
          isActive: true,
          deletedAt: null,
        },
      },

      include: {
        barber: true,
      },

      orderBy: [
        {
          barberId: 'asc',
        },
        {
          dayOfWeek: 'asc',
        },
        {
          startMinute: 'asc',
        },
      ],
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

    return this.prisma.schedule.findMany({
      where: {
        barberId,
        isActive: true,

        barber: {
          businessId,
          isActive: true,
          deletedAt: null,
        },
      },

      orderBy: [
        {
          dayOfWeek: 'asc',
        },
        {
          startMinute: 'asc',
        },
      ],
    });
  }

  async findOne(
    businessId: number,
    id: number,
  ) {
    const schedule =
      await this.prisma.schedule.findFirst({
        where: {
          id,
          isActive: true,

          barber: {
            businessId,
            isActive: true,
            deletedAt: null,
          },
        },

        include: {
          barber: true,
        },
      });

    if (!schedule) {
      throw new NotFoundException(
        'Horario no encontrado.',
      );
    }

    return schedule;
  }

  async update(
    businessId: number,
    id: number,
    dto: UpdateScheduleDto,
  ) {
    const current =
      await this.findOwnedSchedule(
        businessId,
        id,
      );

    const barberId =
      dto.barberId ??
      current.barberId;

    const dayOfWeek =
      dto.dayOfWeek ??
      current.dayOfWeek;

    const startMinute =
      dto.startMinute ??
      current.startMinute;

    const endMinute =
      dto.endMinute ??
      current.endMinute;

    if (
      dto.barberId !==
      undefined
    ) {
      await this.validateBarber(
        businessId,
        dto.barberId,
      );
    }

    this.validateTimeRange(
      startMinute,
      endMinute,
    );

    await this.validateOverlap(
      barberId,
      dayOfWeek,
      startMinute,
      endMinute,
      id,
    );

    return this.prisma.schedule.update({
      where: {
        id:
          current.id,
      },

      data: {
        ...(dto.barberId !==
          undefined && {
          barberId:
            dto.barberId,
        }),

        ...(dto.dayOfWeek !==
          undefined && {
          dayOfWeek:
            dto.dayOfWeek,
        }),

        ...(dto.startMinute !==
          undefined && {
          startMinute:
            dto.startMinute,
        }),

        ...(dto.endMinute !==
          undefined && {
          endMinute:
            dto.endMinute,
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
    const schedule =
      await this.findOwnedSchedule(
        businessId,
        id,
      );

    return this.prisma.schedule.update({
      where: {
        id:
          schedule.id,
      },

      data: {
        isActive: false,
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

  private validateTimeRange(
    startMinute: number,
    endMinute: number,
  ) {
    if (
      startMinute < 0 ||
      startMinute > 1439
    ) {
      throw new BadRequestException(
        'La hora de inicio no es válida.',
      );
    }

    if (
      endMinute < 1 ||
      endMinute > 1440
    ) {
      throw new BadRequestException(
        'La hora de término no es válida.',
      );
    }

    if (
      startMinute >=
      endMinute
    ) {
      throw new BadRequestException(
        'La hora de término debe ser posterior a la hora de inicio.',
      );
    }
  }

  private async validateOverlap(
    barberId: number,
    dayOfWeek: DayOfWeek,
    startMinute: number,
    endMinute: number,
    excludedScheduleId?: number,
  ) {
    const overlappingSchedule =
      await this.prisma.schedule.findFirst({
        where: {
          barberId,
          dayOfWeek,
          isActive: true,

          startMinute: {
            lt: endMinute,
          },

          endMinute: {
            gt: startMinute,
          },

          ...(excludedScheduleId !==
            undefined && {
            id: {
              not:
                excludedScheduleId,
            },
          }),
        },

        select: {
          id: true,
          startMinute: true,
          endMinute: true,
        },
      });

    if (
      overlappingSchedule
    ) {
      throw new ConflictException(
        'El horario se solapa con otro horario existente del barbero.',
      );
    }
  }

  private async findOwnedSchedule(
    businessId: number,
    id: number,
  ) {
    const schedule =
      await this.prisma.schedule.findFirst({
        where: {
          id,

          barber: {
            businessId,
            deletedAt: null,
          },
        },

        select: {
          id: true,
          barberId: true,
          dayOfWeek: true,
          startMinute: true,
          endMinute: true,
          isActive: true,
        },
      });

    if (!schedule) {
      throw new NotFoundException(
        'Horario no encontrado.',
      );
    }

    return schedule;
  }
}
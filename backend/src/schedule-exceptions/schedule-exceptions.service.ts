import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';
import { UpdateScheduleExceptionDto } from './dto/update-schedule-exception.dto';

@Injectable()
export class ScheduleExceptionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    businessId: number,
    dto: CreateScheduleExceptionDto,
  ) {
    await this.validateBarber(
      businessId,
      dto.barberId,
    );

    const date =
      this.parseDate(
        dto.date,
      );

    this.validateExceptionConfiguration(
      dto.isDayOff,
      dto.startMinute,
      dto.endMinute,
    );

    await this.validateDuplicate(
      dto.barberId,
      date,
    );

    return this.prisma.scheduleException.create({
      data: {
        barberId:
          dto.barberId,

        date,

        isDayOff:
          dto.isDayOff,

        startMinute:
          dto.isDayOff
            ? null
            : dto.startMinute!,

        endMinute:
          dto.isDayOff
            ? null
            : dto.endMinute!,

        reason:
          dto.reason?.trim() ??
          null,
      },

      select: {
        id: true,
        barberId: true,
        date: true,
        isDayOff: true,
        startMinute: true,
        endMinute: true,
        reason: true,

        barber: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  async findAll(
    businessId: number,
  ) {
    return this.prisma.scheduleException.findMany({
      where: {
        barber: {
          businessId,
          isActive: true,
          deletedAt: null,
        },
      },

      select: {
        id: true,
        barberId: true,
        date: true,
        isDayOff: true,
        startMinute: true,
        endMinute: true,
        reason: true,

        barber: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },

      orderBy: [
        {
          date: 'asc',
        },
        {
          barberId: 'asc',
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

    return this.prisma.scheduleException.findMany({
      where: {
        barberId,

        barber: {
          businessId,
          isActive: true,
          deletedAt: null,
        },
      },

      select: {
        id: true,
        barberId: true,
        date: true,
        isDayOff: true,
        startMinute: true,
        endMinute: true,
        reason: true,
      },

      orderBy: {
        date: 'asc',
      },
    });
  }

  async findOne(
    businessId: number,
    id: number,
  ) {
    const exception =
      await this.prisma.scheduleException.findFirst({
        where: {
          id,

          barber: {
            businessId,
            isActive: true,
            deletedAt: null,
          },
        },

        select: {
          id: true,
          barberId: true,
          date: true,
          isDayOff: true,
          startMinute: true,
          endMinute: true,
          reason: true,

          barber: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

    if (!exception) {
      throw new NotFoundException(
        'Excepción de horario no encontrada.',
      );
    }

    return exception;
  }

  async update(
    businessId: number,
    id: number,
    dto: UpdateScheduleExceptionDto,
  ) {
    const current =
      await this.findOwnedException(
        businessId,
        id,
      );

    const barberId =
      dto.barberId ??
      current.barberId;

    const date =
      dto.date !==
      undefined
        ? this.parseDate(
            dto.date,
          )
        : current.date;

    const isDayOff =
      dto.isDayOff ??
      current.isDayOff;

    const startMinute =
      isDayOff
        ? undefined
        : dto.startMinute ??
          current.startMinute ??
          undefined;

    const endMinute =
      isDayOff
        ? undefined
        : dto.endMinute ??
          current.endMinute ??
          undefined;

    if (
      dto.barberId !==
      undefined
    ) {
      await this.validateBarber(
        businessId,
        dto.barberId,
      );
    }

    this.validateExceptionConfiguration(
      isDayOff,
      startMinute,
      endMinute,
    );

    if (
      barberId !==
        current.barberId ||
      date.getTime() !==
        current.date.getTime()
    ) {
      await this.validateDuplicate(
        barberId,
        date,
        id,
      );
    }

    return this.prisma.scheduleException.update({
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

        ...(dto.date !==
          undefined && {
          date,
        }),

        ...(dto.isDayOff !==
          undefined && {
          isDayOff:
            dto.isDayOff,
        }),

        startMinute:
          isDayOff
            ? null
            : startMinute!,

        endMinute:
          isDayOff
            ? null
            : endMinute!,

        ...(dto.reason !==
          undefined && {
          reason:
            dto.reason.trim() ||
            null,
        }),
      },

      select: {
        id: true,
        barberId: true,
        date: true,
        isDayOff: true,
        startMinute: true,
        endMinute: true,
        reason: true,

        barber: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  async remove(
    businessId: number,
    id: number,
  ) {
    const exception =
      await this.findOwnedException(
        businessId,
        id,
      );

    /*
     * ScheduleException no posee
     * deletedAt ni isActive.
     * Aquí la eliminación es física.
     */
    return this.prisma.scheduleException.delete({
      where: {
        id:
          exception.id,
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

  private validateExceptionConfiguration(
    isDayOff: boolean,
    startMinute?: number,
    endMinute?: number,
  ) {
    if (isDayOff) {
      if (
        startMinute !==
          undefined ||
        endMinute !==
          undefined
      ) {
        throw new BadRequestException(
          'Un día libre no debe tener horario de inicio ni término.',
        );
      }

      return;
    }

    if (
      startMinute ===
        undefined ||
      endMinute ===
        undefined
    ) {
      throw new BadRequestException(
        'Un horario especial debe tener hora de inicio y término.',
      );
    }

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

  private async validateDuplicate(
    barberId: number,
    date: Date,
    excludedId?: number,
  ) {
    const existing =
      await this.prisma.scheduleException.findFirst({
        where: {
          barberId,
          date,

          ...(excludedId !==
            undefined && {
            id: {
              not:
                excludedId,
            },
          }),
        },

        select: {
          id: true,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Ya existe una excepción de horario para este barbero en esa fecha.',
      );
    }
  }

  private async findOwnedException(
    businessId: number,
    id: number,
  ) {
    const exception =
      await this.prisma.scheduleException.findFirst({
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
          date: true,
          isDayOff: true,
          startMinute: true,
          endMinute: true,
          reason: true,
        },
      });

    if (!exception) {
      throw new NotFoundException(
        'Excepción de horario no encontrada.',
      );
    }

    return exception;
  }

  private parseDate(
    date: string,
  ) {
    return new Date(
      `${date}T00:00:00.000Z`,
    );
  }
}
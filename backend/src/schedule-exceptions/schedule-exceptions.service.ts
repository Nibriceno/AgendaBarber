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
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createScheduleExceptionDto: CreateScheduleExceptionDto,
  ) {
    await this.validateBarber(
      createScheduleExceptionDto.barberId,
    );

    this.validateExceptionData(
      createScheduleExceptionDto.isDayOff ?? false,
      createScheduleExceptionDto.startMinute,
      createScheduleExceptionDto.endMinute,
    );

    const date = this.parseDate(
      createScheduleExceptionDto.date,
    );

    const existingException =
      await this.prisma.scheduleException.findFirst({
        where: {
          barberId: createScheduleExceptionDto.barberId,
          date,
        },
      });

    if (existingException) {
      throw new ConflictException(
        'Ya existe una excepción para este barbero en esa fecha',
      );
    }

    return this.prisma.scheduleException.create({
      data: {
        barberId: createScheduleExceptionDto.barberId,
        date,
        isDayOff:
          createScheduleExceptionDto.isDayOff ?? false,
        startMinute:
          createScheduleExceptionDto.isDayOff === true
            ? null
            : createScheduleExceptionDto.startMinute,
        endMinute:
          createScheduleExceptionDto.isDayOff === true
            ? null
            : createScheduleExceptionDto.endMinute,
        reason: createScheduleExceptionDto.reason,
      },
      include: {
        barber: true,
      },
    });
  }

  findAll() {
    return this.prisma.scheduleException.findMany({
      where: {
        barber: {
          deletedAt: null,
          isActive: true,
        },
      },
      include: {
        barber: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async findByBarber(barberId: number) {
    await this.validateBarber(barberId);

    return this.prisma.scheduleException.findMany({
      where: {
        barberId,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const exception =
      await this.prisma.scheduleException.findUnique({
        where: {
          id,
        },
        include: {
          barber: true,
        },
      });

    if (!exception) {
      throw new NotFoundException(
        `No se encontró la excepción con ID ${id}`,
      );
    }

    return exception;
  }

  async update(
    id: number,
    updateScheduleExceptionDto: UpdateScheduleExceptionDto,
  ) {
    const currentException = await this.findOne(id);

    const barberId =
      updateScheduleExceptionDto.barberId ??
      currentException.barberId;

    await this.validateBarber(barberId);

    const date =
      updateScheduleExceptionDto.date !== undefined
        ? this.parseDate(updateScheduleExceptionDto.date)
        : currentException.date;

    const isDayOff =
      updateScheduleExceptionDto.isDayOff ??
      currentException.isDayOff;

    const startMinute =
      updateScheduleExceptionDto.startMinute ??
      currentException.startMinute ??
      undefined;

    const endMinute =
      updateScheduleExceptionDto.endMinute ??
      currentException.endMinute ??
      undefined;

    this.validateExceptionData(
      isDayOff,
      startMinute,
      endMinute,
    );

    if (
      updateScheduleExceptionDto.barberId !== undefined ||
      updateScheduleExceptionDto.date !== undefined
    ) {
      const duplicatedException =
        await this.prisma.scheduleException.findFirst({
          where: {
            id: {
              not: id,
            },
            barberId,
            date,
          },
        });

      if (duplicatedException) {
        throw new ConflictException(
          'Ya existe una excepción para este barbero en esa fecha',
        );
      }
    }

    return this.prisma.scheduleException.update({
      where: {
        id,
      },
      data: {
        ...(updateScheduleExceptionDto.barberId !==
          undefined && {
          barberId: updateScheduleExceptionDto.barberId,
        }),

        ...(updateScheduleExceptionDto.date !== undefined && {
          date,
        }),

        ...(updateScheduleExceptionDto.isDayOff !==
          undefined && {
          isDayOff: updateScheduleExceptionDto.isDayOff,
        }),

        startMinute: isDayOff ? null : startMinute,
        endMinute: isDayOff ? null : endMinute,

        ...(updateScheduleExceptionDto.reason !==
          undefined && {
          reason: updateScheduleExceptionDto.reason,
        }),
      },
      include: {
        barber: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.scheduleException.delete({
      where: {
        id,
      },
    });
  }

  private async validateBarber(barberId: number) {
    const barber = await this.prisma.barber.findFirst({
      where: {
        id: barberId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!barber) {
      throw new NotFoundException(
        `No se encontró un barbero activo con ID ${barberId}`,
      );
    }

    return barber;
  }

  private validateExceptionData(
    isDayOff: boolean,
    startMinute?: number,
    endMinute?: number,
  ) {
    if (isDayOff) {
      return;
    }

    if (
      startMinute === undefined ||
      endMinute === undefined
    ) {
      throw new BadRequestException(
        'Debes indicar startMinute y endMinute cuando no es un día libre',
      );
    }

    if (endMinute <= startMinute) {
      throw new BadRequestException(
        'La hora de término debe ser posterior a la hora de inicio',
      );
    }
  }

  private parseDate(date: string) {
    return new Date(`${date}T00:00:00.000Z`);
  }
}
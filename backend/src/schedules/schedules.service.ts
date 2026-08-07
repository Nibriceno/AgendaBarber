import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createScheduleDto: CreateScheduleDto) {
    await this.validateBarber(createScheduleDto.barberId);

    this.validateTimeRange(
      createScheduleDto.startMinute,
      createScheduleDto.endMinute,
    );

    await this.validateOverlap(
      createScheduleDto.barberId,
      createScheduleDto.dayOfWeek,
      createScheduleDto.startMinute,
      createScheduleDto.endMinute,
    );

    return this.prisma.schedule.create({
      data: createScheduleDto,
      include: {
        barber: true,
      },
    });
  }

  findAll() {
    return this.prisma.schedule.findMany({
      where: {
        isActive: true,
        barber: {
          deletedAt: null,
          isActive: true,
        },
      },
      include: {
        barber: true,
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

  async findByBarber(barberId: number) {
    await this.validateBarber(barberId);

    return this.prisma.schedule.findMany({
      where: {
        barberId,
        isActive: true,
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

  async findOne(id: number) {
    const schedule = await this.prisma.schedule.findUnique({
      where: {
        id,
      },
      include: {
        barber: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException(
        `No se encontró el horario con ID ${id}`,
      );
    }

    return schedule;
  }

  async update(
    id: number,
    updateScheduleDto: UpdateScheduleDto,
  ) {
    const currentSchedule = await this.findOne(id);

    const barberId =
      updateScheduleDto.barberId ??
      currentSchedule.barberId;

    const dayOfWeek =
      updateScheduleDto.dayOfWeek ??
      currentSchedule.dayOfWeek;

    const startMinute =
      updateScheduleDto.startMinute ??
      currentSchedule.startMinute;

    const endMinute =
      updateScheduleDto.endMinute ??
      currentSchedule.endMinute;

    await this.validateBarber(barberId);

    this.validateTimeRange(startMinute, endMinute);

    await this.validateOverlap(
      barberId,
      dayOfWeek,
      startMinute,
      endMinute,
      id,
    );

    return this.prisma.schedule.update({
      where: {
        id,
      },
      data: updateScheduleDto,
      include: {
        barber: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.schedule.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
      include: {
        barber: true,
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

  private validateTimeRange(
    startMinute: number,
    endMinute: number,
  ) {
    if (endMinute <= startMinute) {
      throw new BadRequestException(
        'La hora de término debe ser posterior a la hora de inicio',
      );
    }
  }

  private async validateOverlap(
    barberId: number,
    dayOfWeek: CreateScheduleDto['dayOfWeek'],
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

          ...(excludedScheduleId !== undefined && {
            id: {
              not: excludedScheduleId,
            },
          }),

          startMinute: {
            lt: endMinute,
          },

          endMinute: {
            gt: startMinute,
          },
        },
      });

    if (overlappingSchedule) {
      throw new ConflictException(
        'El horario se cruza con otro horario activo del barbero',
      );
    }
  }
}
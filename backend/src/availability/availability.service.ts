import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  DayOfWeek,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async check(dto: CheckAvailabilityDto) {
    const business = await this.prisma.business.findFirst({
      where: {
        id: dto.businessId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!business) {
      throw new NotFoundException(
        `No se encontró la barbería con ID ${dto.businessId}`,
      );
    }

    const barber = await this.prisma.barber.findFirst({
      where: {
        id: dto.barberId,
        businessId: dto.businessId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!barber) {
      throw new NotFoundException(
        `No se encontró el barbero con ID ${dto.barberId}`,
      );
    }

    const serviceIds = [...new Set(dto.serviceIds)];

    const barberServices =
      await this.prisma.barberService.findMany({
        where: {
          barberId: barber.id,
          serviceId: {
            in: serviceIds,
          },
          isActive: true,
          service: {
            businessId: dto.businessId,
            isActive: true,
            deletedAt: null,
          },
        },
        include: {
          service: true,
        },
      });

    if (barberServices.length !== serviceIds.length) {
      throw new BadRequestException(
        'Uno o más servicios no están disponibles para este barbero',
      );
    }

    let totalDurationMinutes = 0;

    for (const barberService of barberServices) {
      const service = barberService.service;

      const duration =
        barberService.customDurationMinutes ??
        service.durationMinutes;

      totalDurationMinutes +=
        service.bufferBefore +
        duration +
        service.bufferAfter;
    }

    const requestedDate = this.parseDate(dto.date);

    const dayOfWeek = this.getDayOfWeek(requestedDate);

    const exception =
      await this.prisma.scheduleException.findFirst({
        where: {
          barberId: barber.id,
          date: requestedDate,
        },
      });

    if (exception?.isDayOff) {
      return {
        date: dto.date,
        barberId: barber.id,
        durationMinutes: totalDurationMinutes,
        availableSlots: [],
      };
    }

    let scheduleRanges: {
      startMinute: number;
      endMinute: number;
    }[] = [];

    if (exception) {
      if (
        exception.startMinute !== null &&
        exception.endMinute !== null
      ) {
        scheduleRanges = [
          {
            startMinute: exception.startMinute,
            endMinute: exception.endMinute,
          },
        ];
      }
    } else {
      scheduleRanges =
        await this.prisma.schedule.findMany({
          where: {
            barberId: barber.id,
            dayOfWeek,
            isActive: true,
          },
          select: {
            startMinute: true,
            endMinute: true,
          },
          orderBy: {
            startMinute: 'asc',
          },
        });
    }

    if (scheduleRanges.length === 0) {
      return {
        date: dto.date,
        barberId: barber.id,
        durationMinutes: totalDurationMinutes,
        availableSlots: [],
      };
    }

    const dayStart = this.localDateMinuteToUtc(
      dto.date,
      0,
      business.timezone,
    );

    const dayEnd = this.localDateMinuteToUtc(
      dto.date,
      1440,
      business.timezone,
    );

    const existingAppointments =
      await this.prisma.appointment.findMany({
        where: {
          barberId: barber.id,
          deletedAt: null,
          status: {
            in: [
              AppointmentStatus.PENDING,
              AppointmentStatus.CONFIRMED,
              AppointmentStatus.IN_PROGRESS,
            ],
          },
          startAt: {
            lt: dayEnd,
          },
          endAt: {
            gt: dayStart,
          },
        },
        select: {
          startAt: true,
          endAt: true,
        },
      });

    const now = new Date();

    const minimumStartAt = new Date(
      now.getTime() +
        business.minimumAdvanceTime * 60_000,
    );

    const maximumStartAt = new Date(
      now.getTime() +
        business.maximumAdvanceDays *
          24 *
          60 *
          60 *
          1000,
    );

    const availableSlots: {
      startAt: string;
      endAt: string;
      time: string;
    }[] = [];

    for (const range of scheduleRanges) {
      for (
        let minute = range.startMinute;
        minute + totalDurationMinutes <= range.endMinute;
        minute += business.appointmentInterval
      ) {
        const startAt = this.localDateMinuteToUtc(
          dto.date,
          minute,
          business.timezone,
        );

        const endAt = new Date(
          startAt.getTime() +
            totalDurationMinutes * 60_000,
        );

        if (startAt < minimumStartAt) {
          continue;
        }

        if (startAt > maximumStartAt) {
          continue;
        }

        const hasOverlap = existingAppointments.some(
          (appointment) =>
            appointment.startAt < endAt &&
            appointment.endAt > startAt,
        );

        if (hasOverlap) {
          continue;
        }

        availableSlots.push({
          time: this.minutesToTime(minute),
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        });
      }
    }

    return {
      date: dto.date,
      barberId: barber.id,
      durationMinutes: totalDurationMinutes,
      availableSlots,
    };
  }

  private parseDate(date: string) {
    return new Date(`${date}T00:00:00.000Z`);
  }

  private getDayOfWeek(date: Date): DayOfWeek {
    const days: DayOfWeek[] = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];

    return days[date.getUTCDay()];
  }

  private minutesToTime(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return `${hours
      .toString()
      .padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}`;
  }

  private localDateMinuteToUtc(
    date: string,
    minuteOfDay: number,
    timezone: string,
  ) {
    const [year, month, day] = date.split('-').map(Number);

    const normalizedDate = new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        0,
        minuteOfDay,
      ),
    );

    const formatter = new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      },
    );

    const parts = Object.fromEntries(
      formatter
        .formatToParts(normalizedDate)
        .map((part) => [part.type, part.value]),
    );

    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );

    const offset =
      asUtc - normalizedDate.getTime();

    return new Date(
      normalizedDate.getTime() - offset,
    );
  }
}
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
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async check(
    businessId: number,
    dto: CheckAvailabilityDto,
  ) {
    const business =
      await this.prisma.business.findFirst({
        where: {
          id: businessId,
          isActive: true,
          deletedAt: null,
        },

        select: {
          id: true,
          timezone: true,
          appointmentInterval: true,
          minimumAdvanceTime: true,
          maximumAdvanceDays: true,
        },
      });

    if (!business) {
      throw new NotFoundException(
        'Barbería no encontrada.',
      );
    }

    const barber =
      await this.prisma.barber.findFirst({
        where: {
          id: dto.barberId,
          businessId,
          isActive: true,
          deletedAt: null,
        },

        select: {
          id: true,
          displayName: true,
        },
      });

    if (!barber) {
      throw new NotFoundException(
        'Barbero no encontrado.',
      );
    }

    const serviceIds = [
      ...new Set(dto.serviceIds),
    ];

    if (
      serviceIds.length !==
      dto.serviceIds.length
    ) {
      throw new BadRequestException(
        'No puedes seleccionar el mismo servicio más de una vez.',
      );
    }

    const barberServices =
      await this.prisma.barberService.findMany({
        where: {
          barberId: barber.id,

          serviceId: {
            in: serviceIds,
          },

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

        select: {
          serviceId: true,
          customDurationMinutes: true,

          service: {
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              bufferBefore: true,
              bufferAfter: true,
            },
          },
        },
      });

    if (
      barberServices.length !==
      serviceIds.length
    ) {
      throw new BadRequestException(
        'Uno o más servicios no están disponibles para este barbero.',
      );
    }

    let totalDurationMinutes = 0;

    for (
      const barberService of barberServices
    ) {
      const service =
        barberService.service;

      const duration =
        barberService.customDurationMinutes ??
        service.durationMinutes;

      totalDurationMinutes +=
        service.bufferBefore +
        duration +
        service.bufferAfter;
    }

    const requestedDate =
      this.parseDate(dto.date);

    this.validateRequestedDate(
      dto.date,
      business.timezone,
      business.maximumAdvanceDays,
    );

    const dayOfWeek =
      this.getDayOfWeek(
        requestedDate,
      );

    const exception =
      await this.prisma.scheduleException.findFirst({
        where: {
          barberId: barber.id,
          date: requestedDate,
        },

        select: {
          id: true,
          isDayOff: true,
          startMinute: true,
          endMinute: true,
        },
      });

    if (exception?.isDayOff) {
      return {
        date: dto.date,
        barberId: barber.id,
        durationMinutes:
          totalDurationMinutes,
        availableSlots: [],
      };
    }

    let scheduleRanges: {
      startMinute: number;
      endMinute: number;
    }[] = [];

    if (exception) {
      if (
        exception.startMinute !==
          null &&
        exception.endMinute !==
          null
      ) {
        scheduleRanges = [
          {
            startMinute:
              exception.startMinute,

            endMinute:
              exception.endMinute,
          },
        ];
      }
    } else {
      scheduleRanges =
        await this.prisma.schedule.findMany({
          where: {
            barberId:
              barber.id,

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

    if (
      scheduleRanges.length === 0
    ) {
      return {
        date: dto.date,
        barberId: barber.id,
        durationMinutes:
          totalDurationMinutes,
        availableSlots: [],
      };
    }

    const dayStart =
      this.localDateMinuteToUtc(
        dto.date,
        0,
        business.timezone,
      );

    const dayEnd =
      this.localDateMinuteToUtc(
        dto.date,
        1440,
        business.timezone,
      );

    const existingAppointments =
      await this.prisma.appointment.findMany({
        where: {
          businessId,

          barberId:
            barber.id,

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
          id: true,
          startAt: true,
          endAt: true,
        },

        orderBy: {
          startAt: 'asc',
        },
      });

    const now =
      new Date();

    const minimumStartAt =
      new Date(
        now.getTime() +
          business.minimumAdvanceTime *
            60_000,
      );

    const maximumStartAt =
      this.calculateMaximumStartAt(
        business.maximumAdvanceDays,
        business.timezone,
      );

    const availableSlots: {
      time: string;
      startAt: string;
      endAt: string;
    }[] = [];

    for (
      const range of scheduleRanges
    ) {
      for (
        let minute =
          range.startMinute;

        minute +
            totalDurationMinutes <=
          range.endMinute;

        minute +=
          business.appointmentInterval
      ) {
        const startAt =
          this.localDateMinuteToUtc(
            dto.date,
            minute,
            business.timezone,
          );

        const endAt =
          new Date(
            startAt.getTime() +
              totalDurationMinutes *
                60_000,
          );

        if (
          startAt <
          minimumStartAt
        ) {
          continue;
        }

        if (
          startAt >
          maximumStartAt
        ) {
          continue;
        }

        const hasOverlap =
          existingAppointments.some(
            (appointment) =>
              appointment.startAt <
                endAt &&
              appointment.endAt >
                startAt,
          );

        if (hasOverlap) {
          continue;
        }

        availableSlots.push({
          time:
            this.minutesToTime(
              minute,
            ),

          startAt:
            startAt.toISOString(),

          endAt:
            endAt.toISOString(),
        });
      }
    }

    return {
      date:
        dto.date,

      barberId:
        barber.id,

      durationMinutes:
        totalDurationMinutes,

      availableSlots,
    };
  }

  private validateRequestedDate(
    date: string,
    timezone: string,
    maximumAdvanceDays: number,
  ) {
    const requestedStart =
      this.localDateMinuteToUtc(
        date,
        0,
        timezone,
      );

    const today =
      this.getLocalTodayStartUtc(
        timezone,
      );

    if (
      requestedStart <
      today
    ) {
      throw new BadRequestException(
        'No puedes consultar disponibilidad para una fecha pasada.',
      );
    }

    const maximumDate =
      new Date(
        today.getTime() +
          maximumAdvanceDays *
            24 *
            60 *
            60 *
            1000,
      );

    if (
      requestedStart >
      maximumDate
    ) {
      throw new BadRequestException(
        `Solo puedes consultar disponibilidad con hasta ${maximumAdvanceDays} días de anticipación.`,
      );
    }
  }

  private calculateMaximumStartAt(
    maximumAdvanceDays: number,
    timezone: string,
  ) {
    const today =
      this.getLocalTodayDate(
        timezone,
      );

    const maximumDate =
      new Date(
        Date.UTC(
          today.year,
          today.month - 1,
          today.day +
            maximumAdvanceDays,
        ),
      );

    const year =
      maximumDate.getUTCFullYear();

    const month =
      String(
        maximumDate.getUTCMonth() +
          1,
      ).padStart(2, '0');

    const day =
      String(
        maximumDate.getUTCDate(),
      ).padStart(2, '0');

    return this.localDateMinuteToUtc(
      `${year}-${month}-${day}`,
      1440,
      timezone,
    );
  }

  private getLocalTodayStartUtc(
    timezone: string,
  ) {
    const localToday =
      this.getLocalTodayDate(
        timezone,
      );

    const date =
      `${localToday.year}-${String(
        localToday.month,
      ).padStart(2, '0')}-${String(
        localToday.day,
      ).padStart(2, '0')}`;

    return this.localDateMinuteToUtc(
      date,
      0,
      timezone,
    );
  }

  private getLocalTodayDate(
    timezone: string,
  ) {
    const formatter =
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        },
      );

    const parts =
      Object.fromEntries(
        formatter
          .formatToParts(
            new Date(),
          )
          .map(
            (part) => [
              part.type,
              part.value,
            ],
          ),
      );

    return {
      year:
        Number(parts.year),

      month:
        Number(parts.month),

      day:
        Number(parts.day),
    };
  }

  private parseDate(
    date: string,
  ) {
    const parsed =
      new Date(
        `${date}T00:00:00.000Z`,
      );

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      throw new BadRequestException(
        'Fecha inválida.',
      );
    }

    return parsed;
  }

  private getDayOfWeek(
    date: Date,
  ): DayOfWeek {
    const days: DayOfWeek[] = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];

    return days[
      date.getUTCDay()
    ];
  }

  private minutesToTime(
    minutes: number,
  ) {
    const hours =
      Math.floor(
        minutes / 60,
      );

    const mins =
      minutes % 60;

    return `${hours
      .toString()
      .padStart(
        2,
        '0',
      )}:${mins
      .toString()
      .padStart(
        2,
        '0',
      )}`;
  }

  private localDateMinuteToUtc(
    date: string,
    minuteOfDay: number,
    timezone: string,
  ) {
    const [
      year,
      month,
      day,
    ] = date
      .split('-')
      .map(Number);

    const normalizedDate =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day,
          0,
          minuteOfDay,
        ),
      );

    const formatter =
      new Intl.DateTimeFormat(
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

    const parts =
      Object.fromEntries(
        formatter
          .formatToParts(
            normalizedDate,
          )
          .map(
            (part) => [
              part.type,
              part.value,
            ],
          ),
      );

    const asUtc =
      Date.UTC(
        Number(parts.year),
        Number(parts.month) -
          1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second),
      );

    const offset =
      asUtc -
      normalizedDate.getTime();

    return new Date(
      normalizedDate.getTime() -
        offset,
    );
  }
}
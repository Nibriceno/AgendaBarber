import { Injectable, NotFoundException } from '@nestjs/common';

import { AppointmentStatus, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  addDaysToDateKey,
  getLocalDateParts,
  localDateMinuteToUtc,
  toDateKey,
} from '../common/time/local-date';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(businessId: number) {
    const business = await this.prisma.business.findFirst({
      where: {
        id: businessId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        timezone: true,
        currency: true,
      },
    });

    if (!business) {
      throw new NotFoundException('Barbería no encontrada.');
    }

    const periods = this.getPeriods(business.timezone);

    const bookedStatuses = [
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.IN_PROGRESS,
      AppointmentStatus.COMPLETED,
    ];

    const [
      todayAppointments,
      todayStatusGroups,
      todayRevenue,
      monthlyRevenue,
      totalClients,
      newClientsThisMonth,
      serviceGroups,
      teamGroups,
      activeBarbers,
    ] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          businessId,
          deletedAt: null,
          startAt: {
            gte: periods.todayStart,
            lt: periods.tomorrowStart,
          },
        },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          status: true,
          totalPrice: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          barber: {
            select: {
              id: true,
              displayName: true,
              calendarColor: true,
            },
          },
          services: {
            orderBy: {
              displayOrder: 'asc',
            },
            select: {
              serviceName: true,
            },
          },
        },
        orderBy: {
          startAt: 'asc',
        },
      }),

      this.prisma.appointment.groupBy({
        by: ['status'],
        where: {
          businessId,
          deletedAt: null,
          startAt: {
            gte: periods.todayStart,
            lt: periods.tomorrowStart,
          },
        },
        _count: {
          _all: true,
        },
      }),

      this.prisma.appointment.aggregate({
        where: {
          businessId,
          deletedAt: null,
          status: AppointmentStatus.COMPLETED,
          startAt: {
            gte: periods.todayStart,
            lt: periods.tomorrowStart,
          },
        },
        _sum: {
          totalPrice: true,
        },
      }),

      this.prisma.appointment.aggregate({
        where: {
          businessId,
          deletedAt: null,
          status: AppointmentStatus.COMPLETED,
          completedAt: {
            gte: periods.monthStart,
            lt: periods.nextMonthStart,
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          totalPrice: true,
        },
      }),

      this.prisma.user.count({
        where: {
          businessId,
          role: UserRole.CLIENT,
          isActive: true,
          deletedAt: null,
        },
      }),

      this.prisma.user.count({
        where: {
          businessId,
          role: UserRole.CLIENT,
          isActive: true,
          deletedAt: null,
          createdAt: {
            gte: periods.monthStart,
            lt: periods.nextMonthStart,
          },
        },
      }),

      this.prisma.appointmentService.groupBy({
        by: ['serviceId', 'serviceName'],
        where: {
          appointment: {
            businessId,
            deletedAt: null,
            status: {
              in: bookedStatuses,
            },
            startAt: {
              gte: periods.lastThirtyDaysStart,
              lt: periods.tomorrowStart,
            },
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          finalPrice: true,
        },
      }),

      this.prisma.appointment.groupBy({
        by: ['barberId'],
        where: {
          businessId,
          deletedAt: null,
          status: AppointmentStatus.COMPLETED,
          completedAt: {
            gte: periods.lastThirtyDaysStart,
            lt: periods.tomorrowStart,
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          totalPrice: true,
        },
      }),

      this.prisma.barber.findMany({
        where: {
          businessId,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          displayName: true,
          calendarColor: true,
        },
        orderBy: [
          {
            displayOrder: 'asc',
          },
          {
            displayName: 'asc',
          },
        ],
      }),
    ]);

    const statusCounts = Object.fromEntries(
      todayStatusGroups.map((group) => [group.status, group._count._all]),
    ) as Partial<Record<AppointmentStatus, number>>;

    const getStatusCount = (status: AppointmentStatus) =>
      statusCounts[status] ?? 0;

    const activeToday =
      getStatusCount(AppointmentStatus.PENDING) +
      getStatusCount(AppointmentStatus.CONFIRMED) +
      getStatusCount(AppointmentStatus.IN_PROGRESS) +
      getStatusCount(AppointmentStatus.COMPLETED);

    const topServices = serviceGroups
      .map((group) => ({
        serviceId: group.serviceId,
        name: group.serviceName,
        bookings: group._count._all,
        revenue: group._sum.finalPrice?.toString() ?? '0',
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);

    const teamByBarber = new Map(
      teamGroups.map((group) => [group.barberId, group]),
    );

    const teamPerformance = activeBarbers
      .map((barber) => {
        const group = teamByBarber.get(barber.id);

        const completedAppointments = group?._count._all ?? 0;

        const revenue = Number(group?._sum.totalPrice ?? 0);

        return {
          barberId: barber.id,
          displayName: barber.displayName,
          calendarColor: barber.calendarColor,
          completedAppointments,
          revenue: String(revenue),
          averageTicket:
            completedAppointments > 0
              ? String(revenue / completedAppointments)
              : '0',
        };
      })
      .sort(
        (a, b) =>
          b.completedAppointments - a.completedAppointments ||
          Number(b.revenue) - Number(a.revenue),
      )
      .slice(0, 5);

    return {
      generatedAt: new Date().toISOString(),
      timezone: business.timezone,
      currency: business.currency,
      periods: {
        today: periods.today,
        month: periods.month,
        lastThirtyDaysStart: periods.lastThirtyDays,
      },
      today: {
        totalAppointments: todayStatusGroups.reduce(
          (total, group) => total + group._count._all,
          0,
        ),
        activeAppointments: activeToday,
        pending: getStatusCount(AppointmentStatus.PENDING),
        confirmed: getStatusCount(AppointmentStatus.CONFIRMED),
        inProgress: getStatusCount(AppointmentStatus.IN_PROGRESS),
        completed: getStatusCount(AppointmentStatus.COMPLETED),
        cancelled: getStatusCount(AppointmentStatus.CANCELLED),
        noShow: getStatusCount(AppointmentStatus.NO_SHOW),
        revenue: todayRevenue._sum.totalPrice?.toString() ?? '0',
        appointments: todayAppointments.map((appointment) => ({
          id: appointment.id,
          startAt: appointment.startAt.toISOString(),
          endAt: appointment.endAt.toISOString(),
          status: appointment.status,
          totalPrice: appointment.totalPrice.toString(),
          customerName:
            `${appointment.customer.firstName} ${appointment.customer.lastName}`.trim(),
          barber: {
            id: appointment.barber.id,
            displayName: appointment.barber.displayName,
            calendarColor: appointment.barber.calendarColor,
          },
          services: appointment.services.map((service) => service.serviceName),
        })),
      },
      month: {
        revenue: monthlyRevenue._sum.totalPrice?.toString() ?? '0',
        completedAppointments: monthlyRevenue._count._all,
      },
      clients: {
        total: totalClients,
        newThisMonth: newClientsThisMonth,
      },
      topServices,
      teamPerformance,
    };
  }

  private getPeriods(timezone: string) {
    const today = getLocalDateParts(new Date(), timezone);

    const todayKey = toDateKey(today);

    const tomorrowKey = addDaysToDateKey(todayKey, 1);

    const lastThirtyDays = addDaysToDateKey(todayKey, -29);

    const monthKey = `${today.year}-${String(today.month).padStart(2, '0')}`;

    const monthStartKey = `${monthKey}-01`;

    const nextMonth = new Date(Date.UTC(today.year, today.month, 1));

    const nextMonthStartKey = toDateKey({
      year: nextMonth.getUTCFullYear(),
      month: nextMonth.getUTCMonth() + 1,
      day: 1,
    });

    return {
      today: todayKey,
      month: monthKey,
      lastThirtyDays,
      todayStart: localDateMinuteToUtc(todayKey, 0, timezone),
      tomorrowStart: localDateMinuteToUtc(tomorrowKey, 0, timezone),
      monthStart: localDateMinuteToUtc(monthStartKey, 0, timezone),
      nextMonthStart: localDateMinuteToUtc(nextMonthStartKey, 0, timezone),
      lastThirtyDaysStart: localDateMinuteToUtc(lastThirtyDays, 0, timezone),
    };
  }
}

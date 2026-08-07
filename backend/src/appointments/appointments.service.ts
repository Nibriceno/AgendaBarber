import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  DayOfWeek,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAppointmentDto: CreateAppointmentDto) {
    const business = await this.validateBusiness(
      createAppointmentDto.businessId,
    );

    await this.validateCustomer(
      createAppointmentDto.customerId,
      createAppointmentDto.businessId,
    );

    const barber = await this.validateBarber(
      createAppointmentDto.barberId,
      createAppointmentDto.businessId,
    );

    const serviceIds = [
      ...new Set(createAppointmentDto.serviceIds),
    ];

    const barberServices =
      await this.prisma.barberService.findMany({
        where: {
          barberId: barber.id,
          serviceId: {
            in: serviceIds,
          },
          isActive: true,
          service: {
            businessId: business.id,
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
        'Uno o más servicios no existen, están inactivos o no están asignados al barbero',
      );
    }

    const orderedServices = serviceIds.map(
      (serviceId) => {
        const barberService = barberServices.find(
          (item) => item.serviceId === serviceId,
        );

        if (!barberService) {
          throw new BadRequestException(
            `El servicio con ID ${serviceId} no está asignado al barbero`,
          );
        }

        return barberService;
      },
    );

    let totalDurationMinutes = 0;
    let subtotal = new Prisma.Decimal(0);

    const appointmentServices = orderedServices.map(
      (barberService, index) => {
        const service = barberService.service;

        const durationMinutes =
          barberService.customDurationMinutes ??
          service.durationMinutes;

        const unitPrice =
          barberService.customPrice ??
          service.price;

        totalDurationMinutes +=
          service.bufferBefore +
          durationMinutes +
          service.bufferAfter;

        subtotal = subtotal.plus(unitPrice);

        return {
          serviceId: service.id,
          serviceName: service.name,
          durationMinutes,
          bufferBefore: service.bufferBefore,
          bufferAfter: service.bufferAfter,
          unitPrice,
          finalPrice: unitPrice,
          displayOrder: index,
        };
      },
    );

    const discountAmount = new Prisma.Decimal(
      createAppointmentDto.discountAmount ?? 0,
    );

    if (discountAmount.greaterThan(subtotal)) {
      throw new BadRequestException(
        'El descuento no puede ser mayor que el subtotal',
      );
    }

    const totalPrice = subtotal.minus(discountAmount);

    const startAt = new Date(
      createAppointmentDto.startAt,
    );

    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException(
        'La fecha de inicio no es válida',
      );
    }

    const now = new Date();

    const minimumStartAt = new Date(
      now.getTime() +
        business.minimumAdvanceTime * 60_000,
    );

    if (startAt < minimumStartAt) {
      throw new BadRequestException(
        `La reserva debe hacerse con al menos ${business.minimumAdvanceTime} minutos de anticipación`,
      );
    }

    const maximumStartAt = new Date(
      now.getTime() +
        business.maximumAdvanceDays *
          24 *
          60 *
          60 *
          1000,
    );

    if (startAt > maximumStartAt) {
      throw new BadRequestException(
        `La reserva no puede superar los ${business.maximumAdvanceDays} días de anticipación`,
      );
    }

    const endAt = new Date(
      startAt.getTime() +
        totalDurationMinutes * 60_000,
    );

    await this.validateSchedule(
      barber.id,
      startAt,
      endAt,
      business.timezone,
      business.appointmentInterval,
    );

    const confirmationCode =
      this.generateConfirmationCode();

    return this.prisma.$transaction(
      async (transaction) => {
        await this.validateOverlap(
          barber.id,
          startAt,
          endAt,
          undefined,
          transaction,
        );

        const appointment =
          await transaction.appointment.create({
            data: {
              businessId: business.id,
              customerId:
                createAppointmentDto.customerId,
              barberId: barber.id,
              startAt,
              endAt,
              status: AppointmentStatus.PENDING,
              totalDurationMinutes,
              subtotal,
              discountAmount,
              totalPrice,
              customerNotes:
                createAppointmentDto.customerNotes,
              internalNotes:
                createAppointmentDto.internalNotes,
              confirmationCode,
            },
          });

        await transaction.appointmentService.createMany(
          {
            data: appointmentServices.map(
              (service) => ({
                appointmentId: appointment.id,
                ...service,
              }),
            ),
          },
        );

        await transaction.appointmentHistory.create({
          data: {
            appointmentId: appointment.id,
            previousStatus: null,
            newStatus: AppointmentStatus.PENDING,
            comment: 'Reserva creada',
          },
        });

        return transaction.appointment.findUnique({
          where: {
            id: appointment.id,
          },
          include: this.appointmentInclude(),
        });
      },
    );
  }

  findAll() {
    return this.prisma.appointment.findMany({
      where: {
        deletedAt: null,
      },
      include: this.appointmentInclude(),
      orderBy: {
        startAt: 'asc',
      },
    });
  }

  async findByBusiness(businessId: number) {
    await this.validateBusiness(businessId);

    return this.prisma.appointment.findMany({
      where: {
        businessId,
        deletedAt: null,
      },
      include: this.appointmentInclude(),
      orderBy: {
        startAt: 'asc',
      },
    });
  }

  async findByBarber(barberId: number) {
    const barber =
      await this.prisma.barber.findFirst({
        where: {
          id: barberId,
          deletedAt: null,
        },
      });

    if (!barber) {
      throw new NotFoundException(
        `No se encontró el barbero con ID ${barberId}`,
      );
    }

    return this.prisma.appointment.findMany({
      where: {
        barberId,
        deletedAt: null,
      },
      include: this.appointmentInclude(),
      orderBy: {
        startAt: 'asc',
      },
    });
  }

  async findByCustomer(customerId: number) {
    const customer =
      await this.prisma.user.findFirst({
        where: {
          id: customerId,
          deletedAt: null,
        },
      });

    if (!customer) {
      throw new NotFoundException(
        `No se encontró el cliente con ID ${customerId}`,
      );
    }

    return this.prisma.appointment.findMany({
      where: {
        customerId,
        deletedAt: null,
      },
      include: this.appointmentInclude(),
      orderBy: {
        startAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const appointment =
      await this.prisma.appointment.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: this.appointmentInclude(),
      });

    if (!appointment) {
      throw new NotFoundException(
        `No se encontró la reserva con ID ${id}`,
      );
    }

    return appointment;
  }

async update(
  id: number,
  updateAppointmentDto: UpdateAppointmentDto,
) {
  const currentAppointment = await this.findOne(id);

  if (
    updateAppointmentDto.status !== undefined &&
    updateAppointmentDto.status !== currentAppointment.status
  ) {
    this.validateStatusTransition(
      currentAppointment.status,
      updateAppointmentDto.status,
    );
  }

  if (
    updateAppointmentDto.status === AppointmentStatus.CANCELLED &&
    !updateAppointmentDto.cancellationReason
  ) {
    throw new BadRequestException(
      'Debes indicar el motivo de cancelación',
    );
  }

  return this.prisma.$transaction(async (transaction) => {
    const updatedAppointment =
      await transaction.appointment.update({
        where: {
          id,
        },
        data: {
          ...(updateAppointmentDto.status !== undefined && {
            status: updateAppointmentDto.status,
          }),

          ...(updateAppointmentDto.customerNotes !== undefined && {
            customerNotes: updateAppointmentDto.customerNotes,
          }),

          ...(updateAppointmentDto.internalNotes !== undefined && {
            internalNotes: updateAppointmentDto.internalNotes,
          }),

          ...(updateAppointmentDto.cancellationReason !== undefined && {
            cancellationReason:
              updateAppointmentDto.cancellationReason,
          }),

          ...(updateAppointmentDto.status ===
            AppointmentStatus.CONFIRMED && {
            confirmedAt: new Date(),
          }),

          ...(updateAppointmentDto.status ===
            AppointmentStatus.IN_PROGRESS && {
            startedAt: new Date(),
          }),

          ...(updateAppointmentDto.status ===
            AppointmentStatus.COMPLETED && {
            completedAt: new Date(),
          }),

          ...(updateAppointmentDto.status ===
            AppointmentStatus.CANCELLED && {
            cancelledAt: new Date(),
          }),

          ...(updateAppointmentDto.status ===
            AppointmentStatus.NO_SHOW && {
            noShowAt: new Date(),
          }),
        },
      });

    if (
      updateAppointmentDto.status !== undefined &&
      updateAppointmentDto.status !== currentAppointment.status
    ) {
      await transaction.appointmentHistory.create({
        data: {
          appointmentId: id,
          previousStatus: currentAppointment.status,
          newStatus: updateAppointmentDto.status,
          comment:
            updateAppointmentDto.cancellationReason ??
            updateAppointmentDto.internalNotes ??
            'Estado actualizado',
        },
      });
    }

    return transaction.appointment.findUnique({
      where: {
        id: updatedAppointment.id,
      },
      include: this.appointmentInclude(),
    });
  });
}

  async reschedule(
    id: number,
    dto: RescheduleAppointmentDto,
  ) {
    const currentAppointment =
      await this.findOne(id);

    if (
      currentAppointment.status ===
        AppointmentStatus.COMPLETED ||
      currentAppointment.status ===
        AppointmentStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'No se puede reprogramar una reserva completada o cancelada',
      );
    }
    

    const business = await this.validateBusiness(
      currentAppointment.businessId,
    );

    const barberId =
      dto.barberId ??
      currentAppointment.barberId;

    const barber = await this.validateBarber(
      barberId,
      currentAppointment.businessId,
    );

    const serviceIds =
      dto.serviceIds ??
      currentAppointment.services.map(
        (appointmentService) =>
          appointmentService.serviceId,
      );

    const uniqueServiceIds = [
      ...new Set(serviceIds),
    ];

    const barberServices =
      await this.prisma.barberService.findMany({
        where: {
          barberId: barber.id,
          serviceId: {
            in: uniqueServiceIds,
          },
          isActive: true,
          service: {
            businessId:
              currentAppointment.businessId,
            isActive: true,
            deletedAt: null,
          },
        },
        include: {
          service: true,
        },
      });

    if (
      barberServices.length !==
      uniqueServiceIds.length
    ) {
      throw new BadRequestException(
        'Uno o más servicios no están disponibles para el barbero seleccionado',
      );
    }

    const orderedServices =
      uniqueServiceIds.map((serviceId) => {
        const barberService =
          barberServices.find(
            (item) =>
              item.serviceId === serviceId,
          );

        if (!barberService) {
          throw new BadRequestException(
            `El servicio con ID ${serviceId} no está disponible para el barbero`,
          );
        }

        return barberService;
      });

    let totalDurationMinutes = 0;
    let subtotal = new Prisma.Decimal(0);

    const appointmentServices =
      orderedServices.map(
        (barberService, index) => {
          const service =
            barberService.service;

          const durationMinutes =
            barberService.customDurationMinutes ??
            service.durationMinutes;

          const unitPrice =
            barberService.customPrice ??
            service.price;

          totalDurationMinutes +=
            service.bufferBefore +
            durationMinutes +
            service.bufferAfter;

          subtotal =
            subtotal.plus(unitPrice);

          return {
            serviceId: service.id,
            serviceName: service.name,
            durationMinutes,
            bufferBefore:
              service.bufferBefore,
            bufferAfter:
              service.bufferAfter,
            unitPrice,
            finalPrice: unitPrice,
            displayOrder: index,
          };
        },
      );

    const discountAmount =
      dto.discountAmount !== undefined
        ? new Prisma.Decimal(
            dto.discountAmount,
          )
        : currentAppointment.discountAmount;

    if (
      discountAmount.greaterThan(subtotal)
    ) {
      throw new BadRequestException(
        'El descuento no puede ser mayor que el subtotal',
      );
    }

    const totalPrice =
      subtotal.minus(discountAmount);

    const startAt =
      dto.startAt !== undefined
        ? new Date(dto.startAt)
        : currentAppointment.startAt;

    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException(
        'La fecha de inicio no es válida',
      );
    }

    const now = new Date();

    const minimumStartAt = new Date(
      now.getTime() +
        business.minimumAdvanceTime *
          60_000,
    );

    if (startAt < minimumStartAt) {
      throw new BadRequestException(
        `La reserva debe hacerse con al menos ${business.minimumAdvanceTime} minutos de anticipación`,
      );
    }

    const maximumStartAt = new Date(
      now.getTime() +
        business.maximumAdvanceDays *
          24 *
          60 *
          60 *
          1000,
    );

    if (startAt > maximumStartAt) {
      throw new BadRequestException(
        `La reserva no puede superar los ${business.maximumAdvanceDays} días de anticipación`,
      );
    }

    const endAt = new Date(
      startAt.getTime() +
        totalDurationMinutes * 60_000,
    );

    await this.validateSchedule(
      barber.id,
      startAt,
      endAt,
      business.timezone,
      business.appointmentInterval,
    );

    await this.validateOverlap(
      barber.id,
      startAt,
      endAt,
      id,
    );

    return this.prisma.$transaction(
      async (transaction) => {
        await transaction.appointment.update({
          where: {
            id,
          },
          data: {
            barberId: barber.id,
            startAt,
            endAt,
            totalDurationMinutes,
            subtotal,
            discountAmount,
            totalPrice,
          },
        });

        await transaction.appointmentService.deleteMany(
          {
            where: {
              appointmentId: id,
            },
          },
        );

        await transaction.appointmentService.createMany(
          {
            data: appointmentServices.map(
              (service) => ({
                appointmentId: id,
                ...service,
              }),
            ),
          },
        );

        await transaction.appointmentHistory.create({
          data: {
            appointmentId: id,
            previousStatus:
              currentAppointment.status,
            newStatus:
              currentAppointment.status,
            comment: 'Reserva reprogramada',
          },
        });

        return transaction.appointment.findUnique({
          where: {
            id,
          },
          include: this.appointmentInclude(),
        });
      },
    );
  }

  async remove(id: number) {
    const appointment =
      await this.findOne(id);

    if (
      appointment.status ===
      AppointmentStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'No se puede eliminar una reserva completada',
      );
    }

    return this.prisma.appointment.update({
      where: {
        id,
      },
      data: {
        status:
          AppointmentStatus.CANCELLED,
        cancellationReason:
          appointment.cancellationReason ??
          'Reserva eliminada',
        cancelledAt: new Date(),
        deletedAt: new Date(),
      },
      include: this.appointmentInclude(),
    });
  }
  
  private validateStatusTransition(
  currentStatus: AppointmentStatus,
  newStatus: AppointmentStatus,
) {
  const allowedTransitions: Record<
    AppointmentStatus,
    AppointmentStatus[]
  > = {
    [AppointmentStatus.PENDING]: [
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.CANCELLED,
    ],

    [AppointmentStatus.CONFIRMED]: [
      AppointmentStatus.IN_PROGRESS,
      AppointmentStatus.CANCELLED,
      AppointmentStatus.NO_SHOW,
    ],

    [AppointmentStatus.IN_PROGRESS]: [
      AppointmentStatus.COMPLETED,
      AppointmentStatus.CANCELLED,
    ],

    [AppointmentStatus.COMPLETED]: [],

    [AppointmentStatus.CANCELLED]: [],

    [AppointmentStatus.NO_SHOW]: [],
  };

  const allowed =
    allowedTransitions[currentStatus];

  if (!allowed.includes(newStatus)) {
    throw new BadRequestException(
      `No se puede cambiar una reserva de ${currentStatus} a ${newStatus}`,
    );
  }
}

  private async validateBusiness(
    businessId: number,
  ) {
    const business =
      await this.prisma.business.findFirst({
        where: {
          id: businessId,
          isActive: true,
          deletedAt: null,
        },
      });

    if (!business) {
      throw new NotFoundException(
        `No se encontró una barbería activa con ID ${businessId}`,
      );
    }

    return business;
  }

  private async validateCustomer(
    customerId: number,
    businessId: number,
  ) {
    const customer =
      await this.prisma.user.findFirst({
        where: {
          id: customerId,
          businessId,
          isActive: true,
          deletedAt: null,
        },
      });

    if (!customer) {
      throw new NotFoundException(
        `No se encontró un cliente activo con ID ${customerId} en esta barbería`,
      );
    }

    return customer;
  }

  private async validateBarber(
    barberId: number,
    businessId: number,
  ) {
    const barber =
      await this.prisma.barber.findFirst({
        where: {
          id: barberId,
          businessId,
          isActive: true,
          deletedAt: null,
        },
      });

    if (!barber) {
      throw new NotFoundException(
        `No se encontró un barbero activo con ID ${barberId} en esta barbería`,
      );
    }

    return barber;
  }

  private async validateSchedule(
    barberId: number,
    startAt: Date,
    endAt: Date,
    timezone: string,
    appointmentInterval: number,
  ) {
    const startData =
      this.getLocalDateData(
        startAt,
        timezone,
      );

    const endData =
      this.getLocalDateData(
        endAt,
        timezone,
      );

    if (startData.date !== endData.date) {
      throw new BadRequestException(
        'La reserva debe comenzar y terminar el mismo día',
      );
    }

    if (
      startData.minuteOfDay %
        appointmentInterval !==
      0
    ) {
      throw new BadRequestException(
        `La hora debe comenzar en intervalos de ${appointmentInterval} minutos`,
      );
    }

    const exceptionDate = new Date(
      `${startData.date}T00:00:00.000Z`,
    );

    const exception =
      await this.prisma.scheduleException.findFirst({
        where: {
          barberId,
          date: exceptionDate,
        },
      });

    if (exception) {
      if (exception.isDayOff) {
        throw new ConflictException(
          'El barbero tiene el día libre en esta fecha',
        );
      }

      if (
        exception.startMinute === null ||
        exception.endMinute === null
      ) {
        throw new ConflictException(
          'La excepción de horario no está configurada correctamente',
        );
      }

      if (
        startData.minuteOfDay <
          exception.startMinute ||
        endData.minuteOfDay >
          exception.endMinute
      ) {
        throw new ConflictException(
          'La reserva está fuera del horario especial del barbero',
        );
      }

      return;
    }

    const schedule =
      await this.prisma.schedule.findFirst({
        where: {
          barberId,
          dayOfWeek:
            startData.dayOfWeek,
          isActive: true,
          startMinute: {
            lte: startData.minuteOfDay,
          },
          endMinute: {
            gte: endData.minuteOfDay,
          },
        },
      });

    if (!schedule) {
      throw new ConflictException(
        'El barbero no trabaja en ese horario',
      );
    }
  }

  private async validateOverlap(
    barberId: number,
    startAt: Date,
    endAt: Date,
    excludedAppointmentId?: number,
    prismaClient:
      | PrismaService
      | Prisma.TransactionClient =
      this.prisma,
  ) {
    const overlappingAppointment =
      await prismaClient.appointment.findFirst({
        where: {
          barberId,
          deletedAt: null,
          status: {
            in: [
              AppointmentStatus.PENDING,
              AppointmentStatus.CONFIRMED,
              AppointmentStatus.IN_PROGRESS,
            ],
          },

          ...(excludedAppointmentId !==
            undefined && {
            id: {
              not: excludedAppointmentId,
            },
          }),

          startAt: {
            lt: endAt,
          },

          endAt: {
            gt: startAt,
          },
        },
      });

    if (overlappingAppointment) {
      throw new ConflictException(
        'El barbero ya tiene una reserva que se cruza con este horario',
      );
    }
  }

  private getLocalDateData(
    date: Date,
    timezone: string,
  ) {
    const formatter =
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      });

    const parts =
      formatter.formatToParts(date);

    const values = Object.fromEntries(
      parts.map((part) => [
        part.type,
        part.value,
      ]),
    );

    const weekdayMap: Record<
      string,
      DayOfWeek
    > = {
      Monday: DayOfWeek.MONDAY,
      Tuesday: DayOfWeek.TUESDAY,
      Wednesday: DayOfWeek.WEDNESDAY,
      Thursday: DayOfWeek.THURSDAY,
      Friday: DayOfWeek.FRIDAY,
      Saturday: DayOfWeek.SATURDAY,
      Sunday: DayOfWeek.SUNDAY,
    };

    const hour = Number(values.hour);
    const minute = Number(values.minute);

    return {
      date: `${values.year}-${values.month}-${values.day}`,
      dayOfWeek:
        weekdayMap[values.weekday],
      minuteOfDay:
        hour * 60 + minute,
    };
  }

  private generateConfirmationCode() {
    return randomUUID()
      .replaceAll('-', '')
      .slice(0, 10)
      .toUpperCase();
  }

  private appointmentInclude() {
    return {
      business: true,
      customer: true,
      barber: true,
      services: {
        include: {
          service: true,
        },
        orderBy: {
          displayOrder:
            Prisma.SortOrder.asc,
        },
      },
      history: {
        orderBy: {
          createdAt:
            Prisma.SortOrder.asc,
        },
      },
    } satisfies Prisma.AppointmentInclude;
  }
}
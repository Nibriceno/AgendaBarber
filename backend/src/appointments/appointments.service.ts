import {
  BadRequestException,
  ConflictException,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, DayOfWeek, Prisma, UserRole } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ClientRescheduleAppointmentDto } from './dto/client-reschedule-appointment.dto';
import { BarberUpdateStatusDto } from './dto/barber-update-status.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

type GuestCustomerInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
};

type GuestAppointmentInput = {
  barberId: number;
  serviceIds: number[];
  startAt: string;
  customerNotes?: string;
};

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOneAuthorized(id: number, currentUser: AuthUser) {
    const appointment = await this.findOne(currentUser.businessId, id);

    if (
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.RECEPTIONIST
    ) {
      return appointment;
    }

    if (currentUser.role === UserRole.CLIENT) {
      if (appointment.customerId !== currentUser.id) {
        throw new ForbiddenException('No tienes permiso para ver esta reserva');
      }

      return this.prisma.appointment.findFirstOrThrow({
        where: {
          id,
          businessId: currentUser.businessId,
          customerId: currentUser.id,
          deletedAt: null,
        },
        select: this.clientAppointmentSelect(),
      });
    }

    if (currentUser.role === UserRole.BARBER) {
      const barber = await this.prisma.barber.findFirst({
        where: {
          userId: currentUser.id,
          businessId: currentUser.businessId,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!barber) {
        throw new ForbiddenException(
          'El usuario no tiene un perfil de barbero activo',
        );
      }

      if (appointment.barberId !== barber.id) {
        throw new ForbiddenException('No tienes permiso para ver esta reserva');
      }

      return appointment;
    }

    throw new ForbiddenException('No tienes permiso para ver esta reserva');
  }

  async findMyAppointments(currentUser: AuthUser) {
    if (currentUser.role !== UserRole.CLIENT) {
      throw new ForbiddenException('Esta ruta es solo para clientes');
    }

    return this.prisma.appointment.findMany({
      where: {
        businessId: currentUser.businessId,
        customerId: currentUser.id,
        deletedAt: null,
      },
      select: this.clientAppointmentSelect(),
      orderBy: {
        startAt: 'desc',
      },
    });
  }

  async findMyBarberAppointments(currentUser: AuthUser) {
    if (currentUser.role !== UserRole.BARBER) {
      throw new ForbiddenException('Esta ruta es solo para barberos');
    }

    const barber = await this.prisma.barber.findFirst({
      where: {
        userId: currentUser.id,
        businessId: currentUser.businessId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!barber) {
      throw new NotFoundException(
        'No se encontró un perfil de barbero asociado al usuario',
      );
    }

    return this.prisma.appointment.findMany({
      where: {
        businessId: currentUser.businessId,
        barberId: barber.id,
        deletedAt: null,
      },
      include: this.appointmentInclude(),
      orderBy: {
        startAt: 'asc',
      },
    });
  }

  async updateAuthorized(
    id: number,
    updateAppointmentDto: UpdateAppointmentDto,
    currentUser: AuthUser,
  ) {
    if (
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.RECEPTIONIST
    ) {
      throw new ForbiddenException(
        'No tienes permiso para modificar administrativamente esta reserva',
      );
    }

    await this.findOne(currentUser.businessId, id);

    return this.update(
      currentUser.businessId,
      id,
      updateAppointmentDto,
      currentUser,
    );
  }

  async rescheduleAuthorized(
    id: number,
    dto: RescheduleAppointmentDto,
    currentUser: AuthUser,
  ) {
    if (
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.RECEPTIONIST
    ) {
      throw new ForbiddenException(
        'No tienes permiso para reprogramar administrativamente esta reserva.',
      );
    }

    await this.findOne(currentUser.businessId, id);

    return this.reschedule(currentUser.businessId, id, dto, currentUser);
  }

  async create(
    currentUser: AuthUser,
    createAppointmentDto: CreateAppointmentDto,
  ) {
    const canCreateAppointment =
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.RECEPTIONIST ||
      currentUser.role === UserRole.CLIENT;

    if (!canCreateAppointment) {
      throw new ForbiddenException('No tienes permiso para crear reservas.');
    }

    let customerId: number;

    if (currentUser.role === UserRole.CLIENT) {
      /*
       * Un CLIENT autenticado siempre reserva para sí mismo.
       * Aunque intentara enviar customerId en el body, no se usa.
       */
      customerId = currentUser.id;
    } else {
      if (createAppointmentDto.customerId === undefined) {
        throw new BadRequestException('Debes indicar el cliente de la reserva');
      }

      customerId = createAppointmentDto.customerId;
    }

    const canApplyDiscount =
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.RECEPTIONIST;

    return this.createAppointmentForCustomer({
      businessId: currentUser.businessId,
      customerId,
      historyActorId: currentUser.id,
      historyComment: 'Reserva creada',
      canApplyDiscount,
      createAppointmentDto,
    });
  }

  private async createAppointmentForCustomer({
    businessId,
    customerId,
    historyActorId,
    historyComment,
    canApplyDiscount,
    createAppointmentDto,
    managementTokenHash,
  }: {
    businessId: number;
    customerId: number;
    historyActorId: number | null;
    historyComment: string;
    canApplyDiscount: boolean;
    createAppointmentDto: CreateAppointmentDto;
    managementTokenHash?: string;
  }) {
    /*
     * Toda la creación se ejecuta dentro de una transacción
     * Serializable. Así las validaciones y escrituras observan
     * un estado consistente y mantenemos la protección
     * anti-overbooking en una única ruta.
     */
    return this.runSerializableTransaction(async (transaction) =>
      this.createAppointmentForCustomerInTransaction({
        transaction,
        businessId,
        customerId,
        historyActorId,
        historyComment,
        canApplyDiscount,
        createAppointmentDto,
        managementTokenHash,
      }),
    );
  }

  private async createAppointmentForCustomerInTransaction({
    transaction,
    businessId,
    customerId,
    historyActorId,
    historyComment,
    canApplyDiscount,
    createAppointmentDto,
    managementTokenHash,
  }: {
    transaction: Prisma.TransactionClient;
    businessId: number;
    customerId: number;
    historyActorId: number | null;
    historyComment: string;
    canApplyDiscount: boolean;
    createAppointmentDto: CreateAppointmentDto;
    managementTokenHash?: string;
  }) {
    const business = await this.validateBusiness(businessId, transaction);

    await this.validateCustomer(customerId, businessId, transaction);

    const barber = await this.validateBarber(
      createAppointmentDto.barberId,
      businessId,
      transaction,
    );

    const serviceIds = [...new Set(createAppointmentDto.serviceIds)];

    if (serviceIds.length !== createAppointmentDto.serviceIds.length) {
      throw new BadRequestException(
        'No puedes seleccionar el mismo servicio más de una vez',
      );
    }

    const barberServices = await transaction.barberService.findMany({
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
      include: {
        service: true,
      },
    });

    if (barberServices.length !== serviceIds.length) {
      throw new BadRequestException(
        'Uno o más servicios no existen, están inactivos o no están asignados al barbero',
      );
    }

    const orderedServices = serviceIds.map((serviceId) => {
      const barberService = barberServices.find(
        (item) => item.serviceId === serviceId,
      );

      if (!barberService) {
        throw new BadRequestException(
          'Uno o más servicios no están disponibles para este barbero',
        );
      }

      return barberService;
    });

    let totalDurationMinutes = 0;
    let subtotal = new Prisma.Decimal(0);

    const appointmentServices = orderedServices.map((barberService, index) => {
      const service = barberService.service;

      const durationMinutes =
        barberService.customDurationMinutes ?? service.durationMinutes;

      const unitPrice = barberService.customPrice ?? service.price;

      totalDurationMinutes +=
        service.bufferBefore + durationMinutes + service.bufferAfter;

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
    });

    const discountAmount = new Prisma.Decimal(
      canApplyDiscount ? (createAppointmentDto.discountAmount ?? 0) : 0,
    );

    if (discountAmount.isNegative()) {
      throw new BadRequestException('El descuento no puede ser negativo');
    }

    if (discountAmount.greaterThan(subtotal)) {
      throw new BadRequestException(
        'El descuento no puede ser mayor que el subtotal',
      );
    }

    const totalPrice = subtotal.minus(discountAmount);

    const startAt = new Date(createAppointmentDto.startAt);

    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('La fecha de inicio no es válida');
    }

    const now = new Date();

    const minimumStartAt = new Date(
      now.getTime() + business.minimumAdvanceTime * 60_000,
    );

    if (startAt < minimumStartAt) {
      throw new BadRequestException(
        `La reserva debe hacerse con al menos ${business.minimumAdvanceTime} minutos de anticipación`,
      );
    }

    const maximumStartAt = new Date(
      now.getTime() + business.maximumAdvanceDays * 24 * 60 * 60 * 1000,
    );

    if (startAt > maximumStartAt) {
      throw new BadRequestException(
        `La reserva no puede superar los ${business.maximumAdvanceDays} días de anticipación`,
      );
    }

    const endAt = new Date(startAt.getTime() + totalDurationMinutes * 60_000);

    await this.validateSchedule(
      barber.id,
      startAt,
      endAt,
      business.timezone,
      business.appointmentInterval,
      transaction,
    );

    await this.validateOverlap(
      businessId,
      barber.id,
      startAt,
      endAt,
      undefined,
      transaction,
    );

    const confirmationCode = this.generateConfirmationCode();

    const appointment = await transaction.appointment.create({
      data: {
        businessId,
        customerId,
        barberId: barber.id,
        startAt,
        endAt,
        status: AppointmentStatus.PENDING,
        totalDurationMinutes,
        subtotal,
        discountAmount,
        totalPrice,
        customerNotes: createAppointmentDto.customerNotes,
        internalNotes: canApplyDiscount
          ? createAppointmentDto.internalNotes
          : null,
        confirmationCode,
        ...(managementTokenHash !== undefined && {
          managementTokenHash,
        }),
      },
    });

    await transaction.appointmentService.createMany({
      data: appointmentServices.map((service) => ({
        appointmentId: appointment.id,
        ...service,
      })),
    });

    await transaction.appointmentHistory.create({
      data: {
        appointmentId: appointment.id,
        actorId: historyActorId,
        previousStatus: null,
        newStatus: AppointmentStatus.PENDING,
        comment: historyComment,
      },
    });

    /*
     * La reserva acaba de crearse dentro de esta misma
     * transacción. Por eso un resultado null sería una
     * inconsistencia y usamos findUniqueOrThrow.
     */
    return transaction.appointment.findUniqueOrThrow({
      where: {
        id: appointment.id,
      },
      include: this.appointmentInclude(),
    });
  }

  findAll(businessId: number) {
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

  async findByBusiness(businessId: number) {
    await this.validateBusiness(businessId);

    return this.findAll(businessId);
  }

  async findByBarber(businessId: number, barberId: number) {
    await this.validateBarber(barberId, businessId);

    return this.prisma.appointment.findMany({
      where: {
        businessId,
        barberId,
        deletedAt: null,
      },
      include: this.appointmentInclude(),
      orderBy: {
        startAt: 'asc',
      },
    });
  }

  async findByCustomer(businessId: number, customerId: number) {
    await this.validateCustomer(customerId, businessId);

    return this.prisma.appointment.findMany({
      where: {
        businessId,
        customerId,
        deletedAt: null,
      },
      include: this.appointmentInclude(),
      orderBy: {
        startAt: 'desc',
      },
    });
  }

  async findOne(businessId: number, id: number) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        businessId,
        deletedAt: null,
      },
      include: this.appointmentInclude(),
    });

    if (!appointment) {
      throw new NotFoundException('Reserva no encontrada');
    }

    return appointment;
  }

  async update(
    businessId: number,
    id: number,
    updateAppointmentDto: UpdateAppointmentDto,
    currentUser: AuthUser,
  ) {
    const currentAppointment = await this.findOne(businessId, id);

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
      throw new BadRequestException('Debes indicar el motivo de cancelación');
    }

    const now = new Date();

    return this.prisma.$transaction(async (transaction) => {
      await this.updateAppointmentOptimistically(
        transaction,
        {
          id,
          businessId,
          status: currentAppointment.status,
          deletedAt: null,
        },
        {
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
            cancellationReason: updateAppointmentDto.cancellationReason,
          }),

          ...(updateAppointmentDto.status === AppointmentStatus.CONFIRMED && {
            confirmedAt: now,
          }),

          ...(updateAppointmentDto.status === AppointmentStatus.IN_PROGRESS && {
            startedAt: now,
          }),

          ...(updateAppointmentDto.status === AppointmentStatus.COMPLETED && {
            completedAt: now,
          }),

          ...(updateAppointmentDto.status === AppointmentStatus.CANCELLED && {
            cancelledAt: now,
            cancelledById: currentUser.id,
          }),

          ...(updateAppointmentDto.status === AppointmentStatus.NO_SHOW && {
            noShowAt: now,
          }),
        },
      );

      if (
        updateAppointmentDto.status !== undefined &&
        updateAppointmentDto.status !== currentAppointment.status
      ) {
        await transaction.appointmentHistory.create({
          data: {
            appointmentId: id,
            actorId: currentUser.id,
            previousStatus: currentAppointment.status,
            newStatus: updateAppointmentDto.status,
            comment:
              updateAppointmentDto.cancellationReason ??
              updateAppointmentDto.internalNotes ??
              'Estado actualizado',
          },
        });
      }

      return transaction.appointment.findUniqueOrThrow({
        where: {
          id,
        },
        include: this.appointmentInclude(),
      });
    });
  }

  async reschedule(
    businessId: number,
    id: number,
    dto: RescheduleAppointmentDto,
    currentUser: AuthUser,
  ) {
    const currentAppointment = await this.findOne(businessId, id);

    if (
      currentAppointment.status === AppointmentStatus.COMPLETED ||
      currentAppointment.status === AppointmentStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'No se puede reprogramar una reserva completada o cancelada',
      );
    }

    const business = await this.validateBusiness(businessId);

    const barberId = dto.barberId ?? currentAppointment.barberId;

    const barber = await this.validateBarber(barberId, businessId);

    const serviceIds =
      dto.serviceIds ??
      currentAppointment.services.map(
        (appointmentService) => appointmentService.serviceId,
      );

    const uniqueServiceIds = [...new Set(serviceIds)];

    if (uniqueServiceIds.length !== serviceIds.length) {
      throw new BadRequestException(
        'No puedes seleccionar el mismo servicio más de una vez',
      );
    }

    const barberServices = await this.prisma.barberService.findMany({
      where: {
        barberId: barber.id,
        serviceId: {
          in: uniqueServiceIds,
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
      include: {
        service: true,
      },
    });

    if (barberServices.length !== uniqueServiceIds.length) {
      throw new BadRequestException(
        'Uno o más servicios no están disponibles para el barbero seleccionado',
      );
    }

    const orderedServices = uniqueServiceIds.map((serviceId) => {
      const barberService = barberServices.find(
        (item) => item.serviceId === serviceId,
      );

      if (!barberService) {
        throw new BadRequestException(
          'Uno o más servicios no están disponibles para el barbero',
        );
      }

      return barberService;
    });

    let totalDurationMinutes = 0;
    let subtotal = new Prisma.Decimal(0);

    const appointmentServices = orderedServices.map((barberService, index) => {
      const service = barberService.service;

      const durationMinutes =
        barberService.customDurationMinutes ?? service.durationMinutes;

      const unitPrice = barberService.customPrice ?? service.price;

      totalDurationMinutes +=
        service.bufferBefore + durationMinutes + service.bufferAfter;

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
    });

    const canApplyDiscount =
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.RECEPTIONIST;

    const discountAmount =
      canApplyDiscount && dto.discountAmount !== undefined
        ? new Prisma.Decimal(dto.discountAmount)
        : currentAppointment.discountAmount;

    if (discountAmount.isNegative()) {
      throw new BadRequestException('El descuento no puede ser negativo');
    }

    if (discountAmount.greaterThan(subtotal)) {
      throw new BadRequestException(
        'El descuento no puede ser mayor que el subtotal',
      );
    }

    const totalPrice = subtotal.minus(discountAmount);

    const startAt =
      dto.startAt !== undefined
        ? new Date(dto.startAt)
        : currentAppointment.startAt;

    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('La fecha de inicio no es válida');
    }

    const now = new Date();

    const minimumStartAt = new Date(
      now.getTime() + business.minimumAdvanceTime * 60_000,
    );

    if (startAt < minimumStartAt) {
      throw new BadRequestException(
        `La reserva debe hacerse con al menos ${business.minimumAdvanceTime} minutos de anticipación`,
      );
    }

    const maximumStartAt = new Date(
      now.getTime() + business.maximumAdvanceDays * 24 * 60 * 60 * 1000,
    );

    if (startAt > maximumStartAt) {
      throw new BadRequestException(
        `La reserva no puede superar los ${business.maximumAdvanceDays} días de anticipación`,
      );
    }

    const endAt = new Date(startAt.getTime() + totalDurationMinutes * 60_000);

    await this.validateSchedule(
      barber.id,
      startAt,
      endAt,
      business.timezone,
      business.appointmentInterval,
    );

    return this.runSerializableTransaction(async (transaction) => {
      await this.validateOverlap(
        businessId,
        barber.id,
        startAt,
        endAt,
        id,
        transaction,
      );

      await this.updateAppointmentOptimistically(
        transaction,
        {
          id,
          businessId,
          status: currentAppointment.status,
          deletedAt: null,
        },
        {
          barberId: barber.id,
          startAt,
          endAt,
          totalDurationMinutes,
          subtotal,
          discountAmount,
          totalPrice,
        },
      );

      await transaction.appointmentService.deleteMany({
        where: {
          appointmentId: id,
        },
      });

      await transaction.appointmentService.createMany({
        data: appointmentServices.map((service) => ({
          appointmentId: id,
          ...service,
        })),
      });

      await transaction.appointmentHistory.create({
        data: {
          appointmentId: id,
          actorId: currentUser.id,
          previousStatus: currentAppointment.status,
          newStatus: currentAppointment.status,
          comment: 'Reserva reprogramada',
        },
      });

      return transaction.appointment.findUnique({
        where: {
          id,
        },
        include: this.appointmentInclude(),
      });
    });
  }

  private async updateAppointmentOptimistically(
    transaction: Prisma.TransactionClient,
    where: Prisma.AppointmentWhereInput,
    data: Prisma.AppointmentUpdateManyArgs['data'],
  ) {
    const result = await transaction.appointment.updateMany({
      where,
      data,
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'La reserva cambió mientras se procesaba la solicitud. Recarga los datos e inténtalo nuevamente.',
      );
    }
  }

  private validateStatusTransition(
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
  ) {
    const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
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

    const allowed = allowedTransitions[currentStatus];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `No se puede cambiar una reserva de ${currentStatus} a ${newStatus}`,
      );
    }
  }

  private async validateBusiness(
    businessId: number,
    prismaClient: PrismaClientLike = this.prisma,
  ) {
    const business = await prismaClient.business.findFirst({
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
    prismaClient: PrismaClientLike = this.prisma,
  ) {
    const customer = await prismaClient.user.findFirst({
      where: {
        id: customerId,
        businessId,
        role: UserRole.CLIENT,
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
    prismaClient: PrismaClientLike = this.prisma,
  ) {
    const barber = await prismaClient.barber.findFirst({
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
    prismaClient: PrismaClientLike = this.prisma,
  ) {
    const startData = this.getLocalDateData(startAt, timezone);

    const endData = this.getLocalDateData(endAt, timezone);

    if (startData.date !== endData.date) {
      throw new BadRequestException(
        'La reserva debe comenzar y terminar el mismo día',
      );
    }

    if (startData.minuteOfDay % appointmentInterval !== 0) {
      throw new BadRequestException(
        `La hora debe comenzar en intervalos de ${appointmentInterval} minutos`,
      );
    }

    const exceptionDate = new Date(`${startData.date}T00:00:00.000Z`);

    const exception = await prismaClient.scheduleException.findFirst({
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

      if (exception.startMinute === null || exception.endMinute === null) {
        throw new ConflictException(
          'La excepción de horario no está configurada correctamente',
        );
      }

      if (
        startData.minuteOfDay < exception.startMinute ||
        endData.minuteOfDay > exception.endMinute
      ) {
        throw new ConflictException(
          'La reserva está fuera del horario especial del barbero',
        );
      }

      return;
    }

    const schedule = await prismaClient.schedule.findFirst({
      where: {
        barberId,
        dayOfWeek: startData.dayOfWeek,
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
      throw new ConflictException('El barbero no trabaja en ese horario');
    }
  }

  private async validateOverlap(
    businessId: number,
    barberId: number,
    startAt: Date,
    endAt: Date,
    excludedAppointmentId?: number,
    prismaClient: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const overlappingAppointment = await prismaClient.appointment.findFirst({
      where: {
        businessId,
        barberId,
        deletedAt: null,
        status: {
          in: [
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS,
          ],
        },

        ...(excludedAppointmentId !== undefined && {
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

  private getLocalDateData(date: Date, timezone: string) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(date);

    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );

    const weekdayMap: Record<string, DayOfWeek> = {
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
      dayOfWeek: weekdayMap[values.weekday],
      minuteOfDay: hour * 60 + minute,
    };
  }

  private generateConfirmationCode() {
    return randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
  }

  private hashManagementToken(token: string) {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private async runSerializableTransaction<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (transaction) => {
            return operation(transaction);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error) {
        /*
         * PostgreSQL rechazó directamente
         * una reserva solapada mediante:
         *
         * appointments_no_active_overlap
         */
        if (this.isAppointmentOverlapConstraintError(error)) {
          throw new ConflictException(
            'Ese horario acaba de ser reservado o se cruza con otra reserva. Selecciona otro horario.',
          );
        }

        /*
         * P2034:
         * conflicto/deadlock durante una
         * transacción Serializable.
         *
         * Reintentamos de forma controlada.
         */
        const isSerializationConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';

        if (!isSerializationConflict) {
          throw error;
        }

        if (attempt === maxRetries) {
          throw new ConflictException(
            'El horario fue ocupado por otra operación simultánea. Intenta seleccionar otro horario.',
          );
        }
      }
    }

    throw new ConflictException('No fue posible completar la reserva.');
  }

  private isAppointmentOverlapConstraintError(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (error.code !== 'P2004') {
      return false;
    }

    const errorText = [error.message, JSON.stringify(error.meta ?? {})].join(
      ' ',
    );

    return errorText.includes('appointments_no_active_overlap');
  }

  private appointmentInclude() {
    return {
      business: true,

      customer: {
        select: {
          id: true,
          businessId: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          role: true,
          birthDate: true,
          isRegistered: true,
          isActive: true,
          emailVerified: true,
          phoneVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      },

      barber: true,

      services: {
        include: {
          service: true,
        },
        orderBy: {
          displayOrder: Prisma.SortOrder.asc,
        },
      },

      history: {
        orderBy: {
          createdAt: Prisma.SortOrder.asc,
        },
      },
    } satisfies Prisma.AppointmentInclude;
  }

  private clientAppointmentSelect(): Prisma.AppointmentSelect {
    return {
      id: true,
      businessId: true,
      customerId: true,
      barberId: true,
      startAt: true,
      endAt: true,
      status: true,
      totalDurationMinutes: true,
      totalPrice: true,
      customerNotes: true,
      confirmationCode: true,
      cancelledAt: true,
      cancellationReason: true,
      business: {
        select: {
          name: true,
          timezone: true,
          currency: true,
          cancellationMinimumMinutes: true,
          rescheduleMinimumMinutes: true,
        },
      },
      barber: {
        select: {
          id: true,
          displayName: true,
          specialty: true,
          photoUrl: true,
        },
      },
      services: {
        select: {
          id: true,
          serviceId: true,
          serviceName: true,
          durationMinutes: true,
          finalPrice: true,
          displayOrder: true,
        },
        orderBy: {
          displayOrder: Prisma.SortOrder.asc,
        },
      },
    };
  }
  async rescheduleClient(
    id: number,
    dto: ClientRescheduleAppointmentDto,
    currentUser: AuthUser,
  ) {
    if (currentUser.role !== UserRole.CLIENT) {
      throw new ForbiddenException('Esta operación es solo para clientes.');
    }

    const appointment = await this.findOneAuthorized(id, currentUser);

    if (
      appointment.status !== AppointmentStatus.PENDING &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Esta reserva ya no puede ser reprogramada.',
      );
    }

    const business = await this.validateBusiness(currentUser.businessId);

    const now = new Date();

    const rescheduleDeadline = new Date(
      appointment.startAt.getTime() -
        business.rescheduleMinimumMinutes * 60_000,
    );

    if (now > rescheduleDeadline) {
      throw new BadRequestException(
        `La reserva solo puede reprogramarse con al menos ${business.rescheduleMinimumMinutes} minutos de anticipación.`,
      );
    }

    const startAt = new Date(dto.startAt);

    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('La fecha de inicio no es válida.');
    }

    const minimumStartAt = new Date(
      now.getTime() + business.minimumAdvanceTime * 60_000,
    );

    if (startAt < minimumStartAt) {
      throw new BadRequestException(
        `La nueva fecha debe tener al menos ${business.minimumAdvanceTime} minutos de anticipación.`,
      );
    }

    const maximumStartAt = new Date(
      now.getTime() + business.maximumAdvanceDays * 24 * 60 * 60 * 1000,
    );

    if (startAt > maximumStartAt) {
      throw new BadRequestException(
        `La reserva no puede superar los ${business.maximumAdvanceDays} días de anticipación.`,
      );
    }

    const endAt = new Date(
      startAt.getTime() + appointment.totalDurationMinutes * 60_000,
    );

    await this.validateSchedule(
      appointment.barberId,
      startAt,
      endAt,
      business.timezone,
      business.appointmentInterval,
    );

    return this.runSerializableTransaction(async (transaction) => {
      await this.validateOverlap(
        currentUser.businessId,
        appointment.barberId,
        startAt,
        endAt,
        appointment.id,
        transaction,
      );

      await this.updateAppointmentOptimistically(
        transaction,
        {
          id: appointment.id,
          businessId: currentUser.businessId,
          customerId: currentUser.id,
          status: appointment.status,
          deletedAt: null,
        },
        {
          startAt,
          endAt,
        },
      );

      await transaction.appointmentHistory.create({
        data: {
          appointmentId: appointment.id,

          actorId: currentUser.id,

          previousStatus: appointment.status,

          newStatus: appointment.status,

          comment: 'Reserva reprogramada por el cliente',
        },
      });

      return transaction.appointment.findUniqueOrThrow({
        where: {
          id: appointment.id,
        },

        select: this.clientAppointmentSelect(),
      });
    });
  }
  async cancelClient(id: number, reason: string, currentUser: AuthUser) {
    if (currentUser.role !== UserRole.CLIENT) {
      throw new ForbiddenException('Esta operación es solo para clientes.');
    }

    const appointment = await this.findOneAuthorized(id, currentUser);

    if (
      appointment.status !== AppointmentStatus.PENDING &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new BadRequestException('Esta reserva ya no puede ser cancelada.');
    }

    const business = await this.validateBusiness(currentUser.businessId);

    const now = new Date();

    const cancellationDeadline = new Date(
      appointment.startAt.getTime() -
        business.cancellationMinimumMinutes * 60_000,
    );

    if (now > cancellationDeadline) {
      throw new BadRequestException(
        `La reserva solo puede cancelarse con al menos ${business.cancellationMinimumMinutes} minutos de anticipación.`,
      );
    }

    const cancellationReason = reason.trim();

    return this.prisma.$transaction(async (transaction) => {
      await this.updateAppointmentOptimistically(
        transaction,
        {
          id: appointment.id,
          businessId: currentUser.businessId,
          customerId: currentUser.id,
          status: appointment.status,
          deletedAt: null,
        },
        {
          status: AppointmentStatus.CANCELLED,
          cancellationReason,
          cancelledAt: now,
          cancelledById: currentUser.id,
        },
      );

      await transaction.appointmentHistory.create({
        data: {
          appointmentId: appointment.id,

          actorId: currentUser.id,

          previousStatus: appointment.status,

          newStatus: AppointmentStatus.CANCELLED,

          comment: cancellationReason,
        },
      });

      return transaction.appointment.findUniqueOrThrow({
        where: {
          id: appointment.id,
        },

        select: this.clientAppointmentSelect(),
      });
    });
  }

  async updateBarberStatus(
    id: number,
    dto: BarberUpdateStatusDto,
    currentUser: AuthUser,
  ) {
    if (currentUser.role !== UserRole.BARBER) {
      throw new ForbiddenException('Esta operación es solo para barberos.');
    }

    const barber = await this.prisma.barber.findFirst({
      where: {
        userId: currentUser.id,
        businessId: currentUser.businessId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!barber) {
      throw new ForbiddenException('No tienes un perfil de barbero activo.');
    }

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        businessId: currentUser.businessId,
        barberId: barber.id,
        deletedAt: null,
      },
      include: this.appointmentInclude(),
    });

    if (!appointment) {
      throw new NotFoundException('Reserva no encontrada.');
    }

    const allowedBarberStatuses: AppointmentStatus[] = [
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.IN_PROGRESS,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.NO_SHOW,
    ];

    if (!allowedBarberStatuses.includes(dto.status)) {
      throw new ForbiddenException('El barbero no puede asignar este estado.');
    }

    this.validateStatusTransition(appointment.status, dto.status);

    const business = await this.validateBusiness(currentUser.businessId);

    const now = new Date();

    /*
     * CONFIRMED -> IN_PROGRESS
     *
     * El barbero puede iniciar la atención
     * solo dentro de la ventana permitida.
     */
    if (dto.status === AppointmentStatus.IN_PROGRESS) {
      const earliestStart = new Date(
        appointment.startAt.getTime() -
          business.barberStartEarlyMinutes * 60_000,
      );

      if (now < earliestStart) {
        throw new BadRequestException(
          `La atención solo puede iniciarse hasta ${business.barberStartEarlyMinutes} minutos antes de la hora reservada.`,
        );
      }

      if (now >= appointment.endAt) {
        throw new BadRequestException(
          'La hora de esta reserva ya finalizó. No puede iniciarse la atención.',
        );
      }
    }

    /*
     * CONFIRMED -> NO_SHOW
     *
     * El cliente solo puede marcarse como
     * ausente después del período de gracia.
     */
    if (dto.status === AppointmentStatus.NO_SHOW) {
      const noShowAvailableAt = new Date(
        appointment.startAt.getTime() + business.noShowGraceMinutes * 60_000,
      );

      if (now < noShowAvailableAt) {
        throw new BadRequestException(
          `El cliente solo puede marcarse como ausente después de ${business.noShowGraceMinutes} minutos desde la hora de la reserva.`,
        );
      }
    }

    return this.prisma.$transaction(async (transaction) => {
      await this.updateAppointmentOptimistically(
        transaction,
        {
          id: appointment.id,
          businessId: currentUser.businessId,
          barberId: barber.id,
          status: appointment.status,
          deletedAt: null,
        },
        {
          status: dto.status,

          ...(dto.status === AppointmentStatus.CONFIRMED && {
            confirmedAt: now,
          }),

          ...(dto.status === AppointmentStatus.IN_PROGRESS && {
            startedAt: now,
          }),

          ...(dto.status === AppointmentStatus.COMPLETED && {
            completedAt: now,
          }),

          ...(dto.status === AppointmentStatus.NO_SHOW && {
            noShowAt: now,
          }),
        },
      );

      await transaction.appointmentHistory.create({
        data: {
          appointmentId: appointment.id,

          actorId: currentUser.id,

          previousStatus: appointment.status,

          newStatus: dto.status,

          comment: 'Estado actualizado por el barbero',
        },
      });

      return transaction.appointment.findUniqueOrThrow({
        where: {
          id: appointment.id,
        },
        include: this.appointmentInclude(),
      });
    });
  }

  async cancelAuthorized(
    id: number,
    dto: CancelAppointmentDto,
    currentUser: AuthUser,
  ) {
    if (
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.RECEPTIONIST
    ) {
      throw new ForbiddenException(
        'No tienes permiso para cancelar administrativamente esta reserva.',
      );
    }

    const appointment = await this.findOne(currentUser.businessId, id);

    if (
      appointment.status !== AppointmentStatus.PENDING &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new BadRequestException('Esta reserva ya no puede ser cancelada.');
    }

    const now = new Date();

    const reason = dto.reason.trim();

    return this.prisma.$transaction(async (transaction) => {
      await this.updateAppointmentOptimistically(
        transaction,
        {
          id: appointment.id,
          businessId: currentUser.businessId,
          status: appointment.status,
          deletedAt: null,
        },
        {
          status: AppointmentStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: now,
          cancelledById: currentUser.id,
        },
      );

      await transaction.appointmentHistory.create({
        data: {
          appointmentId: appointment.id,

          actorId: currentUser.id,

          previousStatus: appointment.status,

          newStatus: AppointmentStatus.CANCELLED,

          comment: reason,
        },
      });

      return transaction.appointment.findUnique({
        where: {
          id: appointment.id,
        },

        include: this.appointmentInclude(),
      });
    });
  }
  async rescheduleForGuest(
    businessId: number,
    id: number,
    startAtInput: string,
  ) {
    /*
     * Esta operación solo se invoca después de que
     * PublicBookingService valida confirmationCode +
     * X-Booking-Token.
     *
     * Aun así, volvemos a limitar la consulta por tenant
     * y exigimos que sea realmente una reserva guest.
     */
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        businessId,
        managementTokenHash: {
          not: null,
        },
        deletedAt: null,
      },

      select: {
        id: true,
        status: true,
        startAt: true,
        barberId: true,
        totalDurationMinutes: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Reserva no encontrada.');
    }

    if (
      appointment.status !== AppointmentStatus.PENDING &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Esta reserva ya no puede ser reprogramada.',
      );
    }

    const business = await this.validateBusiness(businessId);

    const now = new Date();

    /*
     * El invitado debe respetar la misma política de
     * anticipación que un CLIENT autenticado.
     */
    const rescheduleDeadline = new Date(
      appointment.startAt.getTime() -
        business.rescheduleMinimumMinutes * 60_000,
    );

    if (now > rescheduleDeadline) {
      throw new BadRequestException(
        `La reserva solo puede reprogramarse con al menos ${business.rescheduleMinimumMinutes} minutos de anticipación.`,
      );
    }

    const startAt = new Date(startAtInput);

    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('La fecha de inicio no es válida.');
    }

    const minimumStartAt = new Date(
      now.getTime() + business.minimumAdvanceTime * 60_000,
    );

    if (startAt < minimumStartAt) {
      throw new BadRequestException(
        `La nueva fecha debe tener al menos ${business.minimumAdvanceTime} minutos de anticipación.`,
      );
    }

    const maximumStartAt = new Date(
      now.getTime() + business.maximumAdvanceDays * 24 * 60 * 60 * 1000,
    );

    if (startAt > maximumStartAt) {
      throw new BadRequestException(
        `La reserva no puede superar los ${business.maximumAdvanceDays} días de anticipación.`,
      );
    }

    const endAt = new Date(
      startAt.getTime() + appointment.totalDurationMinutes * 60_000,
    );

    await this.validateSchedule(
      appointment.barberId,
      startAt,
      endAt,
      business.timezone,
      business.appointmentInterval,
    );

    return this.runSerializableTransaction(async (transaction) => {
      await this.validateOverlap(
        businessId,
        appointment.barberId,
        startAt,
        endAt,
        appointment.id,
        transaction,
      );

      /*
       * La condición de estado evita que una reprogramación
       * guest sobrescriba una cancelación/cambio de estado
       * simultáneo realizado por otro actor.
       */
      await this.updateAppointmentOptimistically(
        transaction,
        {
          id: appointment.id,
          businessId,
          status: appointment.status,
          managementTokenHash: {
            not: null,
          },
          deletedAt: null,
        },
        {
          startAt,
          endAt,
        },
      );

      await transaction.appointmentHistory.create({
        data: {
          appointmentId: appointment.id,
          actorId: null,
          previousStatus: appointment.status,
          newStatus: appointment.status,
          comment: 'Reserva reprogramada por invitado',
        },
      });

      return transaction.appointment.findUniqueOrThrow({
        where: {
          id: appointment.id,
        },
        include: this.appointmentInclude(),
      });
    });
  }

  async cancelForGuest(businessId: number, id: number, reason: string) {
    /*
     * Esta operación solo se invoca después de que
     * PublicBookingService valida confirmationCode +
     * X-Booking-Token.
     *
     * Aun así, volvemos a limitar la consulta por tenant
     * y exigimos que la reserva tenga managementTokenHash.
     */
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        businessId,
        managementTokenHash: {
          not: null,
        },
        deletedAt: null,
      },

      select: {
        id: true,
        status: true,
        startAt: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Reserva no encontrada.');
    }

    if (
      appointment.status !== AppointmentStatus.PENDING &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new BadRequestException('Esta reserva ya no puede ser cancelada.');
    }

    const business = await this.validateBusiness(businessId);

    const now = new Date();

    const cancellationDeadline = new Date(
      appointment.startAt.getTime() -
        business.cancellationMinimumMinutes * 60_000,
    );

    if (now > cancellationDeadline) {
      throw new BadRequestException(
        `La reserva solo puede cancelarse con al menos ${business.cancellationMinimumMinutes} minutos de anticipación.`,
      );
    }

    const cancellationReason = reason.trim();

    if (!cancellationReason) {
      throw new BadRequestException('Debes indicar el motivo de cancelación.');
    }

    return this.prisma.$transaction(async (transaction) => {
      /*
       * La condición de estado evita que una cancelación
       * guest sobrescriba una operación simultánea de
       * ADMIN, RECEPTIONIST o BARBER.
       */
      await this.updateAppointmentOptimistically(
        transaction,
        {
          id: appointment.id,
          businessId,
          status: appointment.status,
          managementTokenHash: {
            not: null,
          },
          deletedAt: null,
        },
        {
          status: AppointmentStatus.CANCELLED,
          cancellationReason,
          cancelledAt: now,

          /*
           * No existe un User autenticado detrás de esta
           * operación pública.
           */
          cancelledById: null,
        },
      );

      await transaction.appointmentHistory.create({
        data: {
          appointmentId: appointment.id,
          actorId: null,
          previousStatus: appointment.status,
          newStatus: AppointmentStatus.CANCELLED,
          comment: cancellationReason,
        },
      });

      return transaction.appointment.findUniqueOrThrow({
        where: {
          id: appointment.id,
        },
        include: this.appointmentInclude(),
      });
    });
  }

  async createForGuest(
    businessId: number,
    guest: GuestCustomerInput,
    dto: GuestAppointmentInput,
  ) {
    const normalizedGuest = {
      firstName: guest.firstName.trim(),
      lastName: guest.lastName.trim(),
      phone: guest.phone.trim(),
      email: guest.email?.trim().toLowerCase(),
    };

    if (
      !normalizedGuest.firstName ||
      !normalizedGuest.lastName ||
      !normalizedGuest.phone
    ) {
      throw new BadRequestException(
        'Los datos del cliente invitado no son válidos.',
      );
    }

    const createAppointmentDto: CreateAppointmentDto = {
      barberId: dto.barberId,
      serviceIds: dto.serviceIds,
      startAt: dto.startAt,

      ...(dto.customerNotes !== undefined && {
        customerNotes: dto.customerNotes.trim(),
      }),
    };

    /*
     * Token secreto de gestión para reservas guest.
     *
     * - 32 bytes aleatorios = 256 bits de entropía.
     * - El token real se devuelve una sola vez al cliente.
     * - PostgreSQL guarda únicamente SHA-256(token).
     */
    const managementToken = randomBytes(32).toString('base64url');

    const managementTokenHash = this.hashManagementToken(managementToken);

    try {
      /*
       * Cliente invitado + reserva forman una sola unidad atómica.
       *
       * Si cualquier validación o escritura posterior falla,
       * PostgreSQL revierte también la creación del User guest.
       */
      const appointment = await this.runSerializableTransaction(
        async (transaction) => {
          await this.validateBusiness(businessId, transaction);

          const customer = await this.resolveGuestCustomerForBooking(
            transaction,
            businessId,
            normalizedGuest,
          );

          return this.createAppointmentForCustomerInTransaction({
            transaction,
            businessId,
            customerId: customer.id,

            /*
             * No existe un usuario autenticado que haya ejecutado
             * esta acción. AppointmentHistory.actorId es nullable,
             * por lo que registramos correctamente actorId = null.
             */
            historyActorId: null,
            historyComment: 'Reserva creada como invitado',
            canApplyDiscount: false,
            createAppointmentDto,
            managementTokenHash,
          });
        },
      );

      return {
        ...appointment,
        managementToken,
      };
    } catch (error) {
      /*
       * Dos solicitudes concurrentes podrían intentar crear
       * el mismo guest. La constraint UNIQUE sigue siendo
       * la autoridad final. No exponemos detalles de Prisma.
       */
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'No es posible realizar una reserva con estos datos.',
        );
      }

      throw error;
    }
  }

  private async resolveGuestCustomerForBooking(
    transaction: Prisma.TransactionClient,
    businessId: number,
    guest: {
      firstName: string;
      lastName: string;
      phone: string;
      email?: string;
    },
  ) {
    /*
     * Buscamos por teléfono sin filtrar inicialmente por rol.
     * Así un teléfono de ADMIN/BARBER nunca puede reutilizarse
     * silenciosamente como identidad de cliente guest.
     */
    const existingByPhone = await transaction.user.findFirst({
      where: {
        businessId,
        phone: guest.phone,
        deletedAt: null,
      },

      select: {
        id: true,
        role: true,
        email: true,
        isRegistered: true,
        isActive: true,
      },
    });

    if (existingByPhone) {
      if (existingByPhone.role !== UserRole.CLIENT) {
        throw new ConflictException(
          'No es posible realizar una reserva con estos datos.',
        );
      }

      if (!existingByPhone.isActive) {
        throw new ConflictException(
          'No es posible realizar una reserva con estos datos.',
        );
      }

      /*
       * Una identidad registrada debe utilizar autenticación
       * o, en el futuro, un mecanismo OTP. Una petición pública
       * anónima no puede crear reservas sobre esa cuenta.
       */
      if (existingByPhone.isRegistered) {
        throw new ConflictException(
          'No es posible realizar una reserva con estos datos.',
        );
      }

      if (
        guest.email &&
        existingByPhone.email &&
        existingByPhone.email.toLowerCase() !== guest.email
      ) {
        throw new ConflictException(
          'No es posible realizar una reserva con estos datos.',
        );
      }

      return {
        id: existingByPhone.id,
      };
    }

    /*
     * Si no existe el teléfono, impedimos que el email
     * reutilice otra identidad del mismo tenant.
     */
    if (guest.email) {
      const existingByEmail = await transaction.user.findFirst({
        where: {
          businessId,
          email: guest.email,
          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

      if (existingByEmail) {
        throw new ConflictException(
          'No es posible realizar una reserva con estos datos.',
        );
      }
    }

    /*
     * La creación ocurre dentro de la misma transacción
     * Serializable que la reserva.
     */
    return transaction.user.create({
      data: {
        businessId,
        firstName: guest.firstName,
        lastName: guest.lastName,
        phone: guest.phone,
        email: guest.email ?? null,
        role: UserRole.CLIENT,
        isRegistered: false,
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
      },

      select: {
        id: true,
      },
    });
  }
}

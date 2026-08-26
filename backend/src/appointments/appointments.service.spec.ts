import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AppointmentStatus, UserRole } from '@prisma/client';

import { AppointmentsService } from './appointments.service';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import type { PrismaService } from '../prisma/prisma.service';

describe('AppointmentsService client access', () => {
  let capturedQuery: unknown;
  const findMany = jest.fn((query: unknown) => {
    capturedQuery = query;
    return Promise.resolve([]);
  });

  const service = new AppointmentsService({
    appointment: {
      findMany,
    },
  } as unknown as PrismaService);

  const client: AuthUser = {
    id: 21,
    businessId: 8,
    businessSlug: 'barber-booking',
    role: UserRole.CLIENT,
    firstName: 'Ana',
    lastName: 'Pérez',
    phone: '+56912345678',
    email: 'ana@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedQuery = undefined;
  });

  it('scopes my appointments to the authenticated client and tenant', async () => {
    await service.findMyAppointments(client);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: client.businessId,
          customerId: client.id,
          deletedAt: null,
        },
      }),
    );
  });

  it('does not expose internal notes, customer records or history', async () => {
    await service.findMyAppointments(client);

    const query = capturedQuery as {
      select: Record<string, unknown>;
    };

    expect(query.select.internalNotes).toBeUndefined();
    expect(query.select.customer).toBeUndefined();
    expect(query.select.history).toBeUndefined();
  });

  it('rejects non-client roles from the client endpoint', async () => {
    await expect(
      service.findMyAppointments({
        ...client,
        role: UserRole.ADMIN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('AppointmentsService authenticated client creation', () => {
  const findFirstOrThrow = jest.fn();
  const prisma = {
    appointment: {
      findFirstOrThrow,
    },
  };
  const service = new AppointmentsService(prisma as unknown as PrismaService);
  const createAppointmentForCustomer = jest.fn();
  const client: AuthUser = {
    id: 21,
    businessId: 8,
    businessSlug: 'barber-booking',
    role: UserRole.CLIENT,
    firstName: 'Ana',
    lastName: 'Pérez',
    phone: '+56912345678',
    email: 'ana@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (
      service as unknown as Record<string, unknown>
    ).createAppointmentForCustomer = createAppointmentForCustomer;
    createAppointmentForCustomer.mockResolvedValue({ id: 88 });
    findFirstOrThrow.mockResolvedValue({
      id: 88,
      customerId: client.id,
      status: AppointmentStatus.PENDING,
    });
  });

  it('asocia la reserva al usuario autenticado y devuelve la vista segura', async () => {
    const result = await service.create(client, {
      customerId: 999,
      barberId: 6,
      serviceIds: [2],
      startAt: '2026-08-28T14:00:00.000Z',
    });

    expect(createAppointmentForCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: client.businessId,
        customerId: client.id,
        historyActorId: client.id,
        canApplyDiscount: false,
      }),
    );
    expect(findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 88,
          businessId: client.businessId,
          customerId: client.id,
          deletedAt: null,
        },
        select: expect.not.objectContaining({
          internalNotes: expect.anything(),
          customer: expect.anything(),
          history: expect.anything(),
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ id: 88, customerId: client.id }),
    );
  });
});

describe('AppointmentsService barber daily agenda', () => {
  let capturedQuery: unknown;

  const prisma = {
    business: {
      findFirst: jest.fn(),
    },
    barber: {
      findFirst: jest.fn(),
    },
    appointment: {
      findMany: jest.fn((query: unknown) => {
        capturedQuery = query;
        return Promise.resolve([]);
      }),
    },
  };

  const service = new AppointmentsService(prisma as unknown as PrismaService);

  const barber: AuthUser = {
    id: 31,
    businessId: 8,
    businessSlug: 'barber-booking',
    role: UserRole.BARBER,
    firstName: 'Pedro',
    lastName: 'Barbero',
    phone: '+56987654321',
    email: 'pedro@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedQuery = undefined;

    prisma.business.findFirst.mockResolvedValue({
      timezone: 'America/Santiago',
      barberStartEarlyMinutes: 15,
      noShowGraceMinutes: 15,
    });

    prisma.barber.findFirst.mockResolvedValue({
      id: 5,
      displayName: 'Pedro Barbero',
      specialty: 'Degradados',
      photoUrl: null,
      calendarColor: '#18181b',
    });
  });

  it('limita la agenda al barbero, tenant y fecha solicitada', async () => {
    const result = await service.findMyBarberAppointments(barber, {
      date: '2026-08-25',
    });

    const query = capturedQuery as {
      where: {
        businessId: number;
        barberId: number;
        startAt: {
          gte: Date;
          lt: Date;
        };
      };
    };

    expect(query.where.businessId).toBe(barber.businessId);
    expect(query.where.barberId).toBe(5);
    expect(query.where.startAt.gte).toBeInstanceOf(Date);
    expect(query.where.startAt.lt).toBeInstanceOf(Date);
    expect(
      query.where.startAt.lt.getTime() - query.where.startAt.gte.getTime(),
    ).toBe(24 * 60 * 60 * 1000);
    expect(result.date).toBe('2026-08-25');
    expect(result.timezone).toBe('America/Santiago');
  });

  it('no expone datos internos en la agenda del barbero', async () => {
    await service.findMyBarberAppointments(barber, {
      date: '2026-08-25',
    });

    const query = capturedQuery as {
      select: Record<string, unknown>;
    };

    expect(query.select.internalNotes).toBeUndefined();
    expect(query.select.business).toBeUndefined();
    expect(query.select.barber).toBeUndefined();
    expect(query.select.history).toBeUndefined();
    expect(query.select.totalPrice).toBeUndefined();
    expect(query.select.customer).toBeDefined();
  });

  it('rechaza una fecha inexistente', async () => {
    await expect(
      service.findMyBarberAppointments(barber, {
        date: '2026-02-30',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it('rechaza roles distintos de BARBER', async () => {
    await expect(
      service.findMyBarberAppointments({
        ...barber,
        role: UserRole.ADMIN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.business.findFirst).not.toHaveBeenCalled();
  });
});

describe('AppointmentsService booking management policies', () => {
  const prisma = {
    business: {
      findFirst: jest.fn(),
    },
  };
  const service = new AppointmentsService(prisma as unknown as PrismaService);
  const client: AuthUser = {
    id: 21,
    businessId: 8,
    businessSlug: 'barber-booking',
    role: UserRole.CLIENT,
    firstName: 'Ana',
    lastName: 'Pérez',
    phone: '+56912345678',
    email: 'ana@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(service, 'findOneAuthorized').mockResolvedValue({
      id: 44,
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    } as never);
  });

  it('bloquea la reprogramación cuando el administrador la desactiva', async () => {
    prisma.business.findFirst.mockResolvedValue({
      allowClientRescheduling: false,
      isActive: true,
    });

    await expect(
      service.rescheduleClient(
        44,
        { startAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() },
        client,
      ),
    ).rejects.toThrow('La barbería no permite reprogramar reservas en línea.');
  });

  it('bloquea la cancelación cuando el administrador la desactiva', async () => {
    prisma.business.findFirst.mockResolvedValue({
      allowClientCancellation: false,
      isActive: true,
    });

    await expect(
      service.cancelClient(44, 'Cambio de planes', client),
    ).rejects.toThrow('La barbería no permite cancelar reservas en línea.');
  });
});

describe('AppointmentsService status transitions', () => {
  const service = new AppointmentsService({} as PrismaService);
  const validateStatusTransition = (
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
  ) =>
    (
      service as unknown as {
        validateStatusTransition: (
          current: AppointmentStatus,
          next: AppointmentStatus,
        ) => void;
      }
    ).validateStatusTransition(currentStatus, newStatus);

  it('permite marcar No asistió directamente desde Pendiente', () => {
    expect(() =>
      validateStatusTransition(
        AppointmentStatus.PENDING,
        AppointmentStatus.NO_SHOW,
      ),
    ).not.toThrow();
  });

  it('continúa rechazando saltos inválidos desde Pendiente', () => {
    expect(() =>
      validateStatusTransition(
        AppointmentStatus.PENDING,
        AppointmentStatus.IN_PROGRESS,
      ),
    ).toThrow('No se puede cambiar una reserva de PENDING a IN_PROGRESS');
  });
});

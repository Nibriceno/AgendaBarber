import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
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

describe('AppointmentsService paginated administrative agenda', () => {
  const prisma = {
    business: {
      findFirst: jest.fn(),
    },
    appointment: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    barber: {
      findMany: jest.fn(),
    },
  };
  const service = new AppointmentsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.business.findFirst.mockResolvedValue({
      timezone: 'America/Santiago',
      currency: 'CLP',
    });
    prisma.appointment.count.mockResolvedValue(45);
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.barber.findMany.mockResolvedValue([]);
  });

  it('pagina por servidor y limita todas las consultas al tenant autenticado', async () => {
    const result = await service.findAdminPage(8, {
      date: '2026-08-26',
      page: 2,
      pageSize: 20,
      status: AppointmentStatus.CONFIRMED,
      barberId: 7,
    });

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: 8,
          status: AppointmentStatus.CONFIRMED,
          barberId: 7,
        }),
        skip: 20,
        take: 20,
      }),
    );
    expect(prisma.appointment.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ businessId: 8 }),
    });
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it('aplica la búsqueda sobre campos permitidos sin perder el tenant', async () => {
    await service.findAdminPage(8, {
      date: '2026-08-26',
      search: 'ana@example.com',
    });

    const query = prisma.appointment.findMany.mock.calls[0][0];

    expect(query.where.businessId).toBe(8);
    expect(query.where.OR).toHaveLength(5);
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

describe('AppointmentsService manual customer resolution', () => {
  const service = new AppointmentsService({} as PrismaService);
  const resolveManualCustomer = (
    transaction: unknown,
    customer: {
      firstName: string;
      lastName: string;
      phone: string;
      email?: string;
    },
  ) =>
    (
      service as unknown as {
        resolveManualCustomerForBooking: (
          transaction: unknown,
          businessId: number,
          customer: {
            firstName: string;
            lastName: string;
            phone: string;
            email?: string;
          },
        ) => Promise<unknown>;
      }
    ).resolveManualCustomerForBooking(transaction, 8, customer);

  it('reutiliza la cuenta CLIENT registrada cuando coincide el teléfono', async () => {
    const transaction = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 21,
          role: UserRole.CLIENT,
          firstName: 'Ana',
          lastName: 'Pérez',
          email: 'ana@example.com',
          isRegistered: true,
          isActive: true,
        }),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    await expect(
      resolveManualCustomer(transaction, {
        firstName: 'Ana',
        lastName: 'Pérez',
        phone: '+56912345678',
        email: 'ana@example.com',
      }),
    ).resolves.toEqual({
      id: 21,
      firstName: 'Ana',
      email: 'ana@example.com',
      isRegistered: true,
    });
    expect(transaction.user.update).not.toHaveBeenCalled();
    expect(transaction.user.create).not.toHaveBeenCalled();
  });

  it('actualiza el contacto invitado existente sin crear un duplicado', async () => {
    const transaction = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 31,
            role: UserRole.CLIENT,
            firstName: 'Cliente',
            lastName: 'Invitado',
            email: null,
            isRegistered: false,
            isActive: true,
          })
          .mockResolvedValueOnce(null),
        update: jest.fn().mockResolvedValue({
          id: 31,
          firstName: 'Carla',
          email: 'carla@example.com',
          isRegistered: false,
        }),
        create: jest.fn(),
      },
    };

    await resolveManualCustomer(transaction, {
      firstName: 'Carla',
      lastName: 'Soto',
      phone: '+56987654321',
      email: 'carla@example.com',
    });

    expect(transaction.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 31 },
        data: expect.objectContaining({
          firstName: 'Carla',
          lastName: 'Soto',
          email: 'carla@example.com',
        }),
      }),
    );
    expect(transaction.user.create).not.toHaveBeenCalled();
  });

  it('rechaza un correo que no coincide con la cuenta del teléfono', async () => {
    const transaction = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 21,
          role: UserRole.CLIENT,
          firstName: 'Ana',
          lastName: 'Pérez',
          email: 'ana@example.com',
          isRegistered: true,
          isActive: true,
        }),
      },
    };

    await expect(
      resolveManualCustomer(transaction, {
        firstName: 'Otra',
        lastName: 'Persona',
        phone: '+56912345678',
        email: 'otra@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

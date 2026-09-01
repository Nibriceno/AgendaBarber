import { AppointmentStatus, BusinessStatus } from '@prisma/client';

import { AppointmentLifecycleService } from './appointment-lifecycle.service';
import type { EmailService } from '../email/email.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('AppointmentLifecycleService', () => {
  const appointmentFindMany = jest.fn();
  const appointmentUpdateMany = jest.fn();
  const historyCreate = jest.fn();
  const sendBookingUpdate = jest.fn();
  const transaction = {
    appointment: {
      updateMany: appointmentUpdateMany,
    },
    appointmentHistory: {
      create: historyCreate,
    },
  };
  const prisma = {
    appointment: {
      findMany: appointmentFindMany,
    },
    $transaction: jest.fn(
      (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  };
  const emailService = {
    sendBookingUpdate,
  };
  const service = new AppointmentLifecycleService(
    prisma as unknown as PrismaService,
    emailService as unknown as EmailService,
  );
  const now = new Date('2026-08-26T15:30:00.000Z');

  function candidate(startAt: Date, graceMinutes = 15) {
    return {
      id: 44,
      businessId: 8,
      startAt,
      business: {
        name: 'AgendaBarber',
        timezone: 'America/Santiago',
        noShowGraceMinutes: graceMinutes,
      },
      customer: {
        firstName: 'Ana',
        email: 'ana@example.com',
      },
      barber: {
        displayName: 'Pedro Barbero',
      },
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    appointmentUpdateMany.mockResolvedValue({ count: 1 });
    historyCreate.mockResolvedValue({ id: 1 });
    sendBookingUpdate.mockResolvedValue(undefined);
  });

  it('cierra una reserva pendiente cuando venció el período de gracia', async () => {
    appointmentFindMany.mockResolvedValue([
      candidate(new Date('2026-08-26T15:00:00.000Z')),
    ]);

    await expect(service.processExpiredPendingAppointments(now)).resolves.toBe(
      1,
    );

    expect(appointmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          business: {
            status: BusinessStatus.ACTIVE,
            deletedAt: null,
          },
        }),
      }),
    );

    expect(appointmentUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 44,
        businessId: 8,
        status: AppointmentStatus.PENDING,
        deletedAt: null,
      },
      data: {
        status: AppointmentStatus.NO_SHOW,
        noShowAt: now,
      },
    });
    expect(historyCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        appointmentId: 44,
        actorId: null,
        previousStatus: AppointmentStatus.PENDING,
        newStatus: AppointmentStatus.NO_SHOW,
      }),
    });
    expect(sendBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        action: 'no_show',
      }),
    );
  });

  it('mantiene pendiente una reserva que todavía está dentro de la gracia', async () => {
    appointmentFindMany.mockResolvedValue([
      candidate(new Date('2026-08-26T15:20:00.000Z')),
    ]);

    await expect(service.processExpiredPendingAppointments(now)).resolves.toBe(
      0,
    );

    expect(appointmentUpdateMany).not.toHaveBeenCalled();
    expect(historyCreate).not.toHaveBeenCalled();
    expect(sendBookingUpdate).not.toHaveBeenCalled();
  });

  it('no duplica historial ni correos si otra instancia procesó la reserva', async () => {
    appointmentFindMany.mockResolvedValue([
      candidate(new Date('2026-08-26T15:00:00.000Z')),
    ]);
    appointmentUpdateMany.mockResolvedValue({ count: 0 });

    await expect(service.processExpiredPendingAppointments(now)).resolves.toBe(
      0,
    );

    expect(historyCreate).not.toHaveBeenCalled();
    expect(sendBookingUpdate).not.toHaveBeenCalled();
  });
});

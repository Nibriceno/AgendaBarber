import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';

import { PublicBookingService } from './public-booking.service';

describe('PublicBookingService guest management access', () => {
  const token = 'guest-management-token';
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const prisma = {
    business: {
      findFirst: jest.fn(),
    },
    appointment: {
      findFirst: jest.fn(),
    },
  };
  const appointmentsService = {
    rescheduleForGuest: jest.fn(),
    cancelForGuest: jest.fn(),
  };
  const emailService = {
    sendBookingUpdate: jest.fn(),
    sendGuestBookingConfirmation: jest.fn(),
  };
  const service = new PublicBookingService(
    prisma as never,
    { check: jest.fn() } as never,
    appointmentsService as never,
    {
      getOrThrow: jest.fn(() => 'http://localhost:3001'),
    } as never,
    emailService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.business.findFirst.mockResolvedValue({
      id: 8,
      slug: 'barber-booking',
      name: 'AgendaBarber',
      phone: null,
      email: null,
      address: null,
      logoUrl: null,
      instagramUrl: 'https://instagram.com/agenda-barber',
      twitterUrl: null,
      facebookUrl: null,
      whatsappUrl: 'https://wa.me/56912345678',
      timezone: 'America/Santiago',
      currency: 'CLP',
      appointmentInterval: 15,
      minimumAdvanceTime: 60,
      maximumAdvanceDays: 60,
      cancellationMinimumMinutes: 120,
      rescheduleMinimumMinutes: 120,
      allowClientCancellation: true,
      allowClientRescheduling: true,
      cancellationPolicy: null,
    });
  });

  it('expone únicamente los enlaces sociales configurados como parte del negocio público', async () => {
    const result = await service.findBusiness('barber-booking');

    expect(result.socialLinks).toEqual({
      instagram: 'https://instagram.com/agenda-barber',
      twitter: null,
      facebook: null,
      whatsapp: 'https://wa.me/56912345678',
    });
  });

  it('exige el token secreto además del código visible', async () => {
    await expect(
      service.findGuestAppointment('barber-booking', 'ABCDEF1234'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.appointment.findFirst).not.toHaveBeenCalled();
  });

  it('consultar una reserva no dispara correos de cambio', async () => {
    prisma.appointment.findFirst
      .mockResolvedValueOnce({ id: 44, managementTokenHash: tokenHash })
      .mockResolvedValueOnce({
        id: 44,
        status: 'CONFIRMED',
        startAt: new Date('2026-08-27T14:00:00.000Z'),
        endAt: new Date('2026-08-27T14:30:00.000Z'),
        totalDurationMinutes: 30,
        totalPrice: 15_000,
        customerNotes: null,
        confirmationCode: 'ABCDEF1234',
        business: {
          name: 'AgendaBarber',
          timezone: 'America/Santiago',
          currency: 'CLP',
          allowClientCancellation: true,
          allowClientRescheduling: true,
          cancellationMinimumMinutes: 120,
          rescheduleMinimumMinutes: 120,
          cancellationPolicy: null,
        },
        barber: { id: 6, displayName: 'Nicolás', photoUrl: null },
        services: [
          {
            serviceId: 2,
            serviceName: 'Corte',
            durationMinutes: 30,
            finalPrice: 15_000,
          },
        ],
      });

    const result = await service.findGuestAppointment(
      'barber-booking',
      'ABCDEF1234',
      token,
    );

    expect(result.confirmationCode).toBe('ABCDEF1234');
    expect(result.business.bookingPolicy.allowCancellation).toBe(true);
    expect(emailService.sendBookingUpdate).not.toHaveBeenCalled();
  });
});

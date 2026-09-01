import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BusinessStatus, UserRole } from '@prisma/client';

import { PlatformBusinessesService } from './platform-businesses.service';

describe('PlatformBusinessesService', () => {
  const transaction = {
    business: {
      create: jest.fn(),
    },
    user: {
      create: jest.fn(),
      update: jest.fn(),
    },
    businessInvitation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    authSession: {
      updateMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(
      (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
    business: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: { count: jest.fn() },
    barber: { count: jest.fn() },
    service: { count: jest.fn() },
    appointment: { count: jest.fn() },
    businessInvitation: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const configService = {
    getOrThrow: jest.fn(() => 'http://localhost:3001'),
  };
  const emailService = {
    sendBusinessAdminInvitation: jest.fn(),
  };
  const businessStatusService = {
    changeStatus: jest.fn(),
  };
  let service: PlatformBusinessesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformBusinessesService(
      prisma as never,
      configService as never,
      emailService as never,
      businessStatusService as never,
    );
  });

  it('creates the tenant and a forced ADMIN atomically, then sends the invite', async () => {
    const business = {
      id: 8,
      name: 'Barber Pro',
      slug: 'barber-pro',
      status: BusinessStatus.ACTIVE,
    };
    const user = {
      id: 12,
      firstName: 'Ana',
      lastName: 'Díaz',
      phone: '+56911112222',
      email: 'ana@example.com',
      role: UserRole.ADMIN,
    };
    transaction.business.create.mockResolvedValue(business);
    transaction.user.create.mockResolvedValue(user);
    transaction.businessInvitation.create.mockResolvedValue({ id: 30 });
    prisma.businessInvitation.update.mockResolvedValue({ id: 30 });
    emailService.sendBusinessAdminInvitation.mockResolvedValue(undefined);

    const result = await service.create(
      {
        business: { name: ' Barber Pro ', slug: 'BARBER-PRO' },
        admin: {
          firstName: 'Ana',
          lastName: 'Díaz',
          phone: '+56911112222',
          email: 'ana@example.com',
        },
      },
      3,
    );

    expect(transaction.business.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Barber Pro',
        slug: 'barber-pro',
        status: BusinessStatus.ACTIVE,
      }),
    });
    expect(transaction.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: 8,
        role: UserRole.ADMIN,
        passwordHash: null,
        isRegistered: false,
        emailVerified: false,
      }),
    });
    expect(transaction.businessInvitation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        invitedByPlatformUserId: 3,
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: expect.any(Date),
      }),
    });
    expect(emailService.sendBusinessAdminInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        invitationUrl: expect.stringContaining(
          '/barber-pro/aceptar-invitacion?token=',
        ),
      }),
    );
    expect(result.invitationEmailSent).toBe(true);
  });

  it('accepts a valid invite only once and activates the administrator', async () => {
    transaction.businessInvitation.findFirst.mockResolvedValue({
      id: 30,
      userId: 12,
      business: { slug: 'barber-pro' },
      user: { id: 12 },
    });
    transaction.businessInvitation.updateMany.mockResolvedValue({ count: 1 });
    transaction.user.update.mockResolvedValue({ id: 12 });
    transaction.authSession.updateMany.mockResolvedValue({ count: 0 });

    const result = await service.acceptInvitation({
      token: 'private-token',
      password: 'Password1',
    });

    expect(transaction.businessInvitation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        }),
      }),
    );
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: expect.objectContaining({
        passwordHash: expect.not.stringContaining('Password1'),
        isRegistered: true,
        emailVerified: true,
        authVersion: { increment: 1 },
      }),
    });
    expect(result.businessSlug).toBe('barber-pro');
  });

  it('rejects an expired or reused invitation without changing the user', async () => {
    transaction.businessInvitation.findFirst.mockResolvedValue(null);

    await expect(
      service.acceptInvitation({ token: 'invalid', password: 'Password1' }),
    ).rejects.toThrow(BadRequestException);

    expect(transaction.user.update).not.toHaveBeenCalled();
  });

  it('does not resend when there is no pending invitation', async () => {
    prisma.businessInvitation.findFirst.mockResolvedValue(null);

    await expect(service.resendInvitation(8, 3)).rejects.toThrow(
      NotFoundException,
    );
    expect(emailService.sendBusinessAdminInvitation).not.toHaveBeenCalled();
  });
});

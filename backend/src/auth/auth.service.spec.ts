import { ForbiddenException } from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { UserRole } from '@prisma/client';

import { AuthService } from './auth.service';

type CreateUserInput = {
  data: {
    firstName: string;
    email: string;
    role: UserRole;
    emailVerified: boolean;
    emailVerificationTokenHash: string;
  };
};

type CreatedUser = {
  id: number;
  firstName: string;
  email: string;
};

type UpdateUserInput = {
  data: {
    emailVerified?: boolean;
    emailVerificationTokenHash?: string | null;
  };
};

type VerificationEmailInput = {
  to: string;
  firstName: string;
  businessName: string;
  verificationUrl: string;
};

describe('AuthService', () => {
  const prisma = {
    business: {
      findFirst: jest.fn(),
    },

    user: {
      findFirst: jest.fn(),
      create: jest.fn<(input: CreateUserInput) => Promise<CreatedUser>>(),
      updateMany: jest.fn<
        (input: UpdateUserInput) => Promise<{
          count: number;
        }>
      >(),
    },
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  const emailService = {
    sendEmailVerification:
      jest.fn<(input: VerificationEmailInput) => Promise<void>>(),
  };

  const configService = {
    getOrThrow: jest.fn(() => 'http://localhost:3001'),
  };

  let service: AuthService;
  let createInput: CreateUserInput | undefined;
  let verificationEmailInput: VerificationEmailInput | undefined;
  let updateInput: UpdateUserInput | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    createInput = undefined;
    verificationEmailInput = undefined;
    updateInput = undefined;

    service = new AuthService(
      prisma as never,
      jwtService as never,
      emailService as never,
      configService as never,
    );
  });

  it('crea un cliente pendiente y no guarda el token en texto plano', async () => {
    prisma.business.findFirst.mockResolvedValue({
      id: 7,
      name: 'Barber Booking',
      slug: 'barber-booking',
    });

    prisma.user.findFirst.mockResolvedValue(null);

    prisma.user.create.mockImplementation((input: CreateUserInput) => {
      createInput = input;

      return Promise.resolve({
        id: 21,
        firstName: input.data.firstName,
        email: input.data.email,
      });
    });

    emailService.sendEmailVerification.mockImplementation(
      (input: VerificationEmailInput) => {
        verificationEmailInput = input;

        return Promise.resolve();
      },
    );

    const result = await service.register({
      businessSlug: 'barber-booking',
      firstName: 'Ana',
      lastName: 'Pérez',
      phone: '+56912345678',
      email: 'ana@example.com',
      password: 'ClaveSegura1!',
    });

    if (!createInput || !verificationEmailInput) {
      throw new Error('No se capturaron los datos de verificación.');
    }

    const token = new URL(
      verificationEmailInput.verificationUrl,
    ).searchParams.get('token');

    expect(result.emailSent).toBe(true);
    expect(createInput.data.role).toBe(UserRole.CLIENT);
    expect(createInput.data.emailVerified).toBe(false);
    expect(createInput.data.emailVerificationTokenHash).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createInput.data.emailVerificationTokenHash).not.toBe(token);
  });

  it('confirma un token vigente una sola vez', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 21,
      emailVerificationExpiresAt: new Date(Date.now() + 60_000),
    });

    prisma.user.updateMany.mockImplementation((input: UpdateUserInput) => {
      updateInput = input;

      return Promise.resolve({
        count: 1,
      });
    });

    const result = await service.verifyEmail({
      businessSlug: 'barber-booking',
      token: 'a'.repeat(43),
    });

    expect(result.message).toContain('confirmado');

    if (!updateInput) {
      throw new Error('No se capturó la actualización.');
    }

    expect(updateInput.data.emailVerified).toBe(true);
    expect(updateInput.data.emailVerificationTokenHash).toBeNull();
  });

  it('impide iniciar sesión a un cliente sin correo verificado', async () => {
    const passwordHash = await bcrypt.hash('ClaveSegura1!', 4);

    prisma.business.findFirst.mockResolvedValue({
      id: 7,
      slug: 'barber-booking',
    });

    prisma.user.findFirst.mockResolvedValue({
      id: 21,
      businessId: 7,
      firstName: 'Ana',
      lastName: 'Pérez',
      phone: '+56912345678',
      email: 'ana@example.com',
      role: UserRole.CLIENT,
      passwordHash,
      emailVerified: false,
    });

    await expect(
      service.login({
        businessSlug: 'barber-booking',
        email: 'ana@example.com',
        password: 'ClaveSegura1!',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});

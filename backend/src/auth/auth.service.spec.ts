import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { UserRole } from '@prisma/client';
import { createHash } from 'node:crypto';

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
  where?: Record<string, unknown>;
  data: {
    emailVerified?: boolean;
    emailVerificationTokenHash?: string | null;
    passwordHash?: string;
    passwordResetTokenHash?: string | null;
    passwordResetExpiresAt?: Date | null;
    passwordResetSentAt?: Date | null;
    authVersion?: {
      increment: number;
    };
  };
};

type VerificationEmailInput = {
  to: string;
  firstName: string;
  businessName: string;
  verificationUrl: string;
};

type PasswordResetEmailInput = {
  to: string;
  firstName: string;
  businessName: string;
  resetUrl: string;
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
    authSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  const emailService = {
    sendEmailVerification:
      jest.fn<(input: VerificationEmailInput) => Promise<void>>(),
    sendPasswordReset:
      jest.fn<(input: PasswordResetEmailInput) => Promise<void>>(),
  };

  const configService = {
    getOrThrow: jest.fn(() => 'http://localhost:3001'),
    get: jest.fn((key: string) =>
      key === 'REFRESH_TOKEN_EXPIRES_DAYS' ? 14 : undefined,
    ),
  };

  let service: AuthService;
  let createInput: CreateUserInput | undefined;
  let verificationEmailInput: VerificationEmailInput | undefined;
  let passwordResetEmailInput: PasswordResetEmailInput | undefined;
  let updateInput: UpdateUserInput | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    createInput = undefined;
    verificationEmailInput = undefined;
    passwordResetEmailInput = undefined;
    updateInput = undefined;
    jwtService.signAsync.mockResolvedValue('access-token');
    prisma.authSession.create.mockResolvedValue({ id: 'session-id' });
    prisma.authSession.updateMany.mockResolvedValue({ count: 1 });

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

  it('inicia sesión sin exponer el refresh token en la base de datos', async () => {
    const passwordHash = await bcrypt.hash('ClaveSegura1', 4);

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
      emailVerified: true,
      authVersion: 3,
    });

    const result = await service.login({
      businessSlug: 'barber-booking',
      email: 'ana@example.com',
      password: 'ClaveSegura1',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toMatch(
      /^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/i,
    );
    expect(prisma.authSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 21,
          authVersion: 3,
          refreshTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(Date),
        }),
      }),
    );
    const storedHash = prisma.authSession.create.mock.calls[0][0].data
      .refreshTokenHash;
    expect(storedHash).not.toBe(result.refreshToken);
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 21,
        businessId: 7,
        authVersion: 3,
        sessionId: expect.any(String),
      }),
    );
  });

  it('rota el refresh token y no reutiliza el secreto anterior', async () => {
    const sessionId = '6b43cb99-d1ab-4f10-b15f-bd31a3ac84a8';
    const refreshToken = `${sessionId}.${'a'.repeat(43)}`;
    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    prisma.authSession.findFirst.mockResolvedValue({
      id: sessionId,
      refreshTokenHash,
      authVersion: 3,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        id: 21,
        businessId: 7,
        firstName: 'Ana',
        lastName: 'Pérez',
        phone: '+56912345678',
        email: 'ana@example.com',
        role: UserRole.CLIENT,
        authVersion: 3,
        isActive: true,
        deletedAt: null,
        business: {
          slug: 'barber-booking',
          isActive: true,
          deletedAt: null,
        },
      },
    });

    const result = await service.refreshSession(refreshToken);

    expect(result.refreshToken).not.toBe(refreshToken);
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: sessionId,
          refreshTokenHash,
        }),
        data: {
          refreshTokenHash: expect.not.stringMatching(refreshTokenHash),
        },
      }),
    );
  });

  it('revoca la sesión cuando se reutiliza un refresh token reemplazado', async () => {
    const sessionId = '6b43cb99-d1ab-4f10-b15f-bd31a3ac84a8';
    const refreshToken = `${sessionId}.${'b'.repeat(43)}`;

    prisma.authSession.findFirst.mockResolvedValue({
      id: sessionId,
      refreshTokenHash: 'c'.repeat(64),
      authVersion: 3,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        authVersion: 3,
        isActive: true,
        deletedAt: null,
        business: { isActive: true, deletedAt: null },
      },
    });

    await expect(service.refreshSession(refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('revoca el refresh token actual al cerrar sesión', async () => {
    const sessionId = '6b43cb99-d1ab-4f10-b15f-bd31a3ac84a8';
    const refreshToken = `${sessionId}.${'d'.repeat(43)}`;
    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const result = await service.logout(refreshToken);

    expect(prisma.authSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: sessionId,
        refreshTokenHash,
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(result).toEqual({ message: 'Sesión cerrada correctamente.' });
  });

  it('responde igual cuando el correo de recuperación no existe', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const result = await service.forgotPassword({
      businessSlug: 'barber-booking',
      email: 'desconocido@example.com',
    });

    expect(result.message).toContain('Si existe una cuenta');
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('envía un token de recuperación y guarda solamente su hash', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 21,
      firstName: 'Ana',
      email: 'ana@example.com',
      passwordResetSentAt: null,
      business: {
        name: 'Barber Booking',
        slug: 'barber-booking',
      },
    });

    prisma.user.updateMany.mockImplementation((input: UpdateUserInput) => {
      updateInput = input;

      return Promise.resolve({
        count: 1,
      });
    });

    emailService.sendPasswordReset.mockImplementation(
      (input: PasswordResetEmailInput) => {
        passwordResetEmailInput = input;

        return Promise.resolve();
      },
    );

    await service.forgotPassword({
      businessSlug: 'barber-booking',
      email: 'ana@example.com',
    });

    if (!updateInput || !passwordResetEmailInput) {
      throw new Error('No se capturó la recuperación de contraseña.');
    }

    const token = new URL(passwordResetEmailInput.resetUrl).searchParams.get(
      'token',
    );

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(updateInput.data.passwordResetTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(updateInput.data.passwordResetTokenHash).not.toBe(token);
    expect(updateInput.data.passwordResetExpiresAt).toBeInstanceOf(Date);
  });

  it('consume el token, actualiza la clave y revoca las sesiones existentes', async () => {
    const currentPasswordHash = await bcrypt.hash('ClaveActual1', 4);

    prisma.user.findFirst.mockResolvedValue({
      id: 21,
      passwordHash: currentPasswordHash,
      passwordResetExpiresAt: new Date(Date.now() + 60_000),
    });

    prisma.user.updateMany.mockImplementation((input: UpdateUserInput) => {
      updateInput = input;

      return Promise.resolve({
        count: 1,
      });
    });

    const result = await service.resetPassword({
      businessSlug: 'barber-booking',
      token: 'b'.repeat(43),
      password: 'ClaveNueva2',
    });

    if (!updateInput?.data.passwordHash) {
      throw new Error('No se capturó la nueva contraseña.');
    }

    expect(result.message).toContain('actualizada');
    await expect(
      bcrypt.compare('ClaveNueva2', updateInput.data.passwordHash),
    ).resolves.toBe(true);
    expect(updateInput.data.passwordResetTokenHash).toBeNull();
    expect(updateInput.data.passwordResetExpiresAt).toBeNull();
    expect(updateInput.data.authVersion).toEqual({
      increment: 1,
    });
  });
});

import { UnauthorizedException } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';

import { PlatformAuthService } from './platform-auth.service';

describe('PlatformAuthService', () => {
  const prisma = {
    platformUser: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    platformAuthSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string) =>
      key === 'PLATFORM_REFRESH_TOKEN_EXPIRES_DAYS' ? 14 : undefined,
    ),
  };

  let service: PlatformAuthService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('ClaveSegura123', 4);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.platformUser.update.mockResolvedValue({ id: 1 });
    prisma.platformAuthSession.create.mockResolvedValue({ id: 'session-id' });
    prisma.platformAuthSession.updateMany.mockResolvedValue({ count: 1 });
    jwtService.signAsync.mockResolvedValue('platform-access-token');

    service = new PlatformAuthService(
      prisma as never,
      jwtService as never,
      configService as never,
    );
  });

  it('creates an isolated platform session with an explicit token type', async () => {
    prisma.platformUser.findFirst.mockResolvedValue({
      id: 1,
      firstName: 'Sofía',
      lastName: 'Admin',
      email: 'admin@platform.test',
      passwordHash,
      role: PlatformRole.SUPER_ADMIN,
      authVersion: 3,
    });

    const result = await service.login({
      email: ' ADMIN@PLATFORM.TEST ',
      password: 'ClaveSegura123',
    });

    expect(prisma.platformUser.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: 'admin@platform.test',
          isActive: true,
          deletedAt: null,
        },
      }),
    );
    expect(prisma.platformAuthSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          platformUserId: 1,
          authVersion: 3,
          refreshTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenType: 'platform',
        sub: 1,
        role: PlatformRole.SUPER_ADMIN,
        authVersion: 3,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'platform-access-token',
        user: expect.objectContaining({
          email: 'admin@platform.test',
          role: PlatformRole.SUPER_ADMIN,
        }),
      }),
    );
  });

  it('uses a generic error and creates no session for invalid credentials', async () => {
    prisma.platformUser.findFirst.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'unknown@platform.test',
        password: 'ClaveSegura123',
      }),
    ).rejects.toThrow(new UnauthorizedException('Credenciales incorrectas.'));

    expect(prisma.platformAuthSession.create).not.toHaveBeenCalled();
  });

  it('rotates a valid refresh token atomically', async () => {
    const sessionId = '6b43cb99-d1ab-4f10-b15f-bd31a3ac84a8';
    const refreshToken = `${sessionId}.${'a'.repeat(43)}`;
    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    prisma.platformAuthSession.findFirst.mockResolvedValue({
      id: sessionId,
      refreshTokenHash,
      authVersion: 3,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      platformUser: {
        id: 1,
        firstName: 'Sofía',
        lastName: 'Admin',
        email: 'admin@platform.test',
        role: PlatformRole.SUPER_ADMIN,
        authVersion: 3,
        isActive: true,
        deletedAt: null,
      },
    });

    const result = await service.refreshSession(refreshToken);

    expect(result.refreshToken).not.toBe(refreshToken);
    expect(prisma.platformAuthSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: sessionId,
        refreshTokenHash,
        revokedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
      data: {
        refreshTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    });
  });

  it('revokes the session when a refresh secret is reused or forged', async () => {
    const sessionId = '6b43cb99-d1ab-4f10-b15f-bd31a3ac84a8';
    const refreshToken = `${sessionId}.${'b'.repeat(43)}`;

    prisma.platformAuthSession.findFirst.mockResolvedValue({
      id: sessionId,
      refreshTokenHash: 'a'.repeat(64),
      authVersion: 3,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      platformUser: {
        id: 1,
        firstName: 'Sofía',
        lastName: 'Admin',
        email: 'admin@platform.test',
        role: PlatformRole.SUPER_ADMIN,
        authVersion: 3,
        isActive: true,
        deletedAt: null,
      },
    });

    await expect(service.refreshSession(refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(prisma.platformAuthSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });
});

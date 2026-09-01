import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { PlatformJwtStrategy } from './platform-jwt.strategy';

describe('PlatformJwtStrategy', () => {
  const prisma = {
    platformUser: {
      findFirst: jest.fn(),
    },
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'PLATFORM_JWT_SECRET' ? 'p'.repeat(32) : undefined,
    ),
  };

  let strategy: PlatformJwtStrategy;

  const payload = {
    tokenType: 'platform' as const,
    sub: 1,
    role: PlatformRole.SUPER_ADMIN,
    authVersion: 2,
    sessionId: 'platform-session',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new PlatformJwtStrategy(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );
  });

  it('loads only an active platform identity with an active session', async () => {
    prisma.platformUser.findFirst.mockResolvedValue({
      id: 1,
      role: PlatformRole.SUPER_ADMIN,
      firstName: 'Sofía',
      lastName: 'Admin',
      email: 'admin@platform.test',
      authVersion: 2,
    });

    await expect(strategy.validate(payload)).resolves.toEqual(
      expect.objectContaining({
        id: 1,
        role: PlatformRole.SUPER_ADMIN,
      }),
    );

    expect(prisma.platformUser.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 1,
          isActive: true,
          deletedAt: null,
        }),
      }),
    );
  });

  it('rejects tenant tokens before querying platform users', async () => {
    await expect(
      strategy.validate({
        ...payload,
        tokenType: 'tenant' as never,
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.platformUser.findFirst).not.toHaveBeenCalled();
  });
});

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessStatus, UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy business state', () => {
  const userFindFirst = jest.fn<
    (args: unknown) => Promise<unknown>
  >();

  const prisma = {
    user: {
      findFirst: userFindFirst,
    },
  };

  const config = {
    get: jest.fn().mockReturnValue('test-jwt-secret'),
  };

  let strategy: JwtStrategy;

  const payload = {
    tokenType: 'tenant' as const,
    sub: 15,
    businessId: 7,
    role: UserRole.ADMIN,
    authVersion: 2,
    sessionId: 'session-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );
  });

  it('requires the user, session and business to remain active', async () => {
    let receivedQuery: unknown;

    prisma.user.findFirst.mockImplementation((query) => {
      receivedQuery = query;

      return Promise.resolve({
        id: 15,
        businessId: 7,
        role: UserRole.ADMIN,
        firstName: 'Ana',
        lastName: 'Pérez',
        phone: '+56911111111',
        email: 'ana@example.com',
        authVersion: 2,
        business: {
          slug: 'agenda-barber',
        },
      });
    });

    await expect(strategy.validate(payload)).resolves.toEqual(
      expect.objectContaining({
        id: 15,
        businessId: 7,
        businessSlug: 'agenda-barber',
      }),
    );

    const query = receivedQuery as {
      where: Record<string, unknown>;
    };

    expect(query.where).toMatchObject({
      id: 15,
      businessId: 7,
      isActive: true,
      deletedAt: null,
      business: {
        status: BusinessStatus.ACTIVE,
        deletedAt: null,
      },
    });
  });

  it('rejects an access token when its business is no longer available', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects platform tokens before querying tenant users', async () => {
    await expect(
      strategy.validate({
        ...payload,
        tokenType: 'platform' as never,
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});

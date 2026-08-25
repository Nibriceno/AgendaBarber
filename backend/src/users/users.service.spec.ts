import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { UsersService } from './users.service';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import type { PrismaService } from '../prisma/prisma.service';

describe('UsersService client self-service', () => {
  const findFirst = jest.fn();
  let capturedUpdate: unknown;
  const update = jest.fn((input: unknown) => {
    capturedUpdate = input;
    return Promise.resolve({
      id: 21,
    });
  });

  const service = new UsersService({
    user: {
      findFirst,
      update,
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
    capturedUpdate = undefined;
  });

  it('rejects staff from client self-service', async () => {
    await expect(
      service.getMyProfile({
        ...client,
        role: UserRole.ADMIN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(findFirst).not.toHaveBeenCalled();
  });

  it('requires the current password before changing it', async () => {
    const passwordHash = await bcrypt.hash('ClaveActual1!', 4);

    findFirst.mockResolvedValue({
      id: client.id,
      passwordHash,
    });

    await expect(
      service.changeMyPassword(client, {
        currentPassword: 'ClaveIncorrecta1!',
        newPassword: 'ClaveNuevaSegura2!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(update).not.toHaveBeenCalled();
  });

  it('updates only the authenticated client password after verification', async () => {
    const passwordHash = await bcrypt.hash('ClaveActual1!', 4);

    findFirst.mockResolvedValue({
      id: client.id,
      passwordHash,
    });
    await service.changeMyPassword(client, {
      currentPassword: 'ClaveActual1!',
      newPassword: 'ClaveNuevaSegura2!',
    });

    const updateInput = capturedUpdate as {
      where: { id: number };
      data: { passwordHash: string };
    };

    expect(updateInput.where.id).toBe(client.id);
    expect(typeof updateInput.data.passwordHash).toBe('string');
  });
});

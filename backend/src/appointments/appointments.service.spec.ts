import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

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

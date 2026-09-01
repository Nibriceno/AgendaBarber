import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BusinessStatus } from '@prisma/client';

import { BusinessStatusService } from './business-status.service';

describe('BusinessStatusService', () => {
  const transaction = {
    business: {
      updateMany: jest.fn(),
      findFirstOrThrow: jest.fn(),
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
  };

  const service = new BusinessStatusService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.business.updateMany.mockResolvedValue({ count: 1 });
    transaction.business.findFirstOrThrow.mockResolvedValue({
      id: 7,
      status: BusinessStatus.ACTIVE,
    });
    transaction.authSession.updateMany.mockResolvedValue({ count: 3 });
  });

  it('suspends the business with metadata and revokes all tenant sessions', async () => {
    await service.changeStatus(
      7,
      BusinessStatus.SUSPENDED,
      '  Pago pendiente  ',
    );

    expect(transaction.business.updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        deletedAt: null,
      },
      data: {
        status: BusinessStatus.SUSPENDED,
        statusChangedAt: expect.any(Date),
        statusReason: 'Pago pendiente',
        suspendedAt: expect.any(Date),
        inactivatedAt: null,
      },
    });
    expect(transaction.authSession.updateMany).toHaveBeenCalledWith({
      where: {
        revokedAt: null,
        user: {
          businessId: 7,
        },
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });

  it('reactivates without restoring previously revoked sessions', async () => {
    await service.changeStatus(7, BusinessStatus.ACTIVE, 'Pago regularizado');

    expect(transaction.business.updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        deletedAt: null,
      },
      data: {
        status: BusinessStatus.ACTIVE,
        statusChangedAt: expect.any(Date),
        statusReason: 'Pago regularizado',
        suspendedAt: null,
        inactivatedAt: null,
      },
    });
    expect(transaction.authSession.updateMany).not.toHaveBeenCalled();
  });

  it('keeps soft deletion separate from ordinary inactivation', async () => {
    await expect(service.softDelete(7, 'Cierre definitivo')).resolves.toEqual({
      message: 'Negocio eliminado correctamente.',
    });

    expect(transaction.business.updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        deletedAt: null,
      },
      data: {
        status: BusinessStatus.INACTIVE,
        statusChangedAt: expect.any(Date),
        statusReason: 'Cierre definitivo',
        suspendedAt: null,
        inactivatedAt: expect.any(Date),
        deletedAt: expect.any(Date),
      },
    });
    expect(transaction.authSession.updateMany).toHaveBeenCalledTimes(1);
  });

  it('does not mutate sessions when the business does not exist', async () => {
    transaction.business.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.changeStatus(99, BusinessStatus.SUSPENDED),
    ).rejects.toThrow(NotFoundException);

    expect(transaction.authSession.updateMany).not.toHaveBeenCalled();
  });

  it('rejects status reasons that exceed the database limit', async () => {
    await expect(
      service.changeStatus(7, BusinessStatus.SUSPENDED, 'x'.repeat(1001)),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

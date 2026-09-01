import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async changeStatus(
    businessId: number,
    status: BusinessStatus,
    reason?: string,
  ) {
    const now = new Date();
    const normalizedReason = reason?.trim() || null;

    this.validateReason(normalizedReason);

    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.business.updateMany({
        where: {
          id: businessId,
          deletedAt: null,
        },
        data: this.statusData(status, normalizedReason, now),
      });

      if (result.count !== 1) {
        throw new NotFoundException('Negocio no encontrado.');
      }

      if (status !== BusinessStatus.ACTIVE) {
        await this.revokeBusinessSessions(transaction, businessId, now);
      }

      return transaction.business.findFirstOrThrow({
        where: {
          id: businessId,
          deletedAt: null,
        },
      });
    });
  }

  async softDelete(businessId: number, reason?: string) {
    const now = new Date();
    const normalizedReason = reason?.trim() || null;

    this.validateReason(normalizedReason);

    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.business.updateMany({
        where: {
          id: businessId,
          deletedAt: null,
        },
        data: {
          ...this.statusData(
            BusinessStatus.INACTIVE,
            normalizedReason,
            now,
          ),
          deletedAt: now,
        },
      });

      if (result.count !== 1) {
        throw new NotFoundException('Negocio no encontrado.');
      }

      await this.revokeBusinessSessions(transaction, businessId, now);

      return {
        message: 'Negocio eliminado correctamente.',
      };
    });
  }

  private statusData(
    status: BusinessStatus,
    reason: string | null,
    now: Date,
  ): Prisma.BusinessUpdateManyMutationInput {
    return {
      status,
      statusChangedAt: now,
      statusReason: reason,
      suspendedAt: status === BusinessStatus.SUSPENDED ? now : null,
      inactivatedAt: status === BusinessStatus.INACTIVE ? now : null,
    };
  }

  private validateReason(reason: string | null) {
    if (reason && reason.length > 1000) {
      throw new BadRequestException(
        'El motivo del cambio de estado no puede superar 1000 caracteres.',
      );
    }
  }

  private revokeBusinessSessions(
    transaction: Prisma.TransactionClient,
    businessId: number,
    revokedAt: Date,
  ) {
    return transaction.authSession.updateMany({
      where: {
        revokedAt: null,
        user: {
          businessId,
        },
      },
      data: {
        revokedAt,
      },
    });
  }
}

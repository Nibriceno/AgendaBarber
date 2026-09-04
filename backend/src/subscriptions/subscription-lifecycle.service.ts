import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  BusinessStatus,
  PlanRequestStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';

import { BILLING_SUSPENSION_REASON_PREFIX } from '../businesses/business-status';
import { PrismaService } from '../prisma/prisma.service';

const PROCESS_INTERVAL_MS = 60_000;
const PROCESS_BATCH_SIZE = 100;

@Injectable()
export class SubscriptionLifecycleService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(SubscriptionLifecycleService.name);
  private timer?: ReturnType<typeof setInterval>;
  private processing = false;

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap(): void {
    void this.runSafely();
    this.timer = setInterval(() => void this.runSafely(), PROCESS_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async processDue(now = new Date()) {
    const canceled = await this.finalizeScheduledCancellations(now);
    const suspended = await this.suspendExpiredGracePeriods(now);
    return { canceled, suspended };
  }

  async finalizeScheduledCancellations(now = new Date()): Promise<number> {
    const candidates = await this.prisma.subscription.findMany({
      where: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { lte: now },
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
        },
      },
      select: { id: true, businessId: true },
      orderBy: { currentPeriodEnd: 'asc' },
      take: PROCESS_BATCH_SIZE,
    });

    let count = 0;
    for (const candidate of candidates) {
      const updated = await this.prisma.$transaction(async (transaction) => {
        const result = await transaction.subscription.updateMany({
          where: {
            id: candidate.id,
            cancelAtPeriodEnd: true,
            currentPeriodEnd: { lte: now },
            status: {
              in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
            },
          },
          data: {
            status: SubscriptionStatus.CANCELED,
            activeKey: null,
            authorizationUrl: null,
            canceledAt: now,
          },
        });
        if (result.count !== 1) return false;

        await this.suspendBusiness(
          transaction,
          candidate.businessId,
          'cancelada al finalizar el período contratado.',
          now,
        );
        return true;
      });
      if (updated) count += 1;
    }
    return count;
  }

  async suspendExpiredGracePeriods(now = new Date()): Promise<number> {
    const candidates = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.PAST_DUE,
        graceEndsAt: { lte: now },
        cancelAtPeriodEnd: false,
      },
      select: { id: true, businessId: true },
      orderBy: { graceEndsAt: 'asc' },
      take: PROCESS_BATCH_SIZE,
    });

    let count = 0;
    for (const candidate of candidates) {
      const updated = await this.prisma.$transaction(async (transaction) => {
        const result = await transaction.subscription.updateMany({
          where: {
            id: candidate.id,
            status: SubscriptionStatus.PAST_DUE,
            graceEndsAt: { lte: now },
            cancelAtPeriodEnd: false,
          },
          data: { status: SubscriptionStatus.SUSPENDED },
        });
        if (result.count !== 1) return false;

        await this.suspendBusiness(
          transaction,
          candidate.businessId,
          'suspendida al vencer el período de gracia.',
          now,
        );
        return true;
      });
      if (updated) count += 1;
    }
    return count;
  }

  private async suspendBusiness(
    transaction: Prisma.TransactionClient,
    businessId: number,
    reason: string,
    now: Date,
  ) {
    const business = await transaction.business.findUnique({
      where: { id: businessId },
      select: {
        status: true,
        statusReason: true,
        deletedAt: true,
        inactivatedAt: true,
        planRequest: { select: { status: true } },
      },
    });
    if (!business || business.deletedAt || business.inactivatedAt) return;
    if (business.status === BusinessStatus.INACTIVE) return;
    if (
      business.status === BusinessStatus.PENDING &&
      business.planRequest?.status !== PlanRequestStatus.CONVERTED
    ) {
      return;
    }

    const manuallySuspended =
      business.status === BusinessStatus.SUSPENDED &&
      !business.statusReason?.startsWith(BILLING_SUSPENSION_REASON_PREFIX);
    if (manuallySuspended) return;

    await transaction.business.update({
      where: { id: businessId },
      data: {
        status: BusinessStatus.SUSPENDED,
        statusChangedAt: now,
        statusReason: `${BILLING_SUSPENSION_REASON_PREFIX} ${reason}`,
        suspendedAt: now,
      },
    });
  }

  private async runSafely() {
    if (this.processing) return;
    this.processing = true;
    try {
      const result = await this.processDue();
      if (result.canceled || result.suspended) {
        this.logger.log(
          `Ciclo de suscripciones: ${result.canceled} cancelada(s), ${result.suspended} suspendida(s).`,
        );
      }
    } catch (error) {
      this.logger.error(
        'No fue posible procesar el ciclo de vida de suscripciones.',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.processing = false;
    }
  }
}

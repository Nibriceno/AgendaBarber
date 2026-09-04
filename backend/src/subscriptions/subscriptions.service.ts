import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessStatus,
  PaymentProvider,
  Prisma,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';

import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import {
  BILLING_SUSPENSION_REASON_PREFIX,
  isBusinessBillingRestricted,
} from '../businesses/business-status';
import {
  SUBSCRIPTION_PAYMENT_PROVIDER,
  type ProviderSubscriptionSnapshot,
  type SubscriptionPaymentProvider,
} from '../payments/providers/payment-provider.interface';
import { PlanPricingService } from '../plan-requests/plan-pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

const PROVIDER = PaymentProvider.MERCADO_PAGO;

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly planPricingService: PlanPricingService,
    @Inject(SUBSCRIPTION_PAYMENT_PROVIDER)
    private readonly paymentProvider: SubscriptionPaymentProvider,
  ) {}

  async create(currentUser: AuthUser, dto: CreateSubscriptionDto) {
    const owner = await this.prisma.user.findFirst({
      where: {
        id: currentUser.id,
        businessId: currentUser.businessId,
        role: UserRole.ADMIN,
        isActive: true,
        deletedAt: null,
        business: {
          deletedAt: null,
          status: { not: BusinessStatus.INACTIVE },
        },
      },
      select: { id: true, email: true, business: { select: { name: true } } },
    });

    if (!owner) {
      throw new NotFoundException('El negocio no está disponible.');
    }
    if (!owner.email) {
      throw new BadRequestException(
        'Tu cuenta necesita un correo electrónico para contratar un plan.',
      );
    }

    const quote = await this.planPricingService.quote(
      dto.planCode,
      dto.promoCode,
    );
    const activeKey = `${PROVIDER}:${currentUser.businessId}`;

    let subscription = await this.prisma.subscription.findUnique({
      where: { activeKey },
    });

    if (subscription && subscription.planId !== quote.id) {
      throw new ConflictException(
        'El negocio ya tiene una suscripción. Utiliza el cambio de plan.',
      );
    }

    if (!subscription) {
      try {
        subscription = await this.prisma.subscription.create({
          data: {
            businessId: currentUser.businessId,
            planId: quote.id,
            ownerUserId: owner.id,
            discountId: quote.discount?.id,
            discountName: quote.discount?.name,
            promoCode: quote.discount?.code,
            provider: PROVIDER,
            status: SubscriptionStatus.PENDING,
            activeKey,
            baseAmount: quote.basePrice,
            discountAmount: quote.discountAmount,
            amount: quote.finalPrice,
            currency: quote.currency,
            interval: quote.interval,
            intervalCount: quote.intervalCount,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          subscription = await this.prisma.subscription.findUnique({
            where: { activeKey },
          });
        } else {
          throw error;
        }
      }
    }

    if (!subscription) {
      throw new ConflictException('No fue posible preparar la suscripción.');
    }

    const appUrl = this.configService.getOrThrow<string>('PUBLIC_APP_URL');
    await this.authorizeExistingSubscription(
      subscription.id,
      `${appUrl}/suscripcion/resultado?subscription=${subscription.id}`,
    );

    return this.getMine(currentUser);
  }

  async authorizeExistingSubscription(subscriptionId: string, backUrl: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: { select: { name: true } },
        business: { select: { name: true } },
        ownerUser: { select: { email: true } },
      },
    });

    if (!subscription) {
      throw new NotFoundException('La suscripción no existe.');
    }
    if (!subscription.ownerUser?.email) {
      throw new BadRequestException(
        'La suscripción necesita un correo de titular.',
      );
    }
    if (subscription.providerSubscriptionId) return subscription;

    const payerEmail = this.providerPayerEmail(subscription.ownerUser.email);
    const providerSubscription = await this.paymentProvider.createSubscription({
      idempotencyKey: subscription.id,
      externalReference: subscription.id,
      payerEmail,
      reason: `Plan ${subscription.plan.name} de AgendaYa para ${subscription.business.name}`,
      amount: subscription.amount,
      currency: subscription.currency,
      interval: subscription.interval,
      intervalCount: subscription.intervalCount,
      backUrl,
    });

    await this.prisma.subscription.updateMany({
      where: { id: subscription.id, providerSubscriptionId: null },
      data: {
        providerSubscriptionId: providerSubscription.providerSubscriptionId,
        providerPayerId: providerSubscription.providerPayerId,
        providerApplicationId: providerSubscription.applicationId,
        providerCollectorId: providerSubscription.collectorId,
        providerStatus: providerSubscription.rawStatus,
        providerStatusDetail: providerSubscription.rawStatusDetail,
        providerUpdatedAt: providerSubscription.providerUpdatedAt,
        status: providerSubscription.status,
        authorizationUrl: providerSubscription.authorizationUrl,
        paymentMethodId: providerSubscription.paymentMethodId,
        nextPaymentAt: providerSubscription.nextPaymentAt,
      },
    });

    return this.prisma.subscription.findUniqueOrThrow({
      where: { id: subscription.id },
    });
  }

  private providerPayerEmail(ownerEmail: string) {
    const sandbox = this.configService.get<boolean>(
      'MERCADO_PAGO_USE_SANDBOX',
      false,
    );
    if (!sandbox) return ownerEmail;

    const testPayerEmail = this.configService
      .get<string>('MERCADO_PAGO_TEST_PAYER_EMAIL')
      ?.trim()
      .toLowerCase();
    return testPayerEmail || ownerEmail;
  }

  async cancelAtPeriodEnd(currentUser: AuthUser) {
    const subscription = await this.findMineForMutation(currentUser);
    if (subscription.status === SubscriptionStatus.CANCELED) {
      return this.getMine(currentUser);
    }
    if (subscription.cancelAtPeriodEnd) {
      return this.getMine(currentUser);
    }

    const now = new Date();
    const keepsAccessUntil =
      subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
        ? subscription.currentPeriodEnd
        : null;

    const snapshot = subscription.providerSubscriptionId
      ? await this.paymentProvider.cancelSubscription(
          subscription.providerSubscriptionId,
        )
      : null;

    await this.prisma.$transaction(async (transaction) => {
      const scheduled = Boolean(
        keepsAccessUntil &&
        (subscription.status === SubscriptionStatus.ACTIVE ||
          subscription.status === SubscriptionStatus.PAST_DUE),
      );
      const result = await transaction.subscription.updateMany({
        where: {
          id: subscription.id,
          businessId: currentUser.businessId,
          status: subscription.status,
        },
        data: {
          ...this.providerSnapshotData(snapshot),
          status: scheduled ? subscription.status : SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: scheduled,
          cancellationRequestedAt: subscription.cancellationRequestedAt ?? now,
          canceledAt: scheduled ? null : now,
          activeKey: scheduled ? subscription.activeKey : null,
          authorizationUrl: null,
          nextPaymentAt: null,
        },
      });
      if (result.count !== 1) {
        throw new ConflictException(
          'La suscripción cambió mientras se procesaba la cancelación. Actualiza la página.',
        );
      }

      if (!scheduled) {
        await this.suspendBusinessForBilling(
          transaction,
          subscription.businessId,
          'cancelada.',
          now,
        );
      }
    });

    return this.getMine(currentUser);
  }

  async reactivate(currentUser: AuthUser) {
    const subscription = await this.findMineForMutation(currentUser);

    if (
      subscription.status === SubscriptionStatus.ACTIVE &&
      !subscription.cancelAtPeriodEnd
    ) {
      throw new ConflictException('La suscripción ya está activa.');
    }
    if (
      subscription.status === SubscriptionStatus.PENDING &&
      subscription.authorizationUrl
    ) {
      return this.getMine(currentUser);
    }

    const providerAlreadyCanceled = ['cancelled', 'canceled'].includes(
      subscription.providerStatus?.toLowerCase() ?? '',
    );
    if (
      subscription.providerSubscriptionId &&
      subscription.status !== SubscriptionStatus.CANCELED &&
      !providerAlreadyCanceled
    ) {
      await this.paymentProvider.cancelSubscription(
        subscription.providerSubscriptionId,
      );
    }

    const released = await this.prisma.subscription.updateMany({
      where: {
        id: subscription.id,
        businessId: currentUser.businessId,
        activeKey: subscription.activeKey,
      },
      data: {
        status: SubscriptionStatus.CANCELED,
        activeKey: null,
        authorizationUrl: null,
        cancelAtPeriodEnd: false,
        cancellationRequestedAt: new Date(),
        canceledAt: new Date(),
      },
    });
    if (released.count !== 1) {
      throw new ConflictException(
        'La suscripción cambió mientras se procesaba la reactivación. Actualiza la página.',
      );
    }

    return this.create(currentUser, { planCode: subscription.plan.code });
  }

  private findMineForMutation(currentUser: AuthUser) {
    return this.prisma.subscription
      .findFirst({
        where: { businessId: currentUser.businessId },
        orderBy: { createdAt: 'desc' },
        include: { plan: { select: { code: true } } },
      })
      .then((subscription) => {
        if (!subscription) {
          throw new NotFoundException(
            'El negocio todavía no tiene suscripción.',
          );
        }
        return subscription;
      });
  }

  private providerSnapshotData(snapshot: ProviderSubscriptionSnapshot | null) {
    if (!snapshot) return {};
    return {
      providerPayerId: snapshot.providerPayerId,
      providerApplicationId: snapshot.applicationId,
      providerCollectorId: snapshot.collectorId,
      providerStatus: snapshot.rawStatus,
      providerStatusDetail: snapshot.rawStatusDetail,
      providerUpdatedAt: snapshot.providerUpdatedAt,
      paymentMethodId: snapshot.paymentMethodId,
    };
  }

  private async suspendBusinessForBilling(
    transaction: Prisma.TransactionClient,
    businessId: number,
    suffix: string,
    now: Date,
  ) {
    const business = await transaction.business.findUnique({
      where: { id: businessId },
      select: {
        status: true,
        statusReason: true,
        deletedAt: true,
        inactivatedAt: true,
      },
    });
    if (
      !business ||
      business.deletedAt ||
      business.inactivatedAt ||
      business.status === BusinessStatus.PENDING ||
      business.status === BusinessStatus.INACTIVE
    ) {
      return;
    }
    if (
      business.status === BusinessStatus.SUSPENDED &&
      !isBusinessBillingRestricted(business)
    ) {
      return;
    }

    await transaction.business.update({
      where: { id: businessId },
      data: {
        status: BusinessStatus.SUSPENDED,
        statusChangedAt: now,
        statusReason: `${BILLING_SUSPENSION_REASON_PREFIX} ${suffix}`,
        suspendedAt: now,
      },
    });
  }

  async getMine(currentUser: AuthUser) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { businessId: currentUser.businessId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: {
          select: {
            code: true,
            name: true,
            description: true,
            features: true,
            limits: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            paymentMethodId: true,
            cardLastFourDigits: true,
            paidAt: true,
            periodStart: true,
            periodEnd: true,
            createdAt: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('El negocio todavía no tiene suscripción.');
    }

    const latestPaymentMethod = subscription.payments.find(
      (payment) => payment.paymentMethodId || payment.cardLastFourDigits,
    );

    return {
      id: subscription.id,
      status: subscription.status,
      plan: subscription.plan,
      price: {
        baseAmount: subscription.baseAmount,
        discountAmount: subscription.discountAmount,
        amount: subscription.amount,
        currency: subscription.currency,
        interval: subscription.interval,
        intervalCount: subscription.intervalCount,
        discountName: subscription.discountName,
        promoCode: subscription.promoCode,
      },
      authorizationUrl:
        subscription.status === SubscriptionStatus.PENDING
          ? subscription.authorizationUrl
          : null,
      paymentMethodId: subscription.paymentMethodId,
      paymentMethod:
        subscription.paymentMethodId || latestPaymentMethod
          ? {
              id:
                subscription.paymentMethodId ??
                latestPaymentMethod?.paymentMethodId ??
                null,
              lastFourDigits: latestPaymentMethod?.cardLastFourDigits ?? null,
            }
          : null,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      nextPaymentAt: subscription.nextPaymentAt,
      pastDueAt: subscription.pastDueAt,
      graceEndsAt: subscription.graceEndsAt,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      cancellationRequestedAt: subscription.cancellationRequestedAt,
      canceledAt: subscription.canceledAt,
      payments: subscription.payments,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }
}

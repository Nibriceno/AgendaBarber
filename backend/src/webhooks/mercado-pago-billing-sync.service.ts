import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BusinessStatus,
  PaymentProvider,
  PlanRequestStatus,
  Prisma,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';

import { BILLING_SUSPENSION_REASON_PREFIX } from '../businesses/business-status';
import {
  SUBSCRIPTION_PAYMENT_PROVIDER,
  type ProviderInvoiceSnapshot,
  type ProviderPaymentSnapshot,
  type ProviderSubscriptionSnapshot,
  type SubscriptionPaymentProvider,
} from '../payments/providers/payment-provider.interface';
import { PrismaService } from '../prisma/prisma.service';

const PROVIDER = PaymentProvider.MERCADO_PAGO;

@Injectable()
export class MercadoPagoBillingSyncService {
  private readonly logger = new Logger(MercadoPagoBillingSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(SUBSCRIPTION_PAYMENT_PROVIDER)
    private readonly provider: SubscriptionPaymentProvider,
  ) {}

  async process(topic: string, resourceId: string) {
    if (topic === 'subscription_preapproval') {
      return this.syncSubscription(resourceId);
    }
    if (topic === 'subscription_authorized_payment') {
      return this.syncInvoice(await this.provider.getInvoice(resourceId));
    }
    if (topic === 'payment') {
      const payment = await this.provider.getPayment(resourceId);
      const invoice = await this.provider.findInvoiceByPaymentId(resourceId);
      if (!invoice) {
        this.logger.log(
          `Pago ${resourceId} ignorado: no pertenece a una factura de suscripción.`,
        );
        return 'ignored' as const;
      }
      return this.syncInvoice(invoice, payment);
    }
    return 'ignored' as const;
  }

  private async syncSubscription(providerSubscriptionId: string) {
    const snapshot = await this.provider.getSubscription(
      providerSubscriptionId,
    );
    const subscription = await this.findAndValidateSubscription(snapshot);
    if (!subscription) return 'ignored' as const;

    await this.prisma.$transaction(async (transaction) => {
      const current = await transaction.subscription.findUnique({
        where: { id: subscription.id },
      });
      if (!current) return;

      if (
        current.providerUpdatedAt &&
        snapshot.providerUpdatedAt &&
        current.providerUpdatedAt > snapshot.providerUpdatedAt
      ) {
        return;
      }

      const scheduledCancellationStillActive =
        snapshot.status === SubscriptionStatus.CANCELED &&
        current.cancelAtPeriodEnd &&
        current.currentPeriodEnd !== null &&
        current.currentPeriodEnd > new Date();
      const delinquencyStillUnpaid =
        snapshot.status === SubscriptionStatus.ACTIVE &&
        current.pastDueAt !== null &&
        (current.status === SubscriptionStatus.PAST_DUE ||
          current.status === SubscriptionStatus.SUSPENDED);
      const nextStatus = scheduledCancellationStillActive
        ? current.status
        : delinquencyStillUnpaid
          ? current.status
          : snapshot.status;

      await transaction.subscription.update({
        where: { id: current.id },
        data: {
          providerSubscriptionId: snapshot.providerSubscriptionId,
          providerPayerId: snapshot.providerPayerId,
          providerApplicationId: snapshot.applicationId,
          providerCollectorId: snapshot.collectorId,
          providerStatus: snapshot.rawStatus,
          providerStatusDetail: snapshot.rawStatusDetail,
          providerUpdatedAt: snapshot.providerUpdatedAt,
          paymentMethodId: snapshot.paymentMethodId,
          nextPaymentAt: scheduledCancellationStillActive
            ? null
            : snapshot.nextPaymentAt,
          authorizationUrl:
            nextStatus === SubscriptionStatus.PENDING
              ? snapshot.authorizationUrl
              : null,
          status: nextStatus,
          activeKey:
            nextStatus === SubscriptionStatus.CANCELED
              ? null
              : current.activeKey,
          canceledAt:
            nextStatus === SubscriptionStatus.CANCELED
              ? (current.canceledAt ?? new Date())
              : current.canceledAt,
        },
      });

      if (!scheduledCancellationStillActive) {
        await this.syncBusinessStatus(
          transaction,
          current.businessId,
          nextStatus,
        );
      }
    });

    this.logger.log(
      `Suscripción ${subscription.id} sincronizada desde ${snapshot.providerSubscriptionId}.`,
    );

    return 'processed' as const;
  }

  private async syncInvoice(
    invoice: ProviderInvoiceSnapshot,
    knownPayment?: ProviderPaymentSnapshot,
  ) {
    if (!invoice.providerSubscriptionId) {
      this.logger.warn(
        `Factura ${invoice.providerInvoiceId} sin preapproval_id; se ignora.`,
      );
      return 'ignored' as const;
    }

    const subscriptionSnapshot = await this.provider.getSubscription(
      invoice.providerSubscriptionId,
    );
    const subscription =
      await this.findAndValidateSubscription(subscriptionSnapshot);
    if (!subscription) return 'ignored' as const;

    this.assertInvoiceMatches(invoice, subscription);

    if (!invoice.providerPaymentId) {
      await this.syncSubscription(invoice.providerSubscriptionId);
      return 'processed' as const;
    }

    const payment =
      knownPayment ??
      (await this.provider.getPayment(invoice.providerPaymentId));
    if (payment.providerPaymentId !== invoice.providerPaymentId) {
      throw new Error('La factura referencia un pago diferente al consultado.');
    }
    this.assertPaymentMatches(payment, subscription);

    const periodStart =
      invoice.debitDate ?? payment.paidAt ?? payment.createdAt ?? new Date();
    const periodEnd =
      subscriptionSnapshot.nextPaymentAt &&
      subscriptionSnapshot.nextPaymentAt > periodStart
        ? subscriptionSnapshot.nextPaymentAt
        : this.addInterval(
            periodStart,
            subscription.interval,
            subscription.intervalCount,
          );

    await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.subscriptionPayment.findUnique({
        where: {
          provider_providerPaymentId: {
            provider: PROVIDER,
            providerPaymentId: payment.providerPaymentId,
          },
        },
      });

      if (
        existing?.providerUpdatedAt &&
        payment.providerUpdatedAt &&
        existing.providerUpdatedAt > payment.providerUpdatedAt
      ) {
        return;
      }

      await transaction.subscriptionPayment.upsert({
        where: {
          provider_providerPaymentId: {
            provider: PROVIDER,
            providerPaymentId: payment.providerPaymentId,
          },
        },
        create: {
          subscriptionId: subscription.id,
          provider: PROVIDER,
          providerPaymentId: payment.providerPaymentId,
          providerInvoiceId: invoice.providerInvoiceId,
          amount: payment.amount!,
          currency: payment.currency!,
          status: payment.status,
          rawStatus: payment.rawStatus,
          rawStatusDetail: payment.rawStatusDetail,
          paymentMethodId: payment.paymentMethodId,
          cardLastFourDigits: payment.cardLastFourDigits,
          liveMode: payment.liveMode,
          providerUpdatedAt: payment.providerUpdatedAt,
          periodStart,
          periodEnd,
          paidAt: payment.paidAt,
        },
        update: {
          subscriptionId: subscription.id,
          providerInvoiceId: invoice.providerInvoiceId,
          amount: payment.amount!,
          currency: payment.currency!,
          status: payment.status,
          rawStatus: payment.rawStatus,
          rawStatusDetail: payment.rawStatusDetail,
          paymentMethodId: payment.paymentMethodId,
          cardLastFourDigits: payment.cardLastFourDigits,
          liveMode: payment.liveMode,
          providerUpdatedAt: payment.providerUpdatedAt,
          periodStart,
          periodEnd,
          paidAt: payment.paidAt,
        },
      });

      await this.applyPaymentResult(
        transaction,
        subscription,
        subscriptionSnapshot,
        payment,
        periodStart,
        periodEnd,
      );
    });

    this.logger.log(
      `Pago ${payment.providerPaymentId} sincronizado en la suscripción ${subscription.id}.`,
    );

    return 'processed' as const;
  }

  private async findAndValidateSubscription(
    snapshot: ProviderSubscriptionSnapshot,
  ) {
    let subscription = await this.prisma.subscription.findUnique({
      where: {
        provider_providerSubscriptionId: {
          provider: PROVIDER,
          providerSubscriptionId: snapshot.providerSubscriptionId,
        },
      },
      include: { business: true },
    });

    if (!subscription && snapshot.externalReference) {
      subscription = await this.prisma.subscription.findFirst({
        where: { id: snapshot.externalReference, provider: PROVIDER },
        include: { business: true },
      });
    }

    if (!subscription) {
      this.logger.warn(
        `Suscripción ${snapshot.providerSubscriptionId} no corresponde a AgendaYa.`,
      );
      return null;
    }

    if (
      snapshot.externalReference &&
      snapshot.externalReference !== subscription.id
    ) {
      throw new Error('La referencia externa de la suscripción no coincide.');
    }
    if (
      subscription.providerSubscriptionId &&
      subscription.providerSubscriptionId !== snapshot.providerSubscriptionId
    ) {
      throw new Error('El identificador de suscripción no coincide.');
    }
    if (snapshot.amount !== null && snapshot.amount !== subscription.amount) {
      throw new Error('El monto de la suscripción no coincide.');
    }
    if (snapshot.currency && snapshot.currency !== subscription.currency) {
      throw new Error('La moneda de la suscripción no coincide.');
    }
    if (
      subscription.providerApplicationId &&
      snapshot.applicationId &&
      subscription.providerApplicationId !== snapshot.applicationId
    ) {
      throw new Error('La aplicación de Mercado Pago no coincide.');
    }
    if (
      subscription.providerCollectorId &&
      snapshot.collectorId &&
      subscription.providerCollectorId !== snapshot.collectorId
    ) {
      throw new Error('La cuenta recaudadora de Mercado Pago no coincide.');
    }

    return subscription;
  }

  private assertInvoiceMatches(
    invoice: ProviderInvoiceSnapshot,
    subscription: { id: string; amount: number; currency: string },
  ) {
    if (
      invoice.externalReference &&
      invoice.externalReference !== subscription.id
    ) {
      throw new Error('La referencia externa de la factura no coincide.');
    }
    if (invoice.amount !== null && invoice.amount !== subscription.amount) {
      throw new Error('El monto de la factura no coincide.');
    }
    if (invoice.currency && invoice.currency !== subscription.currency) {
      throw new Error('La moneda de la factura no coincide.');
    }
  }

  private assertPaymentMatches(
    payment: ProviderPaymentSnapshot,
    subscription: {
      id: string;
      amount: number;
      currency: string;
      providerCollectorId: string | null;
    },
  ) {
    if (payment.amount === null || payment.amount !== subscription.amount) {
      throw new Error('El monto del pago no coincide.');
    }
    if (!payment.currency || payment.currency !== subscription.currency) {
      throw new Error('La moneda del pago no coincide.');
    }
    if (
      payment.externalReference &&
      payment.externalReference !== subscription.id
    ) {
      throw new Error('La referencia externa del pago no coincide.');
    }
    if (
      subscription.providerCollectorId &&
      payment.collectorId &&
      subscription.providerCollectorId !== payment.collectorId
    ) {
      throw new Error('La cuenta recaudadora del pago no coincide.');
    }

    const sandbox = this.configService.get<boolean>(
      'MERCADO_PAGO_USE_SANDBOX',
      true,
    );
    if (payment.liveMode !== null && payment.liveMode === sandbox) {
      throw new Error('El ambiente del pago no coincide con la configuración.');
    }
  }

  private async applyPaymentResult(
    transaction: Prisma.TransactionClient,
    subscription: {
      id: string;
      businessId: number;
      status: SubscriptionStatus;
      activeKey: string | null;
      pastDueAt: Date | null;
      canceledAt: Date | null;
      currentPeriodEnd: Date | null;
      cancelAtPeriodEnd: boolean;
    },
    subscriptionSnapshot: ProviderSubscriptionSnapshot,
    payment: ProviderPaymentSnapshot,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const scheduledCancellationStillActive =
      subscriptionSnapshot.status === SubscriptionStatus.CANCELED &&
      subscription.cancelAtPeriodEnd &&
      subscription.currentPeriodEnd !== null &&
      subscription.currentPeriodEnd > new Date();

    const commonData = {
      providerPayerId: subscriptionSnapshot.providerPayerId,
      providerApplicationId: subscriptionSnapshot.applicationId,
      providerCollectorId: subscriptionSnapshot.collectorId,
      providerStatus: subscriptionSnapshot.rawStatus,
      providerStatusDetail: subscriptionSnapshot.rawStatusDetail,
      providerUpdatedAt: subscriptionSnapshot.providerUpdatedAt,
      paymentMethodId:
        payment.paymentMethodId ?? subscriptionSnapshot.paymentMethodId,
      nextPaymentAt: scheduledCancellationStillActive
        ? null
        : subscriptionSnapshot.nextPaymentAt,
    };

    if (
      !scheduledCancellationStillActive &&
      (subscriptionSnapshot.status === SubscriptionStatus.CANCELED ||
        subscriptionSnapshot.status === SubscriptionStatus.SUSPENDED)
    ) {
      await transaction.subscription.update({
        where: { id: subscription.id },
        data: {
          ...commonData,
          status: subscriptionSnapshot.status,
          activeKey:
            subscriptionSnapshot.status === SubscriptionStatus.CANCELED
              ? null
              : subscription.activeKey,
          canceledAt:
            subscriptionSnapshot.status === SubscriptionStatus.CANCELED
              ? (subscription.canceledAt ?? new Date())
              : subscription.canceledAt,
        },
      });
      await this.syncBusinessStatus(
        transaction,
        subscription.businessId,
        subscriptionSnapshot.status,
      );
      return;
    }

    if (payment.status === SubscriptionPaymentStatus.APPROVED) {
      await transaction.subscription.update({
        where: { id: subscription.id },
        data: {
          ...commonData,
          status: SubscriptionStatus.ACTIVE,
          authorizationUrl: null,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          pastDueAt: null,
          graceEndsAt: null,
        },
      });
      await this.syncBusinessStatus(
        transaction,
        subscription.businessId,
        SubscriptionStatus.ACTIVE,
      );
      await transaction.planRequest.updateMany({
        where: {
          businessId: subscription.businessId,
          status: {
            in: [PlanRequestStatus.NEW, PlanRequestStatus.CHECKOUT_PENDING],
          },
        },
        data: { status: PlanRequestStatus.PAID },
      });
      return;
    }

    if (
      payment.status === SubscriptionPaymentStatus.REJECTED ||
      payment.status === SubscriptionPaymentStatus.REFUNDED ||
      payment.status === SubscriptionPaymentStatus.CHARGED_BACK
    ) {
      if (subscription.status === SubscriptionStatus.CANCELED) return;
      const pastDueAt = subscription.pastDueAt ?? new Date();
      const graceDays = this.configService.get<number>(
        'SUBSCRIPTION_GRACE_PERIOD_DAYS',
        5,
      );
      const graceEndsAt = new Date(
        pastDueAt.getTime() + graceDays * 24 * 60 * 60 * 1_000,
      );
      await transaction.subscription.update({
        where: { id: subscription.id },
        data: {
          ...commonData,
          status: SubscriptionStatus.PAST_DUE,
          pastDueAt,
          graceEndsAt,
        },
      });
      await transaction.planRequest.updateMany({
        where: {
          businessId: subscription.businessId,
          status: PlanRequestStatus.PAID,
        },
        data: { status: PlanRequestStatus.PAYMENT_REVERSED },
      });
      return;
    }

    await transaction.subscription.update({
      where: { id: subscription.id },
      data: commonData,
    });
  }

  private async syncBusinessStatus(
    transaction: Prisma.TransactionClient,
    businessId: number,
    subscriptionStatus: SubscriptionStatus,
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
      business.planRequest &&
      business.planRequest.status !== PlanRequestStatus.CONVERTED
    ) {
      return;
    }

    if (subscriptionStatus === SubscriptionStatus.ACTIVE) {
      const billingSuspension =
        business.statusReason?.startsWith(BILLING_SUSPENSION_REASON_PREFIX) ??
        false;
      if (
        business.status === BusinessStatus.PENDING ||
        (business.status === BusinessStatus.SUSPENDED && billingSuspension)
      ) {
        await transaction.business.update({
          where: { id: businessId },
          data: {
            status: BusinessStatus.ACTIVE,
            statusChangedAt: new Date(),
            statusReason: null,
            suspendedAt: null,
          },
        });
      }
      return;
    }

    if (
      subscriptionStatus === SubscriptionStatus.SUSPENDED ||
      subscriptionStatus === SubscriptionStatus.CANCELED
    ) {
      const manuallySuspended =
        business.status === BusinessStatus.SUSPENDED &&
        !business.statusReason?.startsWith(BILLING_SUSPENSION_REASON_PREFIX);
      if (manuallySuspended) return;
      await transaction.business.update({
        where: { id: businessId },
        data: {
          status: BusinessStatus.SUSPENDED,
          statusChangedAt: new Date(),
          statusReason: `${BILLING_SUSPENSION_REASON_PREFIX} ${
            subscriptionStatus === SubscriptionStatus.CANCELED
              ? 'cancelada.'
              : 'suspendida.'
          }`,
          suspendedAt: new Date(),
        },
      });
    }
  }

  private addInterval(
    date: Date,
    interval: 'MONTH' | 'YEAR',
    intervalCount: number,
  ) {
    const result = new Date(date);
    if (interval === 'YEAR') {
      result.setUTCFullYear(result.getUTCFullYear() + intervalCount);
    } else {
      result.setUTCMonth(result.getUTCMonth() + intervalCount);
    }
    return result;
  }
}

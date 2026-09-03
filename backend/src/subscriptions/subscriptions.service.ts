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
  SUBSCRIPTION_PAYMENT_PROVIDER,
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

    if (!subscription.providerSubscriptionId) {
      const appUrl = this.configService.getOrThrow<string>('PUBLIC_APP_URL');
      const providerSubscription =
        await this.paymentProvider.createSubscription({
          idempotencyKey: subscription.id,
          externalReference: subscription.id,
          payerEmail: owner.email,
          reason: `Plan ${quote.name} de AgendaYa para ${owner.business.name}`,
          amount: subscription.amount,
          currency: subscription.currency,
          interval: subscription.interval,
          intervalCount: subscription.intervalCount,
          backUrl: `${appUrl}/suscripcion/resultado?subscription=${subscription.id}`,
        });

      await this.prisma.subscription.updateMany({
        where: { id: subscription.id, providerSubscriptionId: null },
        data: {
          providerSubscriptionId: providerSubscription.providerSubscriptionId,
          providerPayerId: providerSubscription.providerPayerId,
          providerStatus: providerSubscription.rawStatus,
          providerStatusDetail: providerSubscription.rawStatusDetail,
          providerUpdatedAt: providerSubscription.providerUpdatedAt,
          status: providerSubscription.status,
          authorizationUrl: providerSubscription.authorizationUrl,
          paymentMethodId: providerSubscription.paymentMethodId,
          nextPaymentAt: providerSubscription.nextPaymentAt,
        },
      });
    }

    return this.getMine(currentUser);
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

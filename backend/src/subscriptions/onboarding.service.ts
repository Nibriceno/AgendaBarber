import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BusinessStatus,
  PaymentProvider,
  PlanRequestStatus,
  Prisma,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import { createHash, timingSafeEqual } from 'node:crypto';

import { PlanPricingService } from '../plan-requests/plan-pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { SubscriptionsService } from './subscriptions.service';

const PROVIDER = PaymentProvider.MERCADO_PAGO;

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly planPricingService: PlanPricingService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async create(dto: CreateOnboardingDto) {
    if (dto.website) {
      throw new BadRequestException('No fue posible procesar la solicitud.');
    }

    const tokenHash = this.hashToken(dto.onboardingToken);
    let request = await this.findByKey(dto.idempotencyKey);

    if (request) {
      this.assertToken(request.onboardingTokenHash, tokenHash);
    } else {
      const quote = await this.planPricingService.quote(
        dto.plan,
        dto.promoCode,
      );
      if (
        dto.teamSize < quote.minimumTeamSize ||
        dto.teamSize > quote.maximumTeamSize
      ) {
        throw new BadRequestException(
          `El plan seleccionado admite equipos de ${quote.minimumTeamSize} a ${quote.maximumTeamSize} personas.`,
        );
      }

      const [firstName, ...lastNameParts] = dto.contactName.trim().split(/\s+/);
      const lastName = lastNameParts.join(' ') || 'Administrador';
      const slug =
        dto.desiredSlug ?? `solicitud-${dto.idempotencyKey.toLowerCase()}`;
      const phone = this.normalizePhone(dto.phone);

      try {
        await this.prisma.$transaction(
          async (transaction) => {
            const business = await transaction.business.create({
              data: {
                name: dto.businessName,
                slug,
                phone,
                email: dto.email,
                status: BusinessStatus.PENDING,
                statusChangedAt: new Date(),
                statusReason: 'Configuración inicial pendiente por AgendaYa.',
              },
            });
            const owner = await transaction.user.create({
              data: {
                businessId: business.id,
                firstName,
                lastName,
                phone,
                email: dto.email,
                role: UserRole.ADMIN,
                passwordHash: null,
                isRegistered: false,
                emailVerified: false,
                isActive: true,
              },
            });
            await transaction.planRequest.create({
              data: {
                businessId: business.id,
                onboardingKey: dto.idempotencyKey,
                onboardingTokenHash: tokenHash,
                plan: dto.plan,
                basePrice: quote.basePrice,
                discountAmount: quote.discountAmount,
                monthlyPrice: quote.finalPrice,
                discountId: quote.discount?.id,
                promoCode: quote.discount?.code,
                teamSize: dto.teamSize,
                businessName: dto.businessName,
                businessCategory: dto.businessCategory,
                desiredSlug: dto.desiredSlug || null,
                contactName: dto.contactName,
                email: dto.email,
                phone,
                contactPreference: dto.contactPreference,
                notes: dto.notes || null,
                status: PlanRequestStatus.NEW,
              },
            });
            await transaction.subscription.create({
              data: {
                businessId: business.id,
                planId: quote.id,
                ownerUserId: owner.id,
                discountId: quote.discount?.id,
                discountName: quote.discount?.name,
                promoCode: quote.discount?.code,
                provider: PROVIDER,
                status: SubscriptionStatus.PENDING,
                activeKey: `${PROVIDER}:${business.id}`,
                baseAmount: quote.basePrice,
                discountAmount: quote.discountAmount,
                amount: quote.finalPrice,
                currency: quote.currency,
                interval: quote.interval,
                intervalCount: quote.intervalCount,
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          request = await this.findByKey(dto.idempotencyKey);
          if (!request) {
            throw new ConflictException(
              'La URL solicitada ya está reservada. Elige otra para continuar.',
            );
          }
          this.assertToken(request.onboardingTokenHash, tokenHash);
        } else {
          throw error;
        }
      }

      request ??= await this.findByKey(dto.idempotencyKey);
    }

    if (!request?.businessId || !request.business?.subscriptions[0]) {
      throw new ConflictException('No fue posible preparar la suscripción.');
    }

    const appUrl = this.configService.getOrThrow<string>('PUBLIC_APP_URL');
    const backUrl = `${appUrl}/suscripcion/resultado?request=${request.id}&token=${encodeURIComponent(dto.onboardingToken)}`;
    await this.subscriptionsService.authorizeExistingSubscription(
      request.business.subscriptions[0].id,
      backUrl,
    );

    await this.prisma.planRequest.updateMany({
      where: { id: request.id, status: PlanRequestStatus.NEW },
      data: { status: PlanRequestStatus.CHECKOUT_PENDING },
    });

    return this.getStatus(request.id, dto.onboardingToken);
  }

  async getStatus(id: number, token: string) {
    const request = await this.prisma.planRequest.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            subscriptions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                plan: { select: { code: true, name: true } },
                payments: {
                  where: { status: SubscriptionPaymentStatus.APPROVED },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                  select: { paidAt: true },
                },
              },
            },
          },
        },
      },
    });
    if (!request?.onboardingTokenHash) {
      throw new NotFoundException('El proceso de contratación no existe.');
    }
    this.assertToken(request.onboardingTokenHash, this.hashToken(token));

    const subscription = request.business?.subscriptions[0];
    if (!subscription || !request.business) {
      throw new NotFoundException('La suscripción todavía no está disponible.');
    }

    return {
      requestId: request.id,
      requestStatus: request.status,
      business: {
        name: request.business.name,
        desiredSlug: request.desiredSlug,
        status: request.business.status,
      },
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plan,
        amount: subscription.amount,
        currency: subscription.currency,
        authorizationUrl:
          request.status === PlanRequestStatus.CHECKOUT_PENDING
            ? subscription.authorizationUrl
            : null,
        paymentConfirmed: subscription.payments.length > 0,
        paidAt: subscription.payments[0]?.paidAt ?? null,
      },
    };
  }

  private findByKey(idempotencyKey: string) {
    return this.prisma.planRequest.findUnique({
      where: { onboardingKey: idempotencyKey },
      include: {
        business: {
          include: {
            subscriptions: {
              orderBy: { createdAt: 'desc' as const },
              take: 1,
            },
          },
        },
      },
    });
  }

  private assertToken(storedHash: string | null, receivedHash: string) {
    if (!storedHash) throw new UnauthorizedException('Acceso no autorizado.');
    const stored = Buffer.from(storedHash, 'hex');
    const received = Buffer.from(receivedHash, 'hex');
    if (
      stored.length !== received.length ||
      !timingSafeEqual(stored, received)
    ) {
      throw new UnauthorizedException('Acceso no autorizado.');
    }
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private normalizePhone(phone: string) {
    const trimmed = phone.trim();
    const digits = trimmed.replace(/\D/g, '');
    return trimmed.startsWith('+') ? `+${digits}` : digits;
  }
}

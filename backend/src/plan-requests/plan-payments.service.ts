import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PlanCheckout,
  PlanPaymentStatus,
  PlanRequestStatus,
  Prisma,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

import { MercadoPagoWebhookVerifier } from '../payments/mercado-pago-webhook-verifier';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlanPaymentsService {
  private readonly logger = new Logger(PlanPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly webhookVerifier: MercadoPagoWebhookVerifier,
  ) {}

  private getMercadoPagoClients() {
    const enabled = this.configService.get<boolean>(
      'MERCADO_PAGO_ENABLED',
      false,
    );
    const accessToken = this.configService.get<string>(
      'MERCADO_PAGO_ACCESS_TOKEN',
    );

    if (!enabled || !accessToken) {
      throw new ServiceUnavailableException(
        'Mercado Pago todavía no está habilitado. Configura las credenciales de prueba para continuar.',
      );
    }

    const client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 8_000 },
    });

    return {
      preference: new Preference(client),
      payment: new Payment(client),
    };
  }

  async createCheckout(planRequestId: number, checkoutToken: string) {
    const checkoutTokenHash = createHash('sha256')
      .update(checkoutToken)
      .digest('hex');
    const request = await this.prisma.planRequest.findFirst({
      where: { id: planRequestId, checkoutTokenHash },
      include: { discount: true },
    });

    if (!request) {
      throw new NotFoundException('La solicitud de plan no está disponible.');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { code: request.plan },
      select: { name: true },
    });

    if (!plan) {
      throw new NotFoundException('El plan seleccionado no está disponible.');
    }

    const paidCheckout = await this.prisma.planCheckout.findFirst({
      where: { planRequestId, status: PlanPaymentStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
    });

    if (paidCheckout) {
      throw new ConflictException('Esta solicitud ya tiene un pago aprobado.');
    }

    const now = new Date();
    const reusableCheckout = await this.prisma.planCheckout.findFirst({
      where: {
        planRequestId,
        status: { in: [PlanPaymentStatus.CREATED, PlanPaymentStatus.PENDING] },
        initPoint: { not: null },
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (reusableCheckout?.initPoint) {
      return this.toCheckoutResponse(reusableCheckout);
    }

    await this.prisma.planCheckout.updateMany({
      where: {
        planRequestId,
        status: { in: [PlanPaymentStatus.CREATED, PlanPaymentStatus.PENDING] },
        expiresAt: { lte: now },
      },
      data: { status: PlanPaymentStatus.CANCELLED, activeKey: null },
    });

    const expirationHours = this.configService.get<number>(
      'MERCADO_PAGO_CHECKOUT_EXPIRATION_HOURS',
      24,
    );
    const expiresAt = new Date(
      now.getTime() + expirationHours * 60 * 60 * 1000,
    );
    let checkout: PlanCheckout;

    try {
      checkout = await this.prisma.planCheckout.create({
        data: {
          planRequestId,
          activeKey: String(planRequestId),
          plan: request.plan,
          basePrice: request.basePrice,
          discountAmount: request.discountAmount,
          finalAmount: request.monthlyPrice,
          discountId: request.discountId,
          discountName: request.discount?.name,
          promoCode: request.promoCode,
          expiresAt,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrentCheckout = await this.prisma.planCheckout.findFirst({
          where: {
            planRequestId,
            status: {
              in: [PlanPaymentStatus.CREATED, PlanPaymentStatus.PENDING],
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (concurrentCheckout?.initPoint) {
          return this.toCheckoutResponse(concurrentCheckout);
        }

        throw new ConflictException(
          'El pago ya se está preparando. Inténtalo nuevamente en unos segundos.',
        );
      }
      throw error;
    }

    try {
      const { preference } = this.getMercadoPagoClients();
      const publicAppUrl =
        this.configService.getOrThrow<string>('PUBLIC_APP_URL');
      const publicApiUrl =
        this.configService.getOrThrow<string>('PUBLIC_API_URL');
      const resultUrl = `${publicAppUrl}/pago/resultado?checkout=${checkout.id}`;
      const preferenceResult = await preference.create({
        body: {
          items: [
            {
              id: `agendaya-${request.plan.toLowerCase()}`,
              title: `Plan ${plan.name} de AgendaYa - primer mes`,
              description: `${request.businessName} · ${request.teamSize} personas`,
              quantity: 1,
              currency_id: 'CLP',
              unit_price: request.monthlyPrice,
            },
          ],
          payer: { email: request.email, name: request.contactName },
          external_reference: checkout.id,
          metadata: {
            checkout_id: checkout.id,
            plan_request_id: request.id,
          },
          back_urls: {
            success: `${resultUrl}&result=success`,
            pending: `${resultUrl}&result=pending`,
            failure: `${resultUrl}&result=failure`,
          },
          auto_return: 'approved',
          notification_url: `${publicApiUrl}/payments/mercado-pago/webhook`,
          statement_descriptor: 'AGENDAYA',
          expires: true,
          expiration_date_from: now.toISOString(),
          expiration_date_to: expiresAt.toISOString(),
        },
        requestOptions: { idempotencyKey: checkout.id },
      });
      const useSandbox = this.configService.get<boolean>(
        'MERCADO_PAGO_USE_SANDBOX',
        true,
      );
      const initPoint = useSandbox
        ? preferenceResult.sandbox_init_point
        : preferenceResult.init_point;

      if (!preferenceResult.id || !initPoint) {
        throw new Error('Mercado Pago no entregó una URL de checkout.');
      }

      const updated = await this.prisma.$transaction(async (transaction) => {
        const saved = await transaction.planCheckout.update({
          where: { id: checkout.id },
          data: {
            status: PlanPaymentStatus.PENDING,
            mercadoPagoPreferenceId: preferenceResult.id,
            initPoint,
          },
        });
        await transaction.planRequest.update({
          where: { id: request.id },
          data: { status: PlanRequestStatus.CHECKOUT_PENDING },
        });
        return saved;
      });

      return this.toCheckoutResponse(updated);
    } catch (error) {
      await this.prisma.planCheckout.update({
        where: { id: checkout.id },
        data: { status: PlanPaymentStatus.ERROR, activeKey: null },
      });

      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error('No fue posible crear la preferencia de Mercado Pago.');
      throw new BadGatewayException(
        'No pudimos iniciar el pago con Mercado Pago. Inténtalo nuevamente.',
      );
    }
  }

  async processWebhook(input: {
    xSignature?: string | string[];
    xRequestId?: string | string[];
    dataId?: string | string[];
    type?: string;
  }) {
    this.webhookVerifier.verify({ ...input, topic: 'payment' });

    if (input.type && input.type !== 'payment') {
      return { received: true };
    }

    const paymentId = Array.isArray(input.dataId)
      ? input.dataId[0]
      : input.dataId;

    if (!paymentId) return { received: true };

    const { payment } = this.getMercadoPagoClients();
    const mercadoPagoPayment = await payment.get({ id: paymentId });
    const checkoutId = mercadoPagoPayment.external_reference;

    if (!checkoutId) {
      this.logger.warn(`Pago ${paymentId} sin external_reference.`);
      return { received: true };
    }

    const checkout = await this.prisma.planCheckout.findUnique({
      where: { id: checkoutId },
    });

    if (!checkout) {
      this.logger.warn(`Pago ${paymentId} no corresponde a un checkout local.`);
      return { received: true };
    }

    const amountMatches =
      mercadoPagoPayment.transaction_amount === checkout.finalAmount;
    const currencyMatches =
      mercadoPagoPayment.currency_id === checkout.currency;

    if (!amountMatches || !currencyMatches) {
      this.logger.error(
        `Pago ${paymentId} rechazado por monto o moneda inconsistente.`,
      );
      await this.prisma.planCheckout.update({
        where: { id: checkout.id },
        data: {
          status: PlanPaymentStatus.ERROR,
          activeKey: null,
          mercadoPagoPaymentId: String(paymentId),
          mercadoPagoStatus: mercadoPagoPayment.status,
          mercadoPagoStatusDetail: mercadoPagoPayment.status_detail,
          liveMode: mercadoPagoPayment.live_mode,
        },
      });
      return { received: true };
    }

    const status = this.mapPaymentStatus(mercadoPagoPayment.status);
    const alreadyApproved = checkout.status === PlanPaymentStatus.APPROVED;

    if (
      checkout.status === PlanPaymentStatus.REFUNDED ||
      checkout.status === PlanPaymentStatus.CHARGED_BACK ||
      (alreadyApproved &&
        status !== PlanPaymentStatus.REFUNDED &&
        status !== PlanPaymentStatus.CHARGED_BACK)
    ) {
      return { received: true };
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.planCheckout.update({
        where: { id: checkout.id },
        data: {
          status,
          activeKey:
            status === PlanPaymentStatus.PENDING ? checkout.activeKey : null,
          mercadoPagoPaymentId: String(paymentId),
          mercadoPagoStatus: mercadoPagoPayment.status,
          mercadoPagoStatusDetail: mercadoPagoPayment.status_detail,
          liveMode: mercadoPagoPayment.live_mode,
          paidAt:
            status === PlanPaymentStatus.APPROVED && !alreadyApproved
              ? new Date(mercadoPagoPayment.date_approved ?? Date.now())
              : undefined,
        },
      });

      if (status === PlanPaymentStatus.APPROVED) {
        await transaction.planRequest.update({
          where: { id: checkout.planRequestId },
          data: { status: PlanRequestStatus.PAID },
        });
      } else if (
        status === PlanPaymentStatus.REFUNDED ||
        status === PlanPaymentStatus.CHARGED_BACK
      ) {
        await transaction.planRequest.update({
          where: { id: checkout.planRequestId },
          data: { status: PlanRequestStatus.PAYMENT_REVERSED },
        });
      }
    });

    return { received: true };
  }

  async getCheckoutStatus(id: string) {
    const checkout = await this.prisma.planCheckout.findUnique({
      where: { id },
      select: {
        id: true,
        plan: true,
        finalAmount: true,
        currency: true,
        status: true,
        mercadoPagoStatusDetail: true,
        paidAt: true,
        expiresAt: true,
        planRequest: { select: { businessName: true } },
      },
    });

    if (!checkout) throw new NotFoundException('El pago no está disponible.');

    if (
      checkout.expiresAt &&
      checkout.expiresAt <= new Date() &&
      (checkout.status === PlanPaymentStatus.CREATED ||
        checkout.status === PlanPaymentStatus.PENDING)
    ) {
      return { ...checkout, status: PlanPaymentStatus.CANCELLED };
    }

    return checkout;
  }

  private mapPaymentStatus(status?: string): PlanPaymentStatus {
    switch (status) {
      case 'approved':
        return PlanPaymentStatus.APPROVED;
      case 'pending':
      case 'in_process':
      case 'authorized':
        return PlanPaymentStatus.PENDING;
      case 'rejected':
        return PlanPaymentStatus.REJECTED;
      case 'cancelled':
        return PlanPaymentStatus.CANCELLED;
      case 'refunded':
        return PlanPaymentStatus.REFUNDED;
      case 'charged_back':
        return PlanPaymentStatus.CHARGED_BACK;
      default:
        return PlanPaymentStatus.ERROR;
    }
  }

  private toCheckoutResponse(checkout: {
    id: string;
    initPoint: string | null;
    expiresAt: Date | null;
    finalAmount: number;
    currency: string;
    status: PlanPaymentStatus;
  }) {
    return {
      checkoutId: checkout.id,
      initPoint: checkout.initPoint,
      expiresAt: checkout.expiresAt,
      finalAmount: checkout.finalAmount,
      currency: checkout.currency,
      status: checkout.status,
    };
  }
}

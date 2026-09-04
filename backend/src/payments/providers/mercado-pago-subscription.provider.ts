import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingInterval,
  PaymentProvider,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { Invoice, MercadoPagoConfig, Payment, PreApproval } from 'mercadopago';
import type { InvoiceResponse } from 'mercadopago/dist/clients/invoice/commonTypes';
import type { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import type { PreApprovalResponse } from 'mercadopago/dist/clients/preApproval/commonTypes';

import type {
  CreateProviderSubscriptionInput,
  ProviderInvoiceSnapshot,
  ProviderPaymentSnapshot,
  ProviderSubscriptionSnapshot,
  SubscriptionPaymentProvider,
} from './payment-provider.interface';
import { ProviderResourceNotFoundError } from './payment-provider.interface';

@Injectable()
export class MercadoPagoSubscriptionProvider implements SubscriptionPaymentProvider {
  private readonly logger = new Logger(MercadoPagoSubscriptionProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async createSubscription(
    input: CreateProviderSubscriptionInput,
  ): Promise<ProviderSubscriptionSnapshot> {
    try {
      const response = await this.clients().subscription.create({
        body: {
          payer_email: input.payerEmail,
          reason: input.reason,
          external_reference: input.externalReference,
          back_url: input.backUrl,
          status: 'pending',
          auto_recurring: {
            frequency: this.frequency(input.interval, input.intervalCount),
            frequency_type: 'months',
            transaction_amount: input.amount,
            currency_id: input.currency,
          },
        },
        requestOptions: { idempotencyKey: input.idempotencyKey },
      });

      return this.toSnapshot(response);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(
        `No fue posible crear la suscripción en Mercado Pago: ${this.safeErrorSummary(error)}`,
      );
      throw new BadGatewayException(
        'No pudimos iniciar la suscripción con Mercado Pago. Inténtalo nuevamente.',
      );
    }
  }

  async getSubscription(
    providerSubscriptionId: string,
  ): Promise<ProviderSubscriptionSnapshot> {
    try {
      const response = await this.clients().subscription.get({
        id: providerSubscriptionId,
      });
      return this.toSnapshot(response);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      if (this.isNotFound(error)) {
        throw new ProviderResourceNotFoundError(
          'Suscripción',
          providerSubscriptionId,
        );
      }
      this.logger.error(
        `No fue posible consultar la suscripción ${providerSubscriptionId} en Mercado Pago.`,
      );
      throw new BadGatewayException(
        'No pudimos consultar la suscripción en Mercado Pago.',
      );
    }
  }

  async cancelSubscription(providerSubscriptionId: string) {
    const current = await this.getSubscription(providerSubscriptionId);
    if (current.status === SubscriptionStatus.CANCELED) return current;

    return this.updateSubscriptionStatus(
      providerSubscriptionId,
      'cancelled',
      'cancelar',
    );
  }

  async getInvoice(providerInvoiceId: string) {
    try {
      const response = await this.clients().invoice.get({
        id: providerInvoiceId,
      });
      return this.toInvoiceSnapshot(response);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      if (this.isNotFound(error)) {
        throw new ProviderResourceNotFoundError('Factura', providerInvoiceId);
      }
      this.logger.error(
        `No fue posible consultar la factura ${providerInvoiceId} en Mercado Pago.`,
      );
      throw new BadGatewayException(
        'No pudimos consultar la factura en Mercado Pago.',
      );
    }
  }

  async findInvoiceByPaymentId(providerPaymentId: string) {
    const numericPaymentId = Number(providerPaymentId);
    if (!Number.isSafeInteger(numericPaymentId) || numericPaymentId <= 0) {
      return null;
    }

    try {
      const response = await this.clients().invoice.search({
        options: { payment_id: numericPaymentId, limit: 1 },
      });
      const invoice = response.results?.[0];
      return invoice ? this.toInvoiceSnapshot(invoice) : null;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(
        `No fue posible buscar la factura del pago ${providerPaymentId} en Mercado Pago.`,
      );
      throw new BadGatewayException(
        'No pudimos consultar la factura en Mercado Pago.',
      );
    }
  }

  async getPayment(providerPaymentId: string) {
    try {
      const response = await this.clients().payment.get({
        id: providerPaymentId,
      });
      return this.toPaymentSnapshot(response);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      if (this.isNotFound(error)) {
        throw new ProviderResourceNotFoundError('Pago', providerPaymentId);
      }
      this.logger.error(
        `No fue posible consultar el pago ${providerPaymentId} en Mercado Pago.`,
      );
      throw new BadGatewayException(
        'No pudimos consultar el pago en Mercado Pago.',
      );
    }
  }

  private clients() {
    const enabled = this.configService.get<boolean>(
      'MERCADO_PAGO_ENABLED',
      false,
    );
    const accessToken = this.configService.get<string>(
      'MERCADO_PAGO_ACCESS_TOKEN',
    );

    if (!enabled || !accessToken) {
      throw new ServiceUnavailableException(
        'Mercado Pago todavía no está habilitado.',
      );
    }

    const config = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 8_000 },
    });
    return {
      subscription: new PreApproval(config),
      invoice: new Invoice(config),
      payment: new Payment(config),
    };
  }

  private async updateSubscriptionStatus(
    providerSubscriptionId: string,
    status: 'cancelled',
    action: string,
  ): Promise<ProviderSubscriptionSnapshot> {
    try {
      const clients = this.clients();
      await clients.subscription.update({
        id: providerSubscriptionId,
        body: { status },
      });
      return this.toSnapshot(
        await clients.subscription.get({ id: providerSubscriptionId }),
      );
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      if (this.isNotFound(error)) {
        throw new ProviderResourceNotFoundError(
          'Suscripción',
          providerSubscriptionId,
        );
      }
      this.logger.error(
        `No fue posible ${action} la suscripción ${providerSubscriptionId} en Mercado Pago: ${this.safeErrorSummary(error)}`,
      );
      throw new BadGatewayException(
        `No pudimos ${action} la suscripción en Mercado Pago. Inténtalo nuevamente.`,
      );
    }
  }

  private frequency(interval: BillingInterval, intervalCount: number) {
    return interval === BillingInterval.YEAR
      ? intervalCount * 12
      : intervalCount;
  }

  private toSnapshot(
    response: PreApprovalResponse,
  ): ProviderSubscriptionSnapshot {
    if (!response.id) {
      throw new Error('Mercado Pago no entregó un ID de suscripción.');
    }

    return {
      provider: PaymentProvider.MERCADO_PAGO,
      providerSubscriptionId: response.id,
      providerPayerId:
        response.payer_id === undefined ? null : String(response.payer_id),
      externalReference: response.external_reference ?? null,
      applicationId:
        response.application_id === undefined
          ? null
          : String(response.application_id),
      collectorId:
        response.collector_id === undefined
          ? null
          : String(response.collector_id),
      amount: response.auto_recurring?.transaction_amount ?? null,
      currency: response.auto_recurring?.currency_id ?? null,
      status: this.mapStatus(response.status),
      rawStatus: response.status ?? null,
      rawStatusDetail: null,
      authorizationUrl: response.init_point ?? null,
      paymentMethodId: response.payment_method_id ?? null,
      nextPaymentAt: this.parseDate(response.next_payment_date),
      providerUpdatedAt: this.parseDate(response.last_modified),
    };
  }

  private toInvoiceSnapshot(
    response: InvoiceResponse,
  ): ProviderInvoiceSnapshot {
    if (response.id === undefined) {
      throw new Error('Mercado Pago no entregó un ID de factura.');
    }

    return {
      providerInvoiceId: String(response.id),
      providerSubscriptionId: response.preapproval_id ?? null,
      providerPaymentId:
        response.payment?.id === undefined ? null : String(response.payment.id),
      externalReference: response.external_reference ?? null,
      amount: response.transaction_amount ?? null,
      currency: response.currency_id ?? null,
      rawStatus: response.payment?.status ?? response.status ?? null,
      debitDate: this.parseDate(response.debit_date),
      providerUpdatedAt: this.parseDate(response.last_modified),
    };
  }

  private toPaymentSnapshot(
    response: PaymentResponse,
  ): ProviderPaymentSnapshot {
    if (response.id === undefined) {
      throw new Error('Mercado Pago no entregó un ID de pago.');
    }

    return {
      providerPaymentId: String(response.id),
      externalReference: response.external_reference ?? null,
      collectorId:
        response.collector_id === undefined
          ? null
          : String(response.collector_id),
      amount: response.transaction_amount ?? null,
      currency: response.currency_id ?? null,
      status: this.mapPaymentStatus(response.status),
      rawStatus: response.status ?? null,
      rawStatusDetail: response.status_detail ?? null,
      paymentMethodId: response.payment_method_id ?? null,
      cardLastFourDigits: response.card?.last_four_digits ?? null,
      liveMode: response.live_mode ?? null,
      createdAt: this.parseDate(response.date_created),
      paidAt: this.parseDate(response.date_approved),
      providerUpdatedAt: this.parseDate(response.date_last_updated),
    };
  }

  private mapPaymentStatus(status?: string): SubscriptionPaymentStatus {
    switch (status?.toLowerCase()) {
      case 'approved':
        return SubscriptionPaymentStatus.APPROVED;
      case 'rejected':
        return SubscriptionPaymentStatus.REJECTED;
      case 'cancelled':
      case 'canceled':
        return SubscriptionPaymentStatus.CANCELED;
      case 'refunded':
        return SubscriptionPaymentStatus.REFUNDED;
      case 'charged_back':
        return SubscriptionPaymentStatus.CHARGED_BACK;
      case 'pending':
      case 'in_process':
      case 'authorized':
        return SubscriptionPaymentStatus.PENDING;
      default:
        return SubscriptionPaymentStatus.ERROR;
    }
  }

  private isNotFound(error: unknown) {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as {
      status?: unknown;
      statusCode?: unknown;
      cause?: { status?: unknown };
    };
    return (
      candidate.status === 404 ||
      candidate.statusCode === 404 ||
      candidate.cause?.status === 404
    );
  }

  private safeErrorSummary(error: unknown) {
    if (!error || typeof error !== 'object') return 'respuesta desconocida';
    const candidate = error as {
      status?: unknown;
      statusCode?: unknown;
      error?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    const causes = Array.isArray(candidate.cause)
      ? candidate.cause.slice(0, 5).map((cause: unknown) => {
          if (!cause || typeof cause !== 'object') return {};
          const item = cause as { code?: unknown; description?: unknown };
          return {
            code: this.safeText(item.code),
            description: this.safeText(item.description),
          };
        })
      : undefined;

    return JSON.stringify({
      status: candidate.status ?? candidate.statusCode ?? null,
      error: this.safeText(candidate.error),
      message: this.safeText(candidate.message),
      causes,
    });
  }

  private safeText(value: unknown) {
    return typeof value === 'string' ? value.slice(0, 300) : null;
  }

  private mapStatus(status?: string): SubscriptionStatus {
    switch (status?.toLowerCase()) {
      case 'authorized':
        return SubscriptionStatus.ACTIVE;
      case 'paused':
        return SubscriptionStatus.SUSPENDED;
      case 'cancelled':
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'pending':
      default:
        return SubscriptionStatus.PENDING;
    }
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}

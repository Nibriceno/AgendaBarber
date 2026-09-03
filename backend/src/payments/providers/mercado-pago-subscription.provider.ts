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
  SubscriptionStatus,
} from '@prisma/client';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import type { PreApprovalResponse } from 'mercadopago/dist/clients/preApproval/commonTypes';

import type {
  CreateProviderSubscriptionInput,
  ProviderSubscriptionSnapshot,
  SubscriptionPaymentProvider,
} from './payment-provider.interface';

@Injectable()
export class MercadoPagoSubscriptionProvider implements SubscriptionPaymentProvider {
  private readonly logger = new Logger(MercadoPagoSubscriptionProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async createSubscription(
    input: CreateProviderSubscriptionInput,
  ): Promise<ProviderSubscriptionSnapshot> {
    try {
      const response = await this.client().create({
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
      this.logger.error('No fue posible crear la suscripción en Mercado Pago.');
      throw new BadGatewayException(
        'No pudimos iniciar la suscripción con Mercado Pago. Inténtalo nuevamente.',
      );
    }
  }

  async getSubscription(
    providerSubscriptionId: string,
  ): Promise<ProviderSubscriptionSnapshot> {
    try {
      const response = await this.client().get({ id: providerSubscriptionId });
      return this.toSnapshot(response);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(
        `No fue posible consultar la suscripción ${providerSubscriptionId} en Mercado Pago.`,
      );
      throw new BadGatewayException(
        'No pudimos consultar la suscripción en Mercado Pago.',
      );
    }
  }

  private client() {
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

    return new PreApproval(
      new MercadoPagoConfig({ accessToken, options: { timeout: 8_000 } }),
    );
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
      status: this.mapStatus(response.status),
      rawStatus: response.status ?? null,
      rawStatusDetail: null,
      authorizationUrl: response.init_point ?? null,
      paymentMethodId: response.payment_method_id ?? null,
      nextPaymentAt: this.parseDate(response.next_payment_date),
      providerUpdatedAt: this.parseDate(response.last_modified),
    };
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

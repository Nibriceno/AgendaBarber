import { ServiceUnavailableException } from '@nestjs/common';
import {
  BillingInterval,
  PaymentProvider,
  SubscriptionStatus,
} from '@prisma/client';
import { PreApproval } from 'mercadopago';

import { MercadoPagoSubscriptionProvider } from './mercado-pago-subscription.provider';

describe('MercadoPagoSubscriptionProvider', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates a monthly pending subscription without receiving card data', async () => {
    const config = {
      get: jest.fn((key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          MERCADO_PAGO_ENABLED: true,
          MERCADO_PAGO_ACCESS_TOKEN: 'TEST-access-token',
        };
        return values[key] ?? fallback;
      }),
    };
    const create = jest
      .spyOn(PreApproval.prototype, 'create')
      .mockResolvedValue({
        id: 'preapproval-123',
        status: 'pending',
        init_point: 'https://www.mercadopago.cl/subscriptions/checkout',
        external_reference: 'subscription-123',
        api_response: { status: 201, headers: [] },
      });
    const provider = new MercadoPagoSubscriptionProvider(config as never);

    const result = await provider.createSubscription({
      idempotencyKey: 'subscription-123',
      externalReference: 'subscription-123',
      payerEmail: 'owner@example.com',
      reason: 'Plan Esencial de AgendaYa',
      amount: 19_990,
      currency: 'CLP',
      interval: BillingInterval.MONTH,
      intervalCount: 1,
      backUrl: 'https://agendaya.cl/suscripcion/resultado',
    });

    expect(create).toHaveBeenCalledWith({
      body: {
        payer_email: 'owner@example.com',
        reason: 'Plan Esencial de AgendaYa',
        external_reference: 'subscription-123',
        back_url: 'https://agendaya.cl/suscripcion/resultado',
        status: 'pending',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 19_990,
          currency_id: 'CLP',
        },
      },
      requestOptions: { idempotencyKey: 'subscription-123' },
    });
    expect(result).toEqual(
      expect.objectContaining({
        provider: PaymentProvider.MERCADO_PAGO,
        providerSubscriptionId: 'preapproval-123',
        status: SubscriptionStatus.PENDING,
      }),
    );
  });

  it('does not call Mercado Pago when the integration is disabled', async () => {
    const config = {
      get: jest.fn((_key: string, fallback?: unknown) => fallback),
    };
    const create = jest.spyOn(PreApproval.prototype, 'create');
    const provider = new MercadoPagoSubscriptionProvider(config as never);

    await expect(
      provider.createSubscription({
        idempotencyKey: 'subscription-123',
        externalReference: 'subscription-123',
        payerEmail: 'owner@example.com',
        reason: 'Plan Esencial de AgendaYa',
        amount: 19_990,
        currency: 'CLP',
        interval: BillingInterval.MONTH,
        intervalCount: 1,
        backUrl: 'https://agendaya.cl/suscripcion/resultado',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(create).not.toHaveBeenCalled();
  });
});

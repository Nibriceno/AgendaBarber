import { ServiceUnavailableException } from '@nestjs/common';
import {
  BillingInterval,
  PaymentProvider,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { Invoice, Payment, PreApproval } from 'mercadopago';

import { MercadoPagoSubscriptionProvider } from './mercado-pago-subscription.provider';

describe('MercadoPagoSubscriptionProvider', () => {
  const enabledConfig = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        MERCADO_PAGO_ENABLED: true,
        MERCADO_PAGO_ACCESS_TOKEN: 'TEST-access-token',
      };
      return values[key] ?? fallback;
    }),
  };

  afterEach(() => jest.restoreAllMocks());

  it('creates a monthly pending subscription without receiving card data', async () => {
    const create = jest
      .spyOn(PreApproval.prototype, 'create')
      .mockResolvedValue({
        id: 'preapproval-123',
        status: 'pending',
        init_point: 'https://www.mercadopago.cl/subscriptions/checkout',
        external_reference: 'subscription-123',
        api_response: { status: 201, headers: [] },
      });
    const provider = new MercadoPagoSubscriptionProvider(
      enabledConfig as never,
    );

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

  it('maps recurring invoices and payments without exposing card data', async () => {
    jest.spyOn(Invoice.prototype, 'get').mockResolvedValue({
      id: 88,
      preapproval_id: 'preapproval-123',
      external_reference: 'subscription-123',
      transaction_amount: 19_990,
      currency_id: 'CLP',
      debit_date: '2026-09-03T12:00:00.000Z',
      payment: { id: '99', status: 'processed', status_detail: 'accredited' },
    } as never);
    jest.spyOn(Payment.prototype, 'get').mockResolvedValue({
      id: 99,
      external_reference: 'subscription-123',
      collector_id: 1234,
      transaction_amount: 19_990,
      currency_id: 'CLP',
      status: 'approved',
      status_detail: 'accredited',
      payment_method_id: 'visa',
      card: { last_four_digits: '1234' },
      live_mode: false,
      date_approved: '2026-09-03T12:01:00.000Z',
    } as never);
    const provider = new MercadoPagoSubscriptionProvider(
      enabledConfig as never,
    );

    const invoice = await provider.getInvoice('88');
    const payment = await provider.getPayment('99');

    expect(invoice).toEqual(
      expect.objectContaining({
        providerInvoiceId: '88',
        providerSubscriptionId: 'preapproval-123',
        providerPaymentId: '99',
      }),
    );
    expect(payment).toEqual(
      expect.objectContaining({
        providerPaymentId: '99',
        status: SubscriptionPaymentStatus.APPROVED,
        paymentMethodId: 'visa',
        cardLastFourDigits: '1234',
      }),
    );
    expect(payment).not.toHaveProperty('cardNumber');
  });

  it('cancels the provider subscription before ending local access', async () => {
    const update = jest
      .spyOn(PreApproval.prototype, 'update')
      .mockResolvedValue({ id: 'preapproval-123', status: 'cancelled' });
    jest
      .spyOn(PreApproval.prototype, 'get')
      .mockResolvedValueOnce({
        id: 'preapproval-123',
        status: 'authorized',
        external_reference: 'subscription-123',
        api_response: { status: 200, headers: [] },
      })
      .mockResolvedValueOnce({
        id: 'preapproval-123',
        status: 'cancelled',
        external_reference: 'subscription-123',
        api_response: { status: 200, headers: [] },
      });
    const provider = new MercadoPagoSubscriptionProvider(
      enabledConfig as never,
    );

    const result = await provider.cancelSubscription('preapproval-123');

    expect(update).toHaveBeenCalledWith({
      id: 'preapproval-123',
      body: { status: 'cancelled' },
    });
    expect(result.status).toBe(SubscriptionStatus.CANCELED);
  });

  it('treats an already canceled provider subscription as a successful retry', async () => {
    const update = jest.spyOn(PreApproval.prototype, 'update');
    jest.spyOn(PreApproval.prototype, 'get').mockResolvedValue({
      id: 'preapproval-123',
      status: 'cancelled',
      external_reference: 'subscription-123',
      api_response: { status: 200, headers: [] },
    });
    const provider = new MercadoPagoSubscriptionProvider(
      enabledConfig as never,
    );

    await expect(
      provider.cancelSubscription('preapproval-123'),
    ).resolves.toEqual(
      expect.objectContaining({ status: SubscriptionStatus.CANCELED }),
    );
    expect(update).not.toHaveBeenCalled();
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

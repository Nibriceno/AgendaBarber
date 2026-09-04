/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  PlanPaymentStatus,
  PlanRequestStatus,
  SubscriptionPlan,
} from '@prisma/client';
import { createHmac } from 'node:crypto';
import { Payment } from 'mercadopago';

import { MercadoPagoWebhookVerifier } from '../payments/mercado-pago-webhook-verifier';
import { PlanPaymentsService } from './plan-payments.service';

describe('PlanPaymentsService', () => {
  const transaction = {
    planCheckout: { update: jest.fn() },
    planRequest: { update: jest.fn() },
  };
  const prisma = {
    planRequest: { findFirst: jest.fn() },
    planCheckout: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (client: typeof transaction) => unknown) =>
      Promise.resolve(callback(transaction)),
    ),
  };
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        MERCADO_PAGO_ENABLED: true,
        MERCADO_PAGO_ACCESS_TOKEN: 'TEST-access-token',
        MERCADO_PAGO_WEBHOOK_SECRET: 'webhook-secret',
        MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS: 300,
      };
      return values[key] ?? fallback;
    }),
  };
  let service: PlanPaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlanPaymentsService(
      prisma as never,
      config as never,
      new MercadoPagoWebhookVerifier(config as never),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not reveal a request when the checkout capability token is invalid', async () => {
    prisma.planRequest.findFirst.mockResolvedValue(null);

    await expect(service.createCheckout(42, 'invalid-token')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.planCheckout.create).not.toHaveBeenCalled();
  });

  it('rejects an unsigned webhook before querying Mercado Pago', async () => {
    const paymentGet = jest.spyOn(Payment.prototype, 'get');

    await expect(
      service.processWebhook({ dataId: '123', type: 'payment' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(paymentGet).not.toHaveBeenCalled();
  });

  it('approves only a signed payment whose amount and currency match', async () => {
    const input = signedWebhook('123', 'request-1');
    jest.spyOn(Payment.prototype, 'get').mockResolvedValue({
      id: 123,
      external_reference: 'd84e8f5a-55e3-44b5-bf02-2ad8a86b2d95',
      transaction_amount: 19_990,
      currency_id: 'CLP',
      status: 'approved',
      status_detail: 'accredited',
      live_mode: false,
      date_approved: '2026-09-02T12:00:00.000Z',
    } as never);
    prisma.planCheckout.findUnique.mockResolvedValue({
      id: 'd84e8f5a-55e3-44b5-bf02-2ad8a86b2d95',
      planRequestId: 21,
      plan: SubscriptionPlan.ESSENTIAL,
      finalAmount: 19_990,
      currency: 'CLP',
      status: PlanPaymentStatus.PENDING,
    });

    await service.processWebhook({ ...input, type: 'payment' });

    expect(transaction.planCheckout.update).toHaveBeenCalledWith({
      where: { id: 'd84e8f5a-55e3-44b5-bf02-2ad8a86b2d95' },
      data: expect.objectContaining({
        status: PlanPaymentStatus.APPROVED,
        mercadoPagoPaymentId: '123',
        paidAt: expect.any(Date),
      }),
    });
    expect(transaction.planRequest.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: { status: PlanRequestStatus.PAID },
    });
  });

  it('does not downgrade an approved payment when an older pending event arrives', async () => {
    const input = signedWebhook('124', 'request-2');
    jest.spyOn(Payment.prototype, 'get').mockResolvedValue({
      id: 124,
      external_reference: '3da2ab76-d622-443a-ad3d-4d09da967abb',
      transaction_amount: 29_990,
      currency_id: 'CLP',
      status: 'pending',
      live_mode: false,
    } as never);
    prisma.planCheckout.findUnique.mockResolvedValue({
      id: '3da2ab76-d622-443a-ad3d-4d09da967abb',
      planRequestId: 22,
      finalAmount: 29_990,
      currency: 'CLP',
      status: PlanPaymentStatus.APPROVED,
    });

    await service.processWebhook({ ...input, type: 'payment' });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  function signedWebhook(dataId: string, requestId: string) {
    const timestamp = String(Date.now());
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const signature = createHmac('sha256', 'webhook-secret')
      .update(manifest)
      .digest('hex');

    return {
      dataId,
      xRequestId: requestId,
      xSignature: `ts=${timestamp},v1=${signature}`,
    };
  }
});

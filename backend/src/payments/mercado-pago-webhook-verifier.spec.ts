import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';

import { MercadoPagoWebhookVerifier } from './mercado-pago-webhook-verifier';

describe('MercadoPagoWebhookVerifier', () => {
  const values: Record<string, unknown> = {
    MERCADO_PAGO_WEBHOOK_SECRET: 'webhook-secret',
    MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS: 300,
    MERCADO_PAGO_ALLOW_UNSIGNED_SUBSCRIPTION_WEBHOOKS: false,
  };
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
  };
  let verifier: MercadoPagoWebhookVerifier;

  beforeEach(() => {
    jest.clearAllMocks();
    values.MERCADO_PAGO_ALLOW_UNSIGNED_SUBSCRIPTION_WEBHOOKS = false;
    verifier = new MercadoPagoWebhookVerifier(config as never);
  });

  it('accepts a valid Mercado Pago HMAC signature', () => {
    const dataId = 'payment-123';
    const requestId = 'request-123';
    const timestamp = String(Date.now());
    const signature = createHmac('sha256', 'webhook-secret')
      .update(`id:${dataId};request-id:${requestId};ts:${timestamp};`)
      .digest('hex');

    expect(
      verifier.verify({
        dataId,
        xRequestId: requestId,
        xSignature: `ts=${timestamp},v1=${signature}`,
        topic: 'payment',
      }),
    ).toBe(true);
  });

  it('rejects an invalid signature', () => {
    expect(() =>
      verifier.verify({
        dataId: '123',
        xRequestId: 'request-123',
        xSignature: `ts=${Date.now()},v1=invalid`,
        topic: 'payment',
      }),
    ).toThrow(UnauthorizedException);
  });

  it('only accepts unsigned subscription notifications when explicitly enabled', () => {
    expect(() =>
      verifier.verify({
        dataId: 'preapproval-123',
        topic: 'subscription_preapproval',
      }),
    ).toThrow(UnauthorizedException);

    values.MERCADO_PAGO_ALLOW_UNSIGNED_SUBSCRIPTION_WEBHOOKS = true;
    expect(
      verifier.verify({
        dataId: 'preapproval-123',
        topic: 'subscription_preapproval',
      }),
    ).toBe(false);
  });

  it('never accepts an unsigned payment notification', () => {
    values.MERCADO_PAGO_ALLOW_UNSIGNED_SUBSCRIPTION_WEBHOOKS = true;
    expect(() => verifier.verify({ dataId: '123', topic: 'payment' })).toThrow(
      UnauthorizedException,
    );
  });
});

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { PaymentProvider, Prisma, WebhookEventStatus } from '@prisma/client';

import { ProviderResourceNotFoundError } from '../payments/providers/payment-provider.interface';
import { MercadoPagoWebhookService } from './mercado-pago-webhook.service';

describe('MercadoPagoWebhookService', () => {
  const event = {
    id: '46a32442-f6cf-4dde-970e-39caf0617f03',
    topic: 'subscription_preapproval',
    resourceId: 'preapproval-123',
    status: WebhookEventStatus.RECEIVED,
    attempts: 0,
    nextAttemptAt: null,
    processingStartedAt: null,
    updatedAt: new Date('2026-09-03T12:00:00.000Z'),
  };
  const prisma = {
    webhookEvent: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const config = {
    get: jest.fn((key: string) => (key === 'NODE_ENV' ? 'test' : undefined)),
  };
  const verifier = { verify: jest.fn().mockReturnValue(true) };
  const billingSync = { process: jest.fn() };
  let service: MercadoPagoWebhookService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MercadoPagoWebhookService(
      prisma as never,
      config as never,
      verifier as never,
      billingSync as never,
    );
  });

  it('stores a notification once and acknowledges its duplicate', async () => {
    prisma.webhookEvent.create
      .mockResolvedValueOnce({ id: event.id })
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );
    const input = {
      xSignature: 'ts=1,v1=signature',
      xRequestId: 'request-1',
      queryDataId: 'preapproval-123',
      queryType: 'subscription_preapproval',
      body: { id: 'event-1', data: { id: 'preapproval-123' } },
    };

    await expect(service.receive(input)).resolves.toEqual({ received: true });
    await expect(service.receive(input)).resolves.toEqual({ received: true });

    expect(prisma.webhookEvent.create).toHaveBeenCalledTimes(2);
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: PaymentProvider.MERCADO_PAGO,
        eventKey:
          'subscription_preapproval:event:ce36863f51b6baf9d16397ffb3e9af506b284a816f72d487e55943c1fd974d6d',
        signatureValidated: true,
      }),
      select: { id: true },
    });
  });

  it('marks a webhook for a nonexistent provider resource as ignored', async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue(event);
    prisma.webhookEvent.updateMany.mockResolvedValue({ count: 1 });
    prisma.webhookEvent.update.mockResolvedValue({});
    billingSync.process.mockRejectedValue(
      new ProviderResourceNotFoundError('Suscripción', event.resourceId),
    );

    await service.processEvent(event.id);

    expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
      where: { id: event.id },
      data: expect.objectContaining({
        status: WebhookEventStatus.IGNORED,
        processedAt: expect.any(Date),
      }),
    });
  });
});

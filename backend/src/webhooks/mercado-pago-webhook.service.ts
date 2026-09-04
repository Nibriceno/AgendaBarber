import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, Prisma, WebhookEventStatus } from '@prisma/client';
import { createHash } from 'node:crypto';

import { MercadoPagoWebhookVerifier } from '../payments/mercado-pago-webhook-verifier';
import { ProviderResourceNotFoundError } from '../payments/providers/payment-provider.interface';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoBillingSyncService } from './mercado-pago-billing-sync.service';

const SUPPORTED_TOPICS = new Set([
  'payment',
  'subscription_preapproval',
  'subscription_authorized_payment',
]);
const MAX_ATTEMPTS = 10;
const STALE_PROCESSING_MS = 5 * 60 * 1_000;

type WebhookBody = Record<string, unknown>;

@Injectable()
export class MercadoPagoWebhookService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MercadoPagoWebhookService.name);
  private workerTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly verifier: MercadoPagoWebhookVerifier,
    private readonly billingSync: MercadoPagoBillingSyncService,
  ) {}

  onModuleInit() {
    if (this.configService.get<string>('NODE_ENV') === 'test') return;
    this.workerTimer = setInterval(() => {
      void this.runWorker();
    }, 10_000);
    this.workerTimer.unref();
    setImmediate(() => void this.runWorker());
  }

  onModuleDestroy() {
    if (this.workerTimer) clearInterval(this.workerTimer);
  }

  async receive(input: {
    xSignature?: string | string[];
    xRequestId?: string | string[];
    queryDataId?: string | string[];
    queryType?: string | string[];
    queryTopic?: string | string[];
    body?: WebhookBody;
  }) {
    const body = input.body ?? {};
    const bodyData = this.asRecord(body.data);
    const resourceId = this.firstString(
      input.queryDataId,
      bodyData?.id,
      body.resource,
    );
    const topic = this.normalizeTopic(
      this.firstString(
        input.queryTopic,
        input.queryType,
        body.topic,
        body.type,
      ),
    );

    if (!resourceId || !this.isSafeIdentifier(resourceId)) {
      throw new BadRequestException(
        'El webhook no contiene un recurso válido.',
      );
    }

    const signatureValidated = this.verifier.verify({
      xSignature: input.xSignature,
      xRequestId: input.xRequestId,
      dataId: input.queryDataId ?? resourceId,
      topic,
    });

    if (!SUPPORTED_TOPICS.has(topic)) {
      this.logger.log(`Webhook ${topic || 'sin tipo'} ignorado.`);
      return { received: true };
    }

    const providerEventId = this.firstString(body.id)?.slice(0, 255);
    const action = this.firstString(body.action)?.slice(0, 100);
    const requestId = this.firstString(input.xRequestId)?.slice(0, 255);
    const payloadHash = createHash('sha256')
      .update(JSON.stringify(body))
      .digest('hex');
    const eventKey = providerEventId
      ? `${topic}:event:${createHash('sha256').update(providerEventId).digest('hex')}`
      : `${topic}:resource:${resourceId}:${action ?? '-'}:${payloadHash}`;

    let eventId: string | null = null;
    try {
      const event = await this.prisma.webhookEvent.create({
        data: {
          provider: PaymentProvider.MERCADO_PAGO,
          eventKey,
          providerEventId,
          topic,
          action,
          resourceId,
          requestId,
          liveMode: typeof body.live_mode === 'boolean' ? body.live_mode : null,
          signatureValidated,
          payloadHash,
        },
        select: { id: true },
      });
      eventId = event.id;
      this.logger.log(
        `Webhook recibido: ${topic}, recurso ${resourceId}, evento ${providerEventId ?? event.id}.`,
      );
    } catch (error) {
      if (!(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )) {
        throw error;
      }
      this.logger.log(`Webhook duplicado ignorado: ${eventKey}.`);
    }

    if (eventId && this.configService.get<string>('NODE_ENV') !== 'test') {
      setImmediate(() => {
        void this.processEvent(eventId).catch((error: unknown) => {
          this.logger.error(
            `No fue posible iniciar el procesamiento del webhook ${eventId}: ${this.safeError(error)}`,
          );
        });
      });
    }

    return { received: true };
  }

  async processDueEvents() {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - STALE_PROCESSING_MS);
    const events = await this.prisma.webhookEvent.findMany({
      where: {
        OR: [
          { status: WebhookEventStatus.RECEIVED },
          {
            status: WebhookEventStatus.FAILED,
            attempts: { lt: MAX_ATTEMPTS },
            nextAttemptAt: { lte: now },
          },
          {
            status: WebhookEventStatus.PROCESSING,
            processingStartedAt: { lt: staleBefore },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { id: true },
    });

    await Promise.allSettled(
      events.map((event) => this.processEvent(event.id)),
    );
  }

  private async runWorker() {
    try {
      await this.processDueEvents();
    } catch (error) {
      this.logger.error(
        `Falló la recuperación de webhooks pendientes: ${this.safeError(error)}`,
      );
    }
  }

  async processEvent(eventId: string) {
    const event = await this.prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) return;
    if (
      event.status === WebhookEventStatus.PROCESSED ||
      event.status === WebhookEventStatus.IGNORED ||
      event.attempts >= MAX_ATTEMPTS
    ) {
      return;
    }

    const now = new Date();
    const isDueFailure =
      event.status === WebhookEventStatus.FAILED &&
      event.nextAttemptAt !== null &&
      event.nextAttemptAt <= now;
    const isStale =
      event.status === WebhookEventStatus.PROCESSING &&
      event.processingStartedAt !== null &&
      event.processingStartedAt.getTime() <=
        now.getTime() - STALE_PROCESSING_MS;
    if (
      event.status !== WebhookEventStatus.RECEIVED &&
      !isDueFailure &&
      !isStale
    ) {
      return;
    }

    const claimed = await this.prisma.webhookEvent.updateMany({
      where: {
        id: event.id,
        status: event.status,
        updatedAt: event.updatedAt,
      },
      data: {
        status: WebhookEventStatus.PROCESSING,
        attempts: { increment: 1 },
        processingStartedAt: now,
        nextAttemptAt: null,
        lastError: null,
      },
    });
    if (claimed.count !== 1) return;

    try {
      const result = await this.billingSync.process(
        event.topic,
        event.resourceId,
      );
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          status:
            result === 'ignored'
              ? WebhookEventStatus.IGNORED
              : WebhookEventStatus.PROCESSED,
          processedAt: new Date(),
          processingStartedAt: null,
        },
      });
      this.logger.log(
        `Webhook ${event.id} ${result === 'ignored' ? 'ignorado' : 'procesado'}.`,
      );
    } catch (error) {
      if (error instanceof ProviderResourceNotFoundError) {
        await this.prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: WebhookEventStatus.IGNORED,
            processedAt: new Date(),
            processingStartedAt: null,
            lastError: this.safeError(error),
          },
        });
        return;
      }

      const attempts = event.attempts + 1;
      const delaySeconds = Math.min(15 * 2 ** (attempts - 1), 15 * 60);
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          status: WebhookEventStatus.FAILED,
          processingStartedAt: null,
          nextAttemptAt:
            attempts < MAX_ATTEMPTS
              ? new Date(Date.now() + delaySeconds * 1_000)
              : null,
          lastError: this.safeError(error),
        },
      });
      this.logger.error(
        `Falló el webhook ${event.id} (intento ${attempts}/${MAX_ATTEMPTS}): ${this.safeError(error)}`,
      );
    }
  }

  private normalizeTopic(value?: string) {
    return (value ?? '').trim().toLowerCase();
  }

  private firstString(...values: unknown[]) {
    for (const value of values) {
      const candidate: unknown = Array.isArray(value)
        ? (value as unknown[])[0]
        : value;
      if (
        (typeof candidate === 'string' || typeof candidate === 'number') &&
        String(candidate).trim()
      ) {
        return String(candidate).trim();
      }
    }
    return undefined;
  }

  private asRecord(value: unknown) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private isSafeIdentifier(value: string) {
    return value.length <= 255 && /^[a-zA-Z0-9_-]+$/.test(value);
  }

  private safeError(error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    return message.replace(/[\r\n\t]+/g, ' ').slice(0, 1_000);
  }
}

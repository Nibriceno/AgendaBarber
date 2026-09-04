import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InvalidWebhookSignatureError,
  WebhookSignatureValidator,
} from 'mercadopago';

const UNSIGNED_SUBSCRIPTION_TOPICS = new Set([
  'subscription_preapproval',
  'subscription_authorized_payment',
]);

@Injectable()
export class MercadoPagoWebhookVerifier {
  private readonly logger = new Logger(MercadoPagoWebhookVerifier.name);

  constructor(private readonly configService: ConfigService) {}

  verify(input: {
    xSignature?: string | string[];
    xRequestId?: string | string[];
    dataId?: string | string[];
    topic: string;
  }) {
    const hasSignature = Boolean(input.xSignature);
    const hasRequestId = Boolean(input.xRequestId);

    if (!hasSignature && !hasRequestId) {
      const allowUnsigned = this.configService.get<boolean>(
        'MERCADO_PAGO_ALLOW_UNSIGNED_SUBSCRIPTION_WEBHOOKS',
        false,
      );
      if (allowUnsigned && UNSIGNED_SUBSCRIPTION_TOPICS.has(input.topic)) {
        this.logger.warn(
          `Webhook ${input.topic} sin firma aceptado como aviso no confiable; el recurso será validado contra Mercado Pago.`,
        );
        return false;
      }
      throw new UnauthorizedException('Firma de webhook ausente.');
    }

    if (!hasSignature || !hasRequestId) {
      throw new UnauthorizedException('Firma de webhook incompleta.');
    }

    const secret = this.configService.get<string>(
      'MERCADO_PAGO_WEBHOOK_SECRET',
    );
    if (!secret) {
      throw new ServiceUnavailableException(
        'La firma de webhooks de Mercado Pago no está configurada.',
      );
    }

    try {
      WebhookSignatureValidator.validate({
        xSignature: input.xSignature,
        xRequestId: input.xRequestId,
        dataId: input.dataId,
        secret,
        toleranceSeconds: this.configService.get<number>(
          'MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS',
          300,
        ),
      });
      return true;
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        this.logger.warn(`Webhook de Mercado Pago rechazado: ${error.reason}.`);
        throw new UnauthorizedException('Firma de webhook inválida.');
      }
      throw error;
    }
  }
}

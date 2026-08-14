import {
  Injectable,
} from '@nestjs/common';

import {
  ThrottlerGuard,
  ThrottlerRequest,
} from '@nestjs/throttler';

@Injectable()
export class PublicBookingPhoneThrottlerGuard
  extends ThrottlerGuard
{
  /*
   * Este segundo rate limit no identifica
   * al cliente por IP.
   *
   * Utilizamos:
   *
   * business slug + teléfono normalizado
   *
   * De esta forma el mismo teléfono mantiene
   * su contador incluso si cambia de IP.
   */
  protected async getTracker(
    req: Record<string, any>,
  ): Promise<string> {
    const rawPhone =
      typeof req.body?.phone === 'string'
        ? req.body.phone
        : '';

    /*
     * Eliminamos cualquier carácter que no
     * sea numérico para evitar bypasses triviales
     * mediante distintas representaciones.
     */
    const normalizedPhone =
      rawPhone.replace(/\D/g, '');

    const slug =
      typeof req.params?.slug === 'string'
        ? req.params.slug
            .trim()
            .toLowerCase()
        : 'unknown-business';

    /*
     * Si por alguna razón todavía no existe
     * teléfono en el body, usamos IP como
     * fallback seguro.
     */
    if (!normalizedPhone) {
      return `ip:${req.ip}`;
    }

    return `business:${slug}:phone:${normalizedPhone}`;
  }

  /*
   * Límite independiente del Throttle
   * normal por IP.
   *
   * Máximo:
   * 10 intentos por teléfono cada 10 minutos.
   */
  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    return super.handleRequest({
      ...requestProps,

      limit: 10,

      ttl:
        10 * 60_000,

      blockDuration:
        10 * 60_000,
    });
  }
}
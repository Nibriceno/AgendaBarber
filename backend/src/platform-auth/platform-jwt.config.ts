import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

export function getPlatformJwtSecret(configService: ConfigService): string {
  const secret =
    configService.get<string>('PLATFORM_JWT_SECRET') ??
    configService.get<string>('JWT_SECRET');

  if (!secret) {
    throw new Error('PLATFORM_JWT_SECRET o JWT_SECRET debe estar configurado.');
  }

  return secret;
}

export function getPlatformJwtExpiresIn(
  configService: ConfigService,
): StringValue {
  const expiresIn =
    configService.get<StringValue>('PLATFORM_JWT_EXPIRES_IN') ??
    configService.get<StringValue>('JWT_EXPIRES_IN');

  if (!expiresIn) {
    throw new Error(
      'PLATFORM_JWT_EXPIRES_IN o JWT_EXPIRES_IN debe estar configurado.',
    );
  }

  return expiresIn;
}

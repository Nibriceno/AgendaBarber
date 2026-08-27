import { Transform } from 'class-transformer';
import { IsOptional, IsUrl, MaxLength } from 'class-validator';

function normalizeOptionalUrl(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue === '' ? null : normalizedValue;
}

export class UpdateSocialLinksDto {
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalUrl(value))
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'instagramUrl debe ser una URL http o https válida' },
  )
  @MaxLength(500)
  instagramUrl?: string | null;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalUrl(value))
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'twitterUrl debe ser una URL http o https válida' },
  )
  @MaxLength(500)
  twitterUrl?: string | null;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalUrl(value))
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'facebookUrl debe ser una URL http o https válida' },
  )
  @MaxLength(500)
  facebookUrl?: string | null;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalUrl(value))
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'whatsappUrl debe ser una URL http o https válida' },
  )
  @MaxLength(500)
  whatsappUrl?: string | null;
}

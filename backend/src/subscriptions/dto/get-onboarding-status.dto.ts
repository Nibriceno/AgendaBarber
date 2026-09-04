import { Transform, type TransformFnParams } from 'class-transformer';
import { Matches } from 'class-validator';

export class GetOnboardingStatusDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(/^[A-Za-z0-9_-]{43}$/, {
    message: 'La autorización del proceso no tiene un formato válido.',
  })
  token!: string;
}

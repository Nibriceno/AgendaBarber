import { Transform, type TransformFnParams } from 'class-transformer';
import { IsUUID, Matches } from 'class-validator';

import { CreatePlanRequestDto } from '../../plan-requests/dto/create-plan-request.dto';

export class CreateOnboardingDto extends CreatePlanRequestDto {
  @IsUUID('4')
  idempotencyKey!: string;

  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(/^[A-Za-z0-9_-]{43}$/, {
    message: 'La autorización del proceso no tiene un formato válido.',
  })
  onboardingToken!: string;
}

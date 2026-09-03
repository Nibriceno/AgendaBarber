import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const normalizeCode = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateSubscriptionDto {
  @Transform(normalizeCode)
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Z0-9]+(?:_[A-Z0-9]+)*$/, {
    message: 'El código del plan tiene un formato inválido.',
  })
  planCode!: string;

  @IsOptional()
  @Transform(normalizeCode)
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  promoCode?: string;
}

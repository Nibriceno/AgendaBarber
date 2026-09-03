import { PlanDiscountType, SubscriptionPlan } from '@prisma/client';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const normalizeCode = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreatePlanDiscountDto {
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsEnum(PlanDiscountType)
  type!: PlanDiscountType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  value!: number;

  @IsOptional()
  @Transform(normalizeCode)
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  code?: string;

  @IsBoolean()
  autoApply!: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

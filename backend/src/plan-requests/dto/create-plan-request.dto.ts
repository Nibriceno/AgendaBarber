import {
  BusinessCategory,
  LeadContactPreference,
  SubscriptionPlan,
} from '@prisma/client';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const normalizeEmail = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const normalizeSlug = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreatePlanRequestDto {
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  teamSize!: number;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  businessName!: string;

  @IsEnum(BusinessCategory)
  businessCategory!: BusinessCategory;

  @IsOptional()
  @Transform(normalizeSlug)
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'La URL solo puede contener letras minúsculas, números y guiones.',
  })
  desiredSlug?: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contactName!: string;

  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^\+?[0-9][0-9\s()-]{7,19}$/, {
    message: 'Ingresa un teléfono válido, idealmente con código de país.',
  })
  phone!: string;

  @IsEnum(LeadContactPreference)
  contactPreference!: LeadContactPreference;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  promoCode?: string;

  @Equals(true, {
    message: 'Debes aceptar los términos y autorizar el contacto.',
  })
  acceptedTerms!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(0)
  website?: string;
}

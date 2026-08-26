import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  appointmentInterval?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumAdvanceTime?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maximumAdvanceDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20_160)
  cancellationMinimumMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20_160)
  rescheduleMinimumMinutes?: number;

  @IsOptional()
  @IsBoolean()
  allowClientCancellation?: boolean;

  @IsOptional()
  @IsBoolean()
  allowClientRescheduling?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  noShowGraceMinutes?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  cancellationPolicy?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

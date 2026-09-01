import { BusinessStatus } from '@prisma/client';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChangePlatformBusinessStatusDto {
  @IsEnum(BusinessStatus)
  status!: BusinessStatus;

  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => {
    const input: unknown = value;
    return typeof input === 'string' ? input.trim() : input;
  })
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

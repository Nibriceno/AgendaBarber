import { OmitType } from '@nestjs/mapped-types';
import { Type, Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { CreateBusinessDto } from '../../businesses/dto/create-business.dto';

function trimString({ value }: TransformFnParams): unknown {
  const input: unknown = value;
  return typeof input === 'string' ? input.trim() : input;
}

function normalizeEmail({ value }: TransformFnParams): unknown {
  const input: unknown = value;
  return typeof input === 'string' ? input.trim().toLowerCase() : input;
}

export class PlatformBusinessDataDto extends OmitType(CreateBusinessDto, [
  'status',
] as const) {}

export class InitialBusinessAdminDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @Transform(trimString)
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'El teléfono no tiene un formato válido.',
  })
  phone!: string;

  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(150)
  email!: string;
}

export class CreatePlatformBusinessDto {
  @ValidateNested()
  @Type(() => PlatformBusinessDataDto)
  business!: PlatformBusinessDataDto;

  @ValidateNested()
  @Type(() => InitialBusinessAdminDto)
  admin!: InitialBusinessAdminDto;
}

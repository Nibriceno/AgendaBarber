import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export enum ManualAppointmentSource {
  PHONE = 'PHONE',
  IN_PERSON = 'IN_PERSON',
}

export class CreateManualAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'El teléfono no tiene un formato válido.',
  })
  phone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsEnum(ManualAppointmentSource)
  source!: ManualAppointmentSource;

  @IsInt()
  @Min(1)
  barberId!: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  serviceIds!: number[];

  @IsDateString()
  startAt!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNotes?: string;
}

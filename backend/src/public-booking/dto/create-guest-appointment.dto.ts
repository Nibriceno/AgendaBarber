import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateGuestAppointmentDto {
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
  @IsString()
  @MaxLength(500)
  customerNotes?: string;
}
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'businessSlug tiene un formato inválido',
  })
  businessSlug?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;

  @IsInt()
  @Min(1)
  barberId!: number;

  @IsDateString()
  startAt!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  serviceIds!: number[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

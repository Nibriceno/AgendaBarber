import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

export class CheckAvailabilityDto {
  @IsInt()
  @Min(1)
  businessId!: number;

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
  date!: string;
}
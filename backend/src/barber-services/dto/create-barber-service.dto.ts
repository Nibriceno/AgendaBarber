import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateBarberServiceDto {
  @IsInt()
  @Min(1)
  barberId!: number;

  @IsInt()
  @Min(1)
  serviceId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  customDurationMinutes?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  customPrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
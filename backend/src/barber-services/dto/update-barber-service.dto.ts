import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateBarberServiceDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  barberId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  serviceId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customPrice?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  customDurationMinutes?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
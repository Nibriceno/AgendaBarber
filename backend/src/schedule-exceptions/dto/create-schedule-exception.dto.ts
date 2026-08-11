import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateScheduleExceptionDto {
  @IsInt()
  @Min(1)
  barberId!: number;

  @IsDateString()
  date!: string;

  @IsBoolean()
  isDayOff!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason?: string;
}
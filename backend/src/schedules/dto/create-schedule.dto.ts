import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { DayOfWeek } from '@prisma/client';

export class CreateScheduleDto {
  @IsInt()
  @Min(1)
  barberId!: number;

  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute!: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

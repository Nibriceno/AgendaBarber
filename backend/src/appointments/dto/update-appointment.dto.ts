import { AppointmentStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
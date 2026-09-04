import {
  IsEnum,
} from 'class-validator';

import {
  AppointmentStatus,
} from '@prisma/client';

export class BarberUpdateStatusDto {
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;
}

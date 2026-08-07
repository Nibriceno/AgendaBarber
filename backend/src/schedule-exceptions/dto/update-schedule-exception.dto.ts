import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduleExceptionDto } from './create-schedule-exception.dto';

export class UpdateScheduleExceptionDto extends PartialType(
  CreateScheduleExceptionDto,
) {}
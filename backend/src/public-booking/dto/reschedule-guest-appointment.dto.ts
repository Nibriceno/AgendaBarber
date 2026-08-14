import {
  IsDateString,
} from 'class-validator';

export class RescheduleGuestAppointmentDto {
  @IsDateString()
  startAt!: string;
}
import {
  IsDateString,
} from 'class-validator';

export class ClientRescheduleAppointmentDto {
  @IsDateString()
  startAt!: string;
}

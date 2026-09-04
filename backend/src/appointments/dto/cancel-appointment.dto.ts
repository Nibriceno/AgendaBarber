import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CancelAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason!: string;
}

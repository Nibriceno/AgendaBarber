import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class ClientCancelAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason!: string;
}

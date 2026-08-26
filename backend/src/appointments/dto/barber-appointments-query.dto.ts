import { IsOptional, Matches } from 'class-validator';

export class BarberAppointmentsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe usar el formato YYYY-MM-DD',
  })
  date?: string;
}

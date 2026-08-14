import {
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

import {
  Type,
} from 'class-transformer';

export class PublicBarbersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceId?: number;
}
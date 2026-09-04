import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

import {
  Transform,
  Type,
} from 'class-transformer';

export class CheckAvailabilityDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  barberId!: number;

  @Transform(({ value }) => {
    const values =
      Array.isArray(value)
        ? value
        : [value];

    return values.map(
      (item) => Number(item),
    );
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  serviceIds!: number[];

  @IsDateString()
  date!: string;
}

import { Transform, type TransformFnParams } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class CreatePlanCheckoutDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(64, 64)
  checkoutToken!: string;
}

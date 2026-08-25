import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_VALIDATION_MESSAGE,
} from '../../common/validation/password-policy';

export class ChangeMyPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(72)
  @Matches(PASSWORD_PATTERN, {
    message: PASSWORD_VALIDATION_MESSAGE,
  })
  newPassword!: string;
}

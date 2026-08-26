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

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'businessSlug tiene un formato inválido',
  })
  businessSlug!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/, {
    message: 'El token de recuperación tiene un formato inválido.',
  })
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(72)
  @Matches(PASSWORD_PATTERN, {
    message: PASSWORD_VALIDATION_MESSAGE,
  })
  password!: string;
}

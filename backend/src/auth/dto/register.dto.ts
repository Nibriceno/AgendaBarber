import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    {
      message:
        'businessSlug tiene un formato inválido',
    },
  )
  businessSlug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(
    /^\+?[1-9]\d{7,14}$/,
    {
      message:
        'El teléfono no tiene un formato válido.',
    },
  )
  phone!: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
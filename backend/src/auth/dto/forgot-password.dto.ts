import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'businessSlug tiene un formato inválido',
  })
  businessSlug!: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email!: string;
}

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStaffMemberDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message:
      'El nombre debe contener al menos un carácter válido.',
  })
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message:
      'El apellido debe contener al menos un carácter válido.',
  })
  @MaxLength(80)
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{8,15}$/, {
    message:
      'El teléfono no tiene un formato válido.',
  })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/\S/, {
    message:
      'La contraseña debe contener al menos un carácter distinto de espacio.',
  })
  password!: string;
}

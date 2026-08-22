import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBarberAccessDto {
  @IsInt()
  @Min(1)
  barberId!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message:
      'El nombre no puede contener solo espacios.',
  })
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message:
      'El apellido no puede contener solo espacios.',
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

  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
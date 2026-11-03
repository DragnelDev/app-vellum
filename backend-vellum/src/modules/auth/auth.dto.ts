import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistroDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_.-]+$/, { message: 'Solo letras, números, _ . -' })
  username: string;

  @IsEmail() @MaxLength(255) email: string;

  @IsString() @MinLength(8) @MaxLength(72) password: string;
}

export class LoginDto {
  @IsString() @MaxLength(255) identificador: string;
  @IsString() @MaxLength(72) password: string;
}

export class OlvideDto {
  @IsEmail() @MaxLength(255) email: string;
}

export class RestablecerDto {
  @IsString() @MinLength(32) @MaxLength(128) token: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
}

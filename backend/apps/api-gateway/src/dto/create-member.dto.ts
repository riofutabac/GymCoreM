import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { SanitizeEmail, SanitizeName } from '../common/sanitize.decorator';

export class CreateMemberDto {
  @SanitizeEmail()
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @MaxLength(320, { message: 'El email no puede exceder 320 caracteres.' })
  email!: string;

  @SanitizeName()
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres.' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, { message: 'El nombre solo puede contener letras, espacios, guiones y apostrofes.' })
  firstName!: string;

  @SanitizeName()
  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El apellido no puede exceder 50 caracteres.' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, { message: 'El apellido solo puede contener letras, espacios, guiones y apostrofes.' })
  lastName!: string;
}

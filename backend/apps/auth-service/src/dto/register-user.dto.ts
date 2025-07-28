import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, MaxLength, Matches } from 'class-validator';
import { SanitizeEmail, SanitizeString, SanitizeName } from '../../../../libs/sanitize.decorator';

export class RegisterUserDto {
  @SanitizeEmail()
  @IsEmail({}, { message: 'Por favor proporciona una dirección de email válida.' })
  @IsNotEmpty({ message: 'El email no debe estar vacío.' })
  @MaxLength(320, { message: 'El email no puede exceder 320 caracteres.' })
  email!: string;

  @SanitizeString()
  @IsString()
  @IsNotEmpty({ message: 'La contraseña no debe estar vacía.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(128, { message: 'La contraseña no puede exceder 128 caracteres.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: 'La contraseña debe contener al menos una minúscula, una mayúscula y un número.' })
  password!: string;

  @SanitizeName()
  @IsString()
  @IsNotEmpty({ message: 'El nombre no debe estar vacío.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres.' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, { message: 'El nombre solo puede contener letras, espacios, guiones y apostrofes.' })
  firstName!: string;

  @SanitizeName()
  @IsString()
  @IsNotEmpty({ message: 'El apellido no debe estar vacío.' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres.' })
  @MaxLength(50, { message: 'El apellido no puede exceder 50 caracteres.' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, { message: 'El apellido solo puede contener letras, espacios, guiones y apostrofes.' })
  lastName!: string;

  @SanitizeString()
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'ID de gimnasio inválido.' })
  gymId?: string; // Opcional para unirse a un gimnasio específico
}
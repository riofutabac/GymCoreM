// backend/apps/auth-service/src/dto/login-user.dto.ts
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SanitizeEmail, SanitizeString } from '../../../../libs/sanitize.decorator';

export class LoginUserDto {
  @SanitizeEmail()
  @IsEmail({}, { message: 'Por favor proporciona una dirección de email válida.' })
  @IsNotEmpty({ message: 'El email no debe estar vacío.' })
  @MaxLength(320, { message: 'El email no puede exceder 320 caracteres.' })
  email!: string;

  @SanitizeString()
  @IsString()
  @IsNotEmpty({ message: 'La contraseña no debe estar vacía.' })
  @MaxLength(128, { message: 'La contraseña no puede exceder 128 caracteres.' })
  password!: string;
}
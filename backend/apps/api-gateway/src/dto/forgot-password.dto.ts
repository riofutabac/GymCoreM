
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { SanitizeEmail } from '../common/sanitize.decorator';

export class ForgotPasswordDto {
  @SanitizeEmail()
  @IsEmail({}, { message: 'Debe ser un email válido.' })
  @IsNotEmpty({ message: 'El email es requerido.' })
  @MaxLength(320, { message: 'El email no puede exceder 320 caracteres.' })
  email!: string;
}

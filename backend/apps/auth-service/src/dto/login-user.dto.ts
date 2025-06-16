// backend/apps/auth-service/src/dto/login-user.dto.ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
  @IsEmail({}, { message: 'Por favor proporciona una dirección de email válida.' })
  @IsNotEmpty({ message: 'El email no debe estar vacío.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña no debe estar vacía.' })
  password: string;
}
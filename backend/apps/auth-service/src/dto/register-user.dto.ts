import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterUserDto {
  @IsEmail({}, { message: 'Por favor proporciona una dirección de email válida.' })
  @IsNotEmpty({ message: 'El email no debe estar vacío.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña no debe estar vacía.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre no debe estar vacío.' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido no debe estar vacío.' })
  lastName: string;

  @IsOptional()
  @IsString()
  gymId?: string; // Opcional para unirse a un gimnasio específico
}
import { IsNotEmpty, IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { SanitizeName } from '../../../../libs/sanitize.decorator';

export class CreateGymDto {
  @SanitizeName()
  @IsString()
  @IsNotEmpty({ message: 'El nombre del gimnasio no puede estar vacío.' })
  @MinLength(2, { message: 'El nombre del gimnasio debe tener al menos 2 caracteres.' })
  @MaxLength(100, { message: 'El nombre del gimnasio no puede exceder 100 caracteres.' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s'-]+$/, { message: 'El nombre solo puede contener letras, números, espacios, guiones y apostrofes.' })
  name!: string;
}
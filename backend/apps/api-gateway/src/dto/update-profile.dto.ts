
import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength, Matches } from 'class-validator';
import { SanitizeName } from '../common/sanitize.decorator';

export class UpdateProfileDto {
  @SanitizeName()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres.' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, { message: 'El nombre solo puede contener letras, espacios, guiones y apostrofes.' })
  firstName?: string;

  @SanitizeName()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres.' })
  @MaxLength(50, { message: 'El apellido no puede exceder 50 caracteres.' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, { message: 'El apellido solo puede contener letras, espacios, guiones y apostrofes.' })
  lastName?: string;
}

import { IsOptional, IsString, IsBoolean, MinLength, IsNotEmpty, MaxLength, Matches } from 'class-validator';
import { SanitizeName, SanitizeString } from '../common/sanitize.decorator';

export class UpdateGymDto {
  @SanitizeName()
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre del gimnasio debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre del gimnasio no puede exceder 100 caracteres.' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s'-]+$/, { message: 'El nombre solo puede contener letras, números, espacios, guiones y apostrofes.' })
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignManagerDto {
  @SanitizeString()
  @IsString()
  @IsNotEmpty({ message: 'El ID de usuario es requerido.' })
  @MaxLength(100, { message: 'ID de usuario inválido.' })
  userId!: string;
}

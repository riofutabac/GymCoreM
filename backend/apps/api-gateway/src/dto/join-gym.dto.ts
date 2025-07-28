import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';
import { SanitizeCode } from '../common/sanitize.decorator';

export class JoinGymDto {
  @SanitizeCode()
  @IsString()
  @IsNotEmpty({ message: 'El código de gimnasio es requerido.' })
  @MaxLength(50, { message: 'El código no puede exceder 50 caracteres.' })
  @Matches(/^[A-Z0-9\-_]+$/, { message: 'El código solo puede contener letras mayúsculas, números, guiones y guiones bajos.' })
  uniqueCode!: string;
}

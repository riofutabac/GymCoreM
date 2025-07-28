import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
  MaxLength,
  IsNotEmpty,
  Matches,
  Max,
  IsInt,
} from 'class-validator';
import { SanitizeString, SanitizeText, SanitizeBarcode } from '../../../../../libs/sanitize.decorator';

export class CreateProductDto {
  @SanitizeString()
  @IsString()
  @IsNotEmpty({ message: 'El nombre del producto es requerido.' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres.' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\-_\.]+$/, { message: 'El nombre solo puede contener letras, números, espacios y caracteres básicos.' })
  name!: string;

  @SanitizeText()
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'La descripción no puede exceder 1000 caracteres.' })
  description?: string;

  @IsNumber({}, { message: 'El precio debe ser un número válido.' })
  @IsPositive({ message: 'El precio debe ser mayor a 0.' })
  @Max(999999.99, { message: 'El precio no puede exceder 999,999.99.' })
  price!: number;

  @IsNumber({}, { message: 'El stock debe ser un número válido.' })
  @IsInt({ message: 'El stock debe ser un número entero.' })
  @Min(0, { message: 'El stock no puede ser negativo.' })
  @Max(999999, { message: 'El stock no puede exceder 999,999 unidades.' })
  stock!: number;

  @SanitizeBarcode()
  @IsString()
  @IsNotEmpty({ message: 'El código de barras es requerido.' })
  @MaxLength(50, { message: 'El código de barras no puede exceder 50 caracteres.' })
  @Matches(/^[a-zA-Z0-9\-_]+$/, { message: 'El código de barras solo puede contener letras, números, guiones y guiones bajos.' })
  barcode!: string;

  @SanitizeString()
  @IsString()
  @IsNotEmpty({ message: 'El ID del gimnasio es requerido.' })
  @MaxLength(100, { message: 'ID de gimnasio inválido.' })
  gymId!: string;
}

import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsString()
  barcode: string;

  @IsString()
  gymId: string;
}

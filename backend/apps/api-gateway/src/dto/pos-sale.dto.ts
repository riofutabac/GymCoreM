import { IsString, IsArray, IsNumber, IsPositive, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PosSaleItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsPositive()
  price: number;
}

export class PosSaleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosSaleItemDto)
  items: PosSaleItemDto[];

  @IsNumber()
  @IsPositive()
  total: number;
}

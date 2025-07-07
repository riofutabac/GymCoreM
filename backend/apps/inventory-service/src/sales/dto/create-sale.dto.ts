import {
  IsString,
  IsArray,
  IsNumber,
  IsPositive,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSaleItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsPositive()
  price: number;
}

export class CreateSaleDto {
  @IsString()
  gymId: string;

  @IsString()
  cashierId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @IsNumber()
  @IsPositive()
  total: number;
}

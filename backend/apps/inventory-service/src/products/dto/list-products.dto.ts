import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class ListProductsDto {
  @IsOptional()
  @IsString()
  gymId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

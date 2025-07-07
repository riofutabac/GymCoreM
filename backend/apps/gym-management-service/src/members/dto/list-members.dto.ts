import { IsOptional, IsString, IsPositive, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ListMembersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string; // Para buscar por nombre o email

  @IsOptional()
  @IsIn(['active', 'deleted'])
  status?: 'active' | 'deleted'; // Para filtrar por estado
}

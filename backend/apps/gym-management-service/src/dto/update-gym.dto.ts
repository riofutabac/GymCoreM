import { IsOptional, IsString, IsBoolean, MinLength } from 'class-validator';

export class UpdateGymDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre del gimnasio debe tener al menos 2 caracteres' })
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

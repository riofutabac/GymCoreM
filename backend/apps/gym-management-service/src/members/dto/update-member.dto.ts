import { IsOptional, IsString, MinLength, IsEmail, IsEnum } from 'class-validator';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Por favor, introduce un email válido' })
  email?: string;

  @IsOptional()
  @IsEnum(['OWNER', 'MANAGER', 'RECEPTIONIST', 'MEMBER'])
  role?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

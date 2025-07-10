import { IsUUID, IsDateString, IsOptional, IsString, IsNumber, IsPositive } from 'class-validator';

export class ActivateMembershipDto {
  @IsUUID()
  userId: string; // El manager busca al usuario por ID

  @IsNumber()
  @IsPositive({ message: 'El monto debe ser un número positivo.' })
  amount: number; // Campo OBLIGATORIO para el monto pagado en efectivo

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

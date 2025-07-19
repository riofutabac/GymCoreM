import { IsUUID, IsDateString, IsOptional, IsString, IsNumber, IsPositive, IsEnum } from 'class-validator';

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

  @IsEnum(['CASH', 'ONLINE'])
  @IsOptional()
  paymentType?: 'CASH' | 'ONLINE' = 'CASH'; // Default a CASH para managers

  @IsOptional()
  @IsString()
  reason?: string;
}

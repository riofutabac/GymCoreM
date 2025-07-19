import { IsUUID, IsDateString, IsOptional, IsString, IsNumber, IsPositive } from 'class-validator';

export class RenewMembershipDto {
  @IsUUID()
  membershipId!: string;

  @IsDateString()
  newEndDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'El monto debe ser un número positivo.' })
  amount?: number; // Campo opcional para el monto pagado en efectivo en renovaciones manuales
}

import { IsNotEmpty, IsUUID } from 'class-validator';

export class ActivateMembershipDto {
  @IsUUID(4, { message: 'El ID de la membresía debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID de la membresía no puede estar vacío.' })
  membershipId: string;

  @IsUUID(4, { message: 'El ID del manager debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID del manager no puede estar vacío.' })
  managerId: string;
}

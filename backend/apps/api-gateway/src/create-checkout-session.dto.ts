import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsUUID()
  @IsNotEmpty({ message: 'El ID de la membresía no puede estar vacío.' })
  membershipId: string;
}

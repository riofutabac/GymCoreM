import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateCheckoutDto {
  @IsUUID()
  @IsNotEmpty()
  membershipId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;
}

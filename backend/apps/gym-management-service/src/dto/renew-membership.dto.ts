import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';

export class RenewMembershipDto {
  @IsUUID()
  membershipId: string;

  @IsDateString()
  newEndDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

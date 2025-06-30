import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';

export class ActivateMembershipDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  gymId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

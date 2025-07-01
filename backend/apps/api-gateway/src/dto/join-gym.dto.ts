import { IsString, IsNotEmpty } from 'class-validator';

export class JoinGymDto {
  @IsString()
  @IsNotEmpty()
  uniqueCode: string;
}

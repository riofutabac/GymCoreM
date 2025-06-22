import { IsNotEmpty, IsString } from 'class-validator';

export class CreateGymDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del gimnasio no puede estar vacío.' })
  name: string;
}
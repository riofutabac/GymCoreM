import { Module } from '@nestjs/common';
import { SerialService } from './serial.service';

@Module({
  providers: [SerialService],
  exports: [SerialService], // Exportamos para que otros módulos puedan usarlo
})
export class SerialModule {}

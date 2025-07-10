import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SerialModule } from './serial/serial.module'; // <-- IMPORTA ESTO

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SerialModule
  ], // <-- AÑADE ESTO
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

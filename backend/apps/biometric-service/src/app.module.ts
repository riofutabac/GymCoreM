import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SerialModule } from './serial/serial.module';
import { RedisModule } from './redis.module';
import { RedisService } from './biometric.service';
import { BiometricEventsController } from './biometric.events.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3001,
        },
      },
      {
        name: 'GYM_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.MESSAGE_BUS_URL || 'amqp://localhost:5672'],
          queue: 'gym-management.check_membership',
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
    SerialModule,
    RedisModule,
  ],
  controllers: [AppController, BiometricEventsController],
  providers: [AppService, RedisService],
})
export class AppModule {}

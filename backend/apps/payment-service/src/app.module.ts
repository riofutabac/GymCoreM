import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PaypalModule } from './paypal/paypal.module';
import { RabbitBindingsService } from './rabbit-bindings.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    PrismaModule,
    PaypalModule,
    RabbitMQModule.forRoot({
      exchanges: [
        {
          name: 'gymcore-exchange',
          type: 'topic',
          options: { durable: true }, // Asegúrate que el exchange sea durable
        },
      ],
      uri: process.env.MESSAGE_BUS_URL || 'amqp://localhost:5672',
      connectionInitOptions: { 
        wait: true, 
        reject: process.env.NODE_ENV === 'production' ? true : false,
        timeout: 10000 
      },
      // --- ESTA ES LA LÍNEA MÁS IMPORTANTE ---
      // Le dice a NestJS que busque los @RabbitSubscribe en tus controladores.
      enableControllerDiscovery: true, 
    }),
    ClientsModule.registerAsync([
      {
        name: 'GYM_SERVICE',
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => {
          const url = config.get<string>('GYM_SERVICE_URL') || 'tcp://localhost:3002';
          const [host, port] = url.replace('tcp://', '').split(':');
          return {
            transport: Transport.TCP,
            options: { host, port: +port },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RabbitBindingsService,
  ],
})
export class AppModule {}
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from './prisma/prisma.module';
import { PaypalModule } from './paypal/paypal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env', // <--- RUTA CORRECTA
    }),
    PrismaModule,
    PaypalModule,
    RabbitMQModule.forRoot({
      exchanges: [
        {
          name: 'gymcore-exchange',
          type: 'topic',
        },
      ],
      uri: process.env.MESSAGE_BUS_URL || 'amqp://localhost:5672',
      connectionInitOptions: { wait: false },
    }),
    ClientsModule.registerAsync([
      {
        name: 'GYM_SERVICE',
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => {
          const url = config.get<string>('GYM_MGMT_SERVICE_URL') || 'tcp://localhost:3002';
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
  controllers: [AppController, PaymentsController],
  providers: [AppService, PaymentsService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PaypalModule } from './paypal/paypal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'backend/apps/payment-service/.env',
    }),
    PrismaModule,
    PaypalModule,
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
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

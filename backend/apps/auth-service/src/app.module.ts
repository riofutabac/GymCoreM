import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    SupabaseModule,
    PrismaModule,
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
        useFactory: (configService: ConfigService) => {
          const gymServiceUrl =
            configService.get<string>('GYM_SERVICE_URL') || 'tcp://localhost:3002';
          const [host, port] = gymServiceUrl.replace('tcp://', '').split(':');
          return {
            transport: Transport.TCP,
            options: {
              host: host,
              port: +port,
            },
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
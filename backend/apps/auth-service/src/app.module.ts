import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
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
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ElasticsearchModule } from './elasticsearch.module';
import { AppElasticsearchService } from './elasticsearch.service';
import { LogsController } from './logs.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: './.env' }),
    RabbitMQModule.forRoot({
      exchanges: [
        {
          name: 'gymcore-logs-exchange',
          type: 'topic',
          options: { durable: true },
        },
      ],
      uri: process.env.MESSAGE_BUS_URL || 'amqp://guest:guest@localhost:5672',
      enableControllerDiscovery: true,
    }),
    ElasticsearchModule,
  ],
  controllers: [AppController, LogsController],
  providers: [AppService, AppElasticsearchService],
})
export class AppModule {}
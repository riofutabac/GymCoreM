import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  try {
    const amqp = app.get(AmqpConnection);
    const channel = await amqp.managedChannel;
    
    await channel.assertQueue('payments.membership.activated.manually', { durable: true });
    
    await channel.bindQueue(
      'payments.membership.activated.manually',
      'gymcore-exchange',
      'membership.activated.manually',
    );
  } catch (error) {
    // Error handling sin logs
  }

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3003;

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port,
    },
  });

  await app.startAllMicroservices();
}
bootstrap();


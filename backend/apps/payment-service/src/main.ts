import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

async function bootstrap() {
  console.log('🚀 Iniciando Payment Service...');
  
  // Create the Nest application directly
  const app = await NestFactory.create(AppModule);
  console.log('✅ AppModule creado correctamente');

  // PLAN B: Forzamos el binding en RabbitMQ directamente aquí
  try {
    console.log('🐰 Intentando obtener AmqpConnection...');
    const amqp = app.get(AmqpConnection);
    console.log('✅ AmqpConnection obtenido');
    
    const channel = await amqp.managedChannel;
    console.log('📡 Channel obtenido correctamente');
    
    await channel.assertQueue('payments.membership.activated.manually', { durable: true });
    console.log('📦 Queue creada: payments.membership.activated.manually');
    
    await channel.bindQueue(
      'payments.membership.activated.manually',
      'gymcore-exchange',
      'membership.activated.manually',
    );
    console.log('🔗 Binding creado correctamente');
    console.log('✅ (main.ts) Queue y binding creados');
  } catch (error) {
    console.error('❌ Error configurando RabbitMQ en main.ts:', error);
  }

  // Get configuration service from the app itself
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3003;
  console.log(`🔧 Puerto configurado: ${port}`);

  // Connect the microservice listener
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port,
    },
  });
  console.log('🔌 Microservicio TCP configurado');

  // Start all microservice listeners
  await app.startAllMicroservices();
  console.log(`✅ Payment microservice is listening on port ${port}`);
  console.log('🎉 Payment Service completamente inicializado');
}
bootstrap();


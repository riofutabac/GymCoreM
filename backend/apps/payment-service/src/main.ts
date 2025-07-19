import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AppController } from './app.controller';

async function bootstrap() {
  const logger = new Logger('PaymentService-Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3003;

  // Conectar el microservicio TCP para la comunicación síncrona
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port },
  });

  // --- REGISTRO MANUAL DEL OYENTE DE RABBITMQ ---
  try {
    const amqpConnection = app.get(AmqpConnection);
    const appController = app.get(AppController);
    
    logger.log('🔧 Registrando handlers de RabbitMQ para el Payment Service...');
    
    // Registrar el handler para la activación manual de membresías
    await amqpConnection.createSubscriber(
      // La función que se ejecutará cuando llegue un mensaje
      (payload: any) => appController.handleManualMembershipActivation(payload),
      {
        // La configuración de la cola y el enrutamiento
        exchange: 'gymcore-exchange',
        routingKey: 'membership.activated.manually',
        queue: 'payments.membership.activated.manually',
        queueOptions: { durable: true },
      },
      'handleManualMembershipActivation' // Nombre del handler para un mejor logging
    );
    
    // Registrar el handler para payment.completed (ventas POS)
    await amqpConnection.createSubscriber(
      (payload: any) => appController.handlePaymentCompleted(payload),
      {
        exchange: 'gymcore-exchange',
        routingKey: 'payment.completed',
        queue: 'payment-service-payment-completed',
        queueOptions: { durable: true },
      },
      'handlePaymentCompleted'
    );
    
    // Registrar el handler de debug para todos los eventos
    await amqpConnection.createSubscriber(
      (payload: any, amqpMsg: any) => appController.debugAllEvents(payload, amqpMsg?.fields?.routingKey || 'unknown'),
      {
        exchange: 'gymcore-exchange',
        routingKey: '#',
        queue: 'payment-debug-all-events',
        queueOptions: { durable: false, autoDelete: true },
      },
      'debugAllEvents'
    );
    
    logger.log('✅ Todos los handlers de RabbitMQ registrados exitosamente.');

  } catch (error) {
    logger.error('❌ Error registrando el handler de RabbitMQ', error);
  }
  // --- FIN DEL REGISTRO MANUAL ---

  await app.startAllMicroservices();
  logger.log(`Microservicio de Pagos está escuchando en el puerto ${port}`);
}

bootstrap().catch(err => {
  console.error('❌ Falló el inicio del Payment Service', err);
  process.exit(1);
});


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
    
    logger.log('🔧 Registrando el handler de RabbitMQ para el Payment Service...');
    
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
    
    logger.log('✅ Handler de RabbitMQ para pagos manuales registrado exitosamente.');

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


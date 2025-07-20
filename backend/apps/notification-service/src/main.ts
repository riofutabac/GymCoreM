import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { INestApplication, INestApplicationContext } from '@nestjs/common';
import { AmqpLogger } from './amqp-logger.service';

async function bootstrap() {
  const logger = new Logger('NotificationService');

  // Check if we should run with HTTP server (for testing) or as background service
  const runWithHttpServer = process.env.RUN_HTTP_SERVER === 'true';

  let app: INestApplication | INestApplicationContext;

  if (runWithHttpServer) {
    // Create HTTP application for testing endpoints
    const httpApp = await NestFactory.create(AppModule, { logger: false });
    
    // Configurar el logger centralizado
    const amqpLogger = httpApp.get(AmqpLogger);
    httpApp.useLogger(amqpLogger);
    
    const port = process.env.PORT ?? 3007; // Different port to avoid conflicts
    await httpApp.listen(port);
    app = httpApp;

    amqpLogger.log('🚀 Notification Service started with HTTP server!', 'Bootstrap');
    amqpLogger.log(`🌐 HTTP server running on port ${port}`, 'Bootstrap');
    amqpLogger.log('📧 Email service configured with SendGrid', 'Bootstrap');
    amqpLogger.log('🐰 RabbitMQ event listeners are active', 'Bootstrap');
    amqpLogger.log(
      `📱 Test endpoint available at: http://localhost:${port}/test-email`,
      'Bootstrap'
    );
  } else {
    // Create application context for background service
    // This allows the service to listen to RabbitMQ events without HTTP server
    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    
    // Configurar el logger centralizado
    const amqpLogger = app.get(AmqpLogger);
    app.useLogger(amqpLogger);

    amqpLogger.log('🚀 Notification Service started successfully!', 'Bootstrap');
    amqpLogger.log('📧 Email service configured with SendGrid', 'Bootstrap');
    amqpLogger.log('🐰 RabbitMQ event listeners are active', 'Bootstrap');
    amqpLogger.log('📱 Service is ready to handle notification events', 'Bootstrap');
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.log('📴 Received SIGTERM, shutting down gracefully');
    app
      .close()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });

  process.on('SIGINT', () => {
    logger.log('📴 Received SIGINT, shutting down gracefully');
    app
      .close()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start notification service:', error);
  process.exit(1);
});

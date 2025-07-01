import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { INestApplication, INestApplicationContext } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('NotificationService');

  // Check if we should run with HTTP server (for testing) or as background service
  const runWithHttpServer = process.env.RUN_HTTP_SERVER === 'true';

  let app: INestApplication | INestApplicationContext;

  if (runWithHttpServer) {
    // Create HTTP application for testing endpoints
    const httpApp = await NestFactory.create(AppModule);
    const port = process.env.PORT ?? 3007; // Different port to avoid conflicts
    await httpApp.listen(port);
    app = httpApp;

    logger.log('🚀 Notification Service started with HTTP server!');
    logger.log(`🌐 HTTP server running on port ${port}`);
    logger.log('📧 Email service configured with SendGrid');
    logger.log('🐰 RabbitMQ event listeners are active');
    logger.log(
      `📱 Test endpoint available at: http://localhost:${port}/test-email`,
    );
  } else {
    // Create application context for background service
    // This allows the service to listen to RabbitMQ events without HTTP server
    app = await NestFactory.createApplicationContext(AppModule);

    logger.log('🚀 Notification Service started successfully!');
    logger.log('📧 Email service configured with SendGrid');
    logger.log('🐰 RabbitMQ event listeners are active');
    logger.log('📱 Service is ready to handle notification events');
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

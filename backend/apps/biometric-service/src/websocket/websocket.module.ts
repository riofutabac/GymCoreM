import { Module } from '@nestjs/common';
import { BiometricWebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';

@Module({
  providers: [BiometricWebSocketGateway, WebSocketService],
  exports: [BiometricWebSocketGateway, WebSocketService],
})
export class WebSocketModule {}
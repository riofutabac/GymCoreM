import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BiometricWebSocketGateway } from './websocket.gateway';

@Injectable()
export class WebSocketService implements OnModuleInit {
  private readonly logger = new Logger(WebSocketService.name);
  private gymId: string = 'default'; // Podría venir de configuración

  constructor(private readonly websocketGateway: BiometricWebSocketGateway) {}

  async onModuleInit() {
    this.logger.log('🚀 WebSocketService inicializado - Esperando conexión de agente local');
    
    // Configurar el listener para datos del Arduino
    this.websocketGateway.onArduinoData((data: string) => {
      this.logger.log(`⬅️ Dato recibido de Arduino vía WebSocket: ${data}`);
    });
  }

  sendFireAndForgetCommand(command: string): void {
    if (!this.websocketGateway.isAgentConnected(this.gymId)) {
      this.logger.error(`Agente no conectado. No se pudo enviar el comando (fire-and-forget): ${command}`);
      return;
    }
    
    this.logger.log(`🔥 Enviando comando a Arduino (sin esperar respuesta): ${command}`);
    this.websocketGateway.sendFireAndForgetCommand(command, this.gymId);
  }

  async sendCommand(command: string): Promise<string> {
    if (!this.websocketGateway.isAgentConnected(this.gymId)) {
      const errorMsg = 'Agente no está conectado. No se puede enviar el comando.';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.logger.log(`➡️ Enviando comando a Arduino vía WebSocket: ${command}`);
    
    try {
      const response = await this.websocketGateway.sendCommandToArduino(command, this.gymId, 3000);
      this.logger.log(`📡 Respuesta recibida: ${response}`);
      return response;
    } catch (error: any) {
      this.logger.error(`❌ Error al enviar comando: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async checkSensorStatus(): Promise<{ isHealthy: boolean; response?: string; error?: string }> {
    try {
      if (!this.isArduinoConnected()) {
        return {
          isHealthy: false,
          error: 'Agente no está conectado'
        };
      }

      const response = await this.sendCommand('STATUS');
      
      if (response === 'SENSOR_OK') {
        return {
          isHealthy: true,
          response: response
        };
      } else {
        return {
          isHealthy: false,
          response: response,
          error: 'El sensor no está funcionando correctamente'
        };
      }
    } catch (error: any) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async startEnrollment(userId: string): Promise<string> {
    if (!this.isArduinoConnected()) {
      throw new Error('Agente no está conectado');
    }

    try {
      this.logger.log(`🔄 Iniciando inscripción de huella para usuario: ${userId}`);
      
      const response = await this.sendCommand('ENROLL');
      
      this.logger.log(`📡 Respuesta del Arduino: ${response}`);
      return response;
      
    } catch (error: any) {
      this.logger.error(`❌ Error en inscripción: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  getConnectionStatus(): { isConnected: boolean; error: string | null; port: string | null } {
    const status = this.websocketGateway.getConnectionStatus(this.gymId);
    
    return {
      isConnected: status.isConnected,
      error: status.isConnected ? null : 'Agente no conectado',
      port: status.isConnected ? `WebSocket (Agent: ${status.agentInfo})` : null
    };
  }

  onData(callback: (data: string) => void): void {
    this.websocketGateway.onArduinoData(callback);
  }

  removeDataCallback(callback: (data: string) => void): void {
    this.websocketGateway.removeDataCallback(callback);
  }

  isArduinoConnected(): boolean {
    return this.websocketGateway.isAgentConnected(this.gymId);
  }

  // Método adicional para configurar el gymId si es necesario
  setGymId(gymId: string): void {
    this.gymId = gymId;
    this.logger.log(`🏋️ Configurado para gimnasio: ${gymId}`);
  }
}
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { WebSocketServer } from 'ws';
import * as WebSocket from 'ws';
import * as https from 'https';
import * as fs from 'fs';

export interface BiometricCommand {
  command: string;
  requestId?: string;
  userId?: string;
  fingerprintId?: number;
  gymId?: string;
  fireAndForget?: boolean;
}

export interface BiometricResponse {
  type: string;
  response: string;
  requestId?: string;
  success: boolean;
  timestamp: string;
}

@Injectable()
export class BiometricWebSocketGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BiometricWebSocketGateway.name);
  private wss: WebSocketServer | undefined;
  private connectedAgents = new Map<string, WebSocket>();
  private responseCallbacks = new Map<string, (response: string) => void>();
  private dataCallbacks: ((data: string) => void)[] = [];
  private server: https.Server | null = null;

  async onModuleInit() {
    this.logger.log('🚀 Inicializando WebSocket Gateway...');
    try {
      await this.initializeWebSocketServer();
      this.logger.log('✅ WebSocket Gateway inicializado correctamente');
    } catch (error: any) {
      this.logger.error(`❌ Error inicializando WebSocket Gateway: ${error.message}`);
      throw error;
    }
  }

  onModuleDestroy() {
    this.logger.log('🛑 Cerrando servidor WebSocket...');
    
    if (this.wss) {
      this.wss.close();
    }
    
    if (this.server) {
      this.server.close();
    }
  }

  private async initializeWebSocketServer() {
    try {
      const port = process.env.WEBSOCKET_PORT ? parseInt(process.env.WEBSOCKET_PORT) : 8443;
      
      // Configurar HTTPS para WSS
      const httpsOptions = this.getHttpsOptions();
      
      if (httpsOptions) {
        // Crear servidor HTTPS
        this.server = https.createServer(httpsOptions);
        
        // Crear WebSocket Server sobre HTTPS
        this.wss = new WebSocketServer({ 
          server: this.server,
          verifyClient: (info: any) => {
            this.logger.log(`🔍 Nueva conexión desde: ${info.origin || 'desconocido'}`);
            return true; // Permitir todas las conexiones por ahora
          }
        });
        
        this.server.listen(port, () => {
          this.logger.log(`🔒 Servidor WebSocket Seguro (WSS) iniciado en puerto ${port}`);
        });
      } else {
        // Fallback a WebSocket sin SSL para desarrollo
        this.wss = new WebSocketServer({ 
          port: port,
          verifyClient: (info: any) => {
            this.logger.log(`🔍 Nueva conexión desde: ${info.origin || 'desconocido'}`);
            return true;
          }
        });
        
        this.logger.warn(`⚠️ Servidor WebSocket (WS) iniciado en puerto ${port} - SIN SSL`);
        this.logger.warn(`💡 Para WSS, configura SSL_CERT_PATH y SSL_KEY_PATH`);
      }

      this.setupWebSocketHandlers();
      
    } catch (error: any) {
      this.logger.error(`❌ Error iniciando servidor WebSocket: ${error.message}`);
      throw error;
    }
  }

  private getHttpsOptions(): { cert: Buffer; key: Buffer } | null {
    const certPath = process.env.SSL_CERT_PATH;
    const keyPath = process.env.SSL_KEY_PATH;
    
    if (!certPath || !keyPath) {
      this.logger.log('📋 Variables SSL_CERT_PATH y SSL_KEY_PATH no configuradas');
      return null;
    }

    try {
      const cert = fs.readFileSync(certPath);
      const key = fs.readFileSync(keyPath);
      
      this.logger.log(`🔒 Certificados SSL cargados desde:`);
      this.logger.log(`   📄 Certificado: ${certPath}`);
      this.logger.log(`   🔑 Clave: ${keyPath}`);
      
      return { cert, key };
    } catch (error: any) {
      this.logger.error(`❌ Error cargando certificados SSL: ${error.message}`);
      return null;
    }
  }

  private setupWebSocketHandlers() {
    this.wss?.on('connection', (ws: WebSocket, request: any) => {
      const clientIP = request.socket.remoteAddress;
      const userAgent = request.headers['user-agent'];
      
      this.logger.log(`🔌 Agente conectado desde ${clientIP}`);
      this.logger.log(`🔍 User-Agent: ${userAgent}`);

      // Extraer gymId de la query string o usar default
      const url = new URL(request.url!, `http://${request.headers.host}`);
      const gymId = url.searchParams.get('gymId') || 'default';
      
      // Almacenar la conexión
      this.connectedAgents.set(gymId, ws);
      this.logger.log(`🏋️ Agente registrado para gimnasio: ${gymId}`);

      // Enviar mensaje de bienvenida
      this.sendMessage(ws, {
        type: 'connection_established',
        response: 'Conexión establecida con biometric-service',
        success: true,
        timestamp: new Date().toISOString()
      });

      // Configurar handlers de mensajes
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleAgentMessage(message, gymId);
        } catch (error: any) {
          this.logger.error(`❌ Error parseando mensaje: ${error.message}`);
        }
      });

      // Handler de desconexión
      ws.on('close', (code: any, reason: any) => {
        this.logger.warn(`🔌 Agente desconectado (${gymId}): ${code} - ${reason}`);
        this.connectedAgents.delete(gymId);
      });

      // Handler de errores
      ws.on('error', (error: any) => {
        this.logger.error(`❌ Error en conexión WebSocket (${gymId}): ${error.message}`);
        this.connectedAgents.delete(gymId);
      });
    });

    this.wss?.on('error', (error: any) => {
      this.logger.error(`❌ Error en servidor WebSocket: ${error.message}`);
    });
  }

  private handleAgentMessage(message: any, gymId: string) {
    const { type, response, requestId } = message;

    this.logger.log(`⬅️ Mensaje del agente (${gymId}): ${type} - ${response}`);

    switch (type) {
      case 'arduino_response':
        this.handleArduinoResponse(response, requestId);
        break;
      
      case 'agent_status':
        this.logger.log(`📊 Estado del agente (${gymId}): ${JSON.stringify(message.details || {})}`);
        break;
      
      default:
        this.logger.warn(`⚠️ Tipo de mensaje no reconocido: ${type}`);
    }
  }

  private handleArduinoResponse(response: string, requestId?: string) {
    this.logger.log(`⬅️ Respuesta de Arduino: ${response}`);

    // Si hay un callback esperando esta respuesta específica
    if (requestId && this.responseCallbacks.has(requestId)) {
      const callback = this.responseCallbacks.get(requestId);
      if (callback) {
        callback(response);
        this.responseCallbacks.delete(requestId);
      }
    }

    // Notificar a todos los callbacks de datos registrados
    this.dataCallbacks.forEach(callback => {
      try {
        callback(response);
      } catch (error: any) {
        this.logger.error(`❌ Error en callback de datos: ${error.message}`);
      }
    });
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Método para enviar comandos al Arduino a través del agente
  async sendCommandToArduino(
    command: string,
    gymId: string = 'default',
    timeout: number = 5000,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const agent = this.connectedAgents.get(gymId);
      
      if (!agent || agent.readyState !== WebSocket.OPEN) {
        reject(new Error(`No hay agente conectado para el gimnasio ${gymId}`));
        return;
      }

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Configurar timeout
      const timeoutId = setTimeout(() => {
        this.responseCallbacks.delete(requestId);
        reject(new Error(`Timeout: Arduino no respondió en ${timeout}ms`));
      }, timeout);

      // Configurar callback para la respuesta
      this.responseCallbacks.set(requestId, (response: string) => {
        clearTimeout(timeoutId);
        resolve(response);
      });

      // Enviar comando al agente
      const message = {
        type: 'send_to_arduino',
        command,
        requestId,
        timestamp: new Date().toISOString(),
      };

      this.sendMessage(agent, message);
      this.logger.log(`➡️ Comando enviado al Arduino: ${command} (ID: ${requestId})`);
    });
  }

  // Método para enviar comandos fire-and-forget
  sendFireAndForgetCommand(command: string, gymId: string = 'default'): void {
    const agent = this.connectedAgents.get(gymId);
    
    if (!agent || agent.readyState !== WebSocket.OPEN) {
      this.logger.error(`No hay agente conectado para el gimnasio ${gymId}`);
      return;
    }

    const message = {
      type: 'send_to_arduino',
      command,
      fireAndForget: true,
      timestamp: new Date().toISOString(),
    };

    this.sendMessage(agent, message);
    this.logger.log(`🔥 Comando fire-and-forget enviado: ${command}`);
  }

  // Método para verificar si hay agentes conectados
  isAgentConnected(gymId: string = 'default'): boolean {
    const agent = this.connectedAgents.get(gymId);
    return agent !== undefined && agent.readyState === WebSocket.OPEN;
  }

  // Método para obtener el estado de conexión
  getConnectionStatus(gymId: string = 'default'): {
    isConnected: boolean;
    agentInfo?: string;
  } {
    const agent = this.connectedAgents.get(gymId);
    
    if (agent && agent.readyState === WebSocket.OPEN) {
      return {
        isConnected: true,
        agentInfo: `WebSocket Agent (${gymId})`,
      };
    }

    return { isConnected: false };
  }

  // Método para registrar callbacks de datos del Arduino
  onArduinoData(callback: (data: string) => void): void {
    this.dataCallbacks.push(callback);
  }

  removeDataCallback(callback: (data: string) => void): void {
    const index = this.dataCallbacks.indexOf(callback);
    if (index > -1) {
      this.dataCallbacks.splice(index, 1);
    }
  }

  // Método para obtener estadísticas del servidor
  getServerStats(): {
    connectedAgents: number;
    totalConnections: number;
    isServerRunning: boolean;
  } {
    return {
      connectedAgents: this.connectedAgents.size,
      totalConnections: this.wss?.clients?.size || 0,
      isServerRunning: this.wss !== undefined,
    };
  }
}
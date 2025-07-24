const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');

class BiometricAgent {
  constructor(config = {}) {
    this.config = {
      // Configuración del puerto serial
      serialPort: config.serialPort || process.env.BIOMETRIC_DEVICE_PORT || 'COM3',
      baudRate: config.baudRate || 9600,
      
      // Configuración del WebSocket
      serverUrl: config.serverUrl || process.env.BIOMETRIC_SERVER_URL || 'wss://gymcore.site:8443',
      gymId: config.gymId || process.env.GYM_ID || 'default',
      
      // Configuración SSL
      sslCert: config.sslCert || process.env.SSL_CERT_PATH,
      sslKey: config.sslKey || process.env.SSL_KEY_PATH,
      rejectUnauthorized: config.rejectUnauthorized !== undefined ? config.rejectUnauthorized : false,
      
      // Configuración de reconexión
      reconnectDelay: config.reconnectDelay || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      
      ...config
    };

    this.serialPort = null;
    this.parser = null;
    this.ws = null;
    this.isSerialConnected = false;
    this.isWebSocketConnected = false;
    this.reconnectAttempts = 0;
    this.responseCallbacks = new Map();

    console.log('🤖 Agente Biométrico inicializado');
    console.log(`📡 URL del servidor: ${this.config.serverUrl}`);
    console.log(`🏋️ ID del gimnasio: ${this.config.gymId}`);
    console.log(`🔌 Puerto serial: ${this.config.serialPort}`);
  }

  async start() {
    console.log('🚀 Iniciando agente biométrico...');
    
    try {
      await this.initializeSerial();
      await this.initializeWebSocket();
      
      console.log('✅ Agente iniciado correctamente');
      console.log('🔄 Esperando comandos del servidor...');
      
    } catch (error) {
      console.error('❌ Error al iniciar el agente:', error.message);
      this.scheduleReconnect();
    }
  }

  async initializeSerial() {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Conectando al puerto serial ${this.config.serialPort}...`);
      
      try {
        this.serialPort = new SerialPort({
          path: this.config.serialPort,
          baudRate: this.config.baudRate
        });

        this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

        this.serialPort.on('open', () => {
          console.log(`✅ Puerto serial ${this.config.serialPort} abierto correctamente`);
          this.isSerialConnected = true;
          resolve();
        });

        this.parser.on('data', (data) => {
          const response = data.toString().trim();
          console.log(`⬅️ Arduino: ${response}`);
          this.handleArduinoResponse(response);
        });

        this.serialPort.on('error', (err) => {
          console.error(`❌ Error en puerto serial: ${err.message}`);
          this.isSerialConnected = false;
          reject(err);
        });

        this.serialPort.on('close', () => {
          console.warn('🔌 Puerto serial cerrado');
          this.isSerialConnected = false;
        });

      } catch (error) {
        console.error(`❌ Error al crear puerto serial: ${error.message}`);
        reject(error);
      }
    });
  }

  async initializeWebSocket() {
    return new Promise((resolve, reject) => {
      console.log(`🌐 Conectando al servidor WebSocket...`);
      
      // Construir URL con parámetros
      const wsUrl = new URL(this.config.serverUrl);
      wsUrl.searchParams.set('gymId', this.config.gymId);
      
      const wsOptions = {
        rejectUnauthorized: this.config.rejectUnauthorized
      };

      // Configurar SSL si está disponible
      if (this.config.sslCert && this.config.sslKey) {
        try {
          const cert = fs.readFileSync(this.config.sslCert);
          const key = fs.readFileSync(this.config.sslKey);
          
          wsOptions.cert = cert;
          wsOptions.key = key;
          
          console.log('🔒 Usando certificados SSL personalizados');
        } catch (error) {
          console.warn('⚠️ Error al cargar certificados SSL:', error.message);
        }
      }

      console.log(`🔗 Conectando a: ${wsUrl.toString()}`);
      this.ws = new WebSocket(wsUrl.toString(), wsOptions);

      // Timeout para la conexión inicial
      const connectionTimeout = setTimeout(() => {
        if (!this.isWebSocketConnected) {
          reject(new Error('Timeout al conectar con el servidor'));
        }
      }, 10000);

      this.ws.on('open', () => {
        clearTimeout(connectionTimeout);
        console.log('🌐 ✅ Conectado al servidor WebSocket');
        this.isWebSocketConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.ws.on('close', (code, reason) => {
        clearTimeout(connectionTimeout);
        console.warn(`🌐 ❌ Desconectado del servidor: ${code} - ${reason}`);
        this.isWebSocketConnected = false;
        this.scheduleReconnect();
      });

      this.ws.on('error', (error) => {
        clearTimeout(connectionTimeout);
        console.error(`🌐 ❌ Error de conexión: ${error.message}`);
        this.isWebSocketConnected = false;
        
        if (!this.isWebSocketConnected) {
          reject(error);
        }
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleServerMessage(message);
        } catch (error) {
          console.error('❌ Error parseando mensaje del servidor:', error.message);
        }
      });
    });
  }

  handleArduinoResponse(response) {
    // Enviar la respuesta al servidor
    if (this.isWebSocketConnected && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'arduino_response',
        response: response,
        timestamp: new Date().toISOString()
      };

      // Buscar si esta respuesta corresponde a algún comando pendiente
      for (const [requestId, callback] of this.responseCallbacks.entries()) {
        if (callback) {
          message.requestId = requestId;
          this.responseCallbacks.delete(requestId);
          break;
        }
      }

      this.ws.send(JSON.stringify(message));
    }
  }

  handleServerMessage(message) {
    const { type, command, requestId, fireAndForget, timestamp } = message;
    
    switch (type) {
      case 'connection_established':
        console.log('🎉 Conexión establecida:', message.response);
        break;
        
      case 'send_to_arduino':
        this.handleServerCommand({ command, requestId, fireAndForget, timestamp });
        break;
        
      default:
        console.log('📨 Mensaje del servidor:', message);
    }
  }

  async handleServerCommand(data) {
    const { command, requestId, fireAndForget, timestamp } = data;
    
    console.log(`➡️ Servidor: ${command}${requestId ? ` (ID: ${requestId})` : ''}`);
    
    if (!this.isSerialConnected) {
      console.error('❌ Puerto serial no conectado, no se puede enviar comando');
      if (requestId && !fireAndForget) {
        this.sendArduinoResponse('ERROR_SERIAL_DISCONNECTED', requestId);
      }
      return;
    }

    try {
      if (fireAndForget) {
        // Comando fire-and-forget
        this.serialPort.write(`${command}\n`, (err) => {
          if (err) {
            console.error(`❌ Error enviando comando: ${err.message}`);
          } else {
            console.log(`🔥 Comando enviado (fire-and-forget): ${command}`);
          }
        });
      } else {
        // Comando con respuesta esperada
        if (requestId) {
          this.responseCallbacks.set(requestId, true);
          
          // Timeout para la respuesta
          setTimeout(() => {
            if (this.responseCallbacks.has(requestId)) {
              this.responseCallbacks.delete(requestId);
              this.sendArduinoResponse('TIMEOUT_NO_RESPONSE', requestId);
              console.warn(`⏰ Timeout esperando respuesta para: ${command}`);
            }
          }, 5000);
        }

        this.serialPort.write(`${command}\n`, (err) => {
          if (err) {
            console.error(`❌ Error enviando comando: ${err.message}`);
            if (requestId) {
              this.responseCallbacks.delete(requestId);
              this.sendArduinoResponse(`ERROR_SERIAL_WRITE: ${err.message}`, requestId);
            }
          } else {
            console.log(`📤 Comando enviado: ${command}`);
          }
        });
      }
    } catch (error) {
      console.error(`❌ Error procesando comando: ${error.message}`);
      if (requestId && !fireAndForget) {
        this.sendArduinoResponse(`ERROR_PROCESSING: ${error.message}`, requestId);
      }
    }
  }

  sendArduinoResponse(response, requestId) {
    if (this.isWebSocketConnected && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'arduino_response',
        response: response,
        requestId: requestId,
        timestamp: new Date().toISOString()
      };

      this.ws.send(JSON.stringify(message));
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(`❌ Máximo número de intentos de reconexión alcanzado (${this.config.maxReconnectAttempts})`);
      console.log('💡 Reinicia el agente manualmente o verifica la configuración');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reintentando conexión en ${this.config.reconnectDelay}ms (intento ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    
    setTimeout(() => {
      console.log('🔄 Reintentando conexión...');
      this.start();
    }, this.config.reconnectDelay);
  }

  sendStatus() {
    if (this.isWebSocketConnected && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'agent_status',
        details: {
          serialConnected: this.isSerialConnected,
          serialPort: this.config.serialPort,
          gymId: this.config.gymId,
          timestamp: new Date().toISOString()
        }
      };

      this.ws.send(JSON.stringify(message));
    }
  }

  stop() {
    console.log('🛑 Deteniendo agente...');
    
    if (this.serialPort && this.serialPort.isOpen) {
      this.serialPort.close();
    }
    
    if (this.ws) {
      this.ws.close();
    }
    
    console.log('✅ Agente detenido');
  }
}

// Configuración desde variables de entorno o archivo
const config = {
  serialPort: process.env.BIOMETRIC_DEVICE_PORT || 'COM3',
  serverUrl: process.env.BIOMETRIC_SERVER_URL || 'wss://gymcore.site:8443',
  gymId: process.env.GYM_ID || 'default',
  sslCert: process.env.SSL_CERT_PATH,
  sslKey: process.env.SSL_KEY_PATH,
  rejectUnauthorized: process.env.SSL_REJECT_UNAUTHORIZED === 'true'
};

// Crear e iniciar el agente
const agent = new BiometricAgent(config);

// Manejar señales del sistema
process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal de interrupción');
  agent.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Recibida señal de terminación');
  agent.stop();
  process.exit(0);
});

// Enviar estado cada 30 segundos
setInterval(() => {
  agent.sendStatus();
}, 30000);

// Iniciar el agente
agent.start().catch((error) => {
  console.error('💥 Error fatal al iniciar el agente:', error.message);
  process.exit(1);
});

module.exports = BiometricAgent;
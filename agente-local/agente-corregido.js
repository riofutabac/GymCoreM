require('dotenv').config();
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');
const fs = require('fs');

// Configuración desde variables de entorno
const BIOMETRIC_SERVICE_URL = process.env.BIOMETRIC_SERVICE_URL || 'wss://localhost:8443';
const SERIAL_PORT = process.env.SERIAL_PORT || process.env.BIOMETRIC_DEVICE_PORT || 'COM3';
const GYM_ID = process.env.GYM_ID || 'default';
const SSL_REJECT_UNAUTHORIZED = process.env.SSL_REJECT_UNAUTHORIZED !== 'true';

let ws;
let port;
let parser;
let pingInterval;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const responseCallbacks = new Map();

console.log('🤖 Agente Biométrico Local iniciando...');
console.log(`📡 URL del servidor: ${BIOMETRIC_SERVICE_URL}`);
console.log(`🔌 Puerto serial: ${SERIAL_PORT}`);
console.log(`🏋️ ID del gimnasio: ${GYM_ID}`);

function connectWebSocket() {
  console.log(`[WebSocket] Conectando a: ${BIOMETRIC_SERVICE_URL}`);
  
  // Construir URL con parámetros
  const wsUrl = new URL(BIOMETRIC_SERVICE_URL);
  wsUrl.searchParams.set('gymId', GYM_ID);
  
  const wsOptions = {
    rejectUnauthorized: SSL_REJECT_UNAUTHORIZED
  };

  // Configurar SSL si hay certificados disponibles
  const sslCert = process.env.SSL_CERT_PATH;
  const sslKey = process.env.SSL_KEY_PATH;
  
  if (sslCert && sslKey) {
    try {
      wsOptions.cert = fs.readFileSync(sslCert);
      wsOptions.key = fs.readFileSync(sslKey);
      console.log('🔒 Usando certificados SSL personalizados');
    } catch (error) {
      console.warn('⚠️ Error cargando certificados SSL:', error.message);
    }
  }

  ws = new WebSocket(wsUrl.toString(), wsOptions);

  ws.on('open', () => {
    console.log('[WebSocket] ✅ Conexión exitosa con el servidor.');
    reconnectAttempts = 0;
    
    // Enviar ping cada 30 segundos para mantener la conexión
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        sendStatus();
      }
    }, 30000);
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('[WebSocket] ⬅️ Mensaje recibido:', data);
      
      handleServerMessage(data);
    } catch (error) {
      console.error('[WebSocket] ❌ Error procesando mensaje:', error.message);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[WebSocket] 🔌 Conexión cerrada: ${code} - ${reason}`);
    clearInterval(pingInterval);
    scheduleReconnect();
  });

  ws.on('error', (error) => {
    console.error(`[WebSocket] ❌ Error: ${error.message}`);
  });
}

function handleServerMessage(data) {
  const { type, command, requestId, fireAndForget } = data;
  
  switch (type) {
    case 'connection_established':
      console.log('🎉 Conexión establecida:', data.response);
      break;
      
    case 'send_to_arduino':
      handleArduinoCommand({ command, requestId, fireAndForget });
      break;
      
    default:
      console.log('📨 Mensaje del servidor:', data);
  }
}

function handleArduinoCommand({ command, requestId, fireAndForget }) {
  console.log(`[Arduino] ➡️ Enviando comando: ${command}${requestId ? ` (ID: ${requestId})` : ''}`);
  
  if (!port || !port.isOpen) {
    console.error('[Arduino] ❌ Puerto serial no está abierto');
    if (requestId && !fireAndForget) {
      sendArduinoResponse('ERROR_SERIAL_DISCONNECTED', requestId);
    }
    return;
  }

  try {
    if (fireAndForget) {
      // Comando fire-and-forget
      port.write(`${command}\n`, (err) => {
        if (err) {
          console.error(`[Arduino] ❌ Error enviando comando: ${err.message}`);
        } else {
          console.log(`[Arduino] 🔥 Comando enviado (fire-and-forget): ${command}`);
        }
      });
    } else {
      // Comando con respuesta esperada
      if (requestId) {
        responseCallbacks.set(requestId, true);
        
        // Timeout para la respuesta
        setTimeout(() => {
          if (responseCallbacks.has(requestId)) {
            responseCallbacks.delete(requestId);
            sendArduinoResponse('TIMEOUT_NO_RESPONSE', requestId);
            console.warn(`[Arduino] ⏰ Timeout esperando respuesta para: ${command}`);
          }
        }, 5000);
      }

      port.write(`${command}\n`, (err) => {
        if (err) {
          console.error(`[Arduino] ❌ Error enviando comando: ${err.message}`);
          if (requestId) {
            responseCallbacks.delete(requestId);
            sendArduinoResponse(`ERROR_SERIAL_WRITE: ${err.message}`, requestId);
          }
        } else {
          console.log(`[Arduino] 📤 Comando enviado: ${command}`);
        }
      });
    }
  } catch (error) {
    console.error(`[Arduino] ❌ Error procesando comando: ${error.message}`);
    if (requestId && !fireAndForget) {
      sendArduinoResponse(`ERROR_PROCESSING: ${error.message}`, requestId);
    }
  }
}

function sendArduinoResponse(response, requestId) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const message = {
      type: 'arduino_response',
      response: response,
      requestId: requestId,
      timestamp: new Date().toISOString()
    };

    ws.send(JSON.stringify(message));
    console.log(`[WebSocket] ➡️ Respuesta enviada: ${response}`);
  }
}

function sendStatus() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const message = {
      type: 'agent_status',
      details: {
        serialConnected: port && port.isOpen,
        serialPort: SERIAL_PORT,
        gymId: GYM_ID,
        timestamp: new Date().toISOString()
      }
    };

    ws.send(JSON.stringify(message));
  }
}

function scheduleReconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error(`[WebSocket] ❌ Máximo número de intentos alcanzado (${maxReconnectAttempts})`);
    console.log('💡 Reinicia el agente manualmente o verifica la configuración');
    return;
  }

  reconnectAttempts++;
  const delay = 5000;
  console.log(`[WebSocket] 🔄 Reintentando conexión en ${delay}ms (intento ${reconnectAttempts}/${maxReconnectAttempts})`);
  
  setTimeout(() => {
    console.log('[WebSocket] 🔄 Reintentando conexión...');
    connectWebSocket();
  }, delay);
}

function connectArduino() {
  console.log(`[Serial] Buscando Arduino en: ${SERIAL_PORT}`);
  
  try {
    port = new SerialPort({ 
      path: SERIAL_PORT, 
      baudRate: 9600 
    });

    parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    port.on('open', () => {
      console.log('[Serial] ✅ Puerto serial abierto correctamente');
    });

    parser.on('data', (data) => {
      const trimmedData = data.toString().trim();
      console.log(`[Serial] ⬅️ Dato de Arduino: ${trimmedData}`);
      
      // Enviar respuesta al servidor con el protocolo correcto
      if (ws && ws.readyState === WebSocket.OPEN) {
        const message = {
          type: 'arduino_response',
          response: trimmedData,
          timestamp: new Date().toISOString()
        };

        // Buscar si esta respuesta corresponde a algún comando pendiente
        for (const [requestId, callback] of responseCallbacks.entries()) {
          if (callback) {
            message.requestId = requestId;
            responseCallbacks.delete(requestId);
            break;
          }
        }

        ws.send(JSON.stringify(message));
      }
    });

    port.on('close', () => {
      console.log('[Serial] 🔌 Puerto cerrado. Reintentando conexión en 10s...');
      setTimeout(connectArduino, 10000);
    });

    port.on('error', (err) => {
      console.error(`[Serial] ❌ Error: ${err.message}`);
      console.log('[Serial] 🔄 Reintentando conexión en 10s...');
      setTimeout(connectArduino, 10000);
    });

  } catch (error) {
    console.error(`[Serial] ❌ Error al crear puerto: ${error.message}`);
    console.log('[Serial] 🔄 Reintentando conexión en 10s...');
    setTimeout(connectArduino, 10000);
  }
}

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando agente...');
  
  if (port && port.isOpen) {
    port.close();
  }
  
  if (ws) {
    ws.close();
  }
  
  clearInterval(pingInterval);
  console.log('✅ Agente cerrado correctamente');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Terminando agente...');
  
  if (port && port.isOpen) {
    port.close();
  }
  
  if (ws) {
    ws.close();
  }
  
  clearInterval(pingInterval);
  console.log('✅ Agente terminado correctamente');
  process.exit(0);
});

// Iniciar conexiones
console.log('🚀 Iniciando conexiones...');
connectWebSocket();
connectArduino();

console.log('📋 Agente funcionando. Presiona Ctrl+C para detener.');
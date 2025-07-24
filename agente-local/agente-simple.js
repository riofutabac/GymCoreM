require('dotenv').config();
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');

// Configuración simple - primero probemos sin SSL
const BIOMETRIC_SERVICE_URL = process.env.BIOMETRIC_SERVICE_URL || 'ws://localhost:8080';
const SERIAL_PORT = process.env.SERIAL_PORT || 'COM3';
const GYM_ID = process.env.GYM_ID || 'default';

let ws;
let port;
let parser;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const responseCallbacks = new Map();

console.log('🤖 Agente Biométrico Simple iniciando...');
console.log(`📡 URL del servidor: ${BIOMETRIC_SERVICE_URL}`);
console.log(`🔌 Puerto serial: ${SERIAL_PORT}`);
console.log(`🏋️ ID del gimnasio: ${GYM_ID}`);

function connectWebSocket() {
  console.log(`[WebSocket] Conectando a: ${BIOMETRIC_SERVICE_URL}`);
  
  // URL simple con gymId
  const wsUrl = `${BIOMETRIC_SERVICE_URL}?gymId=${GYM_ID}`;
  
  try {
    ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      console.log('[WebSocket] ✅ Conexión exitosa con el servidor.');
      reconnectAttempts = 0;
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('[WebSocket] ⬅️ Mensaje recibido:', data);
        
        handleServerMessage(data);
      } catch (error) {
        console.error('[WebSocket] ❌ Error procesando mensaje:', error.message);
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`[WebSocket] 🔌 Conexión cerrada: ${code} - ${reason}`);
      scheduleReconnect();
    });

    ws.on('error', (error) => {
      console.error(`[WebSocket] ❌ Error: ${error.message}`);
      console.error(`[WebSocket] ❌ Código: ${error.code || 'N/A'}`);
    });

  } catch (error) {
    console.error(`[WebSocket] ❌ Error creando conexión: ${error.message}`);
    scheduleReconnect();
  }
}

function handleServerMessage(data) {
  const { type, command, requestId, fireAndForget } = data;
  
  switch (type) {
    case 'connection_established':
      console.log('🎉 Conexión establecida:', data.response || data.message);
      break;
      
    case 'send_to_arduino':
      if (command) {
        handleArduinoCommand({ command, requestId, fireAndForget });
      }
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

  port.write(`${command}\n`, (err) => {
    if (err) {
      console.error(`[Arduino] ❌ Error enviando comando: ${err.message}`);
      if (requestId && !fireAndForget) {
        sendArduinoResponse(`ERROR_SERIAL_WRITE: ${err.message}`, requestId);
      }
    } else {
      console.log(`[Arduino] 📤 Comando enviado: ${command}`);
      
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
    }
  });
}

function sendArduinoResponse(response, requestId) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const message = {
      type: 'arduino_response',
      response: response,
      timestamp: new Date().toISOString()
    };

    if (requestId) {
      message.requestId = requestId;
    }

    ws.send(JSON.stringify(message));
    console.log(`[WebSocket] ➡️ Respuesta enviada: ${response}`);
  }
}

function scheduleReconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error(`[WebSocket] ❌ Máximo número de intentos alcanzado (${maxReconnectAttempts})`);
    console.log('💡 Reinicia el agente manualmente');
    console.log('💡 Verifica que el biometric-service esté funcionando');
    console.log('💡 Prueba cambiando la URL a ws://localhost:8080');
    return;
  }

  reconnectAttempts++;
  const delay = 3000;
  console.log(`[WebSocket] 🔄 Reintentando conexión en ${delay}ms (intento ${reconnectAttempts}/${maxReconnectAttempts})`);
  
  setTimeout(() => {
    console.log('[WebSocket] 🔄 Reintentando conexión...');
    connectWebSocket();
  }, delay);
}

function connectArduino() {
  console.log(`[Serial] Intentando conectar a Arduino en: ${SERIAL_PORT}`);
  
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
      
      // Enviar respuesta al servidor
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
      console.log('[Serial] 🔌 Puerto cerrado. Reintentando en 5s...');
      setTimeout(connectArduino, 5000);
    });

    port.on('error', (err) => {
      console.error(`[Serial] ❌ Error: ${err.message}`);
      console.log('[Serial] 💡 Verifica que:');
      console.log('[Serial]   - El Arduino esté conectado');
      console.log('[Serial]   - El puerto COM sea correcto');
      console.log('[Serial]   - No haya otro programa usando el puerto');
      console.log('[Serial] 🔄 Reintentando en 10s...');
      setTimeout(connectArduino, 10000);
    });

  } catch (error) {
    console.error(`[Serial] ❌ Error al crear puerto: ${error.message}`);
    setTimeout(connectArduino, 10000);
  }
}

// Mostrar puertos disponibles para debug
SerialPort.list().then(ports => {
  console.log('\n📋 Puertos serie disponibles:');
  ports.forEach(port => {
    console.log(`   ${port.path} - ${port.manufacturer || 'Desconocido'}`);
  });
  console.log('');
}).catch(err => {
  console.error('❌ Error listando puertos:', err.message);
});

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando agente...');
  
  if (port && port.isOpen) {
    port.close();
  }
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  
  console.log('✅ Agente cerrado');
  process.exit(0);
});

// Iniciar conexiones
console.log('🚀 Iniciando conexiones...');
connectWebSocket();
connectArduino();

console.log('📋 Agente funcionando. Presiona Ctrl+C para detener.');

// Test de conectividad cada 10 segundos
setInterval(() => {
  const wsStatus = ws ? (ws.readyState === WebSocket.OPEN ? '✅' : '❌') : '❌';
  const serialStatus = port && port.isOpen ? '✅' : '❌';
  
  console.log(`[Status] WebSocket: ${wsStatus} | Serial: ${serialStatus}`);
}, 10000);
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws'); // CLIENTE WebSocket, no servidor

// --- CONFIGURACIÓN ---
const BAUDRATE_ARDUINO = 9600;
const BIOMETRIC_SERVICE_URL = 'ws://gymcore.site:8443'; // Conectar directamente al puerto del biometric-service
const INTERVALO_BUSQUEDA = 3000;
const GYM_ID = 'default';

let port;
let parser;
let ws; // Cliente WebSocket
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const responseCallbacks = new Map();

console.log('🚀 Agente Biométrico Cliente iniciando...');
console.log(`📡 Conectando a: ${BIOMETRIC_SERVICE_URL}`);

// --- CONEXIÓN AL SERVIDOR WEBSOCKET (CLIENTE) ---
function conectarWebSocket() {
    console.log(`[WebSocket] Conectando al servidor: ${BIOMETRIC_SERVICE_URL}`);
    
    try {
        ws = new WebSocket(`${BIOMETRIC_SERVICE_URL}?gymId=${GYM_ID}`);

        ws.on('open', () => {
            console.log('[WebSocket] ✅ CONECTADO al biometric-service');
            reconnectAttempts = 0;
        });

        ws.on('message', (data) => {
            try {
                const mensaje = JSON.parse(data.toString());
                console.log('[WebSocket] ⬅️ Comando recibido:', mensaje);
                
                // Manejar comandos del servidor
                if (mensaje.type === 'send_to_arduino' && mensaje.command) {
                    enviarComandoArduino(mensaje.command, mensaje.requestId, mensaje.fireAndForget);
                } else if (mensaje.type === 'connection_established') {
                    console.log('🎉 Conexión establecida con el servidor');
                }
            } catch (error) {
                console.error('[WebSocket] Error procesando mensaje:', error.message);
            }
        });

        ws.on('close', (code, reason) => {
            console.log(`[WebSocket] 🔌 Conexión cerrada: ${code} - ${reason}`);
            reconectarWebSocket();
        });

        ws.on('error', (error) => {
            console.error(`[WebSocket] ❌ Error: ${error.message}`);
            reconectarWebSocket();
        });

    } catch (error) {
        console.error(`[WebSocket] Error creando conexión: ${error.message}`);
        reconectarWebSocket();
    }
}

function reconectarWebSocket() {
    if (reconnectAttempts >= maxReconnectAttempts) {
        console.error(`[WebSocket] ❌ Máximo de intentos alcanzado`);
        return;
    }

    reconnectAttempts++;
    console.log(`[WebSocket] 🔄 Reintentando en 3s (${reconnectAttempts}/${maxReconnectAttempts})`);
    
    setTimeout(() => {
        conectarWebSocket();
    }, 3000);
}

function enviarComandoArduino(comando, requestId, fireAndForget) {
    console.log(`[Arduino] ➡️ Enviando: ${comando}`);
    
    if (!port || !port.isOpen) {
        console.error('[Arduino] ❌ No conectado');
        if (requestId) {
            enviarRespuestaServidor('ERROR_ARDUINO_DISCONNECTED', requestId);
        }
        return;
    }

    // Guardar requestId para asociar respuesta
    if (requestId && !fireAndForget) {
        responseCallbacks.set(requestId, true);
        
        // Timeout para respuesta
        setTimeout(() => {
            if (responseCallbacks.has(requestId)) {
                responseCallbacks.delete(requestId);
                enviarRespuestaServidor('TIMEOUT_NO_RESPONSE', requestId);
            }
        }, 5000);
    }

    port.write(comando + '\n', (err) => {
        if (err) {
            console.error(`[Arduino] Error enviando: ${err.message}`);
            if (requestId) {
                responseCallbacks.delete(requestId);
                enviarRespuestaServidor(`ERROR_WRITE: ${err.message}`, requestId);
            }
        }
    });
}

function enviarRespuestaServidor(respuesta, requestId) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const mensaje = {
            type: 'arduino_response',
            response: respuesta,
            timestamp: new Date().toISOString()
        };

        if (requestId) {
            mensaje.requestId = requestId;
        }

        ws.send(JSON.stringify(mensaje));
        console.log(`[WebSocket] ➡️ Respuesta enviada: ${respuesta}`);
    }
}

// --- BÚSQUEDA Y CONEXIÓN DEL ARDUINO (TU LÓGICA ORIGINAL) ---
async function encontrarYConectarArduino() {
    if (port && port.isOpen) {
        return;
    }

    try {
        const puertos = await SerialPort.list();
        if (puertos.length === 0) {
            console.log('[Arduino] ℹ️ No hay puertos serie. Re-escaneando...');
            return;
        }

        // Buscar Arduino (tu lógica original)
        const puertoArduino = puertos.find(p => 
            (p.manufacturer && p.manufacturer.toLowerCase().includes('arduino')) || 
            (p.pnpId && p.pnpId.includes('CH340')) ||
            (p.manufacturer && p.manufacturer.toLowerCase().includes('wch.cn')) ||
            (p.vendorId && (p.vendorId === '2341' || p.vendorId === '1A86')) // IDs comunes de Arduino
        );

        if (puertoArduino) {
            const arduinoPath = puertoArduino.path;
            console.log(`[Arduino] ✅ Encontrado en ${arduinoPath}. Conectando...`);
            
            port = new SerialPort({ 
                path: arduinoPath, 
                baudRate: BAUDRATE_ARDUINO, 
                autoOpen: false 
            });
            
            parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

            port.open((err) => {
                if (err) {
                    console.error(`[Arduino] Error abriendo ${arduinoPath}: ${err.message}`);
                    port = null;
                    return;
                }
                console.log(`[Arduino] ✅ Conectado a ${arduinoPath}`);
            });

            parser.on('data', (data) => {
                const respuesta = data.toString().trim();
                console.log(`[Arduino] ⬅️ Respuesta: ${respuesta}`);
                
                // Enviar al servidor WebSocket
                if (ws && ws.readyState === WebSocket.OPEN) {
                    const mensaje = {
                        type: 'arduino_response',
                        response: respuesta,
                        timestamp: new Date().toISOString()
                    };

                    // Buscar si corresponde a algún comando pendiente
                    for (const [requestId, callback] of responseCallbacks.entries()) {
                        if (callback) {
                            mensaje.requestId = requestId;
                            responseCallbacks.delete(requestId);
                            break;
                        }
                    }

                    ws.send(JSON.stringify(mensaje));
                }
            });

            port.on('close', () => {
                console.log(`[Arduino] ❌ Conexión perdida con ${arduinoPath}`);
                port = null;
            });

            port.on('error', (err) => {
                console.error(`[Arduino] Error en ${arduinoPath}: ${err.message}`);
                port = null;
            });

        } else {
            console.log('[Arduino] ℹ️ No encontrado. Puertos disponibles:');
            puertos.forEach(p => {
                console.log(`   ${p.path} - ${p.manufacturer || 'Desconocido'}`);
            });
        }
    } catch (error) {
        console.error('[Arduino] Error buscando puertos:', error.message);
    }
}

// --- INICIALIZACIÓN ---
console.log('🔄 Iniciando búsqueda de Arduino y conexión WebSocket...');

// Conectar al WebSocket del servidor
conectarWebSocket();

// Buscar Arduino cada 3 segundos
setInterval(encontrarYConectarArduino, INTERVALO_BUSQUEDA);

// Iniciar búsqueda inmediata
encontrarYConectarArduino();

// Status cada 10 segundos
setInterval(() => {
    const wsStatus = ws && ws.readyState === WebSocket.OPEN ? '✅' : '❌';
    const arduinoStatus = port && port.isOpen ? '✅' : '❌';
    console.log(`[Status] WebSocket: ${wsStatus} | Arduino: ${arduinoStatus}`);
}, 10000);

// Cleanup al cerrar
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando agente...');
    if (port && port.isOpen) port.close();
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    process.exit(0);
});

console.log('✅ Agente funcionando. Ctrl+C para salir.');
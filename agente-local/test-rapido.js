const WebSocket = require('ws');

console.log('🧪 Test de conexión rápida...');

const ws = new WebSocket('ws://localhost:8443?gymId=test');

ws.on('open', () => {
    console.log('✅ ¡CONECTADO! El WebSocket funciona');
    ws.close();
});

ws.on('error', (error) => {
    console.log('❌ Error:', error.message);
});

ws.on('close', (code, reason) => {
    console.log(`🔌 Cerrado: ${code} - ${reason || 'Sin razón'}`);
    process.exit(0);
});

setTimeout(() => {
    console.log('⏰ Timeout - no conectó');
    ws.close();
    process.exit(1);
}, 3000);
// Test rápido de conexión WebSocket
const WebSocket = require('ws');

const testUrls = [
  'ws://localhost:8443',
  'ws://localhost:8080', 
  'ws://127.0.0.1:8443',
  'ws://127.0.0.1:8080'
];

console.log('🧪 Probando conexiones WebSocket...\n');

testUrls.forEach((url, index) => {
  setTimeout(() => {
    console.log(`[Test ${index + 1}] Probando: ${url}`);
    
    const ws = new WebSocket(`${url}?gymId=test`);
    
    const timeout = setTimeout(() => {
      console.log(`[Test ${index + 1}] ❌ Timeout - No respuesta\n`);
      ws.close();
    }, 3000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log(`[Test ${index + 1}] ✅ CONEXIÓN EXITOSA!`);
      console.log(`[Test ${index + 1}] 🎯 URL que funciona: ${url}\n`);
      ws.close();
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`[Test ${index + 1}] ❌ Error: ${error.message}`);
      console.log(`[Test ${index + 1}] 📋 Código: ${error.code || 'N/A'}\n`);
    });
    
    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      if (code !== 1000) {
        console.log(`[Test ${index + 1}] ❌ Cerrado: ${code} - ${reason}\n`);
      }
    });
    
  }, index * 1000);
});

// Salir después de las pruebas
setTimeout(() => {
  console.log('🏁 Pruebas completadas');
  process.exit(0);
}, (testUrls.length + 1) * 1000);
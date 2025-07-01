// Test manual para verificar el webhook de PayPal con verificación de firma
// Este script simula un webhook real de PayPal para testing

const axios = require('axios');
const crypto = require('crypto');

async function testPaypalWebhook() {
  console.log('🧪 Iniciando test del webhook de PayPal con verificación de firma...');

  // 1. Crear un mock del webhook payload
  const mockPayload = {
    id: 'WH-2WR32451HC0013216-67535238-WH',
    event_type: 'CHECKOUT.ORDER.APPROVED',
    create_time: new Date().toISOString(),
    resource: {
      id: 'ORDER_123_TEST', // Este debe coincidir con un transactionId en tu BD
      status: 'APPROVED',
      purchase_units: [{
        amount: {
          value: '29.99',
          currency_code: 'USD'
        }
      }]
    }
  };

  // 2. Headers completos para simular PayPal (necesarios para verificación)
  const headers = {
    'Content-Type': 'application/json',
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594-1d93a270',
    'paypal-transmission-id': crypto.randomUUID(),
    'paypal-transmission-sig': 'mock-signature-' + crypto.randomBytes(16).toString('hex'),
    'paypal-transmission-time': new Date().toISOString(),
  };

  try {
    console.log('📤 Enviando webhook al API Gateway...');
    console.log('🔐 Headers de verificación incluidos para testing');
    
    const response = await axios.post(
      'http://localhost:3000/v1/payments/paypal/webhook',
      mockPayload,
      { 
        headers,
        timeout: 10000 
      }
    );

    console.log('✅ Respuesta recibida:', response.data);
    console.log('📊 Status HTTP:', response.status);

    // Verificar el resultado esperado
    if (response.data.status === 'processed') {
      console.log('🎉 ¡Webhook procesado exitosamente!');
    } else {
      console.log('⚠️ Webhook recibido pero no procesado:', response.data.status);
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ Error HTTP:', error.response.status);
      console.error('📝 Detalle:', error.response.data);
      
      if (error.response.status === 404) {
        console.log('💡 Asegúrate de que el API Gateway esté corriendo en puerto 3000');
      }
    } else {
      console.error('❌ Error de conexión:', error.message);
      console.log('💡 Verifica que todos los servicios estén corriendo:');
      console.log('   - API Gateway: puerto 3000');
      console.log('   - Payment Service: puerto 3003');
      console.log('   - RabbitMQ: puerto 5672');
    }
  }
}

// Ejecutar el test
console.log('🚀 Iniciando test de webhook PayPal...');
console.log('⚠️ Asegúrate de tener PAYPAL_SKIP_SIGNATURE="true" para testing');
testPaypalWebhook().catch(console.error);

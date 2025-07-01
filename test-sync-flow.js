// test-sync-flow.js - Script para probar la sincronización completa
const { setTimeout } = require('timers/promises');

// URLs de los servicios
const API_GATEWAY = 'http://localhost:3000';
const AUTH_SERVICE = 'http://localhost:3001';
const GYM_SERVICE = 'http://localhost:3002';
const PAYMENT_SERVICE = 'http://localhost:3003';

async function testFullFlow() {
  console.log('🚀 Iniciando prueba del flujo completo de sincronización...\n');

  try {
    // 1. Crear un gimnasio de prueba
    console.log('1️⃣ Creando gimnasio de prueba...');
    const createGymResponse = await fetch(`${API_GATEWAY}/api/v1/gyms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Gimnasio Test Sync'
      })
    });
    
    if (!createGymResponse.ok) {
      throw new Error(`Error creando gimnasio: ${await createGymResponse.text()}`);
    }
    
    const gym = await createGymResponse.json();
    console.log(`✅ Gimnasio creado: ${gym.name} (${gym.uniqueCode})\n`);

    // 2. Registrar un usuario
    console.log('2️⃣ Registrando usuario de prueba...');
    const testEmail = `test${Date.now()}@example.com`;
    const registerResponse = await fetch(`${API_GATEWAY}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      })
    });

    if (!registerResponse.ok) {
      throw new Error(`Error registrando usuario: ${await registerResponse.text()}`);
    }

    const registeredUser = await registerResponse.json();
    console.log(`✅ Usuario registrado: ${registeredUser.email}`);
    console.log(`📋 Verifica en logs de gym-management-service: "📝 user.created → ${testEmail}"\n`);

    // 3. Esperar a que se sincronice
    console.log('3️⃣ Esperando sincronización (3 segundos)...');
    await setTimeout(3000);
    console.log('✅ Tiempo de espera completado\n');

    // 4. Hacer login para obtener token
    console.log('4️⃣ Haciendo login...');
    const loginResponse = await fetch(`${API_GATEWAY}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Error en login: ${await loginResponse.text()}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.access_token;
    const userId = loginData.user.id;
    console.log(`✅ Login exitoso para ${loginData.user.email}\n`);

    // 5. Unirse al gimnasio
    console.log('5️⃣ Uniéndose al gimnasio...');
    const joinGymResponse = await fetch(`${API_GATEWAY}/api/v1/gyms/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        uniqueCode: gym.uniqueCode
      })
    });

    if (!joinGymResponse.ok) {
      throw new Error(`Error uniéndose al gimnasio: ${await joinGymResponse.text()}`);
    }

    const joinResult = await joinGymResponse.json();
    console.log(`✅ Unido al gimnasio. Membresía ID: ${joinResult.membershipId}`);
    console.log(`📋 Estado inicial: PENDING_PAYMENT con fechas placeholder\n`);

    // 6. Crear checkout de pago
    console.log('6️⃣ Creando sesión de checkout...');
    const checkoutResponse = await fetch(`${API_GATEWAY}/api/v1/payments/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        membershipId: joinResult.membershipId
      })
    });

    if (!checkoutResponse.ok) {
      throw new Error(`Error creando checkout: ${await checkoutResponse.text()}`);
    }

    const checkoutData = await checkoutResponse.json();
    console.log(`✅ Checkout creado. URL: ${checkoutData.approvalUrl}`);
    console.log(`📋 Verifica logs de API Gateway: "🛒 Creando checkout..."\n`);

    // 7. Simular webhook de pago completado
    console.log('7️⃣ Simulando webhook de pago completado...');
    const webhookResponse = await fetch(`${PAYMENT_SERVICE}/test-webhook`, {
      method: 'GET'
    });

    if (!webhookResponse.ok) {
      throw new Error(`Error en webhook de test: ${await webhookResponse.text()}`);
    }

    const webhookResult = await webhookResponse.json();
    console.log(`✅ Webhook procesado: ${JSON.stringify(webhookResult)}`);

    // 8. Esperar a que se procese el evento
    console.log('8️⃣ Esperando procesamiento del pago (5 segundos)...');
    await setTimeout(5000);
    console.log('✅ Tiempo de espera completado\n');

    console.log('🎉 Prueba completada exitosamente!');
    console.log('');
    console.log('📋 LOGS ESPERADOS:');
    console.log('   🔵 gym-management-service: "📝 user.created → email"');
    console.log('   🔵 gym-management-service: "✅ Usuario email sincronizado"');
    console.log('   🔵 api-gateway: "🛒 Creando checkout para membresía..."');
    console.log('   🔵 payment-service: "✅ Orden procesada y evento \'payment.completed\' publicado"');
    console.log('   🔵 gym-management-service: "payment.completed → membershipId"');
    console.log('   🔵 gym-management-service: "✅ Membresía procesada. Inicio: fecha-pago, Fin: fecha-fin"');
    console.log('');
    console.log('💾 VERIFICAR EN BD:');
    console.log('   - Tabla gym.user: debe tener el usuario sincronizado');
    console.log('   - Tabla gym.membership: estado ACTIVE, startDate ≈ fecha actual, endDate ≈ +30 días');

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.log('\n🔍 TROUBLESHOOTING:');
    console.log('   1. ¿Están todos los servicios ejecutándose?');
    console.log('   2. ¿Está RabbitMQ corriendo?');
    console.log('   3. ¿Hay errores en los logs de los servicios?');
    process.exit(1);
  }
}

// Solo ejecutar si es llamado directamente
if (require.main === module) {
  testFullFlow();
}

module.exports = { testFullFlow };

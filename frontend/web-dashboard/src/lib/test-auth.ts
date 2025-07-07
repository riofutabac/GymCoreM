/**
 * Funciones de prueba para validar la implementación de cookies HTTP-Only
 */

// Test 1: Verificar que el login configura las cookies correctamente
export async function testLogin() {
  try {
    const response = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Importante para recibir cookies
      body: JSON.stringify({
        email: 'test@example.com', // Usar credenciales válidas
        password: 'test123'
      }),
    });

    if (response.ok) {
      console.log('✅ Login exitoso, cookies configuradas');
      console.log('Cookies recibidas:', response.headers.get('set-cookie'));
      return true;
    } else {
      console.log('❌ Error en login:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ Error de red en login:', error);
    return false;
  }
}

// Test 2: Verificar que el JwtAuthGuard acepta cookies HTTP-Only
export async function testAuthenticatedRequest() {
  try {
    const response = await fetch('http://localhost:3000/api/v1/inventory/products', {
      method: 'GET',
      credentials: 'include', // Envía cookies HTTP-Only automáticamente
    });

    if (response.ok) {
      console.log('✅ Petición autenticada exitosa con cookies HTTP-Only');
      const data = await response.json();
      console.log('Datos recibidos:', data);
      return true;
    } else {
      console.log('❌ Error en petición autenticada:', response.status, await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ Error de red en petición autenticada:', error);
    return false;
  }
}

// Test 3: Verificar que el logout limpia las cookies
export async function testLogout() {
  try {
    const response = await fetch('http://localhost:3000/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      console.log('✅ Logout exitoso, cookies limpiadas');
      console.log('Response:', await response.json());
      return true;
    } else {
      console.log('❌ Error en logout:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ Error de red en logout:', error);
    return false;
  }
}

// Función principal de test
export async function runAllTests() {
  console.log('🧪 Iniciando tests de cookies HTTP-Only...\n');
  
  console.log('1. Probando login...');
  const loginSuccess = await testLogin();
  
  if (loginSuccess) {
    console.log('\n2. Probando petición autenticada...');
    await testAuthenticatedRequest();
    
    console.log('\n3. Probando logout...');
    await testLogout();
  }
  
  console.log('\n🧪 Tests completados');
}

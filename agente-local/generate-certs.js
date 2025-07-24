const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 Generando certificados SSL autofirmados para desarrollo...');

// Crear directorio de certificados
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
  console.log('📁 Directorio certs/ creado');
}

// Verificar si openssl está disponible
let opensslCommand = 'openssl';
try {
  execSync('openssl version', { stdio: 'pipe' });
  console.log('✅ OpenSSL encontrado');
} catch (error) {
  console.warn('⚠️ OpenSSL no encontrado en PATH');
  
  // Intentar con Git Bash (común en Windows)
  try {
    opensslCommand = '"C:\\Program Files\\Git\\usr\\bin\\openssl.exe"';
    execSync(`${opensslCommand} version`, { stdio: 'pipe' });
    console.log('✅ OpenSSL encontrado en Git Bash');
  } catch (gitError) {
    console.error('❌ No se encontró OpenSSL');
    console.log('');
    console.log('💡 Soluciones:');
    console.log('   1. Instala OpenSSL: https://slproweb.com/products/Win32OpenSSL.html');
    console.log('   2. Usa WSL: wsl -e bash -c "openssl version"');
    console.log('   3. Usa Git Bash y añade OpenSSL al PATH');
    console.log('   4. Para desarrollo, configura SSL_REJECT_UNAUTHORIZED=false');
    process.exit(1);
  }
}

try {
  console.log('🔑 Generando clave privada...');
  execSync(`${opensslCommand} genrsa -out certs/server.key 2048`, { stdio: 'inherit' });
  
  console.log('📜 Generando certificado autofirmado...');
  const subj = '/C=ES/ST=Madrid/L=Madrid/O=GymCoreM/OU=Development/CN=localhost';
  execSync(`${opensslCommand} req -new -x509 -key certs/server.key -out certs/server.crt -days 365 -subj "${subj}"`, { stdio: 'inherit' });
  
  console.log('📋 Creando archivo de configuración adicional...');
  const configContent = `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = ES
ST = Madrid
L = Madrid
O = GymCoreM
OU = Development
CN = localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.gymcore.site
DNS.3 = gymcore.site
IP.1 = 127.0.0.1
IP.2 = ::1`;

  fs.writeFileSync(path.join(certsDir, 'openssl.conf'), configContent);
  
  console.log('🔄 Regenerando certificado con configuración extendida...');
  execSync(`${opensslCommand} req -new -x509 -key certs/server.key -out certs/server.crt -days 365 -config certs/openssl.conf`, { stdio: 'inherit' });
  
  // Copiar para el cliente
  if (process.platform === 'win32') {
    execSync('copy certs\\server.key certs\\client.key', { stdio: 'inherit', shell: true });
    execSync('copy certs\\server.crt certs\\client.crt', { stdio: 'inherit', shell: true });
  } else {
    execSync('cp certs/server.key certs/client.key', { stdio: 'inherit' });
    execSync('cp certs/server.crt certs/client.crt', { stdio: 'inherit' });
  }
  
  console.log('✅ Certificados generados correctamente:');
  console.log('   📄 certs/server.key - Clave privada del servidor');
  console.log('   📄 certs/server.crt - Certificado del servidor');
  console.log('   📄 certs/client.key - Clave privada del cliente');
  console.log('   📄 certs/client.crt - Certificado del cliente');
  console.log('   ⚙️  certs/openssl.conf - Configuración OpenSSL');
  console.log('');
  console.log('🔧 Para usar los certificados:');
  console.log('   En biometric-service .env:');
  console.log('   SSL_CERT_PATH=./certs/server.crt');
  console.log('   SSL_KEY_PATH=./certs/server.key');
  console.log('   WEBSOCKET_PORT=8443');
  console.log('');
  console.log('   En agente local .env:');
  console.log('   BIOMETRIC_SERVER_URL=wss://localhost:8443');
  console.log('   SSL_REJECT_UNAUTHORIZED=false');
  console.log('');
  console.log('⚠️  IMPORTANTE: Estos certificados son solo para desarrollo.');
  console.log('   Para producción, usa certificados válidos de una CA.');
  
} catch (error) {
  console.error('❌ Error generando certificados:', error.message);
  console.log('');
  console.log('💡 Alternativas para desarrollo:');
  console.log('   1. Configura SSL_REJECT_UNAUTHORIZED=false en .env');
  console.log('   2. Usa conexión WS sin SSL (menos seguro)');
  console.log('   3. Instala OpenSSL y vuelve a intentar');
}
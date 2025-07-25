# Agente Biométrico Local

Este agente conecta tu Arduino con el biometric-service en la nube mediante WebSockets seguros (WSS).

## 🚀 Instalación Rápida

### 1. Instalar dependencias
```bash
cd agente-local
npm install
```

### 2. Configurar el agente
```bash
# Copiar archivo de configuración
copy .env.example .env

# Editar las variables necesarias
notepad .env
```

### 3. Variables de configuración importantes
```env
# Puerto donde está conectado tu Arduino
BIOMETRIC_DEVICE_PORT=COM3

# URL de tu servidor (cambiar por tu dominio)
BIOMETRIC_SERVER_URL=wss://gymcore.site

# ID único de tu gimnasio
GYM_ID=gimnasio_principal

# Para desarrollo local (sin verificación SSL)
SSL_REJECT_UNAUTHORIZED=false
```

### 4. Ejecutar el agente
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🔒 Configuración SSL (Opcional)

### Para desarrollo local:
```bash
# Generar certificados autofirmados
node generate-certs.js

# Configurar en .env
SSL_CERT_PATH=./certs/client.crt
SSL_KEY_PATH=./certs/client.key
SSL_REJECT_UNAUTHORIZED=false
```

### Para producción:
1. Obtén certificados válidos de una CA (Let's Encrypt, etc.)
2. Configura las rutas en `.env`
3. Establece `SSL_REJECT_UNAUTHORIZED=true`

## 📋 Requisitos del Sistema

- **Node.js**: 16.0.0 o superior
- **Sistema Operativo**: Windows, Linux, macOS
- **Arduino**: Conectado via USB
- **Puerto Serial**: Disponible y accesible

## 🔧 Verificación de Conexión

### 1. Verificar puerto serial
```bash
# Windows
mode

# Linux/macOS
ls /dev/tty*
```

### 2. Probar conexión Arduino
- El agente muestra logs detallados
- Busca mensajes como: `✅ Puerto serial COM3 abierto correctamente`

### 3. Probar conexión WebSocket
- Busca: `🌐 ✅ Conectado al servidor WebSocket`
- Si falla, verifica la URL del servidor y certificados

## 🐛 Solución de Problemas

### Error de puerto serial
```
❌ Error en puerto serial: Access denied
```
**Solución**: 
- Cierra Arduino IDE y otros programas que usen el puerto
- Ejecuta como administrador
- Verifica el puerto correcto en Administrador de Dispositivos

### Error de conexión WebSocket
```
🌐 ❌ Error de conexión: connect ECONNREFUSED
```
**Solución**:
- Verifica que el servidor esté ejecutándose
- Comprueba la URL en `.env`
- Para desarrollo local: `SSL_REJECT_UNAUTHORIZED=false`

### Arduino no responde
```
⏰ Timeout esperando respuesta para: PING
```
**Solución**:
- Verifica que el Arduino tenga el firmware correcto
- Comprueba la velocidad de baudios (9600)
- Reinicia el Arduino

## 📊 Logs y Monitoreo

El agente muestra logs detallados:
- `🔌` Conexión serial
- `🌐` Conexión WebSocket  
- `➡️` Comandos enviados al Arduino
- `⬅️` Respuestas del Arduino
- `🔄` Intentos de reconexión

## 🔄 Reconexión Automática

El agente reintenta automáticamente:
- **Serial**: Si se desconecta el Arduino
- **WebSocket**: Si se pierde conexión con el servidor
- **Límite**: 10 intentos por defecto

## 📦 Instalación como Servicio (Opcional)

Para que el agente se ejecute automáticamente:

### Windows
```bash
npm install -g node-windows
npm run install-service
```

### Linux (systemd)
```bash
sudo npm install -g pm2
pm2 start agente.js --name biometric-agent
pm2 startup
pm2 save
```

## 🔧 Comandos Útiles

```bash
# Desarrollo con reinicio automático
npm run dev

# Verificar puertos COM disponibles (Windows)
node -e "const SerialPort = require('serialport'); SerialPort.list().then(ports => console.log(ports));"

# Probar conectividad WebSocket
node -e "const io = require('socket.io-client'); const socket = io('wss://gymcore.site', {rejectUnauthorized: false}); socket.on('connect', () => console.log('Conectado')); socket.on('connect_error', (err) => console.log('Error:', err.message));"
```

## 🚨 Notas de Seguridad

1. **Certificados**: Usa certificados válidos en producción
2. **Firewall**: Asegúrate de que el puerto WebSocket esté abierto
3. **Acceso**: El agente necesita acceso al puerto serial
4. **Red**: Verifica que la red permita conexiones WSS

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del agente
2. Verifica la configuración en `.env`
3. Comprueba la conexión de red
4. Verifica que el Arduino esté correctamente conectado
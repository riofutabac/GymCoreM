# GymCore - Guía de Smoke Tests

## 🔥 Smoke Tests Rápidos

### ✅ 1. Registro de Usuario
```bash
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "firstName": "Test",
  "lastName": "User"
}
```

**Logs esperados:**
- 🔵 **gym-management-service**: `📝 user.created → test@example.com`
- 🔵 **gym-management-service**: `✅ Usuario test@example.com sincronizado`

**Verificar en BD:**
- Tabla `auth.user`: usuario creado
- Tabla `gym.user`: usuario sincronizado

---

### ✅ 2. Crear Gimnasio
```bash
POST http://localhost:3000/api/v1/gyms
Content-Type: application/json

{
  "name": "Gimnasio Test"
}
```

---

### ✅ 3. Login
```bash
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Respuesta esperada:**
```json
{
  "access_token": "eyJ...",
  "user": { "id": "...", "email": "test@example.com", "role": "MEMBER" }
}
```

---

### ✅ 4. Unirse a Gimnasio
```bash
POST http://localhost:3000/api/v1/gyms/join
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "uniqueCode": "<gym_unique_code>"
}
```

**Respuesta esperada:**
```json
{
  "membershipId": "mem_abc123",
  "gymName": "Gimnasio Test",
  "message": "Te has unido al gimnasio exitosamente..."
}
```

**Verificar en BD:**
- Tabla `gym.membership`: status `PENDING_PAYMENT`, fechas `2000-01-01` (placeholder)

---

### ✅ 5. Crear Checkout PayPal
```bash
POST http://localhost:3000/api/v1/payments/create-checkout-session
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "membershipId": "<membership_id>"
}
```

**Logs esperados:**
- 🔵 **api-gateway**: `🛒 Creando checkout para membresía...`
- 🔵 **api-gateway**: `✅ Checkout creado exitosamente. PayPal URL: https://...`

**Respuesta esperada:**
```json
{
  "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=..."
}
```

---

### ✅ 6. Simular Webhook de Pago
```bash
GET http://localhost:3003/test-webhook
```

**Logs esperados:**
- 🔵 **payment-service**: `✅ Orden procesada y evento 'payment.completed' publicado`
- 🔵 **gym-management-service**: `payment.completed → <membershipId>`
- 🔵 **gym-management-service**: `✅ Membresía procesada. Inicio: <fecha_actual>, Fin: <fecha_+30d>`

**Verificar en BD:**
- Tabla `gym.membership`: status `ACTIVE`, `startDate` ≈ ahora, `endDate` ≈ +30 días
- Tabla `payment.payment`: status `COMPLETED`

---

## 🚨 Troubleshooting

### ❌ "User created" no aparece en logs
- ✅ Verificar que RabbitMQ esté corriendo
- ✅ Verificar `wait: true` en configuración RabbitMQ
- ✅ No debe haber queues duplicadas

### ❌ "Payment completed" no se procesa
- ✅ Verificar que hay un pago PENDING en la tabla
- ✅ Verificar logs de payment-service por errores
- ✅ Verificar que el `transactionId` coincide

### ❌ API Gateway logs muestran `paypalUrl` undefined
- ✅ Verificar que payment-service devuelve `approvalUrl`
- ✅ Logs deben mostrar la misma URL

---

## 🔧 Script Automatizado

Para ejecutar todos los tests:
```bash
node test-sync-flow.js
```

---

## 📊 Configuraciones por Ambiente

### Development
- `NODE_ENV=development` (permite endpoint `/test-webhook`)
- `PAYPAL_SKIP_SIGNATURE=true` (omite verificación de firma)
- `reject: false` en RabbitMQ (no crash si RabbitMQ no disponible)
- Fechas placeholder `2000-01-01`

### Production
- `NODE_ENV=production` (oculta endpoint `/test-webhook`)
- `PAYPAL_SKIP_SIGNATURE=false` (habilita verificación de firma)
- `PAYPAL_WEBHOOK_ID` configurado correctamente
- Migrar esquema para fechas nullable o campo `isPlaceholder`

---

## 📈 Monitoreo

### Métricas Prometheus
```bash
GET http://localhost:3003/metrics
```

### Health Checks
```bash
GET http://localhost:3000/api/v1/health    # API Gateway
GET http://localhost:3001/                  # Auth Service
GET http://localhost:3002/                  # Gym Management
GET http://localhost:3003/                  # Payment Service
```

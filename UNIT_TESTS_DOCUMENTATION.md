# 🧪 Unit Tests - GymCore Project

Este documento describe el conjunto completo de pruebas unitarias implementadas para el proyecto GymCore.

## 📂 Estructura de Pruebas

### Backend (NestJS)
```
backend/
├── apps/
│   ├── auth-service/
│   │   └── src/
│   │       ├── app.controller.spec.ts
│   │       └── app.service.spec.ts
│   ├── gym-management-service/
│   │   └── src/
│   │       └── membership.service.spec.ts
│   ├── inventory-service/
│   │   └── src/
│   │       └── products/
│   │           └── products.service.spec.ts
│   ├── payment-service/
│   │   └── src/
│   │       └── app.service.spec.ts
│   ├── api-gateway/
│   │   └── src/
│   │       └── app.controller.spec.ts
│   └── notification-service/
│       └── src/
│           └── email.service.spec.ts
```

### Frontend (Next.js)
```
frontend/web-dashboard/
└── src/
    ├── components/
    │   ├── auth/
    │   │   ├── LoginForm.test.tsx
    │   │   └── RegisterForm.test.tsx
    │   └── layout/
    │       └── SidebarWrapper.test.tsx
    └── actions/
        └── auth.actions.test.ts
```

## 🎯 Cobertura de Pruebas

### Auth Service
- ✅ Registro de usuarios (Supabase + Prisma)
- ✅ Login de usuarios con validación
- ✅ Cambio de roles
- ✅ Manejo de errores RPC
- ✅ Publicación de eventos RabbitMQ
- ✅ Cleanup en caso de fallos

### Gym Management Service
- ✅ Unirse al gimnasio (joinGym)
- ✅ Procesamiento de membresías pagadas
- ✅ Activación manual de membresías
- ✅ Validación de permisos por rol
- ✅ Casos límite y errores

### Inventory Service
- ✅ CRUD de productos
- ✅ Validación de códigos de barras únicos
- ✅ Optimistic locking (versionado)
- ✅ Soft delete
- ✅ Filtrado por gimnasio

### Payment Service
- ✅ Creación de sesiones de checkout PayPal
- ✅ Procesamiento de webhooks PayPal
- ✅ Verificación de firmas
- ✅ Actualización de estados de pago
- ✅ Integración con otros servicios

### API Gateway
- ✅ Proxy de autenticación
- ✅ Manejo de errores RPC
- ✅ Unión a gimnasio con actualización de rol
- ✅ Proxy de webhooks PayPal
- ✅ Guards de JWT y Roles

### Notification Service
- ✅ Envío de emails con SendGrid
- ✅ Templates dinámicos
- ✅ Manejo de errores de envío
- ✅ Configuración de servicios

### Frontend Components
- ✅ LoginForm con estados de carga y error
- ✅ RegisterForm con validación
- ✅ SidebarWrapper con normalización de roles
- ✅ Mocking de hooks y router

### Frontend Actions
- ✅ loginAction con validación y cookies
- ✅ registerAction con manejo de errores
- ✅ Redirección basada en roles
- ✅ Validación de formularios

## 🛠️ Configuración

### Backend Jest Config
```javascript
// jest.config.base.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/generated/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/../../../jest.setup.js'],
  testTimeout: 30000,
};
```

### Frontend Jest Config
```javascript
// jest.config.js (Next.js)
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/actions/(.*)$': '<rootDir>/src/actions/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
```

## 🚀 Comandos de Ejecución

### Backend
```bash
# Ejecutar todas las pruebas del backend
pnpm test:unit:backend

# Ejecutar pruebas por servicio
pnpm test:auth
pnpm test:gyms
pnpm test:payments
pnpm test:gateway
pnpm test:inventory
pnpm test:notifications

# Con cobertura consolidada para SonarCloud
pnpm test:sonar
```

### Frontend
```bash
# Ejecutar pruebas del frontend
pnpm test:frontend

# Con watch mode
pnpm --filter web-dashboard run test:watch

# Con cobertura
pnpm --filter web-dashboard run test:cov
```

### SonarCloud Integration
```bash
# Ejecutar todas las pruebas con cobertura consolidada
pnpm test:sonar

# Este comando:
# 1. Ejecuta todas las pruebas con cobertura
# 2. Consolida reportes de cobertura de todos los servicios
# 3. Genera lcov.info en la raíz para SonarCloud
```

### Todas las pruebas
```bash
# Ejecutar todas las pruebas unitarias
pnpm test:unit:all

# Ejecutar todas las pruebas (incluyendo e2e)
pnpm test
```

## 🧩 Patrones de Testing Implementados

### 1. **Mocking Estratégico**
- Servicios externos (Supabase, PayPal, SendGrid)
- Bases de datos (Prisma)
- Colas de mensajes (RabbitMQ)
- APIs entre servicios

### 2. **Test Isolation**
- `beforeEach` para reset de mocks
- Configuración independiente por test
- No dependencias entre tests

### 3. **Casos de Prueba Completos**
- **Happy Path**: Casos de éxito
- **Error Handling**: Manejo de errores
- **Edge Cases**: Casos límite
- **Validation**: Validación de datos

### 4. **Aserciones Específicas**
- Verificación de llamadas a métodos
- Validación de parámetros
- Verificación de valores de retorno
- Estados de error apropiados

### 5. **Cobertura de Integración**
- Transacciones de base de datos
- Eventos asíncronos
- Comunicación entre servicios
- Manejo de estados complejos

## 📊 Métricas Esperadas

### Cobertura de Código
- **Líneas**: >90%
- **Funciones**: >95%
- **Ramas**: >85%
- **Declaraciones**: >90%

### Tipos de Pruebas
- **Unit Tests**: 95% de la lógica de negocio
- **Integration Tests**: Servicios críticos
- **Component Tests**: UI components principales
- **Action Tests**: Server actions de Next.js

## 🔧 Troubleshooting

### Problemas Comunes

1. **Timeout en pruebas**
   - Incrementar `testTimeout` en jest.config.js
   - Usar `jest.setTimeout()` en pruebas específicas

2. **Mocks no funcionan**
   - Verificar orden de imports
   - Usar `jest.clearAllMocks()` en beforeEach

3. **Errores de TypeScript**
   - Instalar `@types/jest`
   - Verificar configuración de tsconfig.json

4. **Errores de Next.js**
   - Usar `next/jest` para configuración
   - Mockear router y hooks correctamente

## 📝 Mejores Prácticas Implementadas

1. **Naming Conventions**
   - `*.spec.ts` para backend
   - `*.test.tsx` para frontend
   - Nombres descriptivos de tests

2. **Estructura AAA**
   - **Arrange**: Setup del test
   - **Act**: Ejecución de la función
   - **Assert**: Verificación del resultado

3. **Mock Management**
   - Mocks específicos por test
   - Reset entre tests
   - Configuración centralizada

4. **Error Testing**
   - Verificación de tipos de error
   - Códigos de estado HTTP
   - Mensajes de error específicos

5. **Async Testing**
   - Uso correcto de async/await
   - Manejo de promesas
   - Timeouts apropiados

## 🔧 Integración con SonarCloud

### Configuración Automática
El proyecto está configurado para funcionar automáticamente con SonarCloud:

- **Cobertura Consolidada**: Todos los reportes de cobertura se consolidan en un archivo `lcov.info` en la raíz
- **Exclusiones Inteligentes**: Archivos de prueba, generados y configuración excluidos automáticamente
- **CI/CD Integration**: GitHub Actions ejecuta pruebas y envía resultados a SonarCloud

### Archivos de Configuración para SonarCloud

#### `sonar-project.properties`
```properties
sonar.sources=backend,frontend
sonar.exclusions=**/node_modules/**,**/*.spec.ts,**/*.test.ts,**/*.test.tsx,**/generated/**
sonar.javascript.lcov.reportPaths=lcov.info
sonar.coverage.exclusions=**/*.spec.ts,**/*.test.ts,**/*.test.tsx
```

#### `.github/workflows/sonarcloud.yml`
```yaml
- name: Run tests & coverage
  run: infisical run -- pnpm test:sonar

- name: SonarCloud Scan
  uses: SonarSource/sonarqube-scan-action@v5.2.0
  with:
    args: >
      -Dsonar.javascript.lcov.reportPaths=lcov.info
```

### Script de Consolidación de Cobertura
```javascript
// scripts/merge-coverage.js
// Consolida reportes de todos los servicios en un archivo LCOV unificado
```

### Métricas en SonarCloud
- **Coverage**: Cobertura de código consolidada de frontend y backend
- **Quality Gate**: Configurado para mantener >85% de cobertura
- **Code Smells**: Detecta problemas de calidad en código de producción
- **Security Hotspots**: Identifica problemas de seguridad potenciales

Este conjunto de pruebas garantiza la calidad y robustez del sistema GymCore, cubriendo todos los casos críticos y proporcionando confianza para el desarrollo y despliegue continuo.

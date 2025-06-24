# GymCoreM

[![CI](https://circleci.com/gh/riofutabac/GymCoreM.svg?style=shield)](https://circleci.com/gh/riofutabac/GymCoreM) [![Codecov](https://codecov.io/gh/riofutabac/GymCoreM/branch/main/graph/badge.svg?style=shield)](https://codecov.io/gh/riofutabac/GymCoreM) [![npm version](https://img.shields.io/npm/v/gymcorem?style=shield)](https://www.npmjs.com/package/gymcorem) [![License](https://img.shields.io/github/license/riofutabac/GymCoreM?style=shield)](LICENSE)

GymCoreM es un sistema integral de gestión de gimnasios basado en microservicios. Proporciona todo desde registro de usuarios y control de acceso hasta pagos, inventario, análisis y notificaciones en tiempo real, empaquetado en un backend escalable con NestJS y un frontend con Next.js.

---

## 📋 Tabla de Contenidos

- [Características Principales](#características-principales)  
- [Descripción de la Arquitectura](#descripción-de-la-arquitectura)  
- [Stack Tecnológico](#stack-tecnológico)  
- [Primeros Pasos](#primeros-pasos)  
  - [Prerrequisitos](#prerrequisitos)  
  - [Instalación](#instalación)  
  - [Configuración del Entorno](#configuración-del-entorno)  
  - [Migraciones de Base de Datos](#migraciones-de-base-de-datos)  
  - [Inicializar Usuario Propietario](#inicializar-usuario-propietario)  
- [Uso](#uso)  
  - [Ejecutar con Docker](#ejecutar-con-docker)  
  - [Modo Desarrollo](#modo-desarrollo)  
- [Endpoints de la API](#endpoints-de-la-api)  
- [Estructura del Proyecto](#estructura-del-proyecto)  
- [Contribuir](#contribuir)  
- [Licencia](#licencia)  
- [Contacto](#contacto)  
- [Reconocimientos](#reconocimientos)  

---

## ✨ Características Principales

- **Control de Acceso Basado en Roles**: Propietario, Gerente, Recepcionista, Miembro  
- **Soporte Multi-Gimnasio**: Administra múltiples ubicaciones desde un solo dashboard  
- **Membresías y Control de Acceso**: Planes flexibles y entrada segura  
- **Procesamiento de Pagos**: Transacciones integradas y facturación  
- **Integración Biométrica**: Soporte para lectores de huellas dactilares/RFID  
- **Gestión de Inventario**: Seguimiento de productos, ventas y niveles de stock  
- **Análisis e Informes**: Insights del dashboard y métricas de uso  
- **Notificaciones en Tiempo Real**: Alertas por email, in-app y push  

---

## 🏗️ Descripción de la Arquitectura

GymCoreM sigue una arquitectura de microservicios para garantizar modularidad y escalabilidad:

```
[ Dashboard Web (Next.js) ] ⇄ [ API Gateway ]
                                     ⇅
┌─────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  Auth   │   Gestión   │   Pagos     │ Inventario  │ Biométrico  │ Análisis    │Notificación │   Logging   │
│Servicio │ Gimnasios   │  Servicio   │  Servicio   │  Servicio   │  Servicio   │  Servicio   │  Servicio   │
└─────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

### Responsabilidades de los Servicios

- **API Gateway**: Enruta solicitudes, maneja autenticación y limitación de velocidad  
- **Servicio de Autenticación**: Registro de usuarios, login, emisión de JWT  
- **Servicio de Gestión de Gimnasios**: Crear/listar gimnasios, membresías  
- **Servicio de Pagos**: Integración con Stripe y registros de transacciones  
- **Servicio de Inventario**: Operaciones CRUD de productos, actualizaciones de stock  
- **Servicio Biométrico**: Interfaces con hardware para acceso seguro  
- **Servicio de Análisis**: Agrega datos de uso, financieros y de asistencia  
- **Servicio de Notificaciones**: Envía emails y notificaciones push  
- **Servicio de Logging**: Logs centralizados para todos los microservicios  

---

## 🛠️ Stack Tecnológico

### Backend
- **NestJS** – Framework modular, TypeScript-first  
- **Prisma ORM** – Cliente de base de datos type-safe para PostgreSQL  
- **Supabase** – Características de autenticación y tiempo real  
- **TCP** – Transporte inter-servicios de alto rendimiento  

### Frontend
- **Next.js** – Generación SSR y estática  
- **Tailwind CSS** & **shadcn/ui** – Estilizado utility-first y componentes  
- **React Hook Form** + **Zod** – Gestión de estado de formularios y validación  

### DevOps
- **pnpm** – Gestor de paquetes rápido y eficiente en espacio de disco  
- **Docker** & **Docker Compose** – Contenedorización y orquestación  
- **CircleCI** – Pipeline de integración continua  

---

## 🚀 Primeros Pasos

### Prerrequisitos

- **Node.js** v18+  
- **pnpm** v8+  
- **Docker** & **Docker Compose**  
- **PostgreSQL** instancia  
- **Supabase** proyecto (para autenticación)

### Instalación

1. **Clonar repositorio**
   ```bash
   git clone https://github.com/riofutabac/GymCoreM.git
   cd GymCoreM
   ```

2. **Instalar dependencias**
   ```bash
   pnpm install
   ```

### Configuración del Entorno

Copia el archivo `.env.example` de cada servicio a `.env` y completa:
- URLs de bases de datos
- Llaves de Supabase
- Puertos de servicios

### Migraciones de Base de Datos

Ejecuta las migraciones para cada servicio que use Prisma:

```bash
pnpm db:migrate:auth
pnpm db:migrate:gym
pnpm db:migrate:inventory
pnpm db:migrate:payment
```

### Inicializar Usuario Propietario

Crear la primera cuenta de "Propietario":

```bash
pnpm db:init:owner
```

---

## 🎯 Uso

### Ejecutar con Docker

Construir e inicializar todos los contenedores:

```bash
docker-compose build
docker-compose up -d
```

Ver logs agregados:

```bash
docker-compose logs -f
```

### Modo Desarrollo

Iniciar todos los servicios con hot-reload:

```bash
pnpm dev:all
```

O ejecutar servicios individuales:

```bash
pnpm dev:gateway
pnpm dev:auth
```

**Puntos de Acceso:**
- Frontend: [http://localhost:3030](http://localhost:3030)
- API Gateway: [http://localhost:3000](http://localhost:3000)

---

## 📚 Endpoints de la API

Importa la colección de Thunder Client incluida (`thunder-collection.json`) para pruebas rápidas.

**URL Base:** `http://localhost:3000/api/v1`

### Autenticación
- `POST /auth/register` – Registrar nuevo usuario
- `POST /auth/login` – Login, devuelve JWT

### Gimnasios
- `POST /gyms` – Crear gimnasio (Solo propietario)
- `GET /gyms` – Listar gimnasios (Solo propietario)

*Ver la colección de Thunder Client para documentación completa de endpoints de todos los servicios.*

---

## 📁 Estructura del Proyecto

```
riofutabac-gymcorem/
├── package.json
├── pnpm-workspace.yaml
├── thunder-collection.json
├── thunder-environment.json
├── backend/
│   └── apps/
│       ├── api-gateway/                    # Gateway API central
│       │   ├── src/
│       │   │   ├── auth/                   # Guards JWT y roles
│       │   │   │   ├── jwt-auth.guard.ts
│       │   │   │   ├── roles.decorator.ts
│       │   │   │   └── roles.guard.ts
│       │   │   ├── app.controller.ts
│       │   │   ├── app.module.ts
│       │   │   ├── app.service.ts
│       │   │   ├── main.ts
│       │   │   └── rpc-exception.filter.ts
│       │   └── test/
│       │
│       ├── auth-service/                   # Autenticación de usuarios
│       │   ├── prisma/
│       │   │   ├── schema.prisma
│       │   │   └── migrations/
│       │   ├── src/
│       │   │   ├── dto/                    # Objetos de transferencia de datos
│       │   │   │   ├── login-user.dto.ts
│       │   │   │   └── register-user.dto.ts
│       │   │   ├── prisma/                 # Servicio de base de datos
│       │   │   │   ├── prisma.module.ts
│       │   │   │   └── prisma.service.ts
│       │   │   ├── supabase/               # Integración Supabase
│       │   │   │   ├── supabase.module.ts
│       │   │   │   └── supabase.service.ts
│       │   │   ├── app.controller.ts
│       │   │   ├── app.module.ts
│       │   │   ├── app.service.ts
│       │   │   ├── inicializar-owner.ts
│       │   │   └── main.ts
│       │   └── test/
│       │
│       ├── gym-management-service/         # Operaciones CRUD de gimnasios
│       │   ├── prisma/
│       │   │   ├── schema.prisma
│       │   │   └── migrations/
│       │   ├── src/
│       │   │   ├── dto/                    # DTOs de gimnasios
│       │   │   │   ├── admin-gym.dto.ts
│       │   │   │   ├── create-gym.dto.ts
│       │   │   │   └── public-gym.dto.ts
│       │   │   ├── prisma/
│       │   │   │   ├── prisma.module.ts
│       │   │   │   └── prisma.service.ts
│       │   │   ├── app.controller.ts
│       │   │   ├── app.module.ts
│       │   │   ├── app.service.ts
│       │   │   └── main.ts
│       │   └── test/
│       │
│       ├── payment-service/               # Procesamiento de pagos
│       │   ├── prisma/
│       │   │   ├── schema.prisma
│       │   │   └── migrations/
│       │   ├── src/
│       │   │   ├── prisma/
│       │   │   │   ├── prisma.module.ts
│       │   │   │   └── prisma.service.ts
│       │   │   ├── app.controller.ts
│       │   │   ├── app.module.ts
│       │   │   ├── app.service.ts
│       │   │   └── main.ts
│       │   └── test/
│       │
│       ├── inventory-service/             # Gestión de productos y stock
│       │   ├── prisma/
│       │   │   ├── schema.prisma
│       │   │   └── migrations/
│       │   ├── src/
│       │   │   ├── prisma/
│       │   │   │   ├── prisma.module.ts
│       │   │   │   └── prisma.service.ts
│       │   │   ├── app.controller.ts
│       │   │   ├── app.module.ts
│       │   │   ├── app.service.ts
│       │   │   └── main.ts
│       │   └── test/
│       │
│       ├── biometric-service/             # Integración con hardware
│       │   ├── src/
│       │   │   ├── app.controller.ts
│       │   │   ├── app.module.ts
│       │   │   ├── app.service.ts
│       │   │   └── main.ts
│       │   └── test/
│       │
│       ├── analytics-service/             # Análisis de datos
│       │   ├── src/
│       │   │   ├── app.controller.ts
│       │   │   ├── app.module.ts
│       │   │   ├── app.service.ts
│       │   │   └── main.ts
│       │   └── test/
│       │
│       ├── notification-service/          # Notificaciones email y push
│       │   ├── src/
│       │   │   ├── app.controller.ts
│       │   │   ├── app.module.ts
│       │   │   ├── app.service.ts
│       │   │   └── main.ts
│       │   └── test/
│       │
│       └── logging-service/               # Logging centralizado
│           ├── src/
│           │   ├── app.controller.ts
│           │   ├── app.module.ts
│           │   ├── app.service.ts
│           │   └── main.ts
│           └── test/
│
└── frontend/
    └── web-dashboard/                     # Frontend Next.js
        ├── src/
        │   ├── actions/                   # Server actions
        │   │   └── auth.actions.ts
        │   ├── app/                       # App router
        │   │   ├── globals.css
        │   │   ├── layout.tsx
        │   │   ├── page.tsx
        │   │   ├── (auth)/                # Páginas de autenticación
        │   │   │   ├── layout.tsx
        │   │   │   ├── login/
        │   │   │   │   └── page.tsx
        │   │   │   └── register/
        │   │   │       └── page.tsx
        │   │   └── (dashboard)/           # Dashboards por rol
        │   │       ├── layout.tsx
        │   │       ├── manager/
        │   │       │   └── page.tsx
        │   │       ├── member/
        │   │       │   └── page.tsx
        │   │       ├── owner/
        │   │       │   └── page.tsx
        │   │       └── receptionist/
        │   │           └── page.tsx
        │   ├── components/                # Componentes React
        │   │   ├── auth/                  # Formularios de autenticación
        │   │   │   ├── LoginForm.tsx
        │   │   │   └── RegisterForm.tsx
        │   │   ├── layout/                # Componentes de layout
        │   │   │   ├── AuthHeader.tsx
        │   │   │   └── Sidebar.tsx
        │   │   └── ui/                    # Componentes shadcn/ui
        │   │       ├── alert.tsx
        │   │       ├── avatar.tsx
        │   │       ├── badge.tsx
        │   │       ├── button.tsx
        │   │       ├── card.tsx
        │   │       ├── form.tsx
        │   │       ├── input.tsx
        │   │       ├── label.tsx
        │   │       └── separator.tsx
        │   └── lib/                       # Utilidades
        │       ├── validations.ts
        │       ├── api/
        │       │   └── auth.ts
        │       └── utils/
        │           ├── auth.ts
        │           └── cn.ts
        ├── components.json
        ├── next.config.ts
        ├── package.json
        ├── postcss.config.mjs
        └── tsconfig.json
```

---

## 🤝 Contribuir

Por favor lee [CONTRIBUTING.md](./CONTRIBUTING.md) para pautas sobre:

1. **Estilo de Código**: Configuración ESLint + Prettier
2. **Convenciones de Commits**: Formato de commits convencionales
3. **Estrategia de Ramas**: Ramas de características desde `main`
4. **Testing**: Pruebas unitarias requeridas para nuevas características
5. **Pull Requests**: Plantilla y proceso de revisión

### Flujo de Desarrollo

1. Haz fork del repositorio
2. Crea una rama de característica: `git checkout -b feature/caracteristica-increible`
3. Realiza tus cambios y agrega pruebas
4. Ejecuta las pruebas: `pnpm test`
5. Commit: `git commit -m 'feat: agregar característica increible'`
6. Push: `git push origin feature/caracteristica-increible`
7. Abre un Pull Request

---

## 📄 Licencia

Distribuido bajo la **Licencia MIT**. Ver [LICENSE](./LICENSE) para más detalles.

---

## 📧 Contacto

- **Desarrollador Principal**: Alexis Lapo – [GitHub](https://github.com/riofutabac) – [riofutabac](alexislapo1@gmail.com)
- **Repositorio del Proyecto**: [https://github.com/riofutabac/GymCoreM](https://github.com/riofutabac/GymCoreM)
- **Issues**: [Reportar un bug o solicitar una característica](https://github.com/riofutabac/GymCoreM/issues)

---

## 🙏 Reconocimientos

- [NestJS](https://nestjs.com/) – Framework progresivo de Node.js
- [Next.js](https://nextjs.org/) – Framework de React para producción
- [Prisma](https://www.prisma.io/) – ORM de próxima generación
- [Supabase](https://supabase.io/) – Alternativa open source a Firebase
- [shadcn/ui](https://ui.shadcn.com/) – Componentes bellamente diseñados
- [Tailwind CSS](https://tailwindcss.com/) – Framework CSS utility-first
- [Docker](https://www.docker.com/) – Plataforma de contenedorización
- [pnpm](https://pnpm.io/) – Gestor de paquetes rápido y eficiente

---

## 📊 Estado del Proyecto

- **Versión Actual**: v1.0.0
- **Estado de Desarrollo**: Desarrollo Activo
- **Cobertura de Pruebas**: 85%+
- **Documentación**: Completa
- **Listo para Producción**: Sí

Para las últimas actualizaciones y roadmap, revisa nuestra página de [GitHub Projects](https://github.com/riofutabac/GymCoreM/projects).

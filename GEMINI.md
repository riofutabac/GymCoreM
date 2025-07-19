# Contexto del Proyecto: GymCoreM

## Arquitectura General
Este es un monorepo gestionado con pnpm workspaces que contiene un sistema de gestión de gimnasios basado en microservicios.

- **Backend**: Construido con NestJS y TypeScript. Ubicado en `backend/apps/`.
- **Frontend**: Una aplicación web dashboard construida con Next.js. Ubicada en `frontend/web-dashboard/`.
- **Comunicación**: Los servicios se comunican entre sí principalmente vía TCP y usan RabbitMQ para la mensajería asíncrona basada en eventos.
- **Base de Datos**: Cada microservicio con persistencia usa su propia base de datos PostgreSQL con Prisma ORM.

## Microservicios Principales
- **api-gateway**: El punto de entrada único. Enruta las peticiones a los demás servicios. Contiene los guards de autenticación y roles.
- **auth-service**: Gestiona el registro, login y la sincronización de usuarios con Supabase.
- **gym-management-service**: Administra la lógica de gimnasios, membresías y usuarios locales.
- **payment-service**: Procesa pagos a través de PayPal.
- **inventory-service**: Maneja el inventario de productos y las ventas en el punto de venta (POS).
- **analytics-service**: Recopila y procesa métricas de la plataforma.

## Instrucciones para Generar Código
- **Nuevos Endpoints**: Si pido un nuevo endpoint, créalo primero en el controlador del microservicio correspondiente (ej. `gym-management-service`) y luego exponlo a través del `api-gateway`.
- **DTOs**: Utiliza DTOs (Data Transfer Objects) con `class-validator` para toda la data de entrada.
- **Frontend**: Utiliza los componentes de `shadcn/ui` que están en `src/components/ui/`. Las llamadas a la API están en `src/lib/api/`.
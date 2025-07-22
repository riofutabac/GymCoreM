# ==========================================
# 📦 DEPENDENCIES STAGE
# ==========================================
FROM node:18-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/apps/analytics-service/package.json ./backend/apps/analytics-service/
COPY backend/apps/analytics-service/prisma ./backend/apps/analytics-service/prisma

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd backend/apps/analytics-service && npx prisma generate

# ==========================================
# 🔨 BUILD STAGE (VERSIÓN DEFINITIVA Y ROBUSTA)
# ==========================================
FROM node:18-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

# 1. Copiar SÓLO los archivos de manifiesto y el lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 2. Copiar los package.json de las aplicaciones para que pnpm entienda la estructura del workspace.
COPY backend/apps/analytics-service/package.json ./backend/apps/analytics-service/
COPY backend/apps/analytics-service/prisma ./backend/apps/analytics-service/prisma

# 3. Instalar TODAS las dependencias. Esto crea los symlinks correctamente EN ESTA ETAPA.
RUN pnpm install --frozen-lockfile

# 4. Generar Prisma client
RUN cd backend/apps/analytics-service && npx prisma generate

# 5. Ahora, copiar el RESTO del código fuente de tu proyecto.
COPY . .

# 6. Construir la aplicación. ¡Ahora sí encontrará el comando `nest`!
RUN pnpm --filter analytics-service build

# ==========================================
# 🚀 DEVELOPMENT STAGE
# ==========================================
FROM node:18-alpine AS development
WORKDIR /app

RUN npm install -g pnpm

# Copy dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=deps /app/backend/apps/analytics-service/prisma ./backend/apps/analytics-service/prisma
COPY backend/apps/analytics-service ./backend/apps/analytics-service
COPY tsconfig.json ./

WORKDIR /app/backend/apps/analytics-service

EXPOSE 3005

# Development command with hot reload
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "-r", "tsconfig-paths/register", "src/main.ts"]

# ==========================================
# 🏃 PRODUCTION STAGE
# ==========================================
FROM node:18-alpine AS production
WORKDIR /app

RUN npm install -g pnpm

# 1. Copiar solo los archivos necesarios para instalar dependencias de PRODUCCIÓN
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/apps/analytics-service/package.json ./backend/apps/analytics-service/

# 2. Instalar ÚNICAMENTE las dependencias de producción
RUN pnpm install --frozen-lockfile --prod

# 3. Copiar la aplicación ya compilada y el schema de Prisma desde la etapa 'builder'
COPY --from=builder /app/backend/apps/analytics-service/dist ./backend/apps/analytics-service/dist
COPY --from=builder /app/backend/apps/analytics-service/package.json ./backend/apps/analytics-service/
COPY --from=builder /app/backend/apps/analytics-service/prisma ./backend/apps/analytics-service/prisma

# 4. Establecer el directorio de trabajo final
WORKDIR /app/backend/apps/analytics-service

EXPOSE 3005

# 5. Comando para ejecutar la aplicación
CMD ["node", "dist/main.js"]
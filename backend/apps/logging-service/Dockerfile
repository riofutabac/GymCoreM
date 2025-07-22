# ==========================================
# 📦 DEPENDENCIES STAGE
# ==========================================
FROM node:18-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/apps/logging-service/package.json ./backend/apps/logging-service/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# ==========================================
# 🔨 BUILD STAGE (VERSIÓN DEFINITIVA Y ROBUSTA)
# ==========================================
FROM node:18-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

# 1. Copiar SÓLO los archivos de manifiesto y el lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 2. Copiar los package.json de las aplicaciones para que pnpm entienda la estructura del workspace.
COPY backend/apps/logging-service/package.json ./backend/apps/logging-service/

# 3. Instalar TODAS las dependencias. Esto crea los symlinks correctamente EN ESTA ETAPA.
RUN pnpm install --frozen-lockfile

# 4. Ahora, copiar el RESTO del código fuente de tu proyecto.
COPY . .

# 5. Construir la aplicación. ¡Ahora sí encontrará el comando `nest`!
RUN pnpm --filter logging-service build

# ==========================================
# 🚀 DEVELOPMENT STAGE
# ==========================================
FROM node:18-alpine AS development
WORKDIR /app

RUN npm install -g pnpm

# Copy dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY backend/apps/logging-service ./backend/apps/logging-service
COPY tsconfig.json ./

WORKDIR /app/backend/apps/logging-service

EXPOSE 3008

# Development command with hot reload
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "-r", "tsconfig-paths/register", "src/main.ts"]

# ==========================================
# 🏃 PRODUCTION STAGE
# ==========================================
FROM node:18-alpine AS production
WORKDIR /app

RUN npm install -g pnpm

# Install only production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/apps/logging-service/package.json ./backend/apps/logging-service/
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /app/backend/apps/logging-service/dist ./backend/apps/logging-service/dist
COPY --from=builder /app/backend/apps/logging-service/package.json ./backend/apps/logging-service/

WORKDIR /app/backend/apps/logging-service

EXPOSE 3008

# Production command
CMD ["node", "dist/main.js"]
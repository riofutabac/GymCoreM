# ==========================================
# 📦 DEPENDENCIES STAGE
# ==========================================
FROM node:18-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/apps/auth-service/package.json ./backend/apps/auth-service/
COPY backend/apps/auth-service/prisma ./backend/apps/auth-service/prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd backend/apps/auth-service && npx prisma generate

# ==========================================
# 🔨 BUILD STAGE (VERSIÓN DEFINITIVA Y ROBUSTA)
# ==========================================
FROM node:18-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

# 1. Copiar SÓLO los archivos de manifiesto y el lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 2. Copiar los package.json de las aplicaciones para que pnpm entienda la estructura del workspace.
COPY backend/apps/auth-service/package.json ./backend/apps/auth-service/
COPY backend/apps/auth-service/prisma ./backend/apps/auth-service/prisma

# 3. Instalar TODAS las dependencias. Esto crea los symlinks correctamente EN ESTA ETAPA.
RUN pnpm install --frozen-lockfile

# 4. Generar Prisma client
RUN cd backend/apps/auth-service && npx prisma generate

# 5. Ahora, copiar el RESTO del código fuente de tu proyecto.
COPY . .

# 6. Construir la aplicación. ¡Ahora sí encontrará el comando `nest`!
RUN pnpm --filter auth-service build

# ==========================================
# 🚀 DEVELOPMENT STAGE
# ==========================================
FROM node:18-alpine AS development
WORKDIR /app

RUN npm install -g pnpm

# Copy dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=deps /app/backend/apps/auth-service/prisma ./backend/apps/auth-service/prisma
COPY backend/apps/auth-service ./backend/apps/auth-service
COPY tsconfig.json ./

WORKDIR /app/backend/apps/auth-service

EXPOSE 3001

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
COPY backend/apps/auth-service/package.json ./backend/apps/auth-service/
COPY backend/apps/auth-service/prisma ./backend/apps/auth-service/prisma
RUN pnpm install --frozen-lockfile --prod

# Generate Prisma client for production
RUN cd backend/apps/auth-service && npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/backend/apps/auth-service/dist ./backend/apps/auth-service/dist
COPY --from=builder /app/backend/apps/auth-service/package.json ./backend/apps/auth-service/

WORKDIR /app/backend/apps/auth-service

EXPOSE 3001

# Production command
CMD ["node", "dist/main.js"]
# Dockerfile para Frontend Next.js (web-dashboard)
# --- ETAPA 1: Dependencias ---
FROM node:18-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

# Copia los archivos de configuración del monorepo (CLAVE: incluir pnpm-workspace.yaml)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copia el package.json específico del frontend (ANTES de instalar)
COPY frontend/web-dashboard/package.json ./frontend/web-dashboard/

# Instala TODAS las dependencias (dev + prod) incluyendo Next.js
RUN pnpm install --frozen-lockfile --ignore-scripts

# --- ETAPA 2: Builder ---
FROM node:18-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

# Copia dependencias desde la etapa anterior.
COPY --from=deps /app/node_modules ./node_modules
# Copia los archivos de configuración del monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copia solo los archivos necesarios (evita problemas con node_modules)
COPY frontend/web-dashboard/src ./frontend/web-dashboard/src
COPY frontend/web-dashboard/public ./frontend/web-dashboard/public
COPY frontend/web-dashboard/package.json ./frontend/web-dashboard/
COPY frontend/web-dashboard/next.config.js ./frontend/web-dashboard/
COPY frontend/web-dashboard/tsconfig.json ./frontend/web-dashboard/
COPY frontend/web-dashboard/components.json ./frontend/web-dashboard/
COPY frontend/web-dashboard/postcss.config.mjs ./frontend/web-dashboard/

# Configura la variable de entorno para la salida standalone.
# Esto genera una carpeta .next/standalone con solo lo necesario para producción.
ENV NEXT_TELEMETRY_DISABLED 1

# DEBUGGING: Verificar que Next.js esté instalado
RUN ls -la node_modules/.bin/ | grep next || echo "Next.js no encontrado en node_modules/.bin/"

# Ejecuta el build del frontend usando el filtro de pnpm (desde la raíz)
RUN pnpm --filter web-dashboard run build

# --- ETAPA 3: Development ---
FROM node:18-alpine AS development
WORKDIR /app

RUN npm install -g pnpm

# Copia dependencias desde la etapa deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

# Copia solo los archivos necesarios del frontend
COPY frontend/web-dashboard/src ./frontend/web-dashboard/src
COPY frontend/web-dashboard/public ./frontend/web-dashboard/public
COPY frontend/web-dashboard/package.json ./frontend/web-dashboard/
COPY frontend/web-dashboard/next.config.js ./frontend/web-dashboard/
COPY frontend/web-dashboard/tsconfig.json ./frontend/web-dashboard/
COPY frontend/web-dashboard/components.json ./frontend/web-dashboard/
COPY frontend/web-dashboard/postcss.config.mjs ./frontend/web-dashboard/

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED 1

EXPOSE 3000

# Comando de desarrollo
CMD ["pnpm", "--filter", "web-dashboard", "run", "dev"]

# --- ETAPA 4: Runner (Imagen Final de Producción) ---
FROM node:18-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Copia las dependencias de producción
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=deps /app/frontend/web-dashboard/package.json ./frontend/web-dashboard/

# Instala solo dependencias de producción
RUN pnpm install --frozen-lockfile --prod

# Copia el build completo desde la etapa builder
COPY --from=builder /app/frontend/web-dashboard/.next ./frontend/web-dashboard/.next
COPY --from=builder /app/frontend/web-dashboard/public ./frontend/web-dashboard/public
COPY --from=builder /app/frontend/web-dashboard/next.config.js ./frontend/web-dashboard/

WORKDIR /app/frontend/web-dashboard

# Expone el puerto que usa Next.js (por defecto 3000 interno).
EXPOSE 3000

# El comando para iniciar la aplicación con Next.js start
CMD ["pnpm", "start"]
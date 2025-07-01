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

# Copia todo el código fuente.
COPY . .

# Configura la variable de entorno para la salida standalone.
# Esto genera una carpeta .next/standalone con solo lo necesario para producción.
ENV NEXT_TELEMETRY_DISABLED 1

# DEBUGGING: Verificar que Next.js esté instalado
RUN ls -la node_modules/.bin/ | grep next || echo "Next.js no encontrado en node_modules/.bin/"

# Ejecuta el build del frontend usando el filtro de pnpm (desde la raíz)
RUN pnpm --filter web-dashboard run build

# --- ETAPA 3: Runner (Imagen Final) ---
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Copia la salida del build standalone desde la etapa 'builder'.
COPY --from=builder /app/frontend/web-dashboard/.next/standalone ./
# Copia las carpetas de assets estáticos y públicos.
COPY --from=builder /app/frontend/web-dashboard/public ./frontend/web-dashboard/public
COPY --from=builder /app/frontend/web-dashboard/.next/static ./frontend/web-dashboard/.next/static

# Expone el puerto que usa Next.js (por defecto 3030 según tu package.json).
EXPOSE 3030

# El comando para iniciar la aplicación.
# Next.js standalone usa un server.js optimizado.
CMD ["node", "frontend/web-dashboard/server.js"]
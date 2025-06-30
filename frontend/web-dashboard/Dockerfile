# Dockerfile para Frontend Next.js (web-dashboard)
# --- ETAPA 1: Dependencias ---
FROM node:18-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

# Instala solo las dependencias de producción.
RUN pnpm install --prod --frozen-lockfile

# --- ETAPA 2: Builder ---
FROM node:18-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

# Copia dependencias desde la etapa anterior.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./

# Copia todo el código fuente.
COPY . .

# Configura la variable de entorno para la salida standalone.
# Esto genera una carpeta .next/standalone con solo lo necesario para producción.
ENV NEXT_TELEMETRY_DISABLED 1

# Ejecuta el build del frontend.
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
# Dockerfile para servicios NestJS (Versión Final Optimizada)
# --- ETAPA 1: Builder ---
# Esta etapa instala todas las dependencias y compila el código.
FROM node:18-alpine AS builder
WORKDIR /app

# Instala pnpm y la CLI de Infisical en una sola capa para eficiencia.
RUN npm install -g pnpm @infisical/cli

# Copia los archivos de definición de dependencias y configuración.
COPY package.json pnpm-lock.yaml .infisical.json ./

# Copia el .env que contiene el INFISICAL_TOKEN para que el build pueda acceder a los secretos.
COPY .env .

# Instala TODAS las dependencias. El postinstall que genera los clientes Prisma ahora funcionará.
RUN pnpm install --frozen-lockfile

# Copia el resto del código fuente del monorepo.
COPY . .

# Ejecuta el script de "build" específico para el servicio.
ARG SERVICE_NAME
RUN pnpm --filter=${SERVICE_NAME} run build


# --- ETAPA 2: Runner (Imagen Final) ---
# Esta es la imagen final, optimizada y ligera.
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

# Instala pnpm para poder ejecutar los scripts de start:prod
RUN npm install -g pnpm

# Copia solo los archivos de manifiesto necesarios para ejecutar los scripts.
COPY package.json ./

# Copia las dependencias de producción (ya instaladas) desde la etapa 'builder'.
COPY --from=builder /app/node_modules ./node_modules

# Copia el código compilado del servicio específico.
ARG SERVICE_NAME
COPY --from=builder /app/backend/apps/${SERVICE_NAME}/dist ./backend/apps/${SERVICE_NAME}/dist

# Expone el puerto que usará el microservicio.
ARG PORT=3000
EXPOSE ${PORT}

# Comando para iniciar el microservicio.
# Ya no necesita 'infisical run' aquí porque las variables de entorno
# se inyectan directamente desde el docker-compose.
CMD ["pnpm", "--filter", "${SERVICE_NAME}", "run", "start:prod"]
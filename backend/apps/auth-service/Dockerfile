# Dockerfile para servicios NestJS (Versión Final Optimizada)
# --- ETAPA 1: Builder ---
# Esta etapa instala todas las dependencias y compila el código.
FROM node:18-alpine AS builder

# Recibe el argumento que le pasaste desde docker-compose.yml
ARG INFISICAL_TOKEN
ARG SERVICE_NAME=auth-service

# Establece el argumento como una variable de entorno real dentro del build
ENV INFISICAL_TOKEN=${INFISICAL_TOKEN}

# Establece el directorio de trabajo RAÍZ
WORKDIR /app

# Instala pnpm y la CLI de Infisical en una sola capa para eficiencia.
RUN npm install -g pnpm @infisical/cli

# Copia los archivos de definición de dependencias y configuración del monorepo.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .infisical.json ./

# Copia el package.json del servicio específico
COPY backend/apps/${SERVICE_NAME}/package.json ./backend/apps/${SERVICE_NAME}/

# Copia el .env que contiene el INFISICAL_TOKEN para que el build pueda acceder a los secretos.
COPY .env .

# Instala TODAS las dependencias del monorepo SIN ejecutar postinstall
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copia el resto del código fuente del monorepo.
COPY . .

# CAMBIA AL DIRECTORIO DEL SERVICIO
WORKDIR /app/backend/apps/${SERVICE_NAME}

# Ejecuta los comandos desde DENTRO de la carpeta del servicio
RUN pnpm exec prisma generate
RUN pnpm run build


# --- ETAPA 2: Runner (Imagen Final) ---
# Esta es la imagen final, optimizada y ligera.
FROM node:18-alpine
ARG SERVICE_NAME=auth-service
ENV NODE_ENV=production

WORKDIR /app

# Instala pnpm para poder ejecutar los scripts de start:prod
RUN npm install -g pnpm

# Copia solo los archivos de manifiesto necesarios para ejecutar los scripts.
COPY package.json ./

# Copia las dependencias de producción (ya instaladas) desde la etapa 'builder'.
COPY --from=builder /app/node_modules ./node_modules

# Copia el código compilado del servicio específico.
COPY --from=builder /app/backend/apps/${SERVICE_NAME}/dist ./backend/apps/${SERVICE_NAME}/dist

# Expone el puerto que usará el microservicio.
ARG PORT=3000
EXPOSE ${PORT}

# Comando para iniciar el microservicio.
# Ya no necesita 'infisical run' aquí porque las variables de entorno
# se inyectan directamente desde el docker-compose.
CMD ["pnpm", "--filter", "auth-service", "run", "start:prod"]
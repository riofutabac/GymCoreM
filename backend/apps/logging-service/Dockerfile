# Dockerfile para servicios NestJS (ej. api-gateway, auth-service, etc.)
# --- ETAPA 1: Dependencias ---
# Esta etapa instala las dependencias de producción de forma aislada.
FROM node:18-alpine AS deps
WORKDIR /app

# Instala pnpm globalmente en el contenedor
RUN npm install -g pnpm

# Copia los archivos de definición de dependencias del monorepo.
# Esto es más eficiente porque Docker solo reinstalará dependencias si estos archivos cambian.
COPY package.json pnpm-lock.yaml ./

# Instala ÚNICAMENTE las dependencias de producción.
# El flag --prod omite las devDependencies, haciendo esta capa más ligera.
RUN pnpm install --prod --frozen-lockfile


# --- ETAPA 2: Builder ---
# Esta etapa compila el código TypeScript a JavaScript.
FROM node:18-alpine AS builder
WORKDIR /app

# Instala pnpm
RUN npm install -g pnpm

# Copia los archivos de definición de dependencias.
COPY package.json pnpm-lock.yaml ./

# Instala TODAS las dependencias (incluyendo devDependencies como typescript y nest-cli).
RUN pnpm install --frozen-lockfile

# Copia todo el código fuente del monorepo.
COPY . .

# Ejecuta el script de "build" específico para el servicio.
# El argumento SERVICE_NAME se pasará desde el docker-compose.yml.
ARG SERVICE_NAME
RUN pnpm --filter=${SERVICE_NAME} run build


# --- ETAPA 3: Runner (Imagen Final) ---
# Esta es la imagen final, optimizada y ligera que irá a producción.
FROM node:18-alpine
WORKDIR /app

# Variable de entorno para indicar que se ejecuta en producción.
ENV NODE_ENV=production

# Instala pnpm para poder ejecutar comandos.
RUN npm install -g pnpm

# Copia las dependencias de producción desde la etapa 'deps'.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json .

# Copia el código compilado (JavaScript) desde la etapa 'builder'.
# La ruta de destino es crucial para que coincida con la estructura de pnpm workspaces.
ARG SERVICE_NAME
COPY --from=builder /app/backend/apps/${SERVICE_NAME}/dist ./backend/apps/${SERVICE_NAME}/dist

# Expone el puerto que usará el microservicio.
# Este valor se pasará desde el docker-compose.
ARG PORT=3000
EXPOSE ${PORT}

# Comando para iniciar el microservicio.
# Usa el script start:prod que ejecuta el nodo directamente sobre el archivo compilado.
CMD ["pnpm", "--filter", "${SERVICE_NAME}", "run", "start:prod"]
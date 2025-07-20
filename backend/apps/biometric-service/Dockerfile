FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy this service's package.json
COPY backend/apps/biometric-service/package.json ./backend/apps/biometric-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY backend/apps/biometric-service ./backend/apps/biometric-service
COPY tsconfig.json ./

# Set working directory to the service
WORKDIR /app/backend/apps/biometric-service

# Development command
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "-r", "tsconfig-paths/register", "src/main.ts"]
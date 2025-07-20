FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy this service's package.json
COPY backend/apps/notification-service/package.json ./backend/apps/notification-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY backend/apps/notification-service ./backend/apps/notification-service
COPY tsconfig.json ./

# Set working directory to the service
WORKDIR /app/backend/apps/notification-service

# Development command
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "-r", "tsconfig-paths/register", "src/main.ts"]
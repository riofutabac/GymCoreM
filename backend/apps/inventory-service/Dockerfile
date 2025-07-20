FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy this service's package.json and prisma
COPY backend/apps/inventory-service/package.json ./backend/apps/inventory-service/
COPY backend/apps/inventory-service/prisma ./backend/apps/inventory-service/prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd backend/apps/inventory-service && npx prisma generate

# Copy source code
COPY backend/apps/inventory-service ./backend/apps/inventory-service
COPY tsconfig.json ./

# Set working directory to the service
WORKDIR /app/backend/apps/inventory-service

# Development command
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "-r", "tsconfig-paths/register", "src/main.ts"]
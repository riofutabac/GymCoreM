FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy this service's package.json and prisma
COPY backend/apps/analytics-service/package.json ./backend/apps/analytics-service/
COPY backend/apps/analytics-service/prisma ./backend/apps/analytics-service/prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd backend/apps/analytics-service && npx prisma generate

# Copy source code
COPY backend/apps/analytics-service ./backend/apps/analytics-service
COPY tsconfig.json ./

# Set working directory to the service
WORKDIR /app/backend/apps/analytics-service

# Development command
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "-r", "tsconfig-paths/register", "src/main.ts"]
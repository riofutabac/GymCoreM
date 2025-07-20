FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy this service's package.json and prisma
COPY backend/apps/payment-service/package.json ./backend/apps/payment-service/
COPY backend/apps/payment-service/prisma ./backend/apps/payment-service/prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd backend/apps/payment-service && npx prisma generate

# Copy source code
COPY backend/apps/payment-service ./backend/apps/payment-service
COPY tsconfig.json ./

# Set working directory to the service
WORKDIR /app/backend/apps/payment-service

# Development command
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "-r", "tsconfig-paths/register", "src/main.ts"]
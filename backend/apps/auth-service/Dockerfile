# ==========================================
# 📦 DEPENDENCIES STAGE
# ==========================================
FROM node:18-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/apps/auth-service/package.json ./backend/apps/auth-service/
COPY backend/apps/auth-service/prisma ./backend/apps/auth-service/prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd backend/apps/auth-service && npx prisma generate

# ==========================================
# 🔨 BUILD STAGE
# ==========================================
FROM node:18-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm @nestjs/cli

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=deps /app/backend/apps/auth-service/prisma ./backend/apps/auth-service/prisma

# Copy source code
COPY backend/apps/auth-service ./backend/apps/auth-service
COPY tsconfig.json ./

# Build the application using workspace build
RUN cd backend/apps/auth-service && npx nest build

# ==========================================
# 🚀 DEVELOPMENT STAGE
# ==========================================
FROM node:18-alpine AS development
WORKDIR /app

RUN npm install -g pnpm

# Copy dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=deps /app/backend/apps/auth-service/prisma ./backend/apps/auth-service/prisma
COPY backend/apps/auth-service ./backend/apps/auth-service
COPY tsconfig.json ./

WORKDIR /app/backend/apps/auth-service

EXPOSE 3001

# Development command with hot reload
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "-r", "tsconfig-paths/register", "src/main.ts"]

# ==========================================
# 🏃 PRODUCTION STAGE
# ==========================================
FROM node:18-alpine AS production
WORKDIR /app

RUN npm install -g pnpm

# Install only production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/apps/auth-service/package.json ./backend/apps/auth-service/
COPY backend/apps/auth-service/prisma ./backend/apps/auth-service/prisma
RUN pnpm install --frozen-lockfile --prod

# Generate Prisma client for production
RUN cd backend/apps/auth-service && npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/backend/apps/auth-service/dist ./backend/apps/auth-service/dist
COPY --from=builder /app/backend/apps/auth-service/package.json ./backend/apps/auth-service/

WORKDIR /app/backend/apps/auth-service

EXPOSE 3001

# Production command
CMD ["node", "dist/main.js"]
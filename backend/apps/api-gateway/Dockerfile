# ==========================================
# 📦 DEPENDENCIES STAGE
# ==========================================
FROM node:18-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/apps/api-gateway/package.json ./backend/apps/api-gateway/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# ==========================================
# 🔨 BUILD STAGE
# ==========================================
FROM node:18-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm @nestjs/cli

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

# Copy source code
COPY backend/apps/api-gateway ./backend/apps/api-gateway
COPY tsconfig.json ./

# Build the application using the nest CLI from node_modules
RUN cd backend/apps/api-gateway && ../../../node_modules/.bin/nest build

# ==========================================
# 🚀 DEVELOPMENT STAGE
# ==========================================
FROM node:18-alpine AS development
WORKDIR /app

RUN npm install -g pnpm

# Copy dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY backend/apps/api-gateway ./backend/apps/api-gateway
COPY tsconfig.json ./

WORKDIR /app/backend/apps/api-gateway

EXPOSE 3000

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
COPY backend/apps/api-gateway/package.json ./backend/apps/api-gateway/
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /app/backend/apps/api-gateway/dist ./backend/apps/api-gateway/dist
COPY --from=builder /app/backend/apps/api-gateway/package.json ./backend/apps/api-gateway/

WORKDIR /app/backend/apps/api-gateway

EXPOSE 3000

# Production command
CMD ["node", "dist/main.js"]
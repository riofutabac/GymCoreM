# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GymCoreM is a microservices-based gym management system built with NestJS backend services, Next.js frontend, and various supporting infrastructure. The system includes authentication, gym management, payments, inventory, analytics, biometric access, notifications, and centralized logging.

## Common Development Commands

### Development
```bash
# Start all services in development mode (with Infisical)
pnpm dev:all

# Start individual services (with Infisical)
pnpm dev:gateway     # API Gateway (port 3000)
pnpm dev:auth        # Auth Service 
pnpm dev:gyms        # Gym Management Service
pnpm dev:payments    # Payment Service
pnpm dev:inventory   # Inventory Service
pnpm dev:analytics   # Analytics Service
pnpm dev:notifications # Notification Service
pnpm dev:biometric   # Biometric Service
pnpm dev:logging     # Logging Service
pnpm dev:frontend    # Next.js Frontend

# Start services with Docker (no Infisical, reads .env files)
pnpm dev:all:docker

# Individual Docker services (no Infisical)
pnpm dev:gateway:docker
pnpm dev:auth:docker
# ... etc for all services
```

### Docker Commands
```bash
# Start all services with Docker (individual Dockerfiles per microservice)
docker-compose up -d                    # All services including infrastructure
docker-compose up -d rabbitmq redis elasticsearch kibana  # Infrastructure only

# Start specific services
docker-compose up -d api-gateway auth-service  # Specific services
docker-compose up -d biometric-service         # Single service

# Docker utilities
docker-compose down                     # Stop all services
docker-compose logs -f [service-name]   # View logs for specific service
docker-compose build [service-name]     # Rebuild specific service
docker-compose restart [service-name]   # Restart specific service

# Remove all containers and volumes (clean slate)
docker-compose down -v --remove-orphans
```

### Building
```bash
# Build all services
pnpm build

# Build specific components
pnpm build:backend
pnpm build:frontend
pnpm build:gateway
pnpm build:auth
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests for specific services
pnpm test:auth
pnpm test:gyms
pnpm test:payments
pnpm test:gateway
pnpm test:inventory
pnpm test:analytics
pnpm test:frontend

# Run tests with coverage
pnpm test:coverage

# Run e2e tests
pnpm test:e2e
```

### Database Operations
```bash
# Generate Prisma clients for all services
pnpm db:generate:all

# Run migrations for all services
pnpm db:migrate:all

# Push schema changes without migrations
pnpm db:push:auth
pnpm db:push:gym
pnpm db:push:inventory
pnpm db:push:payment
pnpm db:push:analytics

# Reset databases (destructive)
pnpm db:reset:all

# Initialize owner user
pnpm db:init:owner
```

### Code Quality
```bash
# Lint all projects
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check
```

## Architecture Overview

### Microservices Structure
- **API Gateway** (`backend/apps/api-gateway/`) - Central routing, JWT auth, request validation
- **Auth Service** (`backend/apps/auth-service/`) - User authentication, Supabase integration
- **Gym Management** (`backend/apps/gym-management-service/`) - Gym CRUD, membership management
- **Payment Service** (`backend/apps/payment-service/`) - PayPal integration, transaction processing
- **Inventory Service** (`backend/apps/inventory-service/`) - Product management, sales tracking
- **Analytics Service** (`backend/apps/analytics-service/`) - KPIs, reporting, Redis caching
- **Biometric Service** (`backend/apps/biometric-service/`) - Fingerprint/RFID integration
- **Notification Service** (`backend/apps/notification-service/`) - Email notifications via SendGrid
- **Logging Service** (`backend/apps/logging-service/`) - Centralized logging with Elasticsearch

### Frontend
- **Web Dashboard** (`frontend/web-dashboard/`) - Next.js 14 with React, Tailwind CSS, shadcn/ui

### Communication Patterns
- **API Gateway** routes HTTP requests to appropriate microservices
- **RabbitMQ** for async event communication between services
- **Redis** for caching analytics data and session management
- **PostgreSQL** databases per service with Prisma ORM

### Key Technologies
- **Backend**: NestJS, TypeScript, Prisma, RabbitMQ, Redis
- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui components
- **Database**: PostgreSQL per service
- **Infrastructure**: Docker, Elasticsearch, Kibana for logging
- **Security**: Infisical for secrets management, JWT authentication

## Development Guidelines

### Environment Setup
- Use Infisical CLI for environment variable management
- Each service has its own `.env` file with specific variables
- Services require `DATABASE_URL`, `MESSAGE_BUS_URL`, and service-specific configs

### Database Schema Management
- Each service has its own Prisma schema in `prisma/schema.prisma`
- Generated clients are in `prisma/generated/{service-name}-client/`
- Always run `pnpm db:generate:all` after schema changes

### Testing Approach
- Unit tests use Jest configuration in each service
- E2E tests are service-specific
- Coverage reports are merged using `scripts/merge-coverage.js`

### Code Style
- ESLint configuration is shared across services
- Prettier for code formatting
- Husky pre-commit hooks for linting and testing

### Service-Specific Notes

#### Auth Service
- Integrates with Supabase for user management
- Handles JWT token generation and validation
- Contains `inicializar-owner.ts` script for initial setup

#### Payment Service  
- PayPal SDK integration in `src/paypal/`
- Webhook handling for payment confirmations
- Links to inventory service for POS sales

#### Biometric Service
- Serial port communication for hardware devices
- Event-driven architecture for access control
- Requires physical hardware for full functionality

#### Logging Service
- Elasticsearch integration for log storage
- Kibana dashboard available at http://localhost:5601
- Centralized logging from all microservices

### Docker Development

#### Local Development (with Infisical)
- Use existing scripts with Infisical for local development:
  ```bash
  pnpm dev:all          # All services with Infisical
  pnpm dev:gateway      # Individual service with Infisical
  ```

#### Docker Development (without Infisical)
- Use `:docker` scripts that read from individual `.env` files:
  ```bash
  # Start infrastructure only
  docker-compose -f docker-compose.dev.yml up rabbitmq redis elasticsearch kibana -d
  
  # Start all services in Docker
  docker-compose -f docker-compose.dev.yml up -d
  
  # Individual service commands (no Infisical)
  pnpm dev:gateway:docker
  pnpm dev:auth:docker
  pnpm dev:all:docker   # All services without Infisical
  ```

#### Production Deployment
- `docker-compose.prod.yml` builds optimized images without Infisical
- Each service reads from its own `.env` file in `backend/apps/{service}/.env`
  ```bash
  # Build and deploy production
  docker-compose -f docker-compose.prod.yml up --build -d
  ```

#### Environment File Structure
- Each microservice needs its own `.env` file:
  - `backend/apps/api-gateway/.env`
  - `backend/apps/auth-service/.env`
  - `backend/apps/gym-management-service/.env`
  - etc.
- Docker containers load these files using `env_file` directive

### Workspace Management
- PNPM workspace configuration in `pnpm-workspace.yaml`
- Shared dependencies managed at root level
- Service-specific dependencies in individual `package.json` files
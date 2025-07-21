# ============================================================================
# 🎯 GYMCORE MAKEFILE
# ============================================================================
# Centralized command interface for GymCore development, deployment, and team workflows
# Replaces scattered npm/pnpm scripts with intuitive, standardized commands
# ============================================================================

.PHONY: help setup dev build test deploy clean validate migrate backup

# Default environment
ENV ?= development

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
BLUE := \033[0;34m
NC := \033[0m

# ============================================================================
# 📋 HELP AND INFO
# ============================================================================

## Display this help message
help:
	@echo "$(GREEN)╔══════════════════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║                       🎯 GYMCORE MAKEFILE COMMANDS                        ║$(NC)"
	@echo "$(GREEN)║                    Centralized Development Workflow                      ║$(NC)"
	@echo "$(GREEN)╚══════════════════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(BLUE)📋 ENVIRONMENT MANAGEMENT:$(NC)"
	@echo "  setup-dev           🛠️  Setup development environment (recommended for new devs)"
	@echo "  setup-staging       🎭  Setup staging environment" 
	@echo "  setup-production    🚀  Setup production environment"
	@echo "  validate-env        ✅  Validate environment configuration"
	@echo "  sync-team           🔄  Sync environment with team"
	@echo ""
	@echo "$(BLUE)🏗️ DEVELOPMENT:$(NC)"
	@echo "  dev                 🔥  Start all services in development mode"
	@echo "  dev-docker          🐳  Start all services with Docker"
	@echo "  dev-infra           🏗️  Start only infrastructure (DB, Redis, etc.)"
	@echo "  dev-backend         🎛️  Start only backend services"
	@echo "  dev-frontend        🖥️  Start only frontend"
	@echo ""
	@echo "$(BLUE)🛠️ BUILD & TEST:$(NC)"
	@echo "  build               🏗️  Build all services"
	@echo "  build-backend       🎛️  Build only backend services"
	@echo "  build-frontend      🖥️  Build only frontend"
	@echo "  test                🧪  Run all tests"
	@echo "  test-coverage       📊  Run tests with coverage"
	@echo "  lint                🔍  Lint all code"
	@echo "  format              ✨  Format all code"
	@echo ""
	@echo "$(BLUE)🗄️ DATABASE:$(NC)"
	@echo "  migrate             📦  Run database migrations"
	@echo "  migrate-reset       💥  Reset databases (DESTRUCTIVE)"
	@echo "  migrate-status      📊  Check migration status"
	@echo "  db-init-owner       👑  Initialize owner user"
	@echo ""
	@echo "$(BLUE)🚀 DEPLOYMENT:$(NC)"
	@echo "  deploy-dev          🛠️  Deploy to development"
	@echo "  deploy-staging      🎭  Deploy to staging"  
	@echo "  deploy-production   🚀  Deploy to production"
	@echo "  health-check        💊  Check all services health"
	@echo ""
	@echo "$(BLUE)🧹 MAINTENANCE:$(NC)"
	@echo "  clean               🧹  Clean build artifacts"
	@echo "  clean-deps          💥  Clean and reinstall dependencies"
	@echo "  backup              💾  Backup configurations"
	@echo "  logs                📝  Show service logs"
	@echo ""
	@echo "$(BLUE)📊 EXAMPLES:$(NC)"
	@echo "  make setup-dev                    # 🆕 New developer onboarding"
	@echo "  make dev                          # 🔥 Start development"
	@echo "  make validate-env                 # ✅ Check configuration"
	@echo "  make deploy-staging               # 🎭 Deploy to staging"
	@echo "  make test ENV=staging             # 🧪 Test staging environment"
	@echo ""
	@echo "$(YELLOW)💡 Use ENV=<environment> to override default environment (development)$(NC)"

## Show project status
status:
	@echo "$(GREEN)📊 GymCore Project Status:$(NC)"
	@echo "  Environment: $(ENV)"
	@echo "  Node Version: $$(node --version 2>/dev/null || echo 'Not installed')"
	@echo "  PNPM Version: $$(pnpm --version 2>/dev/null || echo 'Not installed')"
	@echo "  Docker Status: $$(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',' || echo 'Not installed')"
	@echo ""
	@./config/scripts/validate-envs.sh --service api-gateway 2>/dev/null && echo "  ✅ Environment configured" || echo "  ❌ Environment needs setup"

# ============================================================================
# 🛠️ ENVIRONMENT MANAGEMENT
# ============================================================================

## Setup development environment (recommended for new developers)
setup-dev: ENV=development
setup-dev:
	@echo "$(GREEN)🛠️ Setting up development environment...$(NC)"
	@pnpm install
	@./config/scripts/setup-envs.sh --environment development --force
	@./config/scripts/validate-envs.sh
	@$(MAKE) migrate ENV=development
	@echo "$(GREEN)✅ Development environment ready!$(NC)"
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Update .env files with your actual API keys (Supabase, PayPal, etc.)"
	@echo "  2. Run: make dev"
	@echo "  3. Visit: http://localhost:3030 (Frontend) and http://localhost:3000 (API)"

## Setup staging environment
setup-staging: ENV=staging
setup-staging:
	@echo "$(GREEN)🎭 Setting up staging environment...$(NC)"
	@pnpm install
	@./config/scripts/setup-envs.sh --environment staging --force
	@./config/scripts/validate-envs.sh
	@$(MAKE) migrate ENV=staging
	@echo "$(GREEN)✅ Staging environment ready!$(NC)"

## Setup production environment
setup-production: ENV=production
setup-production:
	@echo "$(RED)🚀 Setting up production environment...$(NC)"
	@echo "$(RED)⚠️  WARNING: This will configure production settings!$(NC)"
	@read -p "Are you sure? (y/N): " confirm; [ "$$confirm" = "y" ] || exit 1
	@pnpm install --frozen-lockfile
	@./config/scripts/setup-envs.sh --environment production --force
	@./config/scripts/validate-envs.sh
	@$(MAKE) migrate ENV=production
	@echo "$(GREEN)✅ Production environment ready!$(NC)"

## Validate environment configuration
validate-env:
	@echo "$(BLUE)✅ Validating environment configuration...$(NC)"
	@./config/scripts/validate-envs.sh

## Sync environment with team
sync-team:
	@echo "$(BLUE)🔄 Syncing with team configuration...$(NC)"
	@./config/scripts/sync-team.sh pull
	@./config/scripts/validate-envs.sh

## Push local environment changes to team
sync-push:
	@echo "$(YELLOW)📤 Pushing environment changes to team...$(NC)"
	@./config/scripts/sync-team.sh push

# ============================================================================
# 🏗️ DEVELOPMENT
# ============================================================================

## Start all services in development mode
dev:
	@echo "$(GREEN)🔥 Starting all services in development mode...$(NC)"
	@pnpm dev:all

## Start services with Docker
dev-docker:
	@echo "$(GREEN)🐳 Starting services with Docker...$(NC)"
	@docker-compose -f docker-compose.dev.yml up -d
	@$(MAKE) logs-follow

## Start only infrastructure services
dev-infra:
	@echo "$(GREEN)🏗️ Starting infrastructure services...$(NC)"
	@docker-compose -f docker-compose.dev.yml up -d postgres rabbitmq redis elasticsearch kibana

## Start only backend services
dev-backend:
	@echo "$(GREEN)🎛️ Starting backend services...$(NC)"
	@pnpm dev:backend

## Start only frontend
dev-frontend:
	@echo "$(GREEN)🖥️ Starting frontend...$(NC)"
	@pnpm dev:frontend

## Stop all Docker services
stop:
	@echo "$(YELLOW)⏹️  Stopping all services...$(NC)"
	@docker-compose -f docker-compose.dev.yml down

# ============================================================================
# 🛠️ BUILD & TEST
# ============================================================================

## Build all services
build:
	@echo "$(GREEN)🏗️ Building all services...$(NC)"
	@pnpm build

## Build only backend services
build-backend:
	@echo "$(GREEN)🎛️ Building backend services...$(NC)"
	@pnpm build:backend

## Build only frontend
build-frontend:
	@echo "$(GREEN)🖥️ Building frontend...$(NC)"
	@pnpm build:frontend

## Run all tests
test:
	@echo "$(GREEN)🧪 Running all tests...$(NC)"
	@pnpm test

## Run tests with coverage
test-coverage:
	@echo "$(GREEN)📊 Running tests with coverage...$(NC)"
	@pnpm test:coverage

## Lint all code
lint:
	@echo "$(GREEN)🔍 Linting all code...$(NC)"
	@pnpm lint

## Lint and fix issues
lint-fix:
	@echo "$(GREEN)🔧 Linting and fixing issues...$(NC)"
	@pnpm lint:fix

## Format all code
format:
	@echo "$(GREEN)✨ Formatting all code...$(NC)"
	@pnpm format

# ============================================================================
# 🗄️ DATABASE MANAGEMENT
# ============================================================================

## Run database migrations
migrate:
	@echo "$(GREEN)📦 Running database migrations for $(ENV)...$(NC)"
	@./scripts/migrate-all-databases.sh migrate --environment $(ENV) --yes

## Generate Prisma clients
generate:
	@echo "$(GREEN)⚙️ Generating Prisma clients...$(NC)"
	@./scripts/migrate-all-databases.sh generate --environment $(ENV) --yes

## Push database schema (development only)
migrate-push:
	@echo "$(YELLOW)📤 Pushing database schema...$(NC)"
	@./scripts/migrate-all-databases.sh push --environment $(ENV)

## Reset databases (DESTRUCTIVE)
migrate-reset:
	@echo "$(RED)💥 Resetting databases (DESTRUCTIVE)...$(NC)"
	@echo "$(RED)⚠️  This will DELETE ALL DATA!$(NC)"
	@read -p "Are you sure? Type 'RESET' to confirm: " confirm; [ "$$confirm" = "RESET" ] || exit 1
	@./scripts/migrate-all-databases.sh reset --environment $(ENV) --force

## Check migration status
migrate-status:
	@echo "$(BLUE)📊 Checking migration status...$(NC)"
	@./scripts/migrate-all-databases.sh status --environment $(ENV)

## Initialize owner user
db-init-owner:
	@echo "$(GREEN)👑 Initializing owner user...$(NC)"
	@pnpm db:init:owner

# ============================================================================
# 🚀 DEPLOYMENT
# ============================================================================

## Deploy to development environment
deploy-dev: ENV=development
deploy-dev:
	@echo "$(GREEN)🛠️ Deploying to development...$(NC)"
	@$(MAKE) build
	@$(MAKE) migrate ENV=development
	@$(MAKE) dev-docker

## Deploy to staging environment  
deploy-staging: ENV=staging
deploy-staging:
	@echo "$(YELLOW)🎭 Deploying to staging...$(NC)"
	@$(MAKE) validate-env ENV=staging
	@$(MAKE) build
	@$(MAKE) migrate ENV=staging
	@docker-compose -f docker-compose.staging.yml up -d --build

## Deploy to production environment
deploy-production: ENV=production
deploy-production:
	@echo "$(RED)🚀 Deploying to production...$(NC)"
	@echo "$(RED)⚠️  WARNING: Production deployment!$(NC)"
	@read -p "Are you sure? (y/N): " confirm; [ "$$confirm" = "y" ] || exit 1
	@$(MAKE) validate-env ENV=production
	@$(MAKE) build
	@$(MAKE) migrate ENV=production
	@docker-compose -f docker-compose.prod.yml up -d --build

## Check health of all services
health-check:
	@echo "$(BLUE)💊 Checking service health...$(NC)"
	@echo "API Gateway: $$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "DOWN")"
	@echo "Frontend: $$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3030 || echo "DOWN")"
	@echo "Elasticsearch: $$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9200/_cluster/health || echo "DOWN")"
	@echo "Kibana: $$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5601/api/status || echo "DOWN")"

# ============================================================================
# 🧹 MAINTENANCE
# ============================================================================

## Clean build artifacts
clean:
	@echo "$(YELLOW)🧹 Cleaning build artifacts...$(NC)"
	@pnpm clean:dist
	@docker system prune -f --volumes

## Clean and reinstall dependencies
clean-deps:
	@echo "$(RED)💥 Cleaning dependencies...$(NC)"
	@pnpm clean:deps
	@pnpm install

## Create backup of configurations
backup:
	@echo "$(BLUE)💾 Creating configuration backup...$(NC)"
	@./config/scripts/sync-team.sh backup

## Show service logs
logs:
	@echo "$(BLUE)📝 Showing service logs...$(NC)"
	@docker-compose -f docker-compose.dev.yml logs --tail=100

## Follow service logs
logs-follow:
	@echo "$(BLUE)📝 Following service logs (Ctrl+C to stop)...$(NC)"
	@docker-compose -f docker-compose.dev.yml logs -f

## Show logs for specific service
logs-service:
	@echo "$(BLUE)📝 Showing logs for $(SERVICE)...$(NC)"
	@docker-compose -f docker-compose.dev.yml logs -f $(SERVICE)

# ============================================================================
# 🎯 COMBINED WORKFLOWS
# ============================================================================

## Complete setup for new developers (recommended)
onboarding:
	@echo "$(GREEN)🎯 GymCore Developer Onboarding...$(NC)"
	@echo "$(BLUE)Step 1/5: Installing dependencies...$(NC)"
	@pnpm install
	@echo "$(BLUE)Step 2/5: Setting up environment...$(NC)"
	@$(MAKE) setup-dev
	@echo "$(BLUE)Step 3/5: Starting infrastructure...$(NC)" 
	@$(MAKE) dev-infra
	@sleep 10
	@echo "$(BLUE)Step 4/5: Running migrations...$(NC)"
	@$(MAKE) migrate
	@echo "$(BLUE)Step 5/5: Initializing data...$(NC)"
	@$(MAKE) db-init-owner
	@echo ""
	@echo "$(GREEN)✅ Onboarding complete!$(NC)"
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Update your API keys in the .env files"
	@echo "  2. Run: make dev"
	@echo "  3. Visit: http://localhost:3030"

## Full CI/CD pipeline simulation
ci:
	@echo "$(GREEN)🤖 Running CI/CD pipeline...$(NC)"
	@$(MAKE) validate-env
	@$(MAKE) lint
	@$(MAKE) build
	@$(MAKE) test
	@echo "$(GREEN)✅ CI/CD pipeline completed!$(NC)"

## Reset everything and start fresh (DESTRUCTIVE)
reset-all:
	@echo "$(RED)💥 COMPLETE SYSTEM RESET (DESTRUCTIVE)$(NC)"
	@echo "$(RED)This will DELETE ALL DATA and configurations!$(NC)"
	@read -p "Type 'RESET-ALL' to confirm: " confirm; [ "$$confirm" = "RESET-ALL" ] || exit 1
	@$(MAKE) stop
	@$(MAKE) clean
	@$(MAKE) migrate-reset
	@$(MAKE) setup-dev
	@echo "$(GREEN)✅ System reset complete!$(NC)"

# ============================================================================
# 🔧 UTILITY FUNCTIONS
# ============================================================================

## Check if required tools are installed
check-tools:
	@echo "$(BLUE)🔧 Checking required tools...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "❌ Node.js not installed"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm not installed"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "❌ Docker not installed"; exit 1; }
	@command -v git >/dev/null 2>&1 || { echo "❌ Git not installed"; exit 1; }
	@echo "✅ All required tools are installed"

## Install git hooks
install-hooks:
	@echo "$(BLUE)🪝 Installing git hooks...$(NC)"
	@npx husky install
	@echo "✅ Git hooks installed"

# Make bash scripts executable
$(shell chmod +x config/scripts/*.sh scripts/*.sh 2>/dev/null || true)
// jest.config.js - Configuración principal para ejecutar todos los tests
module.exports = {
  projects: [
    '<rootDir>/backend/apps/auth-service',
    '<rootDir>/backend/apps/gym-management-service',
    '<rootDir>/backend/apps/inventory-service',
    '<rootDir>/backend/apps/payment-service',
    '<rootDir>/backend/apps/api-gateway',
    '<rootDir>/backend/apps/notification-service',
    '<rootDir>/frontend/web-dashboard',
  ],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'backend/apps/*/src/**/*.{ts,js}',
    'frontend/web-dashboard/src/**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
    '!**/*.spec.ts',
    '!**/*.test.ts',
    '!**/*.test.tsx',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/generated/**',
    '!**/main.ts',
    '!**/*.module.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};

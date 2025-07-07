// frontend/web-dashboard/jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/actions/(.*)$': '<rootDir>/src/actions/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
    '!src/**/page.tsx',
    '!src/**/layout.tsx',
    '!src/**/loading.tsx',
    '!src/**/error.tsx',
    '!src/**/not-found.tsx',
  ],
  // Configuración para SonarCloud
  coverageDirectory: '../../coverage/frontend',
  coverageReporters: ['text', 'lcov', 'html'],
  displayName: 'frontend',
};

module.exports = createJestConfig(customJestConfig);

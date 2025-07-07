// jest.config.base.js - Configuración base para todos los microservicios
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/generated/**',
    '!**/*.d.ts',
    '!**/prisma/generated/**',
  ],
  coverageDirectory: '../coverage',
  testTimeout: 30000,
  // Configuración para SonarCloud
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '\\.module\\.ts$',
    'main\\.ts$',
    '/generated/',
  ],
};

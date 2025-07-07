// backend/apps/auth-service/jest.config.js
const baseConfig = require('../../../jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'auth-service',
  rootDir: 'src',
  coverageDirectory: '../../../coverage/auth-service',
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
};

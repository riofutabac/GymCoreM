// backend/apps/inventory-service/jest.config.js
const baseConfig = require('../../../jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'inventory-service',
  rootDir: 'src',
  coverageDirectory: '../../../coverage/inventory-service',
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

// backend/apps/payment-service/jest.config.js
const baseConfig = require('../../../jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'payment-service',
  rootDir: 'src',
  coverageDirectory: '../../../coverage/payment-service',
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

// backend/apps/gym-management-service/jest.config.js
const baseConfig = require('../../../jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'gym-management-service',
  rootDir: 'src',
  coverageDirectory: '../../../coverage/gym-management-service',
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

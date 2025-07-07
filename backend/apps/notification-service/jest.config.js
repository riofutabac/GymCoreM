// backend/apps/notification-service/jest.config.js
const baseConfig = require('../../../jest.config.base.js');

module.exports = {
  ...baseConfig,
  displayName: 'notification-service',
  rootDir: 'src',
  coverageDirectory: '../../../coverage/notification-service',
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/generated/**',
    '!**/*.d.ts',
  ],
};

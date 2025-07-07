// jest.setup.js - Configuración global para todas las pruebas
import 'reflect-metadata';

// Mock global de console para evitar spam en tests
global.console = {
  ...console,
  // Mantener error y warn para debugging
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Mantener error y warn
  error: console.error,
  warn: console.warn,
};

// Configuración global de timeout
jest.setTimeout(30000);

// Mock de Date para pruebas determinísticas
const originalDate = Date;
global.Date = class extends Date {
  constructor(...args) {
    if (args.length === 0) {
      super('2025-01-01T00:00:00.000Z');
    } else {
      super(...args);
    }
  }
  
  static now() {
    return new Date('2025-01-01T00:00:00.000Z').getTime();
  }
};
global.Date.UTC = originalDate.UTC;
global.Date.parse = originalDate.parse;

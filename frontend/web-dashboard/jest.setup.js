// frontend/web-dashboard/jest.setup.js
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock React hooks that may not be available in test environment
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: jest.fn((action, initialState) => [
    initialState,
    jest.fn(),
    false,
  ]),
}));

// Mock cookies from next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Global test timeout
jest.setTimeout(10000);

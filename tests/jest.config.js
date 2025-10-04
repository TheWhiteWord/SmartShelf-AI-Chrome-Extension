// Jest configuration for SmartShelf Chrome Extension

export default {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/setup/jest-setup.js'
  ],

  // Test file patterns
  testMatch: [
    '<rootDir>/**/*.test.js',
    '<rootDir>/**/*.spec.js'
  ],

  // Coverage collection
  collectCoverageFrom: [
    '<rootDir>/../extension/**/*.js',
    '!<rootDir>/../extension/build/**',
    '!<rootDir>/../extension/dist/**',
    '!**/node_modules/**'
  ],

  // Coverage directory and reporters
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'json'],

  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Module paths
  modulePaths: ['<rootDir>/../extension', '<rootDir>'],

  // Module name mapping (for mocking)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../extension/$1',
    '^@tests/(.*)$': '<rootDir>/$1'
  },

  // Globals
  globals: {
    chrome: true,
    browser: true
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/../extension/build/',
    '<rootDir>/../extension/dist/'
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Error on deprecated features
  errorOnDeprecated: true
}

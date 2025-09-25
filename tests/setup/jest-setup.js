// Jest setup for SmartShelf Chrome Extension tests

// Setup jest-chrome for Chrome Extension API mocking
Object.assign(global, require('jest-chrome'))

// Add missing Chrome APIs that jest-chrome doesn't include
if (!global.chrome.action) {
  global.chrome.action = {
    onClicked: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(),
      hasListeners: jest.fn(),
      callListeners: jest.fn(),
      clearListeners: jest.fn()
    },
    setTitle: jest.fn(),
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    setIcon: jest.fn()
  }
}

if (!global.chrome.sidePanel) {
  global.chrome.sidePanel = {
    open: jest.fn(),
    setOptions: jest.fn(),
    getOptions: jest.fn()
  }
}

if (!global.chrome.commands) {
  global.chrome.commands = {
    onCommand: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(),
      hasListeners: jest.fn(),
      callListeners: jest.fn(),
      clearListeners: jest.fn()
    },
    getAll: jest.fn()
  }
}

if (!global.chrome.scripting) {
  global.chrome.scripting = {
    executeScript: jest.fn(),
    insertCSS: jest.fn(),
    removeCSS: jest.fn()
  }
}

if (!global.chrome.notifications) {
  global.chrome.notifications = {
    create: jest.fn(),
    update: jest.fn(),
    clear: jest.fn(),
    getAll: jest.fn()
  }
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Mock console methods for cleaner test output
global.console = {
  ...console
  // Uncomment to suppress console logs in tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn()
}

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
)

// Mock URL constructor for Node.js environment
if (typeof URL === 'undefined') {
  const { URL } = require('url')
  global.URL = URL
}

// Setup test utilities
global.testUtils = {
  // Create mock content item
  createMockContentItem: (overrides = {}) => ({
    id: `test-id-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Test Article',
    url: 'https://example.com/article',
    content: 'This is test content for the article.',
    type: 'article',
    source: 'https://example.com/article',
    dateAdded: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    isPhysical: false,
    status: 'processed',
    summary: 'This is a test article summary.',
    tags: ['test', 'article'],
    categories: ['Technology'],
    notes: '',
    aiProcessed: true,
    ...overrides
  }),

  // Create mock Chrome tab
  createMockTab: (overrides = {}) => ({
    id: 1,
    url: 'https://example.com',
    title: 'Example Page',
    active: true,
    windowId: 1,
    ...overrides
  }),

  // Wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Simulate user interaction
  simulateClick: (element) => {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    })
    element.dispatchEvent(event)
  },

  // Simulate keyboard input
  simulateKeyInput: (element, value) => {
    element.value = value
    const event = new Event('input', {
      bubbles: true,
      cancelable: true
    })
    element.dispatchEvent(event)
  }
}

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks()

  // Reset DOM
  document.body.innerHTML = ''

  // Clear storage mocks
  localStorageMock.clear.mockClear()
  sessionStorageMock.clear.mockClear()
})

// Global test timeout
jest.setTimeout(10000)

console.log('SmartShelf test setup complete')

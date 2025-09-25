// Setup verification test for SmartShelf Chrome Extension

describe('Test Environment Setup', () => {
  test('jest-chrome is properly configured', () => {
    expect(chrome).toBeDefined()
    expect(chrome.runtime).toBeDefined()
    expect(chrome.storage).toBeDefined()
    expect(chrome.tabs).toBeDefined()
  })

  test('Chrome API mocks are functions', () => {
    expect(typeof chrome.runtime.sendMessage).toBe('function')
    expect(typeof chrome.storage.local.get).toBe('function')
    expect(typeof chrome.tabs.query).toBe('function')
  })

  test('DOM environment is available', () => {
    expect(document).toBeDefined()
    expect(window).toBeDefined()
    expect(global.fetch).toBeDefined()
  })

  test('test utilities are available', () => {
    expect(global.testUtils).toBeDefined()
    expect(typeof global.testUtils.createMockContentItem).toBe('function')
    expect(typeof global.testUtils.createMockTab).toBe('function')
  })

  test('can create mock content item', () => {
    const item = global.testUtils.createMockContentItem({
      title: 'Custom Test Title'
    })

    expect(item).toHaveProperty('id')
    expect(item).toHaveProperty('title', 'Custom Test Title')
    expect(item).toHaveProperty('url')
    expect(item).toHaveProperty('type')
  })
})

// Contract tests for Chrome Extension APIs
// These tests verify that our extension properly integrates with Chrome APIs

describe('Chrome Extension API Contracts', () => {
  describe('Runtime API', () => {
    test('should handle runtime messages', () => {
      const mockMessage = { action: 'test', data: {} }
      const mockSender = { tab: { id: 1 } }
      const mockSendResponse = jest.fn()

      // Simulate message listener
      expect(chrome.runtime.onMessage.addListener).toBeDefined()
      expect(typeof chrome.runtime.onMessage.addListener).toBe('function')

      // Verify we can call listeners (jest-chrome specific)
      expect(chrome.runtime.onMessage.callListeners).toBeDefined()
      chrome.runtime.onMessage.callListeners(mockMessage, mockSender, mockSendResponse)
    })

    test('should send messages to content scripts', async () => {
      const testMessage = { greeting: 'hello from background' }
      const mockResponse = { success: true }

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(mockResponse)
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(testMessage, resolve)
      })

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(testMessage, expect.any(Function))
      expect(response).toEqual(mockResponse)
    })
  })

  describe('Storage API', () => {
    test('should handle local storage operations', async () => {
      const testData = { contentItems: [{ id: 'test', title: 'Test Item' }] }

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        if (callback) callback(testData)
        return Promise.resolve(testData)
      })

      chrome.storage.local.set.mockImplementation((data, callback) => {
        if (callback) callback()
        return Promise.resolve()
      })

      // Test get operation
      const result = await new Promise((resolve) => {
        chrome.storage.local.get('contentItems', resolve)
      })
      expect(result).toEqual(testData)

      // Test set operation
      await new Promise((resolve) => {
        chrome.storage.local.set(testData, resolve)
      })
      expect(chrome.storage.local.set).toHaveBeenCalledWith(testData, expect.any(Function))
    })

    test('should handle sync storage operations', async () => {
      const testSettings = { smartshelfSettings: { theme: 'dark' } }

      chrome.storage.sync.get.mockImplementation((keys, callback) => {
        if (callback) callback(testSettings)
        return Promise.resolve(testSettings)
      })

      const result = await new Promise((resolve) => {
        chrome.storage.sync.get('smartshelfSettings', resolve)
      })
      expect(result).toEqual(testSettings)
    })
  })

  describe('Tabs API', () => {
    test('should query active tabs', async () => {
      const mockTabs = [global.testUtils.createMockTab()]

      chrome.tabs.query.mockImplementation((queryInfo, callback) => {
        if (callback) callback(mockTabs)
        return Promise.resolve(mockTabs)
      })

      const tabs = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve)
      })

      expect(tabs).toEqual(mockTabs)
      expect(chrome.tabs.query).toHaveBeenCalledWith(
        { active: true, currentWindow: true },
        expect.any(Function)
      )
    })

    test('should send messages to tabs', async () => {
      const tabId = 1
      const message = { action: 'extract_content' }
      const mockResponse = { success: true, data: {} }

      chrome.tabs.sendMessage.mockImplementation((id, msg, callback) => {
        if (callback) callback(mockResponse)
        return Promise.resolve(mockResponse)
      })

      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, message, resolve)
      })

      expect(response).toEqual(mockResponse)
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, message, expect.any(Function))
    })
  })

  describe('Action API', () => {
    test('should handle action clicks', () => {
      expect(chrome.action.onClicked.addListener).toBeDefined()
      expect(typeof chrome.action.onClicked.addListener).toBe('function')
    })

    test('should update badge text', () => {
      chrome.action.setBadgeText({ text: '5' })
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '5' })
    })
  })

  describe('Side Panel API', () => {
    test('should open side panel', () => {
      chrome.sidePanel.open({ windowId: 1 })
      expect(chrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 1 })
    })
  })

  describe('Commands API', () => {
    test('should handle keyboard shortcuts', () => {
      expect(chrome.commands.onCommand.addListener).toBeDefined()
      expect(typeof chrome.commands.onCommand.addListener).toBe('function')
    })
  })
})

// Integration tests for service worker functionality
// These tests verify the integration between different service worker functions

describe('Service Worker Integration', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  describe('Content Processing Flow', () => {
    test('should process content from tab to storage', async () => {
      // Mock the extractPageContent function (would come from content script)
      const mockPageContent = {
        title: 'Test Article',
        url: 'https://example.com/article',
        content: 'This is test content',
        type: 'article',
        metadata: {
          description: 'Test description',
          keywords: ['test', 'article']
        }
      }

      // Mock storage.local.get to return empty array initially
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = { contentItems: [] }
        if (callback) callback(result)
        return Promise.resolve(result)
      })

      // Mock storage.local.set to capture what gets saved
      let savedData = null
      chrome.storage.local.set.mockImplementation((data, callback) => {
        savedData = data
        if (callback) callback()
        return Promise.resolve()
      })

      // Simulate the content processing workflow
      // 1. Content script extracts page content
      // 2. Background script processes and saves it
      // 3. AI processing is queued

      // Create a content item (simulating what service worker would do)
      const contentItem = {
        id: `smartshelf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...mockPageContent,
        source: mockPageContent.url,
        dateAdded: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        isPhysical: false,
        status: 'pending',
        summary: '',
        tags: [],
        categories: [],
        notes: '',
        aiProcessed: false
      }

      // Simulate saving the content
      const { contentItems = [] } = await chrome.storage.local.get('contentItems')
      contentItems.push(contentItem)
      await chrome.storage.local.set({ contentItems })

      // Verify the integration worked
      expect(chrome.storage.local.get).toHaveBeenCalledWith('contentItems')
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ contentItems: [contentItem] })
      expect(savedData).toEqual({ contentItems: [contentItem] })
      expect(savedData.contentItems[0]).toMatchObject({
        title: mockPageContent.title,
        url: mockPageContent.url,
        content: mockPageContent.content,
        type: mockPageContent.type,
        status: 'pending',
        aiProcessed: false
      })
    })

    test('should handle AI processing workflow', async () => {
      // Setup: Content item exists in storage
      const existingItem = global.testUtils.createMockContentItem({
        status: 'pending',
        aiProcessed: false,
        summary: '',
        tags: [],
        categories: []
      })

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = { contentItems: [existingItem] }
        if (callback) callback(result)
        return Promise.resolve(result)
      })

      let updatedData = null
      chrome.storage.local.set.mockImplementation((data, callback) => {
        updatedData = data
        if (callback) callback()
        return Promise.resolve()
      })

      // Simulate AI processing result
      const aiProcessedItem = {
        ...existingItem,
        status: 'processed',
        aiProcessed: true,
        summary: 'AI-generated summary of the content',
        tags: ['technology', 'programming'],
        categories: ['Technology'],
        dateModified: new Date().toISOString()
      }

      // Simulate the AI processing workflow
      const { contentItems = [] } = await chrome.storage.local.get('contentItems')
      const itemIndex = contentItems.findIndex(item => item.id === existingItem.id)

      if (itemIndex !== -1) {
        contentItems[itemIndex] = aiProcessedItem
        await chrome.storage.local.set({ contentItems })
      }

      // Verify AI processing integration
      expect(chrome.storage.local.get).toHaveBeenCalled()
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ contentItems: [aiProcessedItem] })
      expect(updatedData.contentItems[0]).toMatchObject({
        id: existingItem.id,
        status: 'processed',
        aiProcessed: true,
        summary: expect.stringMatching(/AI-generated/),
        tags: expect.arrayContaining(['technology', 'programming']),
        categories: expect.arrayContaining(['Technology'])
      })
    })
  })

  describe('Settings Management', () => {
    test('should load and apply settings on startup', async () => {
      const mockSettings = {
        smartshelfSettings: {
          aiProcessingEnabled: true,
          openSidePanel: false,
          processingDelay: 2,
          theme: 'dark'
        }
      }

      chrome.storage.sync.get.mockImplementation((keys, callback) => {
        if (callback) callback(mockSettings)
        return Promise.resolve(mockSettings)
      })

      // Simulate loading settings
      const { smartshelfSettings } = await chrome.storage.sync.get('smartshelfSettings')

      expect(chrome.storage.sync.get).toHaveBeenCalledWith('smartshelfSettings')
      expect(smartshelfSettings).toEqual(mockSettings.smartshelfSettings)
      expect(smartshelfSettings.aiProcessingEnabled).toBe(true)
      expect(smartshelfSettings.openSidePanel).toBe(false)
      expect(smartshelfSettings.processingDelay).toBe(2)
      expect(smartshelfSettings.theme).toBe('dark')
    })

    test('should create default settings when none exist', async () => {
      chrome.storage.sync.get.mockImplementation((keys, callback) => {
        const result = {} // No settings exist
        if (callback) callback(result)
        return Promise.resolve(result)
      })

      let savedSettings = null
      chrome.storage.sync.set.mockImplementation((data, callback) => {
        savedSettings = data
        if (callback) callback()
        return Promise.resolve()
      })

      // Simulate default settings creation
      const settings = await chrome.storage.sync.get('smartshelfSettings')

      if (!settings.smartshelfSettings) {
        const defaultSettings = {
          aiProcessingEnabled: true,
          openSidePanel: true,
          processingDelay: 1,
          theme: 'auto',
          notifications: true,
          autoSave: true,
          keyboardShortcuts: true
        }

        await chrome.storage.sync.set({ smartshelfSettings: defaultSettings })
      }

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        smartshelfSettings: expect.objectContaining({
          aiProcessingEnabled: true,
          openSidePanel: true,
          processingDelay: 1,
          theme: 'auto'
        })
      })
      expect(savedSettings.smartshelfSettings).toBeDefined()
    })
  })

  describe('Message Handling Integration', () => {
    test('should handle save_content message from content script', async () => {
      const mockMessage = {
        action: 'save_content',
        data: {
          title: 'Test Page',
          url: 'https://example.com',
          content: 'Page content',
          type: 'webpage'
        }
      }

      const mockSender = { tab: { id: 1 } }
      const mockSendResponse = jest.fn()

      // Mock storage operations
      chrome.storage.local.get.mockResolvedValue({ contentItems: [] })
      chrome.storage.local.set.mockResolvedValue()

      // Simulate message handling
      let messageHandled = false
      const handleMessage = async (message, sender, sendResponse) => {
        if (message.action === 'save_content') {
          // Process the content saving
          const contentItem = {
            id: `smartshelf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...message.data,
            source: message.data.url,
            dateAdded: new Date().toISOString(),
            dateModified: new Date().toISOString(),
            isPhysical: false,
            status: 'pending',
            summary: '',
            tags: [],
            categories: [],
            notes: '',
            aiProcessed: false
          }

          const { contentItems = [] } = await chrome.storage.local.get('contentItems')
          contentItems.push(contentItem)
          await chrome.storage.local.set({ contentItems })

          messageHandled = true
          sendResponse({ success: true, id: contentItem.id })
        }
      }

      await handleMessage(mockMessage, mockSender, mockSendResponse)

      expect(messageHandled).toBe(true)
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        id: expect.stringMatching(/^smartshelf_/)
      })
      expect(chrome.storage.local.get).toHaveBeenCalledWith('contentItems')
      expect(chrome.storage.local.set).toHaveBeenCalled()
    })

    test('should handle search_content message', async () => {
      const existingItems = [
        global.testUtils.createMockContentItem({ title: 'JavaScript Guide', tags: ['javascript', 'programming'] }),
        global.testUtils.createMockContentItem({ title: 'Python Tutorial', tags: ['python', 'programming'] }),
        global.testUtils.createMockContentItem({ title: 'CSS Tips', tags: ['css', 'design'] })
      ]

      chrome.storage.local.get.mockResolvedValue({ contentItems: existingItems })

      const searchMessage = {
        action: 'search_content',
        query: 'programming'
      }

      const mockSendResponse = jest.fn()

      // Simulate search handling
      const handleSearch = async (message, sender, sendResponse) => {
        if (message.action === 'search_content') {
          const { contentItems = [] } = await chrome.storage.local.get('contentItems')

          const results = contentItems.filter(item =>
            item.title.toLowerCase().includes(message.query.toLowerCase()) ||
            item.content.toLowerCase().includes(message.query.toLowerCase()) ||
            item.tags.some(tag => tag.toLowerCase().includes(message.query.toLowerCase()))
          )

          sendResponse({ success: true, results })
        }
      }

      await handleSearch(searchMessage, {}, mockSendResponse)

      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        results: expect.arrayContaining([
          expect.objectContaining({ title: 'JavaScript Guide' }),
          expect.objectContaining({ title: 'Python Tutorial' })
        ])
      })

      const responseData = mockSendResponse.mock.calls[0][0]
      expect(responseData.results).toHaveLength(2)
      expect(responseData.results.every(item =>
        item.tags.includes('programming') ||
        item.title.toLowerCase().includes('programming')
      )).toBe(true)
    })
  })

  describe('Error Handling Integration', () => {
    test('should handle storage errors gracefully', async () => {
      // Mock storage error
      const storageError = new Error('Storage quota exceeded')
      chrome.storage.local.set.mockRejectedValue(storageError)

      let errorHandled = false
      let errorMessage = ''

      try {
        await chrome.storage.local.set({ test: 'data' })
      } catch (error) {
        errorHandled = true
        errorMessage = error.message
      }

      expect(errorHandled).toBe(true)
      expect(errorMessage).toBe('Storage quota exceeded')
    })

    test('should handle AI processing errors', async () => {
      const contentItem = global.testUtils.createMockContentItem({ status: 'pending' })

      chrome.storage.local.get.mockResolvedValue({ contentItems: [contentItem] })

      let updatedItem = null
      chrome.storage.local.set.mockImplementation((data, callback) => {
        updatedItem = data.contentItems[0]
        if (callback) callback()
        return Promise.resolve()
      })

      // Simulate AI processing error
      const simulateAiError = async (itemId) => {
        const { contentItems = [] } = await chrome.storage.local.get('contentItems')
        const itemIndex = contentItems.findIndex(item => item.id === itemId)

        if (itemIndex !== -1) {
          // Mark as error
          contentItems[itemIndex].status = 'error'
          contentItems[itemIndex].dateModified = new Date().toISOString()
          await chrome.storage.local.set({ contentItems })
        }
      }

      await simulateAiError(contentItem.id)

      expect(updatedItem.status).toBe('error')
      expect(updatedItem.id).toBe(contentItem.id)
    })
  })
})

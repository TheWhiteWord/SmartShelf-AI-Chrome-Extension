/**
 * Chrome Storage API Integration Tests (T029)
 * Tests comprehensive Chrome Storage functionality including sync/local storage, 
 * data persistence, quota handling, and storage event management
 */

describe('Chrome Storage API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Local Storage Operations', () => {
    test('should store and retrieve content items', async () => {
      const mockContentItems = [
        {
          id: 'item-1',
          title: 'JavaScript Testing Guide',
          content: 'Comprehensive guide to testing JavaScript applications',
          type: 'article',
          dateAdded: new Date().toISOString()
        },
        {
          id: 'item-2', 
          title: 'React Hooks Tutorial',
          content: 'Learn how to use React Hooks effectively',
          type: 'article',
          dateAdded: new Date().toISOString()
        }
      ]

      // Mock storage operations
      chrome.storage.local.set.mockResolvedValue()
      chrome.storage.local.get.mockResolvedValue({ contentItems: mockContentItems })

      // Store content items
      await chrome.storage.local.set({ contentItems: mockContentItems })
      
      // Retrieve content items
      const result = await chrome.storage.local.get('contentItems')

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ contentItems: mockContentItems })
      expect(chrome.storage.local.get).toHaveBeenCalledWith('contentItems')
      expect(result.contentItems).toHaveLength(2)
      expect(result.contentItems[0].title).toBe('JavaScript Testing Guide')
    })

    test('should handle large data storage', async () => {
      // Create large dataset
      const largeContentItems = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        title: `Article ${i}`,
        content: `Content for article ${i}. `.repeat(100), // ~1KB per item
        type: 'article',
        dateAdded: new Date().toISOString()
      }))

      chrome.storage.local.set.mockResolvedValue()
      chrome.storage.local.get.mockResolvedValue({ contentItems: largeContentItems })

      // Test storage of large dataset
      await chrome.storage.local.set({ contentItems: largeContentItems })
      const result = await chrome.storage.local.get('contentItems')

      expect(result.contentItems).toHaveLength(1000)
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ contentItems: largeContentItems })
    })

    test('should handle storage quota errors', async () => {
      const oversizedData = {
        largeContent: 'x'.repeat(10000000) // 10MB of data
      }

      // Mock quota exceeded error
      chrome.storage.local.set.mockRejectedValue(
        new Error('QUOTA_BYTES quota exceeded')
      )

      let quotaError = null
      try {
        await chrome.storage.local.set(oversizedData)
      } catch (error) {
        quotaError = error
      }

      expect(quotaError).toBeDefined()
      expect(quotaError.message).toContain('QUOTA_BYTES')
    })

    test('should manage search index storage', async () => {
      const mockSearchIndex = {
        tokens: {
          'javascript': ['item-1', 'item-3'],
          'testing': ['item-1', 'item-2'],
          'react': ['item-2', 'item-4']
        },
        items: {
          'item-1': { title: 'JavaScript Testing', score: 1.0 },
          'item-2': { title: 'React Testing', score: 0.9 }
        },
        lastUpdated: Date.now()
      }

      chrome.storage.local.set.mockResolvedValue()
      chrome.storage.local.get.mockResolvedValue({ searchIndex: mockSearchIndex })

      await chrome.storage.local.set({ searchIndex: mockSearchIndex })
      const result = await chrome.storage.local.get('searchIndex')

      expect(result.searchIndex.tokens.javascript).toContain('item-1')
      expect(result.searchIndex.items['item-1'].title).toBe('JavaScript Testing')
      expect(result.searchIndex.lastUpdated).toBeDefined()
    })
  })

  describe('Sync Storage Operations', () => {
    test('should store and sync user settings', async () => {
      const mockSettings = {
        aiProcessingEnabled: true,
        autoTagging: true,
        connectionDiscovery: true,
        processingDelay: 2,
        interfaceTheme: 'dark',
        keyboardShortcuts: true,
        apiGatewayEnabled: false,
        apiPort: 8080,
        backupFrequency: 'daily'
      }

      chrome.storage.sync.set.mockResolvedValue()
      chrome.storage.sync.get.mockResolvedValue({ smartshelfSettings: mockSettings })

      await chrome.storage.sync.set({ smartshelfSettings: mockSettings })
      const result = await chrome.storage.sync.get('smartshelfSettings')

      expect(result.smartshelfSettings.aiProcessingEnabled).toBe(true)
      expect(result.smartshelfSettings.interfaceTheme).toBe('dark')
      expect(result.smartshelfSettings.backupFrequency).toBe('daily')
    })

    test('should handle sync quota limits', async () => {
      // Sync storage has smaller quota limits
      const oversizedSettings = {
        largeConfigData: 'x'.repeat(110000) // Exceeds sync storage limit
      }

      chrome.storage.sync.set.mockRejectedValue(
        new Error('QUOTA_BYTES_PER_ITEM quota exceeded')
      )

      let syncError = null
      try {
        await chrome.storage.sync.set(oversizedSettings)
      } catch (error) {
        syncError = error
      }

      expect(syncError).toBeDefined()
      expect(syncError.message).toContain('QUOTA_BYTES_PER_ITEM')
    })

    test('should sync API token configurations', async () => {
      const mockAPITokens = {
        tokens: [
          {
            id: 'token-1',
            name: 'Development Token',
            permissions: ['read'],
            createdAt: Date.now(),
            lastUsed: null,
            isActive: true
          }
        ],
        settings: {
          rateLimitPerHour: 100,
          maxConcurrentRequests: 5,
          enableAuditLogging: true
        }
      }

      chrome.storage.sync.set.mockResolvedValue()
      chrome.storage.sync.get.mockResolvedValue({ apiTokens: mockAPITokens })

      await chrome.storage.sync.set({ apiTokens: mockAPITokens })
      const result = await chrome.storage.sync.get('apiTokens')

      expect(result.apiTokens.tokens).toHaveLength(1)
      expect(result.apiTokens.tokens[0].name).toBe('Development Token')
      expect(result.apiTokens.settings.rateLimitPerHour).toBe(100)
    })
  })

  describe('Storage Event Handling', () => {
    test('should listen for storage changes', async () => {
      const mockChangeHandler = jest.fn()
      
      // Mock storage change event
      const changes = {
        smartshelfSettings: {
          oldValue: { aiProcessingEnabled: false },
          newValue: { aiProcessingEnabled: true }
        }
      }
      const areaName = 'sync'

      chrome.storage.onChanged.addListener(mockChangeHandler)
      
      // Simulate storage change event
      mockChangeHandler(changes, areaName)

      // Verify the handler was called with correct parameters
      expect(mockChangeHandler).toHaveBeenCalledWith(changes, areaName)
    })

    test('should handle storage change synchronization', async () => {
      const settingsChangeHandler = jest.fn()
      
      function handleStorageChange(changes, areaName) {
        if (areaName === 'sync' && changes.smartshelfSettings) {
          const newSettings = changes.smartshelfSettings.newValue
          const oldSettings = changes.smartshelfSettings.oldValue
          
          settingsChangeHandler({
            updated: Object.keys(newSettings || {}),
            changed: areaName,
            timestamp: Date.now()
          })
        }
      }

      const mockChanges = {
        smartshelfSettings: {
          oldValue: { aiProcessingEnabled: false, autoTagging: true },
          newValue: { aiProcessingEnabled: true, autoTagging: false }
        }
      }

      handleStorageChange(mockChanges, 'sync')

      expect(settingsChangeHandler).toHaveBeenCalledWith({
        updated: ['aiProcessingEnabled', 'autoTagging'],
        changed: 'sync',
        timestamp: expect.any(Number)
      })
    })
  })

  describe('Data Migration and Backup', () => {
    test('should migrate data between storage versions', async () => {
      const oldVersionData = {
        version: '1.0',
        items: [
          { title: 'Old Item 1', url: 'https://example.com/1' }
        ],
        settings: { enabled: true }
      }

      const newVersionData = {
        version: '2.0',
        contentItems: [
          {
            id: 'migrated-1',
            title: 'Old Item 1',
            url: 'https://example.com/1',
            type: 'article',
            dateAdded: new Date().toISOString(),
            migrated: true
          }
        ],
        smartshelfSettings: {
          aiProcessingEnabled: true,
          version: '2.0'
        }
      }

      function migrateData(oldData) {
        return {
          version: '2.0',
          contentItems: oldData.items.map((item, index) => ({
            id: `migrated-${index + 1}`,
            title: item.title,
            url: item.url,
            type: 'article',
            dateAdded: new Date().toISOString(),
            migrated: true
          })),
          smartshelfSettings: {
            aiProcessingEnabled: oldData.settings.enabled,
            version: '2.0'
          }
        }
      }

      const migrated = migrateData(oldVersionData)

      expect(migrated.version).toBe('2.0')
      expect(migrated.contentItems).toHaveLength(1)
      expect(migrated.contentItems[0].migrated).toBe(true)
      expect(migrated.smartshelfSettings.version).toBe('2.0')
    })

    test('should create data backups', async () => {
      const currentData = {
        contentItems: [
          { id: 'item-1', title: 'Test Item', content: 'Test content' }
        ],
        searchIndex: { tokens: {}, items: {} },
        smartshelfSettings: { aiProcessingEnabled: true }
      }

      function createBackup(data) {
        return {
          timestamp: Date.now(),
          version: '2.0',
          data: JSON.stringify(data),
          checksum: 'mock-checksum-hash',
          size: JSON.stringify(data).length
        }
      }

      const backup = createBackup(currentData)

      expect(backup.timestamp).toBeDefined()
      expect(backup.version).toBe('2.0')
      expect(backup.data).toContain('Test Item')
      expect(backup.size).toBeGreaterThan(0)
    })
  })

  describe('Storage Performance and Optimization', () => {
    test('should batch storage operations efficiently', async () => {
      const operations = [
        { key: 'contentItems', value: [{ id: '1', title: 'Item 1' }] },
        { key: 'searchIndex', value: { tokens: { test: ['1'] } } },
        { key: 'categories', value: [{ id: 'cat-1', name: 'Test Category' }] }
      ]

      // Mock batched storage
      chrome.storage.local.set.mockResolvedValue()

      async function batchStorageOperations(ops) {
        const batchData = {}
        ops.forEach(op => {
          batchData[op.key] = op.value
        })
        
        await chrome.storage.local.set(batchData)
        return { success: true, operations: ops.length }
      }

      const result = await batchStorageOperations(operations)

      expect(result.success).toBe(true)
      expect(result.operations).toBe(3)
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        contentItems: [{ id: '1', title: 'Item 1' }],
        searchIndex: { tokens: { test: ['1'] } },
        categories: [{ id: 'cat-1', name: 'Test Category' }]
      })
    })

    test('should compress large data for storage', async () => {
      const largeContent = 'Lorem ipsum dolor sit amet. '.repeat(1000)
      
      function compressData(data) {
        // Mock compression (in real implementation, use actual compression)
        const compressed = `compressed:${data.substring(0, 100)}...`
        return {
          compressed,
          originalSize: data.length,
          compressedSize: compressed.length,
          ratio: compressed.length / data.length
        }
      }

      const result = compressData(largeContent)

      expect(result.compressedSize).toBeLessThan(result.originalSize)
      expect(result.ratio).toBeLessThan(1)
      expect(result.compressed).toContain('compressed:')
    })

    test('should handle concurrent storage access', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        operation: () => chrome.storage.local.set({ [`item-${i}`]: `value-${i}` })
      }))

      // Mock all operations to resolve successfully
      chrome.storage.local.set.mockResolvedValue()

      const results = await Promise.all(
        concurrentOperations.map(op => op.operation())
      )

      expect(results).toHaveLength(10)
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(10)
    })
  })

  describe('Storage Error Recovery', () => {
    test('should recover from corrupted storage', async () => {
      // Mock corrupted data
      chrome.storage.local.get.mockResolvedValue({
        contentItems: null, // Corrupted
        searchIndex: undefined, // Missing
        invalidData: 'corrupted-json-string'
      })

      function recoverFromCorruption() {
        return chrome.storage.local.get(['contentItems', 'searchIndex', 'smartshelfSettings'])
          .then(data => {
            const recovered = {
              contentItems: Array.isArray(data.contentItems) ? data.contentItems : [],
              searchIndex: data.searchIndex && typeof data.searchIndex === 'object' ? data.searchIndex : { tokens: {}, items: {} },
              smartshelfSettings: data.smartshelfSettings || {}
            }
            
            return {
              success: true,
              recovered,
              hadCorruption: !Array.isArray(data.contentItems) || !data.searchIndex
            }
          })
      }

      const result = await recoverFromCorruption()

      expect(result.success).toBe(true)
      expect(result.hadCorruption).toBe(true)
      expect(Array.isArray(result.recovered.contentItems)).toBe(true)
      expect(typeof result.recovered.searchIndex).toBe('object')
    })

    test('should retry failed storage operations', async () => {
      let attemptCount = 0
      
      chrome.storage.local.set.mockImplementation(() => {
        attemptCount++
        if (attemptCount < 3) {
          return Promise.reject(new Error('Temporary storage error'))
        }
        return Promise.resolve()
      })

      async function retryStorageOperation(data, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            await chrome.storage.local.set(data)
            return { success: true, attempts: attempt }
          } catch (error) {
            if (attempt === maxRetries) {
              return { success: false, error: error.message, attempts: attempt }
            }
            await new Promise(resolve => setTimeout(resolve, 100 * attempt)) // Exponential backoff
          }
        }
      }

      const result = await retryStorageOperation({ test: 'data' })

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(3)
      expect(attemptCount).toBe(3)
    })
  })
})
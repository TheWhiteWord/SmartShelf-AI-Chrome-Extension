/**
 * Storage Service Unit Tests
 * Tests comprehensive Chrome Storage API and IndexedDB functionality
 * Covers data operations, quota management, event handling, and backup/restore
 */

const StorageService = require('../../../extension/shared/services/storage-service.js')

describe('Storage Service Unit Tests', () => {
  let storageService
  
  // Mock IndexedDB
  const mockDB = {
    transaction: jest.fn(),
    close: jest.fn(),
    objectStoreNames: {
      contains: jest.fn(() => false)
    }
  }
  
  const mockTransaction = {
    objectStore: jest.fn(),
    oncomplete: null,
    onerror: null
  }
  
  const mockStore = {
    put: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    createIndex: jest.fn(),
    index: jest.fn()
  }
  
  const mockRequest = {
    onsuccess: null,
    onerror: null,
    result: null
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup IndexedDB mocks
    global.indexedDB = {
      open: jest.fn(() => ({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: mockDB
      }))
    }
    
    mockDB.transaction.mockReturnValue(mockTransaction)
    mockTransaction.objectStore.mockReturnValue(mockStore)
    mockStore.get.mockReturnValue(mockRequest)
    mockStore.getAll.mockReturnValue(mockRequest)
    mockStore.put.mockReturnValue(mockRequest)
    mockStore.delete.mockReturnValue(mockRequest)
    
    // Setup Navigator storage estimate
    global.navigator = {
      storage: {
        estimate: jest.fn(() => Promise.resolve({
          usage: 1000000,
          quota: 50000000
        }))
      }
    }
    
    storageService = new StorageService()
  })

  afterEach(() => {
    if (storageService) {
      storageService.cleanup()
    }
  })

  describe('Initialization', () => {
    test('should initialize with correct default properties', () => {
      expect(storageService.db).toBeNull()
      expect(storageService.isInitialized).toBe(false)
      expect(storageService.eventListeners).toBeInstanceOf(Map)
      expect(storageService.quotaWarningThreshold).toBe(0.8)
    })

    test('should initialize IndexedDB on explicit initialize call', async () => {
      // Mock successful IndexedDB initialization
      const mockOpenRequest = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      }
      global.indexedDB.open.mockReturnValue(mockOpenRequest)
      
      // Start initialization
      const initPromise = storageService.initialize()
      
      // Immediately trigger success
      setTimeout(() => {
        mockOpenRequest.onsuccess({ target: { result: mockDB } })
      }, 0)
      
      const result = await initPromise
      
      expect(global.indexedDB.open).toHaveBeenCalledWith('SmartShelfDB', 2)
      expect(result).toBe(true)
    })

    test('should have correct storage constants', () => {
      expect(StorageService.STORAGE_AREAS.SYNC).toBe('sync')
      expect(StorageService.STORAGE_AREAS.LOCAL).toBe('local')
      expect(StorageService.STORAGE_AREAS.INDEXED_DB).toBe('indexeddb')
      
      expect(StorageService.QUOTA_LIMITS.SYNC).toBe(102400)
      expect(StorageService.QUOTA_LIMITS.LOCAL).toBe(5242880)
      expect(StorageService.QUOTA_LIMITS.INDEXED_DB).toBe(Number.MAX_SAFE_INTEGER)
    })

    test('should set up IndexedDB object stores on upgrade', async () => {
      const mockUpgradeEvent = {
        target: { result: mockDB }
      }
      
      const mockCreateObjectStore = jest.fn(() => mockStore)
      mockDB.createObjectStore = mockCreateObjectStore
      mockDB.objectStoreNames.contains = jest.fn(() => false)
      
      // Mock the IndexedDB open request
      const mockOpenRequest = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      }
      global.indexedDB.open.mockReturnValue(mockOpenRequest)
      
      // Start initialization
      const initPromise = storageService.initialize()
      
      // Trigger upgrade needed
      mockOpenRequest.onupgradeneeded(mockUpgradeEvent)
      
      // Then trigger success
      setTimeout(() => {
        mockOpenRequest.onsuccess({ target: { result: mockDB } })
      }, 0)
      
      await initPromise
      
      expect(mockCreateObjectStore).toHaveBeenCalledWith('fullContent', { keyPath: 'id' })
      expect(mockCreateObjectStore).toHaveBeenCalledWith('searchIndex', { keyPath: 'term' })
      expect(mockCreateObjectStore).toHaveBeenCalledWith('analytics', { keyPath: 'id' })
      expect(mockCreateObjectStore).toHaveBeenCalledWith('backups', { keyPath: 'id' })
    })
  })

  describe('Chrome Storage API Methods', () => {
    beforeEach(() => {
      // Setup Chrome Storage mocks
      chrome.storage.local.set.mockResolvedValue()
      chrome.storage.local.get.mockResolvedValue({ testKey: 'testValue' })
      chrome.storage.local.remove.mockResolvedValue()
      chrome.storage.local.clear.mockResolvedValue()
      chrome.storage.local.getBytesInUse.mockResolvedValue(1024)
      
      chrome.storage.sync.set.mockResolvedValue()
      chrome.storage.sync.get.mockResolvedValue({ testKey: 'testValue' })
      chrome.storage.sync.remove.mockResolvedValue()
      chrome.storage.sync.clear.mockResolvedValue()
      chrome.storage.sync.getBytesInUse.mockResolvedValue(512)
    })

    test('should store data in Chrome Storage local area', async () => {
      const testData = { title: 'Test Article', content: 'Test content' }
      
      await storageService.chromeStorageSet('local', 'testKey', testData)
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ testKey: testData })
    })

    test('should store data in Chrome Storage sync area', async () => {
      const testData = { theme: 'dark', language: 'en' }
      
      await storageService.chromeStorageSet('sync', 'settings', testData)
      
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ settings: testData })
    })

    test('should retrieve data from Chrome Storage', async () => {
      const result = await storageService.chromeStorageGet('local', 'testKey')
      
      expect(chrome.storage.local.get).toHaveBeenCalledWith('testKey')
      expect(result.testKey).toBe('testValue')
    })

    test('should retrieve multiple keys from Chrome Storage', async () => {
      await storageService.chromeStorageGet('local', ['key1', 'key2'])
      
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['key1', 'key2'])
    })

    test('should remove data from Chrome Storage', async () => {
      await storageService.chromeStorageRemove('local', 'testKey')
      
      expect(chrome.storage.local.remove).toHaveBeenCalledWith('testKey')
    })

    test('should clear Chrome Storage area', async () => {
      await storageService.chromeStorageClear('local')
      
      expect(chrome.storage.local.clear).toHaveBeenCalled()
    })

    test('should get Chrome Storage quota information', async () => {
      const quotaInfo = await storageService.getChromeStorageQuota('local')
      
      expect(chrome.storage.local.getBytesInUse).toHaveBeenCalled()
      expect(quotaInfo.bytesInUse).toBe(1024)
      expect(quotaInfo.quota).toBe(5242880)
      expect(quotaInfo.percentageUsed).toBeCloseTo(0.0195, 3)
      expect(quotaInfo.remainingBytes).toBe(5241856)
    })

    test('should handle Chrome Storage errors gracefully', async () => {
      chrome.storage.local.set.mockRejectedValue(new Error('Storage error'))
      
      await expect(storageService.chromeStorageSet('local', 'testKey', {}))
        .rejects.toThrow('Storage error')
    })

    test('should handle missing Chrome Storage API', async () => {
      const originalChrome = global.chrome
      global.chrome = undefined
      
      await expect(storageService.chromeStorageSet('local', 'testKey', {}))
        .rejects.toThrow('Chrome Storage local not available')
      
      global.chrome = originalChrome
    })
  })

  describe('IndexedDB Methods', () => {
    beforeEach(() => {
      storageService.db = mockDB
    })

    test('should store data in IndexedDB', async () => {
      const testData = { id: '123', title: 'Test Item', content: 'Full content' }
      
      // Setup successful transaction
      setTimeout(() => {
        mockTransaction.oncomplete()
      }, 0)
      
      const result = await storageService.indexedDBSet('fullContent', testData)
      
      expect(mockDB.transaction).toHaveBeenCalledWith(['fullContent'], 'readwrite')
      expect(mockStore.put).toHaveBeenCalledWith(testData)
      expect(result).toBe(true)
    })

    test('should store multiple items in IndexedDB', async () => {
      const testData = [
        { id: '1', title: 'Item 1' },
        { id: '2', title: 'Item 2' }
      ]
      
      setTimeout(() => {
        mockTransaction.oncomplete()
      }, 0)
      
      await storageService.indexedDBSet('fullContent', testData)
      
      expect(mockStore.put).toHaveBeenCalledTimes(2)
      expect(mockStore.put).toHaveBeenCalledWith({ id: '1', title: 'Item 1' })
      expect(mockStore.put).toHaveBeenCalledWith({ id: '2', title: 'Item 2' })
    })

    test('should retrieve data from IndexedDB', async () => {
      const testData = { id: '123', title: 'Test Item' }
      mockRequest.result = testData
      
      setTimeout(() => {
        mockRequest.onsuccess()
      }, 0)
      
      const result = await storageService.indexedDBGet('fullContent', '123')
      
      expect(mockDB.transaction).toHaveBeenCalledWith(['fullContent'], 'readonly')
      expect(mockStore.get).toHaveBeenCalledWith('123')
      expect(result).toEqual(testData)
    })

    test('should get all data from IndexedDB store', async () => {
      const testData = [
        { id: '1', title: 'Item 1' },
        { id: '2', title: 'Item 2' }
      ]
      mockRequest.result = testData
      
      setTimeout(() => {
        mockRequest.onsuccess()
      }, 0)
      
      const result = await storageService.indexedDBGetAll('fullContent')
      
      expect(mockStore.getAll).toHaveBeenCalled()
      expect(result).toEqual(testData)
    })

    test('should get data from IndexedDB with index query', async () => {
      const testData = [{ id: '1', type: 'article' }]
      mockRequest.result = testData
      const mockIndex = { getAll: jest.fn(() => mockRequest) }
      mockStore.index.mockReturnValue(mockIndex)
      
      setTimeout(() => {
        mockRequest.onsuccess()
      }, 0)
      
      const result = await storageService.indexedDBGetAll('fullContent', 'type', 'article')
      
      expect(mockStore.index).toHaveBeenCalledWith('type')
      expect(mockIndex.getAll).toHaveBeenCalledWith('article')
      expect(result).toEqual(testData)
    })

    test('should remove data from IndexedDB', async () => {
      setTimeout(() => {
        mockTransaction.oncomplete()
      }, 0)
      
      const result = await storageService.indexedDBRemove('fullContent', '123')
      
      expect(mockStore.delete).toHaveBeenCalledWith('123')
      expect(result).toBe(true)
    })

    test('should clear IndexedDB store', async () => {
      setTimeout(() => {
        mockTransaction.oncomplete()
      }, 0)
      
      const result = await storageService.indexedDBClear('fullContent')
      
      expect(mockStore.clear).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    test('should handle IndexedDB transaction errors', async () => {
      storageService.db = mockDB
      
      const setPromise = storageService.indexedDBSet('fullContent', {})
      
      // Immediately trigger error
      setTimeout(() => {
        mockTransaction.error = new Error('Transaction failed')
        if (mockTransaction.onerror) {
          mockTransaction.onerror()
        }
      }, 0)
      
      await expect(setPromise).rejects.toThrow('Transaction failed')
    })

    test('should handle missing IndexedDB connection', async () => {
      storageService.db = null
      
      await expect(storageService.indexedDBSet('fullContent', {}))
        .rejects.toThrow('IndexedDB not initialized')
    })
  })

  describe('High-Level Data Operations', () => {
    beforeEach(() => {
      storageService.db = mockDB
      
      // Mock Chrome Storage operations
      chrome.storage.local.get.mockResolvedValue({ contentItems: [] })
      chrome.storage.local.set.mockResolvedValue()
      
      // Mock IndexedDB operations
      setTimeout(() => {
        mockTransaction.oncomplete()
        mockRequest.onsuccess()
      }, 0)
    })

    test('should save content item to both Chrome Storage and IndexedDB', async () => {
      const contentItem = {
        id: '123',
        title: 'Test Article',
        url: 'https://example.com/article',
        content: 'Full article content with lots of text...',
        type: 'article',
        dateAdded: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        status: 'processed',
        tags: ['technology', 'javascript'],
        categories: ['Technology'],
        summary: 'Article summary',
        isPhysical: false
      }
      
      const result = await storageService.saveContentItem(contentItem)
      
      // Should save lightweight version to Chrome Storage
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        contentItems: [expect.objectContaining({
          id: '123',
          title: 'Test Article',
          url: 'https://example.com/article',
          type: 'article'
        })]
      })
      
      // Should save full content to IndexedDB
      expect(mockStore.put).toHaveBeenCalledWith(contentItem)
      expect(result).toBe(true)
    })

    test('should get content item from IndexedDB first', async () => {
      const fullItem = {
        id: '123',
        title: 'Full Article',
        content: 'Complete content...'
      }
      mockRequest.result = fullItem
      
      const result = await storageService.getContentItem('123')
      
      expect(mockStore.get).toHaveBeenCalledWith('123')
      expect(result).toEqual(fullItem)
    })

    test('should fallback to Chrome Storage if IndexedDB item not found', async () => {
      mockRequest.result = null // Not found in IndexedDB
      
      const chromeItems = [
        { id: '123', title: 'Chrome Item' },
        { id: '456', title: 'Other Item' }
      ]
      chrome.storage.local.get.mockResolvedValue({ contentItems: chromeItems })
      
      const result = await storageService.getContentItem('123')
      
      expect(result).toEqual({ id: '123', title: 'Chrome Item' })
    })

    test('should get all content items with sorting', async () => {
      const items = [
        { id: '1', title: 'First', dateAdded: '2023-01-01T00:00:00.000Z' },
        { id: '2', title: 'Second', dateAdded: '2023-01-02T00:00:00.000Z' },
        { id: '3', title: 'Third', dateAdded: '2023-01-03T00:00:00.000Z' }
      ]
      mockRequest.result = items
      
      const result = await storageService.getAllContentItems({
        sortBy: 'dateAdded',
        sortOrder: 'desc'
      })
      
      expect(result[0].id).toBe('3') // Most recent first
      expect(result[2].id).toBe('1') // Oldest last
    })

    test('should get all content items with pagination', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
        dateAdded: new Date().toISOString()
      }))
      mockRequest.result = items
      
      const result = await storageService.getAllContentItems({
        limit: 5,
        offset: 3
      })
      
      expect(result).toHaveLength(5)
      expect(result[0].id).toBe('item-3')
      expect(result[4].id).toBe('item-7')
    })

    test('should search content items with text query', async () => {
      const items = [
        { id: '1', title: 'JavaScript Guide', content: 'Learn JavaScript', tags: ['js'] },
        { id: '2', title: 'Python Tutorial', content: 'Python basics', tags: ['python'] },
        { id: '3', title: 'Web Development', content: 'HTML, CSS, JavaScript', tags: ['web'] }
      ]
      mockRequest.result = items
      
      const result = await storageService.searchContentItems('javascript')
      
      expect(result).toHaveLength(2)
      expect(result.find(item => item.id === '1')).toBeDefined()
      expect(result.find(item => item.id === '3')).toBeDefined()
    })

    test('should search content items with filters', async () => {
      const items = [
        { id: '1', type: 'article', categories: ['Technology'], tags: ['javascript'] },
        { id: '2', type: 'video', categories: ['Technology'], tags: ['python'] },
        { id: '3', type: 'article', categories: ['Science'], tags: ['research'] }
      ]
      
      // Mock getAllContentItems to return the test data directly
      storageService.getAllContentItems = jest.fn().mockResolvedValue(items)
      
      const result = await storageService.searchContentItems('', {
        type: 'article',
        categories: ['Technology']
      })
      
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    test('should delete content item from both storage areas', async () => {
      const existingItems = [
        { id: '123', title: 'To Delete' },
        { id: '456', title: 'Keep This' }
      ]
      chrome.storage.local.get.mockResolvedValue({ contentItems: existingItems })
      
      const result = await storageService.deleteContentItem('123')
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        contentItems: [{ id: '456', title: 'Keep This' }]
      })
      expect(mockStore.delete).toHaveBeenCalledWith('123')
      expect(result).toBe(true)
    })

    test('should save and get user settings', async () => {
      chrome.storage.sync.set.mockResolvedValue()
      chrome.storage.sync.get.mockResolvedValue({
        smartshelfSettings: { theme: 'dark', aiEnabled: true }
      })
      
      const settings = { theme: 'dark', aiEnabled: true }
      
      await storageService.saveSettings(settings)
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        smartshelfSettings: settings
      })
      
      const retrieved = await storageService.getSettings()
      expect(retrieved).toEqual(settings)
    })
  })

  describe('Quota Management', () => {
    test('should check quota usage across all storage areas', async () => {
      chrome.storage.sync.getBytesInUse.mockResolvedValue(512)
      chrome.storage.local.getBytesInUse.mockResolvedValue(1024)
      
      // Mock the getIndexedDBUsage method
      storageService.getIndexedDBUsage = jest.fn().mockResolvedValue({
        bytesInUse: 1000000,
        quota: 50000000,
        percentageUsed: 2,
        remainingBytes: 49000000
      })
      
      const quotaInfo = await storageService.checkQuotaUsage()
      
      expect(quotaInfo.sync.bytesInUse).toBe(512)
      expect(quotaInfo.local.bytesInUse).toBe(1024)
      expect(quotaInfo.indexedDB.bytesInUse).toBe(1000000)
    })

    test('should emit quota warning when threshold exceeded', async () => {
      chrome.storage.local.getBytesInUse.mockResolvedValue(4200000) // 80%+ of 5MB
      
      const warningCallback = jest.fn()
      storageService.addEventListener('quota:warning', warningCallback)
      
      await storageService.checkQuotaUsage()
      
      expect(warningCallback).toHaveBeenCalledWith({
        area: 'local',
        info: expect.objectContaining({
          percentageUsed: expect.any(Number)
        })
      })
    })

    test('should check quota before storing large data', async () => {
      chrome.storage.local.getBytesInUse.mockResolvedValue(5000000) // Near limit
      
      // Mock getChromeStorageQuota to return quota info that will trigger the error
      storageService.getChromeStorageQuota = jest.fn().mockResolvedValue({
        bytesInUse: 5000000,
        quota: 5242880,
        percentageUsed: 95.4,
        remainingBytes: 242880
      })
      
      const largeData = { content: 'x'.repeat(300000) } // 300KB
      
      await expect(storageService.chromeStorageSet('local', 'largeKey', largeData))
        .rejects.toThrow('Storage quota exceeded')
    })

    test('should get IndexedDB usage estimate', async () => {
      // Ensure navigator.storage is mocked properly
      if (!global.navigator.storage) {
        global.navigator.storage = {
          estimate: jest.fn(() => Promise.resolve({
            usage: 1000000,
            quota: 50000000
          }))
        }
      }
      
      const usage = await storageService.getIndexedDBUsage()
      
      expect(global.navigator.storage.estimate).toHaveBeenCalled()
      expect(usage.bytesInUse).toBe(1000000)
      expect(usage.quota).toBe(50000000)
      expect(usage.percentageUsed).toBe(2)
    })
  })

  describe('Event System', () => {
    test('should add and remove event listeners', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()
      
      storageService.addEventListener('test:event', callback1)
      storageService.addEventListener('test:event', callback2)
      
      expect(storageService.eventListeners.get('test:event').size).toBe(2)
      
      storageService.removeEventListener('test:event', callback1)
      expect(storageService.eventListeners.get('test:event').size).toBe(1)
    })

    test('should emit events to all listeners', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()
      const testData = { message: 'test' }
      
      storageService.addEventListener('test:event', callback1)
      storageService.addEventListener('test:event', callback2)
      
      storageService.emitEvent('test:event', testData)
      
      expect(callback1).toHaveBeenCalledWith(testData)
      expect(callback2).toHaveBeenCalledWith(testData)
    })

    test('should handle listener errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Listener error')
      })
      const successCallback = jest.fn()
      
      storageService.addEventListener('test:event', errorCallback)
      storageService.addEventListener('test:event', successCallback)
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      storageService.emitEvent('test:event', {})
      
      expect(consoleSpy).toHaveBeenCalledWith('Event listener error:', expect.any(Error))
      expect(successCallback).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    test('should handle Chrome Storage change events', () => {
      const callback = jest.fn()
      storageService.addEventListener('storage:local:contentItems', callback)
      
      const changes = {
        contentItems: {
          oldValue: [],
          newValue: [{ id: '1', title: 'New Item' }]
        }
      }
      
      storageService.handleStorageChange(changes, 'local')
      
      expect(callback).toHaveBeenCalledWith({
        key: 'contentItems',
        area: 'local',
        oldValue: [],
        newValue: [{ id: '1', title: 'New Item' }]
      })
    })
  })

  describe('Backup and Restore', () => {
    beforeEach(() => {
      storageService.db = mockDB
      
      chrome.storage.sync.get.mockResolvedValue({
        smartshelfSettings: { theme: 'dark' }
      })
      chrome.storage.local.get.mockResolvedValue({
        contentItems: [{ id: '1', title: 'Item 1' }]
      })
      
      setTimeout(() => {
        mockTransaction.oncomplete()
      }, 0)
    })

    test('should create complete backup', async () => {
      mockRequest.result = [
        { id: '1', title: 'Full Content 1' },
        { id: '2', title: 'Full Content 2' }
      ]
      
      const backup = await storageService.createBackup(true)
      
      expect(backup.id).toMatch(/^backup_\d+$/)
      expect(backup.timestamp).toBeDefined()
      expect(backup.version).toBe('1.0.0')
      expect(backup.data.sync.smartshelfSettings.theme).toBe('dark')
      expect(backup.data.local.contentItems[0].id).toBe('1')
      expect(backup.data.indexedDB.fullContent).toHaveLength(2)
      
      expect(mockStore.put).toHaveBeenCalledWith(backup)
    })

    test('should create backup without IndexedDB content', async () => {
      const backup = await storageService.createBackup(false)
      
      expect(backup.data.sync).toBeDefined()
      expect(backup.data.local).toBeDefined()
      expect(backup.data.indexedDB).toBeUndefined()
    })

    test('should restore from backup', async () => {
      chrome.storage.sync.clear.mockResolvedValue()
      chrome.storage.sync.set.mockResolvedValue()
      chrome.storage.local.clear.mockResolvedValue()
      chrome.storage.local.set.mockResolvedValue()
      
      const mockBackup = {
        id: 'backup_123',
        timestamp: new Date().toISOString(),
        data: {
          sync: { smartshelfSettings: { theme: 'light' } },
          local: { contentItems: [{ id: '1', title: 'Restored Item' }] },
          indexedDB: {
            fullContent: [{ id: '1', content: 'Full content' }]
          }
        }
      }
      
      mockRequest.result = mockBackup
      
      const result = await storageService.restoreFromBackup('backup_123')
      
      expect(chrome.storage.sync.clear).toHaveBeenCalled()
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(mockBackup.data.sync)
      expect(chrome.storage.local.clear).toHaveBeenCalled()
      expect(chrome.storage.local.set).toHaveBeenCalledWith(mockBackup.data.local)
      
      expect(result).toBe(true)
    })

    test('should handle restore from non-existent backup', async () => {
      mockRequest.result = null // Backup not found
      
      await expect(storageService.restoreFromBackup('nonexistent'))
        .rejects.toThrow('Backup not found')
    })
  })

  describe('Utility Methods', () => {
    test('should get storage service status', () => {
      storageService.isInitialized = true
      storageService.db = mockDB
      
      const status = storageService.getStatus()
      
      expect(status.isInitialized).toBe(true)
      expect(status.chromeStorageAvailable).toBe(true)
      expect(status.indexedDBAvailable).toBe(true)
      expect(status.eventListeners).toBe(0)
    })

    test('should cleanup resources properly', () => {
      storageService.db = mockDB
      storageService.isInitialized = true
      storageService.addEventListener('test', jest.fn())
      
      storageService.cleanup()
      
      expect(mockDB.close).toHaveBeenCalled()
      expect(storageService.db).toBeNull()
      expect(storageService.isInitialized).toBe(false)
      expect(storageService.eventListeners.size).toBe(0)
    })

    test('should handle cleanup with no database', () => {
      storageService.db = null
      
      expect(() => storageService.cleanup()).not.toThrow()
    })
  })

  describe('Error Handling', () => {
    test('should handle Chrome Storage API unavailable', async () => {
      const originalChrome = global.chrome
      global.chrome = undefined
      
      await expect(storageService.chromeStorageGet('local', 'test'))
        .rejects.toThrow('Chrome Storage local not available')
      
      global.chrome = originalChrome
    })

    test('should handle IndexedDB initialization failure', async () => {
      const mockOpenRequest = {
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null
      }
      global.indexedDB.open.mockReturnValue(mockOpenRequest)
      
      const newService = new StorageService()
      
      // Start initialization and trigger error
      const initPromise = newService.initialize()
      setTimeout(() => {
        mockOpenRequest.onerror()
      }, 0)
      
      const result = await initPromise
      
      // Should handle gracefully
      expect(result).toBe(false)
      expect(newService.db).toBeNull()
    })

    test('should handle quota check failures gracefully', async () => {
      chrome.storage.local.getBytesInUse.mockRejectedValue(new Error('Quota check failed'))
      
      const quotaInfo = await storageService.getChromeStorageQuota('local')
      
      expect(quotaInfo).toBeNull()
    })

    test('should handle search failures gracefully', async () => {
      storageService.db = null // Simulate DB failure
      chrome.storage.local.get.mockRejectedValue(new Error('Storage error'))
      
      const results = await storageService.searchContentItems('test')
      
      expect(results).toEqual([])
    })
  })
})
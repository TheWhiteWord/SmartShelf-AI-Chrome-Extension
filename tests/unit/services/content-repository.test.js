/**
 * Content Repository Unit Tests (T041)
 * Tests comprehensive ContentItem CRUD operations through repository pattern
 * Tests integration with Storage Service and ContentItem model validation
 */

describe('Content Repository Unit Tests', () => {
  let ContentRepository
  let StorageService
  let ContentItem
  let mockStorageService
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
    
    // Load dependencies
    try {
      ContentRepository = require('../../../extension/shared/services/content-repository.js')
      StorageService = require('../../../extension/shared/services/storage-service.js')
      const contentItemModule = require('../../../extension/shared/models/content-item.js')
      ContentItem = contentItemModule.ContentItem
    } catch (error) {
      // Dependencies don't exist yet - this is expected for TDD
      ContentRepository = null
      StorageService = null
      ContentItem = null
    }
    
    // Create mock storage service
    mockStorageService = {
      initialize: jest.fn().mockResolvedValue(true),
      saveContentItem: jest.fn().mockResolvedValue(true),
      getContentItem: jest.fn().mockResolvedValue(null),
      getAllContentItems: jest.fn().mockResolvedValue([]),
      searchContentItems: jest.fn().mockResolvedValue([]),
      deleteContentItem: jest.fn().mockResolvedValue(true),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      emitEvent: jest.fn(),
      getStatus: jest.fn().mockReturnValue({ isInitialized: true }),
      cleanup: jest.fn()
    }
  })

  afterEach(() => {
    // Clean up any repository instances
    if (ContentRepository && typeof ContentRepository.cleanup === 'function') {
      ContentRepository.cleanup()
    }
  })

  describe('Repository Initialization', () => {
    test('should exist as a class', () => {
      expect(ContentRepository).toBeDefined()
      expect(typeof ContentRepository).toBe('function')
    })

    test('should initialize with storage service dependency', async () => {
      const repository = new ContentRepository(mockStorageService)
      
      expect(repository).toBeDefined()
      expect(repository.storageService).toBe(mockStorageService)
    })

    test('should initialize storage service on construction', async () => {
      const repository = new ContentRepository(mockStorageService)
      await repository.initialize()
      
      expect(mockStorageService.initialize).toHaveBeenCalled()
    })

    test('should throw error if no storage service provided', () => {
      expect(() => new ContentRepository()).toThrow('Storage service is required')
    })

    test('should handle initialization failures gracefully', async () => {
      mockStorageService.initialize.mockRejectedValue(new Error('Storage init failed'))
      
      const repository = new ContentRepository(mockStorageService)
      const result = await repository.initialize()
      
      expect(result).toBe(false)
    })
  })

  describe('Create Operations', () => {
    let repository

    beforeEach(async () => {
      repository = new ContentRepository(mockStorageService)
      await repository.initialize()
    })

    test('should create new content item with valid data', async () => {
      const contentData = {
        title: 'Test Article',
        type: 'article',
        source: 'https://example.com/article',
        content: 'This is test content',
        isPhysical: false
      }

      const result = await repository.create(contentData)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.title).toBe('Test Article')
      expect(result.type).toBe('article')
      expect(mockStorageService.saveContentItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Article',
          type: 'article'
        })
      )
    })

    test('should generate unique ID for new content items', async () => {
      const contentData = {
        title: 'Test Article 1',
        type: 'article',
        source: 'https://example.com/1',
        isPhysical: false
      }

      const result1 = await repository.create(contentData)
      const result2 = await repository.create({
        ...contentData,
        title: 'Test Article 2'
      })

      expect(result1.id).toBeDefined()
      expect(result2.id).toBeDefined()
      expect(result1.id).not.toBe(result2.id)
    })

    test('should set default values for new content items', async () => {
      const contentData = {
        title: 'Minimal Article',
        type: 'article',
        source: 'https://example.com',
        isPhysical: false
      }

      const result = await repository.create(contentData)

      expect(result.status).toBe('pending')
      expect(result.tags).toEqual([])
      expect(result.categories).toEqual([])
      expect(result.dateAdded).toBeDefined()
      expect(result.dateModified).toBeDefined()
    })

    test('should validate content item data before creation', async () => {
      const invalidData = {
        // Missing required title
        type: 'article',
        source: 'https://example.com',
        isPhysical: false
      }

      await expect(repository.create(invalidData))
        .rejects.toThrow('Title is required')
      
      expect(mockStorageService.saveContentItem).not.toHaveBeenCalled()
    })

    test('should handle storage service failures during creation', async () => {
      mockStorageService.saveContentItem.mockRejectedValue(new Error('Storage failed'))

      const contentData = {
        title: 'Test Article',
        type: 'article',
        source: 'https://example.com',
        isPhysical: false
      }

      await expect(repository.create(contentData))
        .rejects.toThrow('Failed to create content item')
    })

    test('should support physical item creation', async () => {
      const physicalData = {
        title: 'Physical Book',
        type: 'book',
        source: 'ISBN:978-1234567890',
        isPhysical: true,
        location: 'Bookshelf A'
      }

      const result = await repository.create(physicalData)

      expect(result.isPhysical).toBe(true)
      expect(result.location).toBe('Bookshelf A')
    })
  })

  describe('Read Operations', () => {
    let repository

    beforeEach(async () => {
      repository = new ContentRepository(mockStorageService)
      await repository.initialize()
    })

    test('should get content item by ID', async () => {
      const mockItem = {
        id: 'test-123',
        title: 'Test Article',
        type: 'article',
        source: 'https://example.com'
      }
      
      mockStorageService.getContentItem.mockResolvedValue(mockItem)

      const result = await repository.getById('test-123')

      expect(result).toEqual(mockItem)
      expect(mockStorageService.getContentItem).toHaveBeenCalledWith('test-123')
    })

    test('should return null for non-existent item', async () => {
      mockStorageService.getContentItem.mockResolvedValue(null)

      const result = await repository.getById('non-existent')

      expect(result).toBeNull()
    })

    test('should get all content items with pagination', async () => {
      const mockItems = [
        { id: '1', title: 'Item 1', dateAdded: '2023-01-01' },
        { id: '2', title: 'Item 2', dateAdded: '2023-01-02' }
      ]
      
      mockStorageService.getAllContentItems.mockResolvedValue(mockItems)

      const result = await repository.getAll({ limit: 10, offset: 0 })

      expect(result).toEqual(mockItems)
      expect(mockStorageService.getAllContentItems).toHaveBeenCalledWith({
        limit: 10,
        offset: 0
      })
    })

    test('should get all items without pagination when no options provided', async () => {
      const mockItems = [
        { id: '1', title: 'Item 1' },
        { id: '2', title: 'Item 2' }
      ]
      
      mockStorageService.getAllContentItems.mockResolvedValue(mockItems)

      const result = await repository.getAll()

      expect(result).toEqual(mockItems)
      expect(mockStorageService.getAllContentItems).toHaveBeenCalledWith({})
    })

    test('should search content items with query and filters', async () => {
      const mockResults = [
        { id: '1', title: 'JavaScript Guide', type: 'article' }
      ]
      
      mockStorageService.searchContentItems.mockResolvedValue(mockResults)

      const result = await repository.search('javascript', {
        type: 'article',
        limit: 5
      })

      expect(result).toEqual(mockResults)
      expect(mockStorageService.searchContentItems).toHaveBeenCalledWith('javascript', {
        type: 'article',
        limit: 5
      })
    })

    test('should handle search with empty query', async () => {
      const mockResults = [
        { id: '1', title: 'All Items' }
      ]
      
      mockStorageService.searchContentItems.mockResolvedValue(mockResults)

      const result = await repository.search('', { type: 'article' })

      expect(result).toEqual(mockResults)
      expect(mockStorageService.searchContentItems).toHaveBeenCalledWith('', {
        type: 'article'
      })
    })

    test('should get items by status', async () => {
      const allItems = [
        { id: '1', title: 'Processed Item', status: 'processed' },
        { id: '2', title: 'Pending Item', status: 'pending' },
        { id: '3', title: 'Another Processed Item', status: 'processed' }
      ]
      
      mockStorageService.getAllContentItems.mockResolvedValue(allItems)

      const result = await repository.getByStatus('processed')

      expect(result).toHaveLength(2)
      expect(result.every(item => item.status === 'processed')).toBe(true)
    })

    test('should get items by type', async () => {
      const allItems = [
        { id: '1', title: 'Article 1', type: 'article' },
        { id: '2', title: 'Video 1', type: 'video' },
        { id: '3', title: 'Article 2', type: 'article' }
      ]
      
      mockStorageService.getAllContentItems.mockResolvedValue(allItems)

      const result = await repository.getByType('article')

      expect(result).toHaveLength(2)
      expect(result.every(item => item.type === 'article')).toBe(true)
    })
  })

  describe('Update Operations', () => {
    let repository

    beforeEach(async () => {
      repository = new ContentRepository(mockStorageService)
      await repository.initialize()
    })

    test('should update existing content item', async () => {
      const existingItem = {
        id: 'test-123',
        title: 'Original Title',
        type: 'article',
        source: 'https://example.com',
        dateAdded: '2023-01-01T00:00:00.000Z',
        dateModified: '2023-01-01T00:00:00.000Z'
      }

      const updates = {
        title: 'Updated Title',
        summary: 'New summary',
        tags: ['updated']
      }

      mockStorageService.getContentItem.mockResolvedValue(existingItem)

      const result = await repository.update('test-123', updates)

      expect(result.title).toBe('Updated Title')
      expect(result.summary).toBe('New summary')
      expect(result.tags).toEqual(['updated'])
      expect(result.dateModified).not.toBe(existingItem.dateModified)
      
      expect(mockStorageService.saveContentItem).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-123',
          title: 'Updated Title',
          summary: 'New summary'
        })
      )
    })

    test('should return null when updating non-existent item', async () => {
      mockStorageService.getContentItem.mockResolvedValue(null)

      const result = await repository.update('non-existent', { title: 'New Title' })

      expect(result).toBeNull()
      expect(mockStorageService.saveContentItem).not.toHaveBeenCalled()
    })

    test('should validate updates before applying', async () => {
      const existingItem = {
        id: 'test-123',
        title: 'Original Title',
        type: 'article',
        source: 'https://example.com'
      }

      mockStorageService.getContentItem.mockResolvedValue(existingItem)

      const invalidUpdates = {
        type: 'invalid-type'  // Invalid content type
      }

      await expect(repository.update('test-123', invalidUpdates))
        .rejects.toThrow('Invalid content type')
      
      expect(mockStorageService.saveContentItem).not.toHaveBeenCalled()
    })

    test('should not allow updating immutable fields', async () => {
      const existingItem = {
        id: 'test-123',
        title: 'Original Title',
        type: 'article',
        source: 'https://example.com',
        dateAdded: '2023-01-01T00:00:00.000Z'
      }

      mockStorageService.getContentItem.mockResolvedValue(existingItem)
      mockStorageService.saveContentItem.mockResolvedValue(true)

      const updates = {
        id: 'new-id',  // Should not be allowed to change
        dateAdded: '2024-01-01T00:00:00.000Z'  // Should not be allowed to change
      }

      const result = await repository.update('test-123', updates)

      expect(result.id).toBe('test-123')  // Original ID preserved
      expect(result.dateAdded).toBe('2023-01-01T00:00:00.000Z')  // Original date preserved
    })

    test('should handle storage service failures during update', async () => {
      const existingItem = {
        id: 'test-123',
        title: 'Original Title',
        type: 'article',
        source: 'https://example.com'
      }

      mockStorageService.getContentItem.mockResolvedValue(existingItem)
      mockStorageService.saveContentItem.mockRejectedValue(new Error('Storage failed'))

      await expect(repository.update('test-123', { title: 'New Title' }))
        .rejects.toThrow('Failed to update content item')
    })
  })

  describe('Delete Operations', () => {
    let repository

    beforeEach(async () => {
      repository = new ContentRepository(mockStorageService)
      await repository.initialize()
    })

    test('should delete content item by ID', async () => {
      mockStorageService.getContentItem.mockResolvedValue({
        id: 'test-123',
        title: 'Item to Delete'
      })

      const result = await repository.delete('test-123')

      expect(result).toBe(true)
      expect(mockStorageService.deleteContentItem).toHaveBeenCalledWith('test-123')
    })

    test('should return false when deleting non-existent item', async () => {
      mockStorageService.getContentItem.mockResolvedValue(null)

      const result = await repository.delete('non-existent')

      expect(result).toBe(false)
      expect(mockStorageService.deleteContentItem).not.toHaveBeenCalled()
    })

    test('should handle storage service failures during deletion', async () => {
      mockStorageService.getContentItem.mockResolvedValue({
        id: 'test-123',
        title: 'Item to Delete'
      })
      mockStorageService.deleteContentItem.mockRejectedValue(new Error('Storage failed'))

      await expect(repository.delete('test-123'))
        .rejects.toThrow('Failed to delete content item')
    })

    test('should delete multiple items by IDs', async () => {
      const itemIds = ['id1', 'id2', 'id3']
      
      // Mock all items exist
      mockStorageService.getContentItem
        .mockResolvedValueOnce({ id: 'id1', title: 'Item 1' })
        .mockResolvedValueOnce({ id: 'id2', title: 'Item 2' })
        .mockResolvedValueOnce({ id: 'id3', title: 'Item 3' })

      const result = await repository.deleteMany(itemIds)

      expect(result.deleted).toBe(3)
      expect(result.failed).toBe(0)
      expect(mockStorageService.deleteContentItem).toHaveBeenCalledTimes(3)
    })

    test('should handle partial failures in batch delete', async () => {
      const itemIds = ['id1', 'id2', 'id3']
      
      mockStorageService.getContentItem
        .mockResolvedValueOnce({ id: 'id1', title: 'Item 1' })
        .mockResolvedValueOnce(null)  // Item 2 doesn't exist
        .mockResolvedValueOnce({ id: 'id3', title: 'Item 3' })

      const result = await repository.deleteMany(itemIds)

      expect(result.deleted).toBe(2)
      expect(result.failed).toBe(1)
      expect(mockStorageService.deleteContentItem).toHaveBeenCalledTimes(2)
    })
  })

  describe('Advanced Operations', () => {
    let repository

    beforeEach(async () => {
      repository = new ContentRepository(mockStorageService)
      await repository.initialize()
    })

    test('should count total items', async () => {
      const mockItems = [
        { id: '1', title: 'Item 1' },
        { id: '2', title: 'Item 2' },
        { id: '3', title: 'Item 3' }
      ]
      
      mockStorageService.getAllContentItems.mockResolvedValue(mockItems)

      const count = await repository.count()

      expect(count).toBe(3)
    })

    test('should count items by status', async () => {
      const mockItems = [
        { id: '1', title: 'Item 1', status: 'processed' },
        { id: '2', title: 'Item 2', status: 'pending' },
        { id: '3', title: 'Item 3', status: 'processed' }
      ]
      
      mockStorageService.getAllContentItems.mockResolvedValue(mockItems)

      const count = await repository.countByStatus('processed')

      expect(count).toBe(2)
    })

    test('should check if item exists', async () => {
      mockStorageService.getContentItem.mockResolvedValue({
        id: 'test-123',
        title: 'Existing Item'
      })

      const exists = await repository.exists('test-123')

      expect(exists).toBe(true)
    })

    test('should return false for non-existent item check', async () => {
      mockStorageService.getContentItem.mockResolvedValue(null)

      const exists = await repository.exists('non-existent')

      expect(exists).toBe(false)
    })

    test('should find duplicate items by URL', async () => {
      const mockItems = [
        { id: '1', title: 'Item 1', url: 'https://example.com/article' },
        { id: '2', title: 'Item 2', url: 'https://different.com/article' },
        { id: '3', title: 'Item 3', url: 'https://example.com/article' }
      ]
      
      mockStorageService.getAllContentItems.mockResolvedValue(mockItems)

      const duplicates = await repository.findDuplicates('https://example.com/article')

      expect(duplicates).toHaveLength(2)
      expect(duplicates.every(item => item.url === 'https://example.com/article')).toBe(true)
    })
  })

  describe('Event Handling', () => {
    let repository

    beforeEach(async () => {
      repository = new ContentRepository(mockStorageService)
      await repository.initialize()
    })

    test('should register event listeners with storage service', () => {
      const callback = jest.fn()
      
      repository.addEventListener('item:created', callback)

      expect(mockStorageService.addEventListener).toHaveBeenCalledWith('item:created', callback)
    })

    test('should remove event listeners from storage service', () => {
      const callback = jest.fn()
      
      repository.removeEventListener('item:updated', callback)

      expect(mockStorageService.removeEventListener).toHaveBeenCalledWith('item:updated', callback)
    })

    test('should emit events for content operations', async () => {
      const contentData = {
        title: 'Event Test Item',
        type: 'article',
        source: 'https://example.com',
        isPhysical: false
      }

      await repository.create(contentData)

      expect(mockStorageService.emitEvent).toHaveBeenCalledWith('item:created', 
        expect.objectContaining({
          title: 'Event Test Item'
        })
      )
    })
  })

  describe('Repository Status and Cleanup', () => {
    let repository

    beforeEach(async () => {
      repository = new ContentRepository(mockStorageService)
      await repository.initialize()
    })

    test('should get repository status', () => {
      const status = repository.getStatus()

      expect(status.isInitialized).toBe(true)
      expect(status.storageService).toBeDefined()
    })

    test('should cleanup resources properly', () => {
      repository.cleanup()

      expect(mockStorageService.cleanup).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    let repository

    beforeEach(async () => {
      repository = new ContentRepository(mockStorageService)
      await repository.initialize()
    })

    test('should handle storage service unavailable', async () => {
      mockStorageService.getStatus.mockReturnValue({ isInitialized: false })

      await expect(repository.getById('test-123'))
        .rejects.toThrow('Storage service not available')
    })

    test('should handle invalid content item data gracefully', async () => {
      const invalidData = {
        title: '',  // Empty title
        type: 'article',
        source: 'https://example.com'
      }

      await expect(repository.create(invalidData))
        .rejects.toThrow('Title is required')
    })

    test('should handle storage service errors in search operations', async () => {
      mockStorageService.searchContentItems.mockRejectedValue(new Error('Search failed'))

      const result = await repository.search('test query')

      expect(result).toEqual([])  // Should return empty array on error
    })
  })
})
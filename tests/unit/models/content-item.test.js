/**
 * Entity Model Test: ContentItem
 * 
 * CRITICAL: This test MUST FAIL until proper implementation exists.
 * Tests the ContentItem model based on data-model.md specifications
 */

describe('ContentItem Model - T013', () => {
  let ContentItem

  beforeEach(() => {
    // Attempt to load ContentItem model
    try {
      // Try to require from expected location
      const contentItemModule = require('../../../extension/shared/models/content-item.js')
      ContentItem = contentItemModule.ContentItem
    } catch (error) {
      // Model doesn't exist yet - this is expected for TDD
      ContentItem = null
    }
  })

  describe('ContentItem Class Definition', () => {
    test('should exist as a class', () => {
      expect(ContentItem).toBeDefined()
      expect(typeof ContentItem).toBe('function')
      expect(ContentItem.prototype.constructor).toBe(ContentItem)
    })

    test('should have required static properties', () => {
      expect(ContentItem.TYPES).toBeDefined()
      expect(ContentItem.TYPES).toEqual(['article', 'video', 'book', 'document', 'image', 'audio'])
      
      expect(ContentItem.STATUSES).toBeDefined()
      expect(ContentItem.STATUSES).toEqual(['pending', 'processing', 'processed', 'error', 'manual'])
    })
  })

  describe('ContentItem Constructor', () => {
    test('should create ContentItem with required fields', () => {
      const data = {
        title: 'Test Article',
        type: 'article',
        source: 'https://example.com/article'
      }

      const item = new ContentItem(data)

      expect(item.id).toBeDefined()
      expect(typeof item.id).toBe('string')
      expect(item.id.length).toBeGreaterThan(0)
      expect(item.title).toBe('Test Article')
      expect(item.type).toBe('article')
      expect(item.source).toBe('https://example.com/article')
      expect(item.dateAdded).toBeInstanceOf(Date)
      expect(item.dateModified).toBeInstanceOf(Date)
      expect(item.isPhysical).toBe(false)
      expect(item.status).toBe('pending')
      expect(item.tags).toEqual([])
      expect(item.categories).toEqual([])
    })

    test('should auto-generate UUID for id field', () => {
      const item1 = new ContentItem({ title: 'Test 1', type: 'article', source: 'test' })
      const item2 = new ContentItem({ title: 'Test 2', type: 'article', source: 'test' })

      expect(item1.id).not.toBe(item2.id)
      expect(item1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(item2.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    test('should set default values for optional fields', () => {
      const item = new ContentItem({
        title: 'Minimal Test',
        type: 'document',
        source: 'test-source'
      })

      expect(item.contentText).toBeNull()
      expect(item.summary).toBeNull()
      expect(item.tags).toEqual([])
      expect(item.categories).toEqual([])
      expect(item.notes).toBe('')
      expect(item.isPhysical).toBe(false)
      expect(item.status).toBe('pending')
    })

    test('should accept and set provided optional fields', () => {
      const data = {
        title: 'Full Test',
        type: 'article',
        source: 'https://example.com',
        contentText: 'Full article content here',
        summary: 'Article summary',
        tags: ['test', 'article'],
        categories: ['Testing', 'Development'],
        notes: 'My personal notes',
        isPhysical: true,
        status: 'processed'
      }

      const item = new ContentItem(data)

      expect(item.contentText).toBe(data.contentText)
      expect(item.summary).toBe(data.summary)
      expect(item.tags).toEqual(data.tags)
      expect(item.categories).toEqual(data.categories)
      expect(item.notes).toBe(data.notes)
      expect(item.isPhysical).toBe(data.isPhysical)
      expect(item.status).toBe(data.status)
    })
  })

  describe('ContentItem Validation', () => {
    test('should validate required fields', () => {
      expect(() => new ContentItem({})).toThrow('Title is required')
      expect(() => new ContentItem({ title: 'Test' })).toThrow('Type is required')
      expect(() => new ContentItem({ title: 'Test', type: 'article' })).toThrow('Source is required')
    })

    test('should validate title length constraints', () => {
      const validTitle = 'Valid Title'
      const tooLongTitle = 'a'.repeat(201)
      const emptyTitle = ''

      expect(() => new ContentItem({
        title: emptyTitle,
        type: 'article',
        source: 'test'
      })).toThrow('Title is required')

      expect(() => new ContentItem({
        title: tooLongTitle,
        type: 'article',
        source: 'test'
      })).toThrow('Title must not exceed 200 characters')

      const validItem = new ContentItem({
        title: validTitle,
        type: 'article',
        source: 'test'
      })
      expect(validItem.title).toBe(validTitle)
    })

    test('should validate content type enum', () => {
      const validTypes = ['article', 'video', 'book', 'document', 'image', 'audio']
      const invalidTypes = ['invalid', 'blog', 'podcast', '']

      validTypes.forEach(type => {
        const item = new ContentItem({
          title: 'Test',
          type: type,
          source: 'test'
        })
        expect(item.type).toBe(type)
      })

      invalidTypes.forEach(type => {
        expect(() => new ContentItem({
          title: 'Test',
          type: type,
          source: 'test'
        })).toThrow('Invalid content type')
      })
    })

    test('should validate status enum', () => {
      const validStatuses = ['pending', 'processing', 'processed', 'error', 'manual']
      const invalidStatuses = ['invalid', 'complete', 'failed']

      validStatuses.forEach(status => {
        const item = new ContentItem({
          title: 'Test',
          type: 'article',
          source: 'test',
          status: status
        })
        expect(item.status).toBe(status)
      })

      invalidStatuses.forEach(status => {
        expect(() => new ContentItem({
          title: 'Test',
          type: 'article',
          source: 'test',
          status: status
        })).toThrow('Invalid status')
      })
    })

    test('should validate source for digital items', () => {
      // Digital items (isPhysical: false) must have source
      expect(() => new ContentItem({
        title: 'Digital Item',
        type: 'article',
        source: '',
        isPhysical: false
      })).toThrow('Source is required for digital items')

      // Physical items can have empty or different source
      const physicalItem = new ContentItem({
        title: 'Physical Book',
        type: 'book',
        source: 'My Library',
        isPhysical: true
      })
      expect(physicalItem.source).toBe('My Library')
    })
  })

  describe('ContentItem Methods', () => {
    let testItem

    beforeEach(() => {
      testItem = new ContentItem({
        title: 'Method Test Item',
        type: 'article',
        source: 'https://example.com/method-test',
        contentText: 'Test content for methods',
        tags: ['method', 'test'],
        categories: ['Testing']
      })
    })

    test('should implement validate() method', () => {
      expect(typeof testItem.validate).toBe('function')
      
      const validationResult = testItem.validate()
      expect(validationResult.isValid).toBe(true)
      expect(validationResult.errors).toEqual([])
    })

    test('should implement addTag() method', () => {
      expect(typeof testItem.addTag).toBe('function')
      
      testItem.addTag('new-tag')
      expect(testItem.tags).toContain('new-tag')
      
      // Should not add duplicate tags
      testItem.addTag('new-tag')
      const tagCount = testItem.tags.filter(tag => tag === 'new-tag').length
      expect(tagCount).toBe(1)
    })

    test('should implement removeTag() method', () => {
      expect(typeof testItem.removeTag).toBe('function')
      
      testItem.removeTag('test')
      expect(testItem.tags).not.toContain('test')
      expect(testItem.tags).toContain('method') // Should not affect other tags
    })

    test('should implement addCategory() method', () => {
      expect(typeof testItem.addCategory).toBe('function')
      
      testItem.addCategory('New Category')
      expect(testItem.categories).toContain('New Category')
      
      // Should not add duplicate categories
      testItem.addCategory('Testing')
      const categoryCount = testItem.categories.filter(cat => cat === 'Testing').length
      expect(categoryCount).toBe(1)
    })

    test('should implement updateStatus() method', () => {
      expect(typeof testItem.updateStatus).toBe('function')
      
      testItem.updateStatus('processed')
      expect(testItem.status).toBe('processed')
      expect(testItem.dateModified.getTime()).toBeGreaterThan(testItem.dateAdded.getTime())
    })

    test('should implement toJSON() method for serialization', () => {
      expect(typeof testItem.toJSON).toBe('function')
      
      const json = testItem.toJSON()
      
      expect(json).toMatchObject({
        id: testItem.id,
        title: testItem.title,
        type: testItem.type,
        source: testItem.source,
        contentText: testItem.contentText,
        summary: testItem.summary,
        tags: testItem.tags,
        categories: testItem.categories,
        dateAdded: testItem.dateAdded.toISOString(),
        dateModified: testItem.dateModified.toISOString(),
        isPhysical: testItem.isPhysical,
        notes: testItem.notes,
        status: testItem.status
      })
    })

    test('should implement fromJSON() static method for deserialization', () => {
      expect(typeof ContentItem.fromJSON).toBe('function')
      
      const jsonData = {
        id: 'test-id-123',
        title: 'JSON Test Item',
        type: 'article',
        source: 'https://example.com/json-test',
        dateAdded: '2025-09-27T10:00:00.000Z',
        dateModified: '2025-09-27T11:00:00.000Z',
        isPhysical: false,
        status: 'processed'
      }

      const item = ContentItem.fromJSON(jsonData)
      
      expect(item).toBeInstanceOf(ContentItem)
      expect(item.id).toBe(jsonData.id)
      expect(item.title).toBe(jsonData.title)
      expect(item.dateAdded).toBeInstanceOf(Date)
      expect(item.dateModified).toBeInstanceOf(Date)
    })
  })

  describe('ContentItem Business Logic', () => {
    test('should automatically update dateModified when modified', () => {
      const item = new ContentItem({
        title: 'Modification Test',
        type: 'article',
        source: 'test'
      })

      const originalModified = new Date(item.dateModified)
      
      // Simulate time passage
      setTimeout(() => {
        item.title = 'Modified Title'
        item.updateModifiedDate()
        
        expect(item.dateModified.getTime()).toBeGreaterThan(originalModified.getTime())
      }, 10)
    })

    test('should calculate processing age', () => {
      const item = new ContentItem({
        title: 'Age Test',
        type: 'article',
        source: 'test'
      })

      expect(typeof item.getProcessingAge).toBe('function')
      
      const age = item.getProcessingAge()
      expect(age).toBeGreaterThanOrEqual(0)
      expect(typeof age).toBe('number')
    })

    test('should determine if item needs AI processing', () => {
      const pendingItem = new ContentItem({
        title: 'Pending Item',
        type: 'article',
        source: 'test',
        status: 'pending'
      })

      const processedItem = new ContentItem({
        title: 'Processed Item',
        type: 'article',
        source: 'test',
        status: 'processed'
      })

      expect(typeof pendingItem.needsAIProcessing).toBe('function')
      
      expect(pendingItem.needsAIProcessing()).toBe(true)
      expect(processedItem.needsAIProcessing()).toBe(false)
    })

    test('should support cloning/copying', () => {
      const original = new ContentItem({
        title: 'Original Item',
        type: 'article',
        source: 'test',
        tags: ['clone', 'test'],
        categories: ['Testing']
      })

      expect(typeof original.clone).toBe('function')
      
      const cloned = original.clone()
      
      expect(cloned).toBeInstanceOf(ContentItem)
      expect(cloned.id).not.toBe(original.id) // Should have new ID
      expect(cloned.title).toBe(original.title)
      expect(cloned.tags).toEqual(original.tags)
      expect(cloned.tags).not.toBe(original.tags) // Should be deep copy
    })
  })

  describe('ContentItem Integration', () => {
    test('should integrate with Chrome Storage API format', () => {
      const item = new ContentItem({
        title: 'Storage Test',
        type: 'article',
        source: 'test'
      })

      const storageFormat = item.toStorageFormat()
      
      expect(storageFormat).toHaveProperty('id')
      expect(storageFormat).toHaveProperty('title')
      expect(storageFormat).toHaveProperty('type')
      expect(typeof storageFormat.dateAdded).toBe('string')
      expect(typeof storageFormat.dateModified).toBe('string')
    })

    test('should support search indexing format', () => {
      const item = new ContentItem({
        title: 'Search Index Test',
        type: 'article',
        source: 'test',
        contentText: 'This is searchable content',
        summary: 'Searchable summary',
        tags: ['search', 'index']
      })

      expect(typeof item.toSearchIndex).toBe('function')
      
      const searchIndex = item.toSearchIndex()
      
      expect(searchIndex).toMatchObject({
        id: item.id,
        searchableText: expect.stringContaining(item.title),
        keywords: expect.arrayContaining(['search', 'index']),
        lastIndexed: expect.any(String)
      })
    })
  })

  // This test will fail until ContentItem model is implemented
  test('ContentItem model should be implemented', () => {
    expect(ContentItem).toBeDefined()
    expect(ContentItem).not.toBeNull()
  })
})
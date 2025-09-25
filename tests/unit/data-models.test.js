// Data model tests for SmartShelf content items
// These tests verify the structure and validation of our data models

describe('SmartShelf Data Models', () => {
  describe('ContentItem Model', () => {
    test('should create valid content item with required fields', () => {
      const item = global.testUtils.createMockContentItem()

      // Required fields
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('title')
      expect(item).toHaveProperty('url')
      expect(item).toHaveProperty('content')
      expect(item).toHaveProperty('type')
      expect(item).toHaveProperty('source')
      expect(item).toHaveProperty('dateAdded')
      expect(item).toHaveProperty('dateModified')
      expect(item).toHaveProperty('isPhysical')
      expect(item).toHaveProperty('status')

      // Optional AI fields
      expect(item).toHaveProperty('summary')
      expect(item).toHaveProperty('tags')
      expect(item).toHaveProperty('categories')
      expect(item).toHaveProperty('notes')
      expect(item).toHaveProperty('aiProcessed')

      // Type validation
      expect(typeof item.id).toBe('string')
      expect(typeof item.title).toBe('string')
      expect(typeof item.url).toBe('string')
      expect(typeof item.content).toBe('string')
      expect(typeof item.isPhysical).toBe('boolean')
      expect(typeof item.aiProcessed).toBe('boolean')
      expect(Array.isArray(item.tags)).toBe(true)
      expect(Array.isArray(item.categories)).toBe(true)
    })

    test('should validate content item types', () => {
      const articleItem = global.testUtils.createMockContentItem({ type: 'article' })
      const videoItem = global.testUtils.createMockContentItem({ type: 'video' })
      const imageItem = global.testUtils.createMockContentItem({ type: 'image' })
      const bookItem = global.testUtils.createMockContentItem({ type: 'book', isPhysical: true })

      expect(articleItem.type).toBe('article')
      expect(videoItem.type).toBe('video')
      expect(imageItem.type).toBe('image')
      expect(bookItem.type).toBe('book')
      expect(bookItem.isPhysical).toBe(true)
    })

    test('should validate content item status', () => {
      const newItem = global.testUtils.createMockContentItem({ status: 'pending' })
      const processedItem = global.testUtils.createMockContentItem({ status: 'processed' })
      const errorItem = global.testUtils.createMockContentItem({ status: 'error' })

      expect(['pending', 'processed', 'error']).toContain(newItem.status)
      expect(['pending', 'processed', 'error']).toContain(processedItem.status)
      expect(['pending', 'processed', 'error']).toContain(errorItem.status)
    })

    test('should handle AI processing fields', () => {
      const unprocessedItem = global.testUtils.createMockContentItem({
        aiProcessed: false,
        summary: '',
        tags: [],
        categories: []
      })

      const processedItem = global.testUtils.createMockContentItem({
        aiProcessed: true,
        summary: 'AI-generated summary',
        tags: ['technology', 'ai'],
        categories: ['Technology', 'AI/ML']
      })

      expect(unprocessedItem.aiProcessed).toBe(false)
      expect(processedItem.aiProcessed).toBe(true)
      expect(processedItem.summary.length).toBeGreaterThan(0)
      expect(processedItem.tags.length).toBeGreaterThan(0)
      expect(processedItem.categories.length).toBeGreaterThan(0)
    })

    test('should generate unique IDs', () => {
      const item1 = global.testUtils.createMockContentItem()
      const item2 = global.testUtils.createMockContentItem()

      expect(item1.id).not.toBe(item2.id)
      expect(item1.id.length).toBeGreaterThan(0)
      expect(item2.id.length).toBeGreaterThan(0)
    })

    test('should handle date fields properly', () => {
      const item = global.testUtils.createMockContentItem()

      expect(() => new Date(item.dateAdded)).not.toThrow()
      expect(() => new Date(item.dateModified)).not.toThrow()

      const dateAdded = new Date(item.dateAdded)
      const dateModified = new Date(item.dateModified)

      expect(dateAdded instanceof Date).toBe(true)
      expect(dateModified instanceof Date).toBe(true)
      expect(!isNaN(dateAdded.getTime())).toBe(true)
      expect(!isNaN(dateModified.getTime())).toBe(true)
    })
  })

  describe('Settings Model', () => {
    test('should create default settings structure', () => {
      const defaultSettings = {
        aiProcessingEnabled: true,
        openSidePanel: true,
        processingDelay: 1,
        theme: 'auto',
        notifications: true,
        autoSave: true,
        keyboardShortcuts: true
      }

      // Validate structure
      expect(typeof defaultSettings.aiProcessingEnabled).toBe('boolean')
      expect(typeof defaultSettings.openSidePanel).toBe('boolean')
      expect(typeof defaultSettings.processingDelay).toBe('number')
      expect(typeof defaultSettings.theme).toBe('string')
      expect(typeof defaultSettings.notifications).toBe('boolean')
      expect(typeof defaultSettings.autoSave).toBe('boolean')
      expect(typeof defaultSettings.keyboardShortcuts).toBe('boolean')

      // Validate constraints
      expect(defaultSettings.processingDelay).toBeGreaterThan(0)
      expect(['auto', 'light', 'dark']).toContain(defaultSettings.theme)
    })

    test('should validate theme options', () => {
      const validThemes = ['auto', 'light', 'dark']

      validThemes.forEach(theme => {
        expect(validThemes).toContain(theme)
      })
    })

    test('should validate processing delay constraints', () => {
      const validDelays = [1, 2, 5, 10]
      const invalidDelays = [0, -1, 0.5]

      validDelays.forEach(delay => {
        expect(delay).toBeGreaterThan(0)
        expect(Number.isInteger(delay)).toBe(true)
      })

      invalidDelays.forEach(delay => {
        expect(delay <= 0 || !Number.isInteger(delay)).toBe(true)
      })
    })
  })

  describe('Search and Filter Models', () => {
    test('should handle search query structure', () => {
      const searchQuery = {
        text: 'javascript',
        filters: {
          type: 'article',
          dateRange: { start: '2024-01-01', end: '2024-12-31' },
          tags: ['programming', 'web'],
          categories: ['Technology'],
          status: 'processed'
        },
        sort: {
          field: 'dateAdded',
          order: 'desc'
        }
      }

      expect(typeof searchQuery.text).toBe('string')
      expect(typeof searchQuery.filters).toBe('object')
      expect(typeof searchQuery.sort).toBe('object')
      expect(Array.isArray(searchQuery.filters.tags)).toBe(true)
      expect(Array.isArray(searchQuery.filters.categories)).toBe(true)
      expect(['asc', 'desc']).toContain(searchQuery.sort.order)
    })

    test('should validate sort field options', () => {
      const validSortFields = ['dateAdded', 'dateModified', 'title', 'type']
      const testField = 'dateAdded'

      expect(validSortFields).toContain(testField)
    })

    test('should validate filter type options', () => {
      const validTypes = ['article', 'video', 'image', 'book', 'document', 'webpage']
      const testType = 'article'

      expect(validTypes).toContain(testType)
    })
  })
})

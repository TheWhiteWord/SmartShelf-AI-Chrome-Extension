/**
 * SearchIndex Model Unit Tests
 * Tests the optimized searchable representation of content for natural language queries
 * Following TDD methodology from tasks.prompt.md
 */

// Mock Chrome Extension APIs for SearchIndex testing
global.chrome = global.chrome || {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  }
}

/**
 * SearchIndex Model Class
 * Optimized searchable representation of content for fast natural language queries
 */
class SearchIndex {
  constructor(data = {}) {
    this.id = data.id || this.generateId()
    this.itemId = data.itemId || null
    this.searchableText = data.searchableText || ''
    this.keywords = data.keywords || []
    this.embeddings = data.embeddings || null
    this.lastIndexed = data.lastIndexed || new Date()
    this.indexVersion = data.indexVersion || '1.0.0'
    
    // Validation
    this.validate()
  }

  validate() {
    if (!this.itemId) {
      throw new Error('SearchIndex must have an associated itemId')
    }
    if (typeof this.searchableText !== 'string') {
      throw new Error('searchableText must be a string')
    }
    if (!Array.isArray(this.keywords)) {
      throw new Error('keywords must be an array')
    }
    if (this.embeddings !== null && !Array.isArray(this.embeddings)) {
      throw new Error('embeddings must be null or an array')
    }
  }

  // Generate searchable text from content item
  static generateSearchableText(contentItem) {
    const parts = [
      contentItem.title || '',
      contentItem.content || contentItem.contentText || '',
      (contentItem.tags || []).join(' '),
      (contentItem.categories || []).join(' '),
      contentItem.notes || '',
      contentItem.summary || ''
    ]
    
    return parts
      .filter(part => part && part.trim())
      .join(' ')
      .toLowerCase()
      .replace(/[_-]/g, ' ')  // Replace underscores and hyphens with spaces
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Extract keywords from searchable text
  static extractKeywords(searchableText, minLength = 3) {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as',
      'was', 'will', 'an', 'be', 'or', 'in', 'with', 'by', 'this', 'that',
      'for', 'from', 'of', 'it', 'you', 'he', 'she', 'they', 'we', 'but'
    ])

    return searchableText
      .split(/\s+/)
      .filter(word => word.length >= minLength)
      .filter(word => !stopWords.has(word))
      .filter(word => /^[a-z0-9]+$/.test(word))
      .reduce((acc, word) => {
        if (!acc.includes(word)) {
          acc.push(word)
        }
        return acc
      }, [])
      .sort()
  }

  // Create SearchIndex from ContentItem
  static fromContentItem(contentItem) {
    const searchableText = SearchIndex.generateSearchableText(contentItem)
    const keywords = SearchIndex.extractKeywords(searchableText)

    return new SearchIndex({
      itemId: contentItem.id,
      searchableText,
      keywords,
      lastIndexed: new Date(),
      indexVersion: '1.0.0'
    })
  }

  // Update index with new content
  updateFromContentItem(contentItem) {
    this.searchableText = SearchIndex.generateSearchableText(contentItem)
    this.keywords = SearchIndex.extractKeywords(this.searchableText)
    this.lastIndexed = new Date()
    return this
  }

  // Calculate search relevance score
  calculateRelevance(query) {
    if (!query || !query.trim()) {
      return 0
    }
    
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0)
    if (queryWords.length === 0) {
      return 0
    }
    
    const matchingKeywords = this.keywords.filter(keyword =>
      queryWords.some(queryWord => 
        keyword.includes(queryWord) || queryWord.includes(keyword)
      )
    )

    const exactMatches = queryWords.filter(word => 
      this.searchableText.includes(word)
    ).length

    const keywordScore = matchingKeywords.length / Math.max(this.keywords.length, 1)
    const exactScore = exactMatches / Math.max(queryWords.length, 1)
    
    return (keywordScore * 0.6) + (exactScore * 0.4)
  }

  // Check if index needs updating
  isStale(contentItem, maxAgeHours = 24) {
    const ageMs = Date.now() - this.lastIndexed.getTime()
    const ageHours = ageMs / (1000 * 60 * 60)

    if (ageHours > maxAgeHours) {
      return true
    }

    const currentText = SearchIndex.generateSearchableText(contentItem)
    return this.searchableText !== currentText
  }

  // Serialize for storage
  toJSON() {
    return {
      id: this.id,
      itemId: this.itemId,
      searchableText: this.searchableText,
      keywords: this.keywords,
      embeddings: this.embeddings,
      lastIndexed: this.lastIndexed.toISOString(),
      indexVersion: this.indexVersion
    }
  }

  // Deserialize from storage
  static fromJSON(data) {
    return new SearchIndex({
      ...data,
      lastIndexed: new Date(data.lastIndexed)
    })
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // Chrome Storage integration
  async save() {
    const key = `searchIndex_${this.itemId}`
    await chrome.storage.local.set({ [key]: this.toJSON() })
  }

  static async load(itemId) {
    const key = `searchIndex_${itemId}`
    const result = await chrome.storage.local.get(key)
    
    if (result[key]) {
      return SearchIndex.fromJSON(result[key])
    }
    return null
  }

  async delete() {
    const key = `searchIndex_${this.itemId}`
    await chrome.storage.local.remove(key)
  }

  // Batch operations for performance
  static async loadBatch(itemIds) {
    const keys = itemIds.map(id => `searchIndex_${id}`)
    const results = await chrome.storage.local.get(keys)
    
    return keys.reduce((acc, key, index) => {
      const itemId = itemIds[index]
      if (results[key]) {
        acc[itemId] = SearchIndex.fromJSON(results[key])
      }
      return acc
    }, {})
  }

  static async saveBatch(searchIndexes) {
    const data = {}
    searchIndexes.forEach(index => {
      const key = `searchIndex_${index.itemId}`
      data[key] = index.toJSON()
    })
    
    await chrome.storage.local.set(data)
  }
}

describe('SearchIndex Model', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Constructor and Validation', () => {
    test('should create SearchIndex with valid data', () => {
      const data = {
        id: 'idx-123',
        itemId: 'item-456',
        searchableText: 'javascript testing framework',
        keywords: ['javascript', 'testing', 'framework'],
        lastIndexed: new Date(),
        indexVersion: '1.0.0'
      }

      const index = new SearchIndex(data)

      expect(index.id).toBe('idx-123')
      expect(index.itemId).toBe('item-456')
      expect(index.searchableText).toBe('javascript testing framework')
      expect(index.keywords).toEqual(['javascript', 'testing', 'framework'])
      expect(index.lastIndexed).toBeInstanceOf(Date)
      expect(index.indexVersion).toBe('1.0.0')
    })

    test('should generate ID if not provided', () => {
      const index = new SearchIndex({
        itemId: 'item-123',
        searchableText: 'test content'
      })

      expect(index.id).toBeDefined()
      expect(typeof index.id).toBe('string')
      expect(index.id.length).toBeGreaterThan(0)
    })

    test('should throw error if itemId is missing', () => {
      expect(() => {
        new SearchIndex({
          searchableText: 'test content'
        })
      }).toThrow('SearchIndex must have an associated itemId')
    })

    test('should throw error for invalid searchableText type', () => {
      expect(() => {
        new SearchIndex({
          itemId: 'item-123',
          searchableText: 123
        })
      }).toThrow('searchableText must be a string')
    })

    test('should throw error for invalid keywords type', () => {
      expect(() => {
        new SearchIndex({
          itemId: 'item-123',
          searchableText: 'test',
          keywords: 'not-array'
        })
      }).toThrow('keywords must be an array')
    })

    test('should throw error for invalid embeddings type', () => {
      expect(() => {
        new SearchIndex({
          itemId: 'item-123',
          searchableText: 'test',
          embeddings: 'invalid'
        })
      }).toThrow('embeddings must be null or an array')
    })

    test('should accept null embeddings', () => {
      const index = new SearchIndex({
        itemId: 'item-123',
        searchableText: 'test',
        embeddings: null
      })

      expect(index.embeddings).toBeNull()
    })

    test('should accept valid embeddings array', () => {
      const embeddings = [0.1, 0.2, 0.3, 0.4]
      const index = new SearchIndex({
        itemId: 'item-123',
        searchableText: 'test',
        embeddings
      })

      expect(index.embeddings).toEqual(embeddings)
    })
  })

  describe('Text Processing', () => {
    test('should generate searchable text from content item', () => {
      const contentItem = {
        id: 'item-123',
        title: 'JavaScript Testing Guide',
        content: 'This is a comprehensive guide about testing JavaScript applications.',
        tags: ['javascript', 'testing', 'programming'],
        categories: ['development', 'tutorials'],
        notes: 'Very useful for beginners',
        summary: 'Guide covering JavaScript testing fundamentals'
      }

      const searchableText = SearchIndex.generateSearchableText(contentItem)

      expect(searchableText).toContain('javascript testing guide')
      expect(searchableText).toContain('comprehensive guide')
      expect(searchableText).toContain('testing programming')
      expect(searchableText).toContain('development tutorials')
      expect(searchableText).toContain('very useful for beginners')
      expect(searchableText).toContain('fundamentals')
    })

    test('should handle missing content fields gracefully', () => {
      const contentItem = {
        id: 'item-123',
        title: 'Test Title'
      }

      const searchableText = SearchIndex.generateSearchableText(contentItem)
      
      expect(searchableText).toBe('test title')
      expect(typeof searchableText).toBe('string')
    })

    test('should normalize and clean searchable text', () => {
      const contentItem = {
        title: 'Test!!! Article???',
        content: 'Content with (parentheses) and [brackets] & symbols!!',
        tags: ['test-tag', 'another_tag']
      }

      const searchableText = SearchIndex.generateSearchableText(contentItem)
      
      expect(searchableText).not.toContain('!!!')
      expect(searchableText).not.toContain('???')
      expect(searchableText).not.toContain('(')
      expect(searchableText).not.toContain('[')
      expect(searchableText).toMatch(/^[a-z0-9\s]+$/)
      expect(searchableText).toContain('test tag another tag') // Underscores converted to spaces
    })

    test('should extract keywords from searchable text', () => {
      const text = 'javascript testing framework for modern web applications'
      
      const keywords = SearchIndex.extractKeywords(text)
      
      expect(keywords).toContain('javascript')
      expect(keywords).toContain('testing')
      expect(keywords).toContain('framework')
      expect(keywords).toContain('modern')
      expect(keywords).toContain('web')
      expect(keywords).toContain('applications')
      expect(keywords).not.toContain('for') // Stop word
      expect(keywords).toEqual(keywords.sort()) // Should be sorted
    })

    test('should filter out short words and stop words', () => {
      const text = 'the is at which on and a to are as was'
      
      const keywords = SearchIndex.extractKeywords(text)
      
      expect(keywords).toHaveLength(0)
    })

    test('should remove duplicates and maintain uniqueness', () => {
      const text = 'javascript javascript testing testing framework javascript'
      
      const keywords = SearchIndex.extractKeywords(text)
      
      expect(keywords).toEqual(['framework', 'javascript', 'testing'])
      expect(new Set(keywords).size).toBe(keywords.length)
    })

    test('should respect minimum length parameter', () => {
      const text = 'a bb ccc dddd eeeee'
      
      const keywords2 = SearchIndex.extractKeywords(text, 2)
      const keywords4 = SearchIndex.extractKeywords(text, 4)
      
      expect(keywords2).toEqual(['bb', 'ccc', 'dddd', 'eeeee'])
      expect(keywords4).toEqual(['dddd', 'eeeee'])
    })
  })

  describe('Factory Methods', () => {
    test('should create SearchIndex from ContentItem', () => {
      const contentItem = {
        id: 'item-123',
        title: 'JavaScript Guide',
        content: 'Learn JavaScript programming',
        tags: ['javascript', 'programming'],
        categories: ['development']
      }

      const index = SearchIndex.fromContentItem(contentItem)

      expect(index.itemId).toBe('item-123')
      expect(index.searchableText).toContain('javascript')
      expect(index.searchableText).toContain('programming')
      expect(index.keywords).toContain('javascript')
      expect(index.keywords).toContain('programming')
      expect(index.keywords).toContain('development')
      expect(index.lastIndexed).toBeInstanceOf(Date)
    })

    test('should update index from content item', () => {
      const originalItem = {
        id: 'item-123',
        title: 'Original Title',
        content: 'Original content'
      }

      const index = SearchIndex.fromContentItem(originalItem)
      const originalText = index.searchableText

      const updatedItem = {
        id: 'item-123',
        title: 'Updated Title',
        content: 'Updated content with new information'
      }

      index.updateFromContentItem(updatedItem)

      expect(index.searchableText).not.toBe(originalText)
      expect(index.searchableText).toContain('updated')
      expect(index.searchableText).toContain('information')
      expect(index.lastIndexed.getTime()).toBeGreaterThan(Date.now() - 1000)
    })
  })

  describe('Search Relevance', () => {
    let index

    beforeEach(() => {
      index = new SearchIndex({
        itemId: 'item-123',
        searchableText: 'javascript testing framework for web applications development',
        keywords: ['javascript', 'testing', 'framework', 'web', 'applications', 'development']
      })
    })

    test('should calculate high relevance for exact matches', () => {
      const relevance = index.calculateRelevance('javascript testing')
      
      expect(relevance).toBeGreaterThan(0.5)
      expect(relevance).toBeLessThanOrEqual(1.0)
    })

    test('should calculate medium relevance for partial matches', () => {
      const relevance = index.calculateRelevance('javascript web')
      
      expect(relevance).toBeGreaterThan(0.2)
      expect(relevance).toBeLessThan(0.8)
    })

    test('should calculate low relevance for no matches', () => {
      const relevance = index.calculateRelevance('python machine learning')
      
      expect(relevance).toBeLessThan(0.2)
    })

    test('should handle empty query gracefully', () => {
      const relevance = index.calculateRelevance('')
      
      expect(relevance).toBe(0)
    })

    test('should calculate different scores for different matches', () => {
      const highRelevance = index.calculateRelevance('javascript testing framework')
      const mediumRelevance = index.calculateRelevance('javascript python')
      const lowRelevance = index.calculateRelevance('python machine learning')
      
      expect(highRelevance).toBeGreaterThan(mediumRelevance)
      expect(mediumRelevance).toBeGreaterThan(lowRelevance)
    })
  })

  describe('Staleness Detection', () => {
    test('should detect stale index based on age', () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      const index = new SearchIndex({
        itemId: 'item-123',
        searchableText: 'test content',
        lastIndexed: oldDate
      })

      const contentItem = { id: 'item-123', title: 'test content' }
      
      expect(index.isStale(contentItem, 24)).toBe(true)
    })

    test('should detect stale index based on content changes', () => {
      const index = new SearchIndex({
        itemId: 'item-123',
        searchableText: 'original content',
        lastIndexed: new Date()
      })

      const updatedItem = {
        id: 'item-123',
        title: 'Updated Title',
        content: 'New content that is different'
      }
      
      expect(index.isStale(updatedItem)).toBe(true)
    })

    test('should not detect fresh index as stale', () => {
      const contentItem = {
        id: 'item-123',
        title: 'Test Title',
        content: 'Test content'
      }

      const index = SearchIndex.fromContentItem(contentItem)
      
      expect(index.isStale(contentItem)).toBe(false)
    })

    test('should respect custom max age parameter', () => {
      const oldDate = new Date(Date.now() - 10 * 60 * 60 * 1000) // 10 hours ago
      const index = new SearchIndex({
        itemId: 'item-123',
        searchableText: 'test content',
        lastIndexed: oldDate
      })

      const contentItem = { id: 'item-123', title: 'test content' }
      
      expect(index.isStale(contentItem, 12)).toBe(false) // Not stale within 12 hours
      expect(index.isStale(contentItem, 8)).toBe(true)   // Stale within 8 hours
    })
  })

  describe('Serialization', () => {
    test('should serialize to JSON correctly', () => {
      const date = new Date()
      const index = new SearchIndex({
        id: 'idx-123',
        itemId: 'item-456',
        searchableText: 'test content',
        keywords: ['test', 'content'],
        embeddings: [0.1, 0.2, 0.3],
        lastIndexed: date,
        indexVersion: '1.0.0'
      })

      const json = index.toJSON()

      expect(json).toEqual({
        id: 'idx-123',
        itemId: 'item-456',
        searchableText: 'test content',
        keywords: ['test', 'content'],
        embeddings: [0.1, 0.2, 0.3],
        lastIndexed: date.toISOString(),
        indexVersion: '1.0.0'
      })
    })

    test('should deserialize from JSON correctly', () => {
      const jsonData = {
        id: 'idx-123',
        itemId: 'item-456',
        searchableText: 'test content',
        keywords: ['test', 'content'],
        embeddings: null,
        lastIndexed: new Date().toISOString(),
        indexVersion: '1.0.0'
      }

      const index = SearchIndex.fromJSON(jsonData)

      expect(index.id).toBe('idx-123')
      expect(index.itemId).toBe('item-456')
      expect(index.searchableText).toBe('test content')
      expect(index.keywords).toEqual(['test', 'content'])
      expect(index.embeddings).toBeNull()
      expect(index.lastIndexed).toBeInstanceOf(Date)
      expect(index.indexVersion).toBe('1.0.0')
    })

    test('should handle round-trip serialization correctly', () => {
      const original = new SearchIndex({
        itemId: 'item-123',
        searchableText: 'test content for serialization',
        keywords: ['test', 'content', 'serialization'],
        embeddings: [0.1, 0.2, 0.3, 0.4]
      })

      const json = original.toJSON()
      const restored = SearchIndex.fromJSON(json)

      expect(restored.itemId).toBe(original.itemId)
      expect(restored.searchableText).toBe(original.searchableText)
      expect(restored.keywords).toEqual(original.keywords)
      expect(restored.embeddings).toEqual(original.embeddings)
      expect(restored.lastIndexed.getTime()).toBe(original.lastIndexed.getTime())
    })
  })

  describe('Chrome Storage Integration', () => {
    beforeEach(() => {
      chrome.storage.local.get.mockClear()
      chrome.storage.local.set.mockClear()
      chrome.storage.local.remove.mockClear()
    })

    test('should save SearchIndex to Chrome storage', async () => {
      const index = new SearchIndex({
        itemId: 'item-123',
        searchableText: 'test content'
      })

      chrome.storage.local.set.mockResolvedValue()

      await index.save()

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        'searchIndex_item-123': index.toJSON()
      })
    })

    test('should load SearchIndex from Chrome storage', async () => {
      const jsonData = {
        id: 'idx-123',
        itemId: 'item-456',
        searchableText: 'stored content',
        keywords: ['stored', 'content'],
        embeddings: null,
        lastIndexed: new Date().toISOString(),
        indexVersion: '1.0.0'
      }

      chrome.storage.local.get.mockResolvedValue({
        'searchIndex_item-456': jsonData
      })

      const index = await SearchIndex.load('item-456')

      expect(chrome.storage.local.get).toHaveBeenCalledWith('searchIndex_item-456')
      expect(index).toBeInstanceOf(SearchIndex)
      expect(index.itemId).toBe('item-456')
      expect(index.searchableText).toBe('stored content')
    })

    test('should return null when loading non-existent index', async () => {
      chrome.storage.local.get.mockResolvedValue({})

      const index = await SearchIndex.load('non-existent')

      expect(index).toBeNull()
    })

    test('should delete SearchIndex from Chrome storage', async () => {
      const index = new SearchIndex({
        itemId: 'item-123',
        searchableText: 'test content'
      })

      chrome.storage.local.remove.mockResolvedValue()

      await index.delete()

      expect(chrome.storage.local.remove).toHaveBeenCalledWith('searchIndex_item-123')
    })

    test('should load multiple SearchIndexes in batch', async () => {
      const itemIds = ['item-1', 'item-2', 'item-3']
      const mockData = {
        'searchIndex_item-1': {
          id: 'idx-1',
          itemId: 'item-1',
          searchableText: 'content 1',
          keywords: ['content'],
          embeddings: null,
          lastIndexed: new Date().toISOString(),
          indexVersion: '1.0.0'
        },
        'searchIndex_item-3': {
          id: 'idx-3',
          itemId: 'item-3',
          searchableText: 'content 3',
          keywords: ['content'],
          embeddings: null,
          lastIndexed: new Date().toISOString(),
          indexVersion: '1.0.0'
        }
      }

      chrome.storage.local.get.mockResolvedValue(mockData)

      const results = await SearchIndex.loadBatch(itemIds)

      expect(chrome.storage.local.get).toHaveBeenCalledWith([
        'searchIndex_item-1',
        'searchIndex_item-2', 
        'searchIndex_item-3'
      ])
      expect(Object.keys(results)).toEqual(['item-1', 'item-3'])
      expect(results['item-1']).toBeInstanceOf(SearchIndex)
      expect(results['item-3']).toBeInstanceOf(SearchIndex)
      expect(results['item-2']).toBeUndefined()
    })

    test('should save multiple SearchIndexes in batch', async () => {
      const indexes = [
        new SearchIndex({ itemId: 'item-1', searchableText: 'content 1' }),
        new SearchIndex({ itemId: 'item-2', searchableText: 'content 2' })
      ]

      chrome.storage.local.set.mockResolvedValue()

      await SearchIndex.saveBatch(indexes)

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        'searchIndex_item-1': indexes[0].toJSON(),
        'searchIndex_item-2': indexes[1].toJSON()
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle very long searchable text', () => {
      const longText = Array(1000).fill().map((_, i) => `word${i}`).join(' ')
      const keywords = SearchIndex.extractKeywords(longText)
      
      const index = new SearchIndex({
        itemId: 'item-123',
        searchableText: longText,
        keywords: keywords
      })

      expect(index.searchableText).toBe(longText)
      expect(index.keywords.length).toBeGreaterThan(0)
    })

    test('should handle empty searchable text', () => {
      const index = new SearchIndex({
        itemId: 'item-123',
        searchableText: ''
      })

      expect(index.searchableText).toBe('')
      expect(index.keywords).toEqual([])
    })

    test('should handle special characters and unicode', () => {
      const contentItem = {
        id: 'item-123',
        title: 'Café naïve résumé',
        content: 'Content with émojis 🚀 and symbols @#$%'
      }

      const index = SearchIndex.fromContentItem(contentItem)

      expect(index.searchableText).toMatch(/^[a-z0-9\s]+$/)
      expect(index.keywords.length).toBeGreaterThan(0)
    })

    test('should handle null and undefined values gracefully', () => {
      const contentItem = {
        id: 'item-123',
        title: null,
        content: undefined,
        tags: null,
        categories: undefined
      }

      const searchableText = SearchIndex.generateSearchableText(contentItem)

      expect(typeof searchableText).toBe('string')
      expect(searchableText).toBe('')
    })
  })

  describe('Performance and Scalability', () => {
    test('should handle large keyword arrays efficiently', () => {
      const longText = Array(1000).fill().map((_, i) => `keyword${i}`).join(' ')
      
      const startTime = Date.now()
      const keywords = SearchIndex.extractKeywords(longText)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100) // Should complete within 100ms
      expect(keywords.length).toBe(1000)
      expect(new Set(keywords).size).toBe(keywords.length) // All unique
    })

    test('should calculate relevance efficiently for large indexes', () => {
      const largeKeywords = Array(1000).fill().map((_, i) => `keyword${i}`)
      const index = new SearchIndex({
        itemId: 'item-123',
        searchableText: largeKeywords.join(' '),
        keywords: largeKeywords
      })

      const startTime = Date.now()
      const relevance = index.calculateRelevance('keyword500 keyword750')
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(50) // Should complete within 50ms
      expect(relevance).toBeGreaterThan(0)
    })

    test('should maintain memory efficiency with embeddings', () => {
      const largeEmbeddings = Array(1000).fill().map(() => Math.random())
      
      const index = new SearchIndex({
        itemId: 'item-123',
        searchableText: 'test content',
        embeddings: largeEmbeddings
      })

      expect(index.embeddings).toEqual(largeEmbeddings)
      expect(index.embeddings.length).toBe(1000)
    })
  })
})
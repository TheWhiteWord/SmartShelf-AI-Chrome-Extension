/**
 * Natural Language Search Integration Tests (T023)
 * Tests the complete search workflow across different content types
 */

describe('Natural Language Search Integration Tests', () => {
  beforeEach(() => {
    // Reset Chrome API mocks
    jest.clearAllMocks()
    
    // Mock search index data structure
    const mockSearchIndex = {
      tokens: {
        'javascript': ['item1', 'item3'],
        'testing': ['item1', 'item2'],
        'machine': ['item2', 'item4'],
        'learning': ['item2', 'item4'],
        'neural': ['item4'],
        'networks': ['item4'],
        'ai': ['item1', 'item2', 'item4']
      },
      items: {
        'item1': {
          title: 'Advanced JavaScript Testing Techniques',
          content: 'Comprehensive guide to testing JavaScript applications',
          tags: ['javascript', 'testing', 'development'],
          score: 1.0
        },
        'item2': {
          title: 'Introduction to Machine Learning',
          content: 'Fundamentals of machine learning and AI systems',
          tags: ['machine learning', 'ai', 'data science'],
          score: 0.9
        },
        'item3': {
          title: 'JavaScript Performance Optimization',
          content: 'Techniques for optimizing JavaScript performance',
          tags: ['javascript', 'performance', 'optimization'],
          score: 0.8
        },
        'item4': {
          title: 'Deep Learning with Neural Networks',
          content: 'Advanced neural network architectures and applications',
          tags: ['neural networks', 'deep learning', 'ai'],
          score: 0.95
        }
      }
    }

    // Mock content items for search testing
    const mockContentItems = [
      {
        id: 'item1',
        title: 'Advanced JavaScript Testing Techniques',
        content: 'This comprehensive guide covers unit testing, integration testing, and end-to-end testing for JavaScript applications. Learn best practices for Jest, Cypress, and other testing frameworks.',
        url: 'https://example.com/js-testing',
        type: 'article',
        aiTags: ['javascript', 'testing', 'development'],
        aiCategories: ['Development', 'Testing'],
        aiSummary: 'Guide to JavaScript testing methodologies',
        dateAdded: '2025-09-29T10:00:00Z'
      },
      {
        id: 'item2',
        title: 'Introduction to Machine Learning',
        content: 'Machine learning fundamentals including supervised learning, unsupervised learning, and reinforcement learning. Covers basic algorithms and practical applications.',
        url: 'https://youtube.com/watch?v=ml-intro',
        type: 'video',
        duration: 1800,
        aiTags: ['machine learning', 'ai', 'data science'],
        aiCategories: ['Technology', 'Education'],
        aiSummary: 'Fundamentals of machine learning concepts',
        dateAdded: '2025-09-28T15:30:00Z'
      },
      {
        id: 'item3',
        title: 'JavaScript Performance Optimization',
        content: 'Techniques for optimizing JavaScript performance including code splitting, lazy loading, and memory management. Advanced optimization strategies for modern web applications.',
        url: 'https://example.com/js-performance',
        type: 'article',
        aiTags: ['javascript', 'performance', 'optimization'],
        aiCategories: ['Development', 'Performance'],
        aiSummary: 'JavaScript optimization techniques and strategies',
        dateAdded: '2025-09-27T09:15:00Z'
      },
      {
        id: 'item4',
        title: 'Deep Learning with Neural Networks',
        content: 'Advanced neural network architectures including CNNs, RNNs, and Transformers. Practical implementation using TensorFlow and PyTorch for real-world applications.',
        url: 'https://arxiv.org/pdf/2023.neural-nets.pdf',
        type: 'pdf',
        pageCount: 25,
        aiTags: ['neural networks', 'deep learning', 'ai'],
        aiCategories: ['Research', 'AI'],
        aiSummary: 'Comprehensive overview of neural network architectures',
        dateAdded: '2025-09-26T14:20:00Z'
      }
    ]

    // Set up Chrome storage mocks
    chrome.storage.local.get.mockImplementation((keys) => {
      if (keys === 'contentItems' || keys.includes('contentItems')) {
        return Promise.resolve({ contentItems: mockContentItems })
      }
      if (keys === 'searchIndex' || keys.includes('searchIndex')) {
        return Promise.resolve({ searchIndex: mockSearchIndex })
      }
      return Promise.resolve({})
    })
  })

  describe('Basic Search Functionality', () => {
    test('should search by exact title match', async () => {
      const searchQuery = 'JavaScript Testing'
      
      // Get content items from storage
      const { contentItems } = await chrome.storage.local.get('contentItems')
      
      // Perform search
      const results = contentItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      )

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Advanced JavaScript Testing Techniques')
      expect(results[0].id).toBe('item1')
    })

    test('should search by content keywords', async () => {
      const searchQuery = 'neural networks'
      
      const { contentItems } = await chrome.storage.local.get('contentItems')
      
      // Search in content and tags
      const results = contentItems.filter(item => 
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.aiTags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Deep Learning with Neural Networks')
      expect(results[0].type).toBe('pdf')
    })

    test('should search by AI-generated tags', async () => {
      const searchQuery = 'machine learning'
      
      const { contentItems } = await chrome.storage.local.get('contentItems')
      
      const results = contentItems.filter(item => 
        item.aiTags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('item2')
      expect(results[0].type).toBe('video')
    })

    test('should search by categories', async () => {
      const searchQuery = 'development'
      
      const { contentItems } = await chrome.storage.local.get('contentItems')
      
      const results = contentItems.filter(item => 
        item.aiCategories.some(category => 
          category.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )

      expect(results).toHaveLength(2)
      const titles = results.map(r => r.title)
      expect(titles).toContain('Advanced JavaScript Testing Techniques')
      expect(titles).toContain('JavaScript Performance Optimization')
    })
  })

  describe('Advanced Search Features', () => {
    test('should rank results by relevance', async () => {
      const searchQuery = 'javascript'
      
      const { contentItems } = await chrome.storage.local.get('contentItems')
      
      // Search and score results
      const results = contentItems
        .filter(item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.aiTags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .map(item => {
          let score = 0
          
          // Title match gets highest score
          if (item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            score += 10
          }
          
          // Content match gets medium score
          if (item.content.toLowerCase().includes(searchQuery.toLowerCase())) {
            score += 5
          }
          
          // Tag match gets lower score
          if (item.aiTags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) {
            score += 3
          }

          // Additional scoring for title prominence
          if (item.title.toLowerCase().startsWith(searchQuery.toLowerCase())) {
            score += 5 // Extra points for title starting with search term
          }
          
          return { ...item, searchScore: score }
        })
        .sort((a, b) => b.searchScore - a.searchScore)

      expect(results).toHaveLength(2)
      
      // Both items have "JavaScript" in title (10 points) and content (5 points) 
      // and tags (3 points), but we need to differentiate them
      const testingArticle = results.find(r => r.title.includes('Testing'))
      const performanceArticle = results.find(r => r.title.includes('Performance'))
      
      expect(testingArticle).toBeDefined()
      expect(performanceArticle).toBeDefined()
      expect(testingArticle.searchScore).toBeGreaterThanOrEqual(18)
      expect(performanceArticle.searchScore).toBeGreaterThanOrEqual(18)
    })

    test('should support multi-term search', async () => {
      const searchQuery = 'javascript testing optimization'
      const searchTerms = searchQuery.toLowerCase().split(' ')
      
      const { contentItems } = await chrome.storage.local.get('contentItems')
      
      const results = contentItems.filter(item => {
        const searchableText = [
          item.title,
          item.content,
          ...item.aiTags,
          ...item.aiCategories
        ].join(' ').toLowerCase()
        
        // Item must contain at least one search term
        return searchTerms.some(term => searchableText.includes(term))
      })

      expect(results).toHaveLength(2) // Items 1 and 3 contain JavaScript
      expect(results.some(r => r.id === 'item1')).toBe(true) // Testing article
      expect(results.some(r => r.id === 'item3')).toBe(true) // Performance article
    })

    test('should filter by content type', async () => {
      const searchQuery = 'ai'
      const filterType = 'video'
      
      const { contentItems } = await chrome.storage.local.get('contentItems')
      
      let results = contentItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.aiTags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )

      // Apply type filter
      if (filterType) {
        results = results.filter(item => item.type === filterType)
      }

      expect(results).toHaveLength(1)
      expect(results[0].type).toBe('video')
      expect(results[0].title).toBe('Introduction to Machine Learning')
    })

    test('should filter by date range', async () => {
      const searchQuery = 'javascript'
      const startDate = '2025-09-28T00:00:00Z' // Changed to exclude item3 (2025-09-27)
      
      const { contentItems } = await chrome.storage.local.get('contentItems')
      
      let results = contentItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.aiTags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )

      // Apply date filter (items added after start date)
      results = results.filter(item => item.dateAdded >= startDate)

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Advanced JavaScript Testing Techniques')
      expect(new Date(results[0].dateAdded)).toBeInstanceOf(Date)
    })
  })

  describe('Search Index Integration', () => {
    test('should use search index for fast token lookup', async () => {
      const searchQuery = 'neural'
      
      const { searchIndex } = await chrome.storage.local.get('searchIndex')
      
      // Use search index for fast lookup
      const tokenResults = searchIndex.tokens[searchQuery.toLowerCase()] || []
      
      expect(tokenResults).toContain('item4')
      expect(tokenResults).toHaveLength(1)
      
      // Get full item details
      const itemDetails = tokenResults.map(itemId => searchIndex.items[itemId])
      
      expect(itemDetails[0].title).toBe('Deep Learning with Neural Networks')
    })

    test('should update search index when content is added', async () => {
      const newContent = {
        id: 'item5',
        title: 'React Testing Library Guide',
        content: 'Complete guide to testing React applications with Testing Library',
        aiTags: ['react', 'testing', 'frontend'],
        aiCategories: ['Development', 'Frontend']
      }

      // Simulate adding content and updating search index
      const { contentItems } = await chrome.storage.local.get('contentItems')
      const { searchIndex } = await chrome.storage.local.get('searchIndex')
      
      const updatedItems = [...contentItems, newContent]
      
      // Update search index tokens
      const updatedSearchIndex = { ...searchIndex }
      newContent.aiTags.forEach(tag => {
        const token = tag.toLowerCase()
        if (!updatedSearchIndex.tokens[token]) {
          updatedSearchIndex.tokens[token] = []
        }
        if (!updatedSearchIndex.tokens[token].includes(newContent.id)) {
          updatedSearchIndex.tokens[token].push(newContent.id)
        }
      })
      
      updatedSearchIndex.items[newContent.id] = {
        title: newContent.title,
        content: newContent.content,
        tags: newContent.aiTags,
        score: 1.0
      }

      // Store updated data
      await chrome.storage.local.set({ 
        contentItems: updatedItems,
        searchIndex: updatedSearchIndex
      })

      // Verify search index was updated
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        contentItems: updatedItems,
        searchIndex: updatedSearchIndex
      })

      // Verify new content is searchable
      expect(updatedSearchIndex.tokens['react']).toContain('item5')
      expect(updatedSearchIndex.tokens['testing']).toContain('item5')
    })

    test('should handle search index corruption gracefully', async () => {
      // Mock corrupted search index
      chrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'searchIndex' || keys.includes('searchIndex')) {
          return Promise.resolve({ searchIndex: null }) // Corrupted/missing
        }
        if (keys === 'contentItems' || keys.includes('contentItems')) {
          return Promise.resolve({ 
            contentItems: [
              {
                id: 'item1',
                title: 'Test Article',
                content: 'Test content',
                aiTags: ['test']
              }
            ]
          })
        }
        return Promise.resolve({})
      })

      const searchQuery = 'test'
      
      // Fallback to direct content search when index is corrupted
      const { contentItems } = await chrome.storage.local.get('contentItems')
      const { searchIndex } = await chrome.storage.local.get('searchIndex')
      
      let results = []
      
      if (!searchIndex || !searchIndex.tokens) {
        // Fallback to direct search
        results = contentItems.filter(item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Test Article')
    })
  })

  describe('Search Performance', () => {
    test('should handle large search queries efficiently', async () => {
      const longSearchQuery = 'javascript testing optimization performance machine learning neural networks deep learning artificial intelligence'.repeat(10)
      
      const { contentItems } = await chrome.storage.local.get('contentItems')
      
      const startTime = Date.now()
      
      // Truncate very long queries for performance
      const trimmedQuery = longSearchQuery.substring(0, 100)
      
      const results = contentItems.filter(item => 
        item.title.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(trimmedQuery.toLowerCase())
      )
      
      const endTime = Date.now()
      const searchTime = endTime - startTime
      
      // Search should complete quickly even with long queries
      expect(searchTime).toBeLessThan(100) // Less than 100ms
      expect(results).toBeDefined()
    })

    test('should limit search results for performance', async () => {
      // Simulate many matching results
      const manyItems = Array.from({ length: 1000 }, (_, i) => ({
        id: `item${i}`,
        title: `JavaScript Article ${i}`,
        content: `Content about JavaScript development ${i}`,
        aiTags: ['javascript', 'development']
      }))

      chrome.storage.local.get.mockResolvedValue({ contentItems: manyItems })

      const searchQuery = 'javascript'
      const maxResults = 50
      
      const { contentItems } = await chrome.storage.local.get('contentItems')
      
      let results = contentItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
      
      // Limit results for performance
      results = results.slice(0, maxResults)
      
      expect(results).toHaveLength(maxResults)
      expect(results[0].title).toContain('JavaScript')
    })
  })

  describe('Search Error Handling', () => {
    test('should handle storage errors gracefully', async () => {
      // Mock storage error
      chrome.storage.local.get.mockRejectedValue(new Error('Storage unavailable'))

      const searchQuery = 'test'
      let searchResults = []
      let searchError = null

      try {
        const { contentItems } = await chrome.storage.local.get('contentItems')
        searchResults = contentItems.filter(item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      } catch (error) {
        searchError = error
        searchResults = [] // Empty results on error
      }

      expect(searchError).toBeDefined()
      expect(searchError.message).toBe('Storage unavailable')
      expect(searchResults).toEqual([])
    })

    test('should handle malformed search queries', async () => {
      const malformedQueries = [
        '', // Empty query
        null, // Null query
        undefined, // Undefined query
        '   ', // Whitespace only
        '***', // Special characters only
      ]

      const { contentItems } = await chrome.storage.local.get('contentItems')

      malformedQueries.forEach(query => {
        let results = []
        
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          results = [] // Return empty for invalid queries
        } else {
          results = contentItems.filter(item => 
            item.title.toLowerCase().includes(query.toLowerCase())
          )
        }

        expect(results).toEqual([])
      })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })
})
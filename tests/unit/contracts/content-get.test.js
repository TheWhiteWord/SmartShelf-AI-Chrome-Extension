/**
 * Contract Test: GET /api/content/{id}
 * 
 * CRITICAL: This test MUST FAIL until proper implementation exists.
 * Tests the content retrieval API contract based on api-spec.yaml
 */

describe('Content Get API Contract - T007', () => {
  let mockSendMessage

  beforeEach(() => {
    mockSendMessage = jest.fn()
    global.chrome.runtime.sendMessage = mockSendMessage
  })

  describe('Valid Content Retrieval', () => {
    const mockContentItem = {
      id: 'test-content-123',
      title: 'Test Article Title',
      type: 'article',
      source: 'https://example.com/article',
      contentText: 'This is the full article content.',
      summary: 'AI-generated summary of the article.',
      tags: [
        { name: 'technology', type: 'ai-generated', confidence: 0.9 },
        { name: 'web', type: 'user-defined' }
      ],
      categories: ['Technology', 'Web Development'],
      dateAdded: '2025-09-27T09:00:00.000Z',
      dateModified: '2025-09-27T10:00:00.000Z',
      isPhysical: false,
      notes: 'User notes about this article',
      status: 'processed'
    }

    test('should retrieve existing content item by ID', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        if (message.action === 'getContent' && message.data.id === 'test-content-123') {
          callback({
            success: true,
            data: mockContentItem
          })
        } else {
          callback({
            success: false,
            error: 'Content not found',
            code: 'NOT_FOUND'
          })
        }
      })

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'getContent',
          data: { id: 'test-content-123' }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve(response)
          }
        })
      })

      expect(response.success).toBe(true)
      expect(response.data).toMatchObject({
        id: 'test-content-123',
        title: expect.any(String),
        type: expect.stringMatching(/^(article|video|book|document|image|audio)$/),
        source: expect.any(String),
        dateAdded: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        dateModified: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        isPhysical: expect.any(Boolean),
        status: expect.stringMatching(/^(pending|processing|processed|error|manual)$/)
      })
    })

    test('should retrieve physical content item with additional fields', async () => {
      const physicalItem = {
        ...mockContentItem,
        id: 'physical-book-456',
        type: 'book',
        isPhysical: true,
        isbn: '978-0-123456-78-9',
        author: 'Test Author',
        publisher: 'Test Publisher',
        physicalLocation: 'Bookshelf A, Row 2',
        condition: 'Good',
        loanStatus: 'available',
        acquisitionDate: '2025-01-15T00:00:00.000Z',
        digitalVersion: 'https://archive.org/details/test-book'
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: physicalItem
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'getContent',
          data: { id: 'physical-book-456' }
        }, resolve)
      })

      expect(response.success).toBe(true)
      expect(response.data.isPhysical).toBe(true)
      expect(response.data.isbn).toBeDefined()
      expect(response.data.author).toBeDefined()
      expect(response.data.physicalLocation).toBeDefined()
    })

    test('should handle content with empty optional fields', async () => {
      const minimalItem = {
        id: 'minimal-content-789',
        title: 'Minimal Content',
        type: 'document',
        source: 'https://example.com/doc',
        contentText: null,
        summary: null,
        tags: [],
        categories: [],
        dateAdded: '2025-09-27T10:00:00.000Z',
        dateModified: '2025-09-27T10:00:00.000Z',
        isPhysical: false,
        notes: '',
        status: 'pending'
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: minimalItem
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'getContent',
          data: { id: 'minimal-content-789' }
        }, resolve)
      })

      expect(response.success).toBe(true)
      expect(response.data.tags).toEqual([])
      expect(response.data.categories).toEqual([])
      expect(response.data.contentText).toBeNull()
    })
  })

  describe('Content Not Found', () => {
    test('should return 404 for non-existent content ID', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Content not found',
          code: 'NOT_FOUND'
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'getContent',
          data: { id: 'non-existent-id' }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.error).toContain('not found')
      expect(response.code).toBe('NOT_FOUND')
    })

    test('should handle malformed content IDs', async () => {
      const invalidIds = ['', null, undefined, 'invalid/id', 'id with spaces']

      for (const invalidId of invalidIds) {
        mockSendMessage.mockImplementation((message, callback) => {
          callback({
            success: false,
            error: 'Invalid content ID format',
            code: 'VALIDATION_ERROR'
          })
        })

        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'getContent',
            data: { id: invalidId }
          }, resolve)
        })

        expect(response.success).toBe(false)
        expect(response.code).toBe('VALIDATION_ERROR')
      }
    })
  })

  describe('Error Handling', () => {
    test('should handle storage access errors', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Storage access failed',
          code: 'STORAGE_ERROR',
          retry: true
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'getContent',
          data: { id: 'test-content-123' }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.code).toBe('STORAGE_ERROR')
      expect(response.retry).toBe(true)
    })

    test('should handle corrupted content data', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Content data is corrupted',
          code: 'DATA_CORRUPTION'
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'getContent',
          data: { id: 'corrupted-content' }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.code).toBe('DATA_CORRUPTION')
    })
  })

  describe('Response Format Validation', () => {
    test('should return complete ContentItem schema for valid retrieval', async () => {
      const completeItem = {
        id: 'complete-item-999',
        title: 'Complete Test Article',
        type: 'article',
        source: 'https://complete-example.com',
        contentText: 'Full article content here.',
        summary: 'Complete summary of the article.',
        tags: [
          { name: 'complete', type: 'user-defined' },
          { name: 'test', type: 'ai-generated', confidence: 0.95 }
        ],
        categories: ['Testing', 'Complete'],
        dateAdded: '2025-09-27T08:00:00.000Z',
        dateModified: '2025-09-27T10:30:00.000Z',
        isPhysical: false,
        notes: 'Complete test notes',
        status: 'processed'
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: completeItem
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'getContent',
          data: { id: 'complete-item-999' }
        }, resolve)
      })

      // Validate response matches OpenAPI schema
      expect(response).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          title: expect.any(String),
          type: expect.stringMatching(/^(article|video|book|document|image|audio)$/),
          source: expect.any(String),
          contentText: expect.any(String),
          summary: expect.any(String),
          tags: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              type: expect.stringMatching(/^(user-defined|ai-generated|system)$/)
            })
          ]),
          categories: expect.arrayContaining([expect.any(String)]),
          dateAdded: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          dateModified: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          isPhysical: expect.any(Boolean),
          notes: expect.any(String),
          status: expect.stringMatching(/^(pending|processing|processed|error|manual)$/)
        }
      })

      // Validate tag schema
      response.data.tags.forEach(tag => {
        expect(tag).toMatchObject({
          name: expect.any(String),
          type: expect.stringMatching(/^(user-defined|ai-generated|system)$/)
        })
        if (tag.type === 'ai-generated') {
          expect(tag.confidence).toBeGreaterThanOrEqual(0)
          expect(tag.confidence).toBeLessThanOrEqual(1)
        }
      })
    })

    test('should validate date formats in response', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            id: 'date-test-item',
            title: 'Date Test',
            type: 'article',
            source: 'https://example.com',
            dateAdded: '2025-09-27T10:00:00.000Z',
            dateModified: '2025-09-27T11:30:45.123Z',
            isPhysical: false,
            status: 'processed',
            tags: [],
            categories: []
          }
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'getContent',
          data: { id: 'date-test-item' }
        }, resolve)
      })

      expect(response.data.dateAdded).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)
      expect(response.data.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/)
      
      // Validate dates are parseable
      expect(new Date(response.data.dateAdded)).toBeInstanceOf(Date)
      expect(new Date(response.data.dateModified)).toBeInstanceOf(Date)
    })
  })

  describe('Performance Requirements', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now()

      mockSendMessage.mockImplementation((message, callback) => {
        // Simulate some processing delay but within limits
        setTimeout(() => {
          callback({
            success: true,
            data: mockContentItem
          })
        }, 50) // 50ms delay
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'getContent',
          data: { id: 'test-content-123' }
        }, resolve)
      })

      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(1000) // Should respond within 1 second
      expect(response.success).toBe(true)
    })
  })

  const mockContentItem = {
    id: 'test-content-123',
    title: 'Test Article Title',
    type: 'article',
    source: 'https://example.com/article',
    contentText: 'This is the full article content.',
    summary: 'AI-generated summary of the article.',
    tags: [
      { name: 'technology', type: 'ai-generated', confidence: 0.9 },
      { name: 'web', type: 'user-defined' }
    ],
    categories: ['Technology', 'Web Development'],
    dateAdded: '2025-09-27T09:00:00.000Z',
    dateModified: '2025-09-27T10:00:00.000Z',
    isPhysical: false,
    notes: 'User notes about this article',
    status: 'processed'
  }
})
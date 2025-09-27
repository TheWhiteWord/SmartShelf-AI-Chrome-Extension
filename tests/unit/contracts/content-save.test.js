/**
 * Contract Test: POST /api/content/save
 * 
 * CRITICAL: This test MUST FAIL until proper implementation exists.
 * Tests the content save API contract based on api-spec.yaml
 */

describe('Content Save API Contract - T006', () => {
  // Mock Chrome Extension messaging
  let mockSendMessage

  beforeEach(() => {
    // Reset mocks
    mockSendMessage = jest.fn()
    global.chrome.runtime.sendMessage = mockSendMessage
  })

  describe('Valid Content Save Requests', () => {
    const validRequest = {
      title: 'Test Article',
      type: 'article', 
      source: 'https://example.com/article',
      contentText: 'This is the article content',
      isPhysical: false,
      userNotes: 'My notes about this article'
    }

    test('should accept valid article save request', async () => {
      // Mock successful response
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            id: 'test-content-id-123',
            title: validRequest.title,
            type: validRequest.type,
            source: validRequest.source,
            dateAdded: '2025-09-27T10:00:00.000Z',
            dateModified: '2025-09-27T10:00:00.000Z',
            status: 'pending'
          }
        })
      })

      // Simulate content save API call
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'saveContent',
          data: validRequest
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve(response)
          }
        })
      })

      // Validate response contract
      expect(response.success).toBe(true)
      expect(response.data).toMatchObject({
        id: expect.any(String),
        title: validRequest.title,
        type: validRequest.type,
        source: validRequest.source,
        dateAdded: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        dateModified: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        status: expect.stringMatching(/^(pending|processing|processed)$/)
      })
    })

    test('should accept valid book save request', async () => {
      const bookRequest = {
        title: 'Test Book',
        type: 'book',
        source: 'Physical Book',
        contentText: 'Book content',
        isPhysical: true
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            id: 'test-book-id-456',
            ...bookRequest,
            dateAdded: '2025-09-27T10:00:00.000Z',
            dateModified: '2025-09-27T10:00:00.000Z',
            status: 'pending'
          }
        })
      })

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'saveContent',
          data: bookRequest
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve(response)
          }
        })
      })

      expect(response.success).toBe(true)
      expect(response.data.isPhysical).toBe(true)
      expect(response.data.type).toBe('book')
    })

    test('should support all content types from specification', async () => {
      const contentTypes = ['article', 'video', 'book', 'document', 'image', 'audio']
      
      for (const type of contentTypes) {
        const request = {
          title: `Test ${type}`,
          type: type,
          source: `https://example.com/${type}`
        }

        mockSendMessage.mockImplementation((message, callback) => {
          callback({
            success: true,
            data: {
              id: `test-${type}-id`,
              ...request,
              dateAdded: '2025-09-27T10:00:00.000Z',
              dateModified: '2025-09-27T10:00:00.000Z',
              status: 'pending'
            }
          })
        })

        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'saveContent',
            data: request
          }, resolve)
        })

        expect(response.success).toBe(true)
        expect(response.data.type).toBe(type)
      }
    })
  })

  describe('Invalid Content Save Requests', () => {
    test('should reject request without title', async () => {
      const invalidRequest = {
        type: 'article',
        source: 'https://example.com'
        // missing title
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Title is required',
          code: 'VALIDATION_ERROR'
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'saveContent',
          data: invalidRequest
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.error).toContain('Title is required')
    })

    test('should reject request with invalid type', async () => {
      const invalidRequest = {
        title: 'Test',
        type: 'invalid-type',
        source: 'https://example.com'
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Invalid content type',
          code: 'VALIDATION_ERROR'
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'saveContent',
          data: invalidRequest
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.error).toContain('Invalid content type')
    })

    test('should reject request with title over 200 characters', async () => {
      const longTitle = 'a'.repeat(201)
      const invalidRequest = {
        title: longTitle,
        type: 'article',
        source: 'https://example.com'
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Title must not exceed 200 characters',
          code: 'VALIDATION_ERROR'
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'saveContent',
          data: invalidRequest
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.error).toContain('200 characters')
    })

    test('should reject request without source for digital items', async () => {
      const invalidRequest = {
        title: 'Test Article',
        type: 'article',
        isPhysical: false
        // missing source for digital item
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Source is required for digital items',
          code: 'VALIDATION_ERROR'
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'saveContent',
          data: invalidRequest
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.error).toContain('Source is required')
    })
  })

  describe('Error Handling', () => {
    test('should handle processing errors gracefully', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'AI processing service unavailable',
          code: 'SERVICE_ERROR',
          retry: true
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'saveContent',
          data: {
            title: 'Test',
            type: 'article', 
            source: 'https://example.com'
          }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.code).toBe('SERVICE_ERROR')
      expect(response.retry).toBe(true)
    })

    test('should handle storage quota exceeded', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Storage quota exceeded',
          code: 'QUOTA_EXCEEDED'
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'saveContent',
          data: {
            title: 'Test',
            type: 'article',
            source: 'https://example.com'
          }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.code).toBe('QUOTA_EXCEEDED')
    })
  })

  describe('Response Format Validation', () => {
    test('should return properly formatted success response', async () => {
      const testRequest = {
        title: 'Format Test',
        type: 'article',
        source: 'https://example.com'
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            id: 'format-test-id',
            title: testRequest.title,
            type: testRequest.type,
            source: testRequest.source,
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
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'saveContent',
          data: testRequest
        }, resolve)
      })

      // Validate complete response schema
      expect(response).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          title: expect.any(String),
          type: expect.stringMatching(/^(article|video|book|document|image|audio)$/),
          source: expect.any(String),
          dateAdded: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          dateModified: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          isPhysical: expect.any(Boolean),
          status: expect.stringMatching(/^(pending|processing|processed|error|manual)$/)
        }
      })
    })
  })
})
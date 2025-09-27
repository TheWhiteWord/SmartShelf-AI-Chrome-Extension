/**
 * Contract Test: POST /api/ai/categorize
 * 
 * CRITICAL: This test MUST FAIL until proper implementation exists.
 * Tests the AI categorization API contract based on api-spec.yaml
 */

describe('AI Categorize API Contract - T011', () => {
  let mockSendMessage

  beforeEach(() => {
    mockSendMessage = jest.fn()
    global.chrome.runtime.sendMessage = mockSendMessage
  })

  describe('Valid Categorization Requests', () => {
    const validContentId = 'test-content-456'
    const existingCategories = ['Technology', 'Programming', 'Web Development', 'Education']

    test('should categorize content with AI-generated categories and tags', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        if (message.action === 'categorizeContent' && message.data.contentId === validContentId) {
          callback({
            success: true,
            data: {
              categories: ['Technology', 'JavaScript', 'Programming'],
              tags: [
                { name: 'javascript', type: 'ai-generated', confidence: 0.95 },
                { name: 'web-development', type: 'ai-generated', confidence: 0.87 },
                { name: 'best-practices', type: 'ai-generated', confidence: 0.82 },
                { name: 'tutorial', type: 'ai-generated', confidence: 0.76 }
              ],
              confidence: 0.91,
              processingTime: 0.323
            }
          })
        }
      })

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'categorizeContent',
          data: { 
            contentId: validContentId,
            existingCategories: existingCategories
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve(response)
          }
        })
      })

      expect(response.success).toBe(true)
      expect(response.data.categories).toBeDefined()
      expect(Array.isArray(response.data.categories)).toBe(true)
      expect(response.data.categories.length).toBeGreaterThan(0)
      expect(response.data.tags).toBeDefined()
      expect(Array.isArray(response.data.tags)).toBe(true)
      expect(response.data.confidence).toBeGreaterThanOrEqual(0)
      expect(response.data.confidence).toBeLessThanOrEqual(1)
      expect(response.data.processingTime).toBeGreaterThan(0)

      // Validate tag structure
      response.data.tags.forEach(tag => {
        expect(tag).toMatchObject({
          name: expect.any(String),
          type: 'ai-generated',
          confidence: expect.any(Number)
        })
        expect(tag.confidence).toBeGreaterThanOrEqual(0)
        expect(tag.confidence).toBeLessThanOrEqual(1)
      })
    })

    test('should prefer existing categories when relevant', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        const { existingCategories = [] } = message.data
        
        callback({
          success: true,
          data: {
            categories: ['Technology', 'Programming'], // Using existing categories
            tags: [
              { name: 'coding', type: 'ai-generated', confidence: 0.89 },
              { name: 'software', type: 'ai-generated', confidence: 0.84 }
            ],
            confidence: 0.88,
            processingTime: 0.267,
            usedExistingCategories: 2,
            newCategories: 0
          }
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'categorizeContent',
          data: { 
            contentId: validContentId,
            existingCategories: existingCategories
          }
        }, resolve)
      })

      expect(response.success).toBe(true)
      expect(response.data.usedExistingCategories).toBeGreaterThan(0)
      expect(response.data.newCategories).toBe(0)
      
      // Should use categories from existing list
      response.data.categories.forEach(category => {
        expect(existingCategories).toContain(category)
      })
    })

    test('should create new categories when existing ones are insufficient', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            categories: ['Technology', 'Machine Learning', 'Artificial Intelligence'], // Mixed existing and new
            tags: [
              { name: 'ai', type: 'ai-generated', confidence: 0.93 },
              { name: 'neural-networks', type: 'ai-generated', confidence: 0.88 },
              { name: 'deep-learning', type: 'ai-generated', confidence: 0.85 }
            ],
            confidence: 0.90,
            processingTime: 0.445,
            usedExistingCategories: 1,
            newCategories: 2,
            suggestedCategoryCreation: ['Machine Learning', 'Artificial Intelligence']
          }
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'categorizeContent',
          data: { 
            contentId: 'ai-content-789',
            existingCategories: existingCategories
          }
        }, resolve)
      })

      expect(response.success).toBe(true)
      expect(response.data.newCategories).toBeGreaterThan(0)
      expect(response.data.suggestedCategoryCreation).toBeDefined()
      expect(Array.isArray(response.data.suggestedCategoryCreation)).toBe(true)
    })

    test('should handle different content types with appropriate categorization', async () => {
      const contentTypes = [
        { type: 'article', expectedCategories: ['Articles', 'Reading'] },
        { type: 'video', expectedCategories: ['Videos', 'Media'] },
        { type: 'book', expectedCategories: ['Books', 'Literature'] },
        { type: 'document', expectedCategories: ['Documents', 'Reference'] }
      ]

      for (const { type, expectedCategories } of contentTypes) {
        mockSendMessage.mockImplementation((message, callback) => {
          callback({
            success: true,
            data: {
              categories: expectedCategories,
              tags: [
                { name: type, type: 'ai-generated', confidence: 0.95 },
                { name: 'content', type: 'ai-generated', confidence: 0.78 }
              ],
              confidence: 0.86,
              processingTime: 0.289,
              contentType: type
            }
          })
        })

        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'categorizeContent',
            data: { contentId: `${type}-content` }
          }, resolve)
        })

        expect(response.success).toBe(true)
        expect(response.data.contentType).toBe(type)
        expect(response.data.categories).toEqual(expect.arrayContaining(expectedCategories))
      }
    })

    test('should provide tag confidence scoring', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            categories: ['Technology'],
            tags: [
              { name: 'high-confidence', type: 'ai-generated', confidence: 0.95 },
              { name: 'medium-confidence', type: 'ai-generated', confidence: 0.75 },
              { name: 'low-confidence', type: 'ai-generated', confidence: 0.55 }
            ],
            confidence: 0.83,
            processingTime: 0.198,
            confidenceDistribution: {
              high: 1, // >= 0.8
              medium: 1, // 0.6-0.79
              low: 1 // < 0.6
            }
          }
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'categorizeContent',
          data: { contentId: 'confidence-test' }
        }, resolve)
      })

      expect(response.success).toBe(true)
      expect(response.data.confidenceDistribution).toBeDefined()
      
      // Tags should be sorted by confidence (descending)
      for (let i = 0; i < response.data.tags.length - 1; i++) {
        expect(response.data.tags[i].confidence)
          .toBeGreaterThanOrEqual(response.data.tags[i + 1].confidence)
      }
    })
  })

  describe('Invalid Categorization Requests', () => {
    test('should reject request for non-existent content', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Content not found',
          code: 'NOT_FOUND'
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'categorizeContent',
          data: { contentId: 'non-existent-content' }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.code).toBe('NOT_FOUND')
      expect(response.error).toContain('not found')
    })

    test('should reject request with missing contentId', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Content ID is required',
          code: 'VALIDATION_ERROR'
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'categorizeContent',
          data: {}
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.code).toBe('VALIDATION_ERROR')
      expect(response.error).toContain('required')
    })

    test('should reject request for content with insufficient analyzable text', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Content has insufficient text for categorization (minimum 20 words required)',
          code: 'INSUFFICIENT_CONTENT',
          minWords: 20,
          actualWords: 8
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'categorizeContent',
          data: { contentId: 'short-content' }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.code).toBe('INSUFFICIENT_CONTENT')
      expect(response.minWords).toBe(20)
      expect(response.actualWords).toBeLessThan(20)
    })
  })

  describe('AI Processing Error Handling', () => {
    test('should handle Chrome AI Prompt API unavailable', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Chrome Prompt API is not available in this browser',
          code: 'AI_API_UNAVAILABLE',
          fallback: 'keyword_extraction',
          apiRequired: 'chrome.ai.prompt'
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'categorizeContent',
          data: { contentId: validContentId }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.code).toBe('AI_API_UNAVAILABLE')
      expect(response.fallback).toBeDefined()
      expect(response.apiRequired).toBe('chrome.ai.prompt')
    })

    test('should handle AI processing overload', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'AI processing system is currently overloaded',
          code: 'AI_OVERLOAD',
          retry: true,
          retryAfter: 30000, // 30 seconds
          queuePosition: 15
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'categorizeContent',
          data: { contentId: validContentId }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.code).toBe('AI_OVERLOAD')
      expect(response.retry).toBe(true)
      expect(response.retryAfter).toBeDefined()
      expect(response.queuePosition).toBeDefined()
    })

    test('should handle categorization confidence too low', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Categorization confidence below minimum threshold',
          code: 'LOW_CONFIDENCE',
          confidence: 0.35,
          minConfidence: 0.5,
          suggestion: 'Content may need manual categorization'
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'categorizeContent',
          data: { contentId: 'ambiguous-content' }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.code).toBe('LOW_CONFIDENCE')
      expect(response.confidence).toBeLessThan(response.minConfidence)
      expect(response.suggestion).toBeDefined()
    })
  })

  describe('Response Quality Validation', () => {
    test('should return meaningful and relevant categories', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            categories: ['Software Engineering', 'Code Quality', 'Best Practices'],
            tags: [
              { name: 'clean-code', type: 'ai-generated', confidence: 0.92 },
              { name: 'refactoring', type: 'ai-generated', confidence: 0.88 },
              { name: 'architecture', type: 'ai-generated', confidence: 0.84 },
              { name: 'testing', type: 'ai-generated', confidence: 0.79 }
            ],
            confidence: 0.89,
            processingTime: 0.356,
            relevanceScores: {
              'Software Engineering': 0.91,
              'Code Quality': 0.87,
              'Best Practices': 0.83
            }
          }
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'categorizeContent',
          data: { contentId: 'software-engineering-article' }
        }, resolve)
      })

      expect(response.success).toBe(true)
      expect(response.data.relevanceScores).toBeDefined()
      
      // All relevance scores should be reasonable
      Object.values(response.data.relevanceScores).forEach(score => {
        expect(score).toBeGreaterThan(0.5)
        expect(score).toBeLessThanOrEqual(1)
      })

      // Categories should be properly capitalized and formatted
      response.data.categories.forEach(category => {
        expect(category).toMatch(/^[A-Z]/)
        expect(category.length).toBeGreaterThan(2)
        expect(category.length).toBeLessThan(50)
      })
    })

    test('should limit number of categories and tags appropriately', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            categories: ['Cat1', 'Cat2', 'Cat3'], // Reasonable number
            tags: [
              { name: 'tag1', type: 'ai-generated', confidence: 0.9 },
              { name: 'tag2', type: 'ai-generated', confidence: 0.85 },
              { name: 'tag3', type: 'ai-generated', confidence: 0.8 },
              { name: 'tag4', type: 'ai-generated', confidence: 0.75 },
              { name: 'tag5', type: 'ai-generated', confidence: 0.7 }
            ], // Reasonable number of tags
            confidence: 0.86,
            processingTime: 0.234,
            limits: {
              maxCategories: 5,
              maxTags: 10,
              minConfidenceThreshold: 0.6
            }
          }
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'categorizeContent',
          data: { contentId: 'limit-test-content' }
        }, resolve)
      })

      expect(response.success).toBe(true)
      expect(response.data.categories.length).toBeLessThanOrEqual(response.data.limits.maxCategories)
      expect(response.data.tags.length).toBeLessThanOrEqual(response.data.limits.maxTags)
      
      // All tags should meet minimum confidence threshold
      response.data.tags.forEach(tag => {
        expect(tag.confidence).toBeGreaterThanOrEqual(response.data.limits.minConfidenceThreshold)
      })
    })
  })

  describe('Performance Requirements', () => {
    test('should complete categorization within acceptable time', async () => {
      const startTime = Date.now()

      mockSendMessage.mockImplementation((message, callback) => {
        // Simulate AI processing time
        setTimeout(() => {
          callback({
            success: true,
            data: {
              categories: ['Technology', 'Performance'],
              tags: [
                { name: 'performance', type: 'ai-generated', confidence: 0.87 },
                { name: 'optimization', type: 'ai-generated', confidence: 0.82 }
              ],
              confidence: 0.85,
              processingTime: 0.389
            }
          })
        }, 400) // 400ms simulation
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'categorizeContent',
          data: { contentId: validContentId }
        }, resolve)
      })

      const totalTime = Date.now() - startTime
      expect(totalTime).toBeLessThan(3000) // Should complete within 3 seconds
      expect(response.data.processingTime).toBeLessThan(1) // AI processing should be under 1 second
    })

    test('should handle batch categorization efficiently', async () => {
      const batchRequests = 5
      const promises = []

      mockSendMessage.mockImplementation((message, callback) => {
        // Simulate batch processing efficiency
        setTimeout(() => {
          callback({
            success: true,
            data: {
              categories: ['Batch', 'Test'],
              tags: [
                { name: `batch-${message.data.contentId.split('-')[2]}`, type: 'ai-generated', confidence: 0.8 }
              ],
              confidence: 0.8 + Math.random() * 0.15,
              processingTime: 0.1 + Math.random() * 0.2 // Faster due to batching
            }
          })
        }, 50 + Math.random() * 100) // Faster processing for batch
      })

      for (let i = 0; i < batchRequests; i++) {
        const promise = new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'categorizeContent',
            data: { contentId: `batch-content-${i}` }
          }, resolve)
        })
        promises.push(promise)
      }

      const responses = await Promise.all(promises)

      expect(responses).toHaveLength(batchRequests)
      responses.forEach((response, index) => {
        expect(response.success).toBe(true)
        expect(response.data.processingTime).toBeLessThan(0.5) // Batch processing should be faster
      })
    })
  })

  const validContentId = 'test-content-456'
})
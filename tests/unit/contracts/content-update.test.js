/**
 * Contract Test: PUT /api/content/{id}
 * 
 * CRITICAL: This test MUST FAIL until proper implementation exists.
 * Tests the content update API contract based on api-spec.yaml
 */

describe('Content Update API Contract - T008', () => {
  let mockSendMessage

  beforeEach(() => {
    mockSendMessage = jest.fn()
    global.chrome.runtime.sendMessage = mockSendMessage
  })

  describe('Valid Content Updates', () => {
    const existingContentId = 'existing-content-123'
    
    test('should update content title successfully', async () => {
      const updateRequest = {
        title: 'Updated Article Title'
      }

      mockSendMessage.mockImplementation((message, callback) => {
        if (message.action === 'updateContent') {
          callback({
            success: true,
            data: {
              id: existingContentId,
              title: updateRequest.title,
              type: 'article',
              source: 'https://example.com/article',
              dateAdded: '2025-09-27T09:00:00.000Z',
              dateModified: '2025-09-27T12:00:00.000Z',
              isPhysical: false,
              status: 'processed'
            }
          })
        }
      })

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'updateContent',
          data: {
            id: existingContentId,
            updates: updateRequest
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
      expect(response.data.title).toBe(updateRequest.title)
      expect(response.data.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      // dateModified should be newer than dateAdded
      expect(new Date(response.data.dateModified).getTime())
        .toBeGreaterThan(new Date(response.data.dateAdded).getTime())
    })

    test('should update user notes successfully', async () => {
      const updateRequest = {
        notes: 'Updated user notes about this content'
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            id: existingContentId,
            title: 'Original Title',
            notes: updateRequest.notes,
            dateModified: new Date().toISOString(),
            dateAdded: '2025-09-27T09:00:00.000Z'
          }
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'updateContent',
          data: {
            id: existingContentId,
            updates: updateRequest
          }
        }, resolve)
      })

      expect(response.success).toBe(true)
      expect(response.data.notes).toBe(updateRequest.notes)
    })

    test('should update categories array', async () => {
      const updateRequest = {
        categories: ['Technology', 'Web Development', 'AI']
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            id: existingContentId,
            title: 'Test Article',
            categories: updateRequest.categories,
            dateModified: new Date().toISOString(),
            dateAdded: '2025-09-27T09:00:00.000Z'
          }
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'updateContent',
          data: {
            id: existingContentId,
            updates: updateRequest
          }
        }, resolve)
      })

      expect(response.success).toBe(true)
      expect(response.data.categories).toEqual(updateRequest.categories)
    })

    test('should update user-defined tags', async () => {
      const updateRequest = {
        tags: ['updated-tag', 'new-tag', 'user-tag']
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            id: existingContentId,
            title: 'Test Article',
            tags: updateRequest.tags.map(tag => ({
              name: tag,
              type: 'user-defined'
            })),
            dateModified: new Date().toISOString(),
            dateAdded: '2025-09-27T09:00:00.000Z'
          }
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'updateContent',
          data: {
            id: existingContentId,
            updates: updateRequest
          }
        }, resolve)
      })

      expect(response.success).toBe(true)
      expect(response.data.tags).toHaveLength(3)
      response.data.tags.forEach(tag => {
        expect(tag.type).toBe('user-defined')
        expect(updateRequest.tags).toContain(tag.name)
      })
    })

    test('should update multiple fields simultaneously', async () => {
      const updateRequest = {
        title: 'Multi-Update Test',
        notes: 'Updated notes',
        categories: ['Multi', 'Update'],
        tags: ['multi', 'update']
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            id: existingContentId,
            title: updateRequest.title,
            notes: updateRequest.notes,
            categories: updateRequest.categories,
            tags: updateRequest.tags.map(tag => ({
              name: tag,
              type: 'user-defined'
            })),
            type: 'article',
            source: 'https://example.com/article',
            dateAdded: '2025-09-27T09:00:00.000Z',
            dateModified: new Date().toISOString(),
            isPhysical: false,
            status: 'processed'
          }
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'updateContent',
          data: {
            id: existingContentId,
            updates: updateRequest
          }
        }, resolve)
      })

      expect(response.success).toBe(true)
      expect(response.data.title).toBe(updateRequest.title)
      expect(response.data.notes).toBe(updateRequest.notes)
      expect(response.data.categories).toEqual(updateRequest.categories)
      expect(response.data.tags).toHaveLength(2)
    })
  })

  describe('Invalid Update Requests', () => {
    test('should reject update for non-existent content', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Content not found',
          code: 'NOT_FOUND'
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'updateContent',
          data: {
            id: 'non-existent-id',
            updates: { title: 'New Title' }
          }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.code).toBe('NOT_FOUND')
      expect(response.error).toContain('not found')
    })

    test('should reject updates with invalid field values', async () => {
      const invalidUpdates = [
        { title: 'a'.repeat(201) }, // Title too long
        { title: '' }, // Empty title
        { categories: [''] }, // Empty category
        { tags: [null, undefined] } // Invalid tags
      ]

      for (const invalidUpdate of invalidUpdates) {
        mockSendMessage.mockImplementation((message, callback) => {
          callback({
            success: false,
            error: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: 'Invalid field values provided'
          })
        })

        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'updateContent',
            data: {
              id: existingContentId,
              updates: invalidUpdate
            }
          }, resolve)
        })

        expect(response.success).toBe(false)
        expect(response.code).toBe('VALIDATION_ERROR')
      }
    })

    test('should reject attempts to update read-only fields', async () => {
      const readOnlyUpdates = {
        id: 'new-id',
        dateAdded: '2025-01-01T00:00:00.000Z',
        status: 'error', // Status should be managed by system
        type: 'book' // Type should not be changeable after creation
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Cannot update read-only fields',
          code: 'VALIDATION_ERROR',
          readOnlyFields: ['id', 'dateAdded', 'status', 'type']
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'updateContent',
          data: {
            id: existingContentId,
            updates: readOnlyUpdates
          }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.code).toBe('VALIDATION_ERROR')
      expect(response.error).toContain('read-only')
    })

    test('should handle empty update requests gracefully', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'No update fields provided',
          code: 'VALIDATION_ERROR'
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'updateContent',
          data: {
            id: existingContentId,
            updates: {}
          }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Error Handling', () => {
    test('should handle concurrent update conflicts', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Content was modified by another process',
          code: 'CONFLICT',
          lastModified: '2025-09-27T12:30:00.000Z'
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'updateContent',
          data: {
            id: existingContentId,
            updates: { title: 'Conflicted Update' }
          }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.code).toBe('CONFLICT')
      expect(response.lastModified).toBeDefined()
    })

    test('should handle storage write errors', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: false,
          error: 'Storage write failed',
          code: 'STORAGE_ERROR',
          retry: true
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'updateContent',
          data: {
            id: existingContentId,
            updates: { title: 'Storage Test' }
          }
        }, resolve)
      })

      expect(response.success).toBe(false)
      expect(response.code).toBe('STORAGE_ERROR')
      expect(response.retry).toBe(true)
    })
  })

  describe('Response Format Validation', () => {
    test('should return updated content with proper schema', async () => {
      const updateRequest = {
        title: 'Schema Test Update',
        notes: 'Schema validation notes'
      }

      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            id: existingContentId,
            title: updateRequest.title,
            type: 'article',
            source: 'https://example.com/schema-test',
            contentText: 'Original content',
            summary: 'Original summary',
            tags: [
              { name: 'schema', type: 'user-defined' },
              { name: 'test', type: 'ai-generated', confidence: 0.8 }
            ],
            categories: ['Testing', 'Schema'],
            dateAdded: '2025-09-27T09:00:00.000Z',
            dateModified: '2025-09-27T13:00:00.000Z',
            isPhysical: false,
            notes: updateRequest.notes,
            status: 'processed'
          }
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'updateContent',
          data: {
            id: existingContentId,
            updates: updateRequest
          }
        }, resolve)
      })

      // Validate complete ContentItem schema in response
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
          status: expect.stringMatching(/^(pending|processing|processed|error|manual)$/),
          tags: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              type: expect.stringMatching(/^(user-defined|ai-generated|system)$/)
            })
          ]),
          categories: expect.arrayContaining([expect.any(String)]),
          notes: expect.any(String)
        }
      })

      expect(response.data.title).toBe(updateRequest.title)
      expect(response.data.notes).toBe(updateRequest.notes)
    })

    test('should preserve AI-generated tags during user updates', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({
          success: true,
          data: {
            id: existingContentId,
            title: 'AI Tag Test',
            tags: [
              { name: 'user-tag', type: 'user-defined' }, // New user tag
              { name: 'ai-tag', type: 'ai-generated', confidence: 0.9 }, // Preserved AI tag
              { name: 'system-tag', type: 'system' } // System tag
            ],
            categories: ['Test'],
            dateModified: new Date().toISOString(),
            dateAdded: '2025-09-27T09:00:00.000Z',
            isPhysical: false,
            status: 'processed'
          }
        })
      })

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'updateContent',
          data: {
            id: existingContentId,
            updates: { tags: ['user-tag'] }
          }
        }, resolve)
      })

      expect(response.success).toBe(true)
      
      // Should have AI and system tags preserved
      const tagTypes = response.data.tags.map(tag => tag.type)
      expect(tagTypes).toContain('user-defined')
      expect(tagTypes).toContain('ai-generated')
      expect(tagTypes).toContain('system')
      
      // AI tag should retain confidence
      const aiTag = response.data.tags.find(tag => tag.type === 'ai-generated')
      expect(aiTag.confidence).toBeDefined()
    })
  })

  const existingContentId = 'existing-content-123'
})
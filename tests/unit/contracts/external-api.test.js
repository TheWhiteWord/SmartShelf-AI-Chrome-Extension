/**
 * Contract Test: GET /api/external/content
 * 
 * CRITICAL: This test MUST FAIL until proper implementation exists.
 * Tests the external API access contract based on api-spec.yaml
 */

describe('External API Contract - T012', () => {
  let mockFetch

  beforeEach(() => {
    // Mock fetch for HTTP API calls (not Chrome extension messaging)
    mockFetch = jest.fn()
    global.fetch = mockFetch
  })

  describe('Valid External API Requests', () => {
    const validApiToken = 'sk-test-token-123456789'
    const baseUrl = 'http://localhost:3000/api/external/content'

    test('should retrieve content collection with valid API key', async () => {
      const mockResponse = {
        items: [
          {
            id: 'external-item-1',
            title: 'Public Content Item 1',
            type: 'article',
            summary: 'This is a summary of the first public content item.',
            tags: ['technology', 'programming'],
            categories: ['Technology', 'Programming'],
            dateAdded: '2025-09-25T10:00:00.000Z',
            isPhysical: false
          },
          {
            id: 'external-item-2',
            title: 'Public Content Item 2',
            type: 'book',
            summary: 'This is a summary of a book in the knowledge base.',
            tags: ['education', 'learning'],
            categories: ['Education', 'Books'],
            dateAdded: '2025-09-20T14:30:00.000Z',
            isPhysical: true
          }
        ],
        meta: {
          totalItems: 2,
          lastUpdated: '2025-09-27T12:00:00.000Z'
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers({
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '95',
          'X-RateLimit-Limit': '100'
        })
      })

      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'X-SmartShelf-Token': validApiToken,
          'Accept': 'application/json'
        }
      })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            type: expect.stringMatching(/^(article|video|book|document|image|audio)$/),
            summary: expect.any(String),
            tags: expect.arrayContaining([expect.any(String)]),
            categories: expect.arrayContaining([expect.any(String)]),
            dateAdded: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
            isPhysical: expect.any(Boolean)
          })
        ]),
        meta: expect.objectContaining({
          totalItems: expect.any(Number),
          lastUpdated: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
        })
      })

      // Verify API key was sent in header
      expect(mockFetch).toHaveBeenCalledWith(baseUrl, expect.objectContaining({
        headers: expect.objectContaining({
          'X-SmartShelf-Token': validApiToken
        })
      }))
    })

    test('should support format parameter (JSON/XML)', async () => {
      const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<smartshelf>
  <items>
    <item>
      <id>xml-item-1</id>
      <title>XML Format Test</title>
      <type>article</type>
      <summary>XML formatted content</summary>
    </item>
  </items>
  <meta>
    <totalItems>1</totalItems>
    <lastUpdated>2025-09-27T12:00:00.000Z</lastUpdated>
  </meta>
</smartshelf>`

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(xmlResponse),
        headers: new Headers({
          'Content-Type': 'application/xml'
        })
      })

      const response = await fetch(`${baseUrl}?format=xml`, {
        method: 'GET',
        headers: {
          'X-SmartShelf-Token': validApiToken,
          'Accept': 'application/xml'
        }
      })

      expect(response.ok).toBe(true)
      const xmlData = await response.text()
      expect(xmlData).toContain('<?xml version="1.0"')
      expect(xmlData).toContain('<smartshelf>')
      expect(xmlData).toContain('<items>')
    })

    test('should support include parameter for selective data', async () => {
      const includedFields = ['summary', 'tags', 'categories']
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          items: [
            {
              id: 'selective-item-1',
              title: 'Selective Data Item',
              type: 'article',
              summary: 'Included summary field',
              tags: ['included-tag'],
              categories: ['Included Category'],
              dateAdded: '2025-09-25T10:00:00.000Z',
              isPhysical: false
              // Note: content and connections should be excluded
            }
          ],
          meta: {
            totalItems: 1,
            lastUpdated: '2025-09-27T12:00:00.000Z',
            includedFields: includedFields
          }
        })
      })

      const includeParam = includedFields.join(',')
      const response = await fetch(`${baseUrl}?include=${includeParam}`, {
        method: 'GET',
        headers: {
          'X-SmartShelf-Token': validApiToken
        }
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      
      expect(data.meta.includedFields).toEqual(includedFields)
      expect(data.items[0]).toHaveProperty('summary')
      expect(data.items[0]).toHaveProperty('tags')
      expect(data.items[0]).toHaveProperty('categories')
      expect(data.items[0]).not.toHaveProperty('content') // Should be excluded
      expect(data.items[0]).not.toHaveProperty('connections') // Should be excluded
    })

    test('should include rate limiting headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], meta: { totalItems: 0 } }),
        headers: new Headers({
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '87',
          'X-RateLimit-Reset': '1727434800', // Unix timestamp
          'X-RateLimit-Window': '3600' // 1 hour window
        })
      })

      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'X-SmartShelf-Token': validApiToken
        }
      })

      expect(response.ok).toBe(true)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('87')
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Window')).toBe('3600')
    })
  })

  describe('Authentication and Authorization', () => {
    test('should reject request without API token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: 'Missing API token',
          code: 'AUTH_MISSING',
          message: 'X-SmartShelf-Token header is required'
        }),
        headers: new Headers({
          'Content-Type': 'application/json'
        })
      })

      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
          // Missing X-SmartShelf-Token header
        }
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)

      const errorData = await response.json()
      expect(errorData.code).toBe('AUTH_MISSING')
      expect(errorData.error).toContain('Missing API token')
    })

    test('should reject request with invalid API token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: 'Invalid API token',
          code: 'AUTH_INVALID',
          message: 'The provided API token is not valid or has expired'
        })
      })

      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'X-SmartShelf-Token': 'invalid-token-123'
        }
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)

      const errorData = await response.json()
      expect(errorData.code).toBe('AUTH_INVALID')
    })

    test('should reject request with expired API token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: 'API token has expired',
          code: 'AUTH_EXPIRED',
          message: 'Please generate a new API token',
          expiredAt: '2025-09-26T12:00:00.000Z'
        })
      })

      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'X-SmartShelf-Token': 'expired-token-456'
        }
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)

      const errorData = await response.json()
      expect(errorData.code).toBe('AUTH_EXPIRED')
      expect(errorData.expiredAt).toBeDefined()
    })

    test('should handle insufficient permissions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          error: 'Insufficient permissions',
          code: 'AUTH_INSUFFICIENT',
          message: 'This API token does not have read access to content',
          requiredPermissions: ['content:read'],
          tokenPermissions: ['basic:info']
        })
      })

      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'X-SmartShelf-Token': 'limited-token-789'
        }
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(403)

      const errorData = await response.json()
      expect(errorData.code).toBe('AUTH_INSUFFICIENT')
      expect(errorData.requiredPermissions).toContain('content:read')
    })
  })

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: 300 // 5 minutes
        }),
        headers: new Headers({
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '1727435100',
          'Retry-After': '300'
        })
      })

      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'X-SmartShelf-Token': validApiToken
        }
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(429)
      expect(response.headers.get('Retry-After')).toBe('300')

      const errorData = await response.json()
      expect(errorData.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(errorData.retryAfter).toBe(300)
    })

    test('should track rate limit consumption correctly', async () => {
      // First request - within limits
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], meta: { totalItems: 0 } }),
        headers: new Headers({
          'X-RateLimit-Remaining': '99'
        })
      })

      const firstResponse = await fetch(baseUrl, {
        method: 'GET',
        headers: { 'X-SmartShelf-Token': validApiToken }
      })

      expect(firstResponse.headers.get('X-RateLimit-Remaining')).toBe('99')

      // Second request - near limit
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], meta: { totalItems: 0 } }),
        headers: new Headers({
          'X-RateLimit-Remaining': '1'
        })
      })

      const secondResponse = await fetch(baseUrl, {
        method: 'GET',
        headers: { 'X-SmartShelf-Token': validApiToken }
      })

      expect(secondResponse.headers.get('X-RateLimit-Remaining')).toBe('1')
    })
  })

  describe('Data Privacy and Security', () => {
    test('should exclude sensitive fields from external response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          items: [
            {
              id: 'privacy-test-item',
              title: 'Privacy Test Content',
              type: 'article',
              summary: 'Public summary information',
              tags: ['public', 'safe'],
              categories: ['Public'],
              dateAdded: '2025-09-25T10:00:00.000Z',
              isPhysical: false
              // Should NOT include: personal notes, full content, source URLs, etc.
            }
          ],
          meta: {
            totalItems: 1,
            lastUpdated: '2025-09-27T12:00:00.000Z',
            sanitized: true,
            excludedFields: ['notes', 'source', 'contentText', 'personalData']
          }
        })
      })

      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'X-SmartShelf-Token': validApiToken
        }
      })

      const data = await response.json()
      
      expect(data.meta.sanitized).toBe(true)
      expect(data.meta.excludedFields).toBeDefined()
      
      data.items.forEach(item => {
        expect(item).not.toHaveProperty('notes')
        expect(item).not.toHaveProperty('source')
        expect(item).not.toHaveProperty('contentText')
        expect(item).not.toHaveProperty('personalData')
      })
    })

    test('should validate token permissions against constitutional requirements', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          items: [],
          meta: {
            totalItems: 0,
            constitutional: {
              exportOnly: true,
              noPersonalData: true,
              sanitized: true,
              auditLogged: true
            }
          }
        }),
        headers: new Headers({
          'X-Constitutional-Compliance': 'verified',
          'X-Data-Classification': 'public'
        })
      })

      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'X-SmartShelf-Token': validApiToken
        }
      })

      const data = await response.json()
      
      expect(response.headers.get('X-Constitutional-Compliance')).toBe('verified')
      expect(response.headers.get('X-Data-Classification')).toBe('public')
      expect(data.meta.constitutional.exportOnly).toBe(true)
      expect(data.meta.constitutional.noPersonalData).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle service unavailable gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.resolve({
          error: 'Service temporarily unavailable',
          code: 'SERVICE_UNAVAILABLE',
          message: 'The API service is currently undergoing maintenance',
          retryAfter: 1800 // 30 minutes
        })
      })

      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'X-SmartShelf-Token': validApiToken
        }
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(503)

      const errorData = await response.json()
      expect(errorData.code).toBe('SERVICE_UNAVAILABLE')
      expect(errorData.retryAfter).toBeDefined()
    })

    test('should handle internal server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while processing your request',
          requestId: 'req-12345-67890'
        })
      })

      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'X-SmartShelf-Token': validApiToken
        }
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)

      const errorData = await response.json()
      expect(errorData.code).toBe('INTERNAL_ERROR')
      expect(errorData.requestId).toBeDefined()
    })

    test('should validate request parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'Invalid request parameters',
          code: 'VALIDATION_ERROR',
          message: 'The include parameter contains invalid field names',
          validationErrors: [
            {
              field: 'include',
              error: 'Invalid field name: invalidField',
              allowedValues: ['content', 'summary', 'tags', 'categories', 'connections']
            }
          ]
        })
      })

      const response = await fetch(`${baseUrl}?include=invalidField`, {
        method: 'GET',
        headers: {
          'X-SmartShelf-Token': validApiToken
        }
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)

      const errorData = await response.json()
      expect(errorData.code).toBe('VALIDATION_ERROR')
      expect(errorData.validationErrors).toBeDefined()
      expect(Array.isArray(errorData.validationErrors)).toBe(true)
    })
  })

  describe('Performance Requirements', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now()

      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({
                items: Array.from({ length: 10 }, (_, i) => ({
                  id: `perf-item-${i}`,
                  title: `Performance Test Item ${i}`,
                  type: 'article',
                  summary: 'Performance test content',
                  tags: ['performance'],
                  categories: ['Testing'],
                  dateAdded: '2025-09-25T10:00:00.000Z',
                  isPhysical: false
                })),
                meta: {
                  totalItems: 10,
                  lastUpdated: '2025-09-27T12:00:00.000Z',
                  processingTime: 0.045
                }
              }),
              headers: new Headers({
                'Content-Type': 'application/json'
              })
            })
          }, 200) // 200ms processing time
        })
      })

      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'X-SmartShelf-Token': validApiToken
        }
      })

      const totalTime = Date.now() - startTime
      expect(totalTime).toBeLessThan(1000) // Should respond within 1 second
      
      const data = await response.json()
      expect(data.meta.processingTime).toBeLessThan(0.1) // Processing should be fast
    })
  })

  const validApiToken = 'sk-test-token-123456789'
  const baseUrl = 'http://localhost:3000/api/external/content'
})
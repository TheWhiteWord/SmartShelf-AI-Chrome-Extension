// Export-Only API Gateway Tests
// Comprehensive test suite for constitutional compliance API

const ExportOnlyAPIGateway = require('../../extension/shared/services/export-api-gateway.js')

describe('Export-Only API Gateway', () => {
  let apiGateway
  let mockChromeStorage

  beforeEach(() => {
    // Mock Chrome storage API
    mockChromeStorage = {
      sync: {
        get: jest.fn(),
        set: jest.fn()
      },
      local: {
        get: jest.fn(),
        set: jest.fn()
      }
    }

    global.chrome = {
      storage: mockChromeStorage
    }

    // Mock crypto for secure token generation
    global.crypto = {
      getRandomValues: jest.fn((array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256)
        }
        return array
      })
    }

    apiGateway = new ExportOnlyAPIGateway()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Initialization', () => {
    test('should initialize when API gateway is enabled in settings', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        smartshelfSettings: { apiGatewayEnabled: true }
      })
      mockChromeStorage.local.get.mockResolvedValue({ apiTokens: [] })

      const result = await apiGateway.initialize()

      expect(result).toBe(true)
      expect(apiGateway.isEnabled).toBe(true)
      expect(mockChromeStorage.sync.get).toHaveBeenCalledWith('smartshelfSettings')
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith('apiTokens')
    })

    test('should not initialize when API gateway is disabled', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        smartshelfSettings: { apiGatewayEnabled: false }
      })

      const result = await apiGateway.initialize()

      expect(result).toBe(false)
      expect(apiGateway.isEnabled).toBe(false)
    })

    test('should handle initialization errors gracefully', async () => {
      mockChromeStorage.sync.get.mockRejectedValue(new Error('Storage error'))

      const result = await apiGateway.initialize()

      expect(result).toBe(false)
      expect(apiGateway.isEnabled).toBe(false)
    })
  })

  describe('API Token Management', () => {
    beforeEach(async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        smartshelfSettings: { apiGatewayEnabled: true }
      })
      mockChromeStorage.local.get.mockResolvedValue({ apiTokens: [] })
      mockChromeStorage.local.set.mockResolvedValue()

      await apiGateway.initialize()
    })

    test('should generate secure API token with proper format', async () => {
      const tokenInfo = await apiGateway.generateAPIToken('Test Token', ['read'], null)

      expect(tokenInfo.token).toMatch(/^shs_[a-f0-9]{64}$/)
      expect(tokenInfo.name).toBe('Test Token')
      expect(tokenInfo.permissions).toEqual(['read'])
      expect(apiGateway.apiTokens.has(tokenInfo.tokenId)).toBe(true)
      expect(mockChromeStorage.local.set).toHaveBeenCalled()
    })

    test('should filter permissions to only allow safe operations', async () => {
      const tokenInfo = await apiGateway.generateAPIToken('Test Token', ['read', 'write', 'delete', 'export'], null)

      expect(tokenInfo.permissions).toEqual(['read', 'export']) // Only safe permissions
      expect(tokenInfo.permissions).not.toContain('write')
      expect(tokenInfo.permissions).not.toContain('delete')
    })

    test('should revoke API token successfully', async () => {
      const tokenInfo = await apiGateway.generateAPIToken('Test Token')

      const result = await apiGateway.revokeAPIToken(tokenInfo.tokenId)

      expect(result).toBe(true)
      const tokenData = apiGateway.apiTokens.get(tokenInfo.tokenId)
      expect(tokenData.isActive).toBe(false)
      expect(tokenData.revokedAt).toBeDefined()
    })

    test('should handle revoking non-existent token', async () => {
      const result = await apiGateway.revokeAPIToken('non-existent-token')

      expect(result).toBe(false)
    })
  })

  describe('Request Authentication', () => {
    let validToken

    beforeEach(async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        smartshelfSettings: { apiGatewayEnabled: true }
      })
      mockChromeStorage.local.get.mockResolvedValue({ apiTokens: [] })
      mockChromeStorage.local.set.mockResolvedValue()

      await apiGateway.initialize()

      const tokenInfo = await apiGateway.generateAPIToken('Test Token')
      validToken = tokenInfo.token
    })

    test('should authenticate valid active token', async () => {
      const result = await apiGateway.authenticateRequest(validToken)

      expect(result.isValid).toBe(true)
      expect(result.tokenData).toBeDefined()
      expect(result.tokenData.totalRequests).toBe(1)
      expect(result.tokenData.lastUsed).toBeDefined()
    })

    test('should reject missing token', async () => {
      const result = await apiGateway.authenticateRequest()

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Missing API token')
    })

    test('should reject invalid token', async () => {
      const result = await apiGateway.authenticateRequest('invalid-token')

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Invalid token')
    })

    test('should reject revoked token', async () => {
      const tokenInfo = await apiGateway.generateAPIToken('Test Token')
      await apiGateway.revokeAPIToken(tokenInfo.tokenId)

      const result = await apiGateway.authenticateRequest(tokenInfo.token)

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Token revoked')
    })

    test('should reject expired token', async () => {
      const expiredDate = new Date(Date.now() - 1000) // 1 second ago
      const tokenInfo = await apiGateway.generateAPIToken('Test Token', ['read'], expiredDate)

      const result = await apiGateway.authenticateRequest(tokenInfo.token)

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Token expired')
    })

    test('should reject requests when API gateway is disabled', async () => {
      apiGateway.isEnabled = false

      const result = await apiGateway.authenticateRequest(validToken)

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('API Gateway disabled')
    })
  })

  describe('Rate Limiting', () => {
    let validToken

    beforeEach(async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        smartshelfSettings: { apiGatewayEnabled: true }
      })
      mockChromeStorage.local.get.mockResolvedValue({ apiTokens: [] })
      mockChromeStorage.local.set.mockResolvedValue()

      await apiGateway.initialize()

      const tokenInfo = await apiGateway.generateAPIToken('Test Token')
      validToken = tokenInfo.token
    })

    test('should allow requests within rate limit', () => {
      const result = apiGateway.checkRateLimit(validToken)

      expect(result.allowed).toBe(true)
      expect(result.remainingRequests).toBe(99) // Default limit is 100
    })

    test('should track request timestamps correctly', () => {
      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        apiGateway.checkRateLimit(validToken)
      }

      const result = apiGateway.checkRateLimit(validToken)
      expect(result.remainingRequests).toBe(94) // 100 - 6 requests
    })

    test('should reject requests when rate limit exceeded', () => {
      const tokenData = apiGateway.apiTokens.get(validToken)
      tokenData.rateLimitPerHour = 2 // Set very low limit

      // Make requests up to limit
      apiGateway.checkRateLimit(validToken)
      apiGateway.checkRateLimit(validToken)

      // This should be rejected
      const result = apiGateway.checkRateLimit(validToken)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Rate limit exceeded')
    })
  })

  describe('API Endpoints - Constitutional Compliance', () => {
    let validToken

    beforeEach(async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        smartshelfSettings: { apiGatewayEnabled: true }
      })
      mockChromeStorage.local.get.mockResolvedValue({ apiTokens: [] })
      mockChromeStorage.local.set.mockResolvedValue()

      await apiGateway.initialize()

      const tokenInfo = await apiGateway.generateAPIToken('Test Token', ['read', 'export'])
      validToken = tokenInfo.token
    })

    test('should only allow read-only endpoints', async () => {
      const allowedEndpoints = [
        '/api/export/collection',
        '/api/export/items',
        '/api/export/categories',
        '/api/export/stats'
      ]

      for (const endpoint of allowedEndpoints) {
        expect(apiGateway.allowedEndpoints).toContain(endpoint)
      }

      // Verify no write/modify endpoints are allowed
      const forbiddenEndpoints = [
        '/api/items/create',
        '/api/items/update',
        '/api/items/delete',
        '/api/collections/modify',
        '/api/admin'
      ]

      for (const endpoint of forbiddenEndpoints) {
        expect(apiGateway.allowedEndpoints).not.toContain(endpoint)
      }
    })

    test('should reject unauthorized endpoints', async () => {
      const response = await apiGateway.processAPIRequest('/api/admin/delete', validToken, {})

      expect(response.success).toBe(false)
      expect(response.error.status).toBe(404)
      expect(response.error.message).toBe('Not Found')
    })

    test('should export collection data with sanitization', async () => {
      // Mock storage data
      const mockContentItems = [
        {
          id: 'item1',
          title: 'Test Article',
          content: 'Sensitive content that should be sanitized',
          personalNotes: 'Private notes',
          summary: 'Public summary',
          tags: ['test', 'example'],
          categories: ['Technology'],
          dateAdded: '2023-01-01T00:00:00Z',
          isPhysical: false,
          type: 'article',
          status: 'processed'
        }
      ]

      mockChromeStorage.local.get.mockResolvedValue({
        contentItems: mockContentItems,
        collections: [],
        connections: []
      })

      const response = await apiGateway.processAPIRequest('/api/export/collection', validToken, {
        include: 'summary,tags,categories'
      })

      expect(response.success).toBe(true)
      expect(response.data.items).toHaveLength(1)

      const exportedItem = response.data.items[0]

      // Verify sanitization - sensitive data excluded
      expect(exportedItem.personalNotes).toBeUndefined()
      expect(exportedItem.content).toBeUndefined()

      // Verify included safe fields
      expect(exportedItem.title).toBe('Test Article')
      expect(exportedItem.summary).toBe('Public summary')
      expect(exportedItem.tags).toEqual(['test', 'example'])
      expect(exportedItem.categories).toEqual(['Technology'])

      // Verify metadata
      expect(response.data.metadata).toBeDefined()
      expect(response.data.metadata.exportDate).toBeDefined()
      expect(response.data.metadata.totalItems).toBe(1)
    })

    test('should limit export results for performance', async () => {
      const manyItems = Array.from({ length: 1500 }, (_, i) => ({
        id: `item${i}`,
        title: `Item ${i}`,
        summary: 'Test summary',
        dateAdded: '2023-01-01T00:00:00Z',
        isPhysical: false,
        type: 'article',
        status: 'processed'
      }))

      mockChromeStorage.local.get.mockResolvedValue({
        contentItems: manyItems,
        collections: [],
        connections: []
      })

      const response = await apiGateway.processAPIRequest('/api/export/collection', validToken, {
        limit: '2000' // Try to request more than max allowed
      })

      expect(response.success).toBe(true)
      expect(response.data.items).toHaveLength(1000) // Should be capped at 1000
      expect(response.data.metadata.totalItems).toBe(1500)
      expect(response.data.metadata.exportedItems).toBe(1000)
    })

    test('should export statistics without revealing sensitive data', async () => {
      mockChromeStorage.local.get.mockResolvedValue({
        contentItems: [
          { id: '1', type: 'article', status: 'processed', dateAdded: '2023-01-01' },
          { id: '2', type: 'video', status: 'processed', dateAdded: '2023-01-02' }
        ],
        collections: [{ id: 'c1', name: 'Test Collection' }],
        connections: [{ id: 'conn1', strength: 0.8 }]
      })

      const response = await apiGateway.processAPIRequest('/api/export/stats', validToken, {})

      expect(response.success).toBe(true)
      expect(response.data.overview.totalItems).toBe(2)
      expect(response.data.overview.totalCollections).toBe(1)
      expect(response.data.contentTypes.article).toBe(1)
      expect(response.data.contentTypes.video).toBe(1)

      // Verify no sensitive internal data is exposed
      expect(response.data.internalUserData).toBeUndefined()
      expect(response.data.systemPaths).toBeUndefined()
    })
  })

  describe('Data Sanitization - Privacy Protection', () => {
    test('should sanitize items for export by removing sensitive fields', () => {
      const sensitiveItem = {
        id: 'test1',
        title: 'Test Item',
        content: 'Full content text with sensitive information',
        personalNotes: 'Private personal notes',
        privateMetadata: { userId: '12345', sessionId: 'abc' },
        summary: 'Safe public summary',
        tags: ['public', 'tag'],
        categories: ['Technology'],
        dateAdded: '2023-01-01',
        type: 'article',
        isPhysical: false,
        status: 'processed'
      }

      const sanitized = apiGateway.sanitizeItemForExport(sensitiveItem, ['summary', 'tags', 'categories'])

      // Should include safe fields
      expect(sanitized.id).toBe('test1')
      expect(sanitized.title).toBe('Test Item')
      expect(sanitized.summary).toBe('Safe public summary')
      expect(sanitized.tags).toEqual(['public', 'tag'])
      expect(sanitized.categories).toEqual(['Technology'])

      // Should exclude sensitive fields
      expect(sanitized.content).toBeUndefined()
      expect(sanitized.personalNotes).toBeUndefined()
      expect(sanitized.privateMetadata).toBeUndefined()
    })

    test('should respect includeFields parameter for controlled data exposure', () => {
      const item = {
        id: 'test1',
        title: 'Test',
        summary: 'Summary',
        tags: ['tag1'],
        categories: ['cat1'],
        contentText: 'Long content...',
        dateAdded: '2023-01-01'
      }

      // Include only summary
      const limitedExport = apiGateway.sanitizeItemForExport(item, ['summary'])
      expect(limitedExport.summary).toBe('Summary')
      expect(limitedExport.tags).toBeUndefined()
      expect(limitedExport.categories).toBeUndefined()

      // Include all requested fields
      const fullExport = apiGateway.sanitizeItemForExport(item, ['summary', 'tags', 'categories', 'content'])
      expect(fullExport.summary).toBe('Summary')
      expect(fullExport.tags).toEqual(['tag1'])
      expect(fullExport.categories).toEqual(['cat1'])
      expect(fullExport.contentPreview).toBe('Long content...') // Truncated content
    })

    test('should truncate content for export to prevent data leakage', () => {
      const longContent = 'A'.repeat(2000) // Very long content
      const item = {
        id: 'test1',
        title: 'Test',
        contentText: longContent,
        dateAdded: '2023-01-01'
      }

      const sanitized = apiGateway.sanitizeItemForExport(item, ['content'])

      expect(sanitized.contentPreview).toHaveLength(1000) // Truncated to 1000 chars
      expect(sanitized.contentPreview).toBe('A'.repeat(1000))
    })
  })

  describe('Security and Error Handling', () => {
    test('should log API requests for security monitoring', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        smartshelfSettings: { apiGatewayEnabled: true }
      })
      mockChromeStorage.local.get.mockResolvedValue({ apiTokens: [] })

      await apiGateway.initialize()

      const tokenInfo = await apiGateway.generateAPIToken('Test Token')

      apiGateway.logAPIRequest(tokenInfo.token, '/api/export/stats', { param1: 'value1' })

      expect(apiGateway.requestLog).toHaveLength(1)

      const logEntry = apiGateway.requestLog[0]
      expect(logEntry.endpoint).toBe('/api/export/stats')
      expect(logEntry.params).toEqual(['param1']) // Only param names, not values
      expect(logEntry.token).toMatch(/^shs_.*\.\.\.$/) // Partial token for security
    })

    test('should limit request log size to prevent memory issues', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        smartshelfSettings: { apiGatewayEnabled: true }
      })
      await apiGateway.initialize()

      // Add more than 1000 log entries
      for (let i = 0; i < 1200; i++) {
        apiGateway.logAPIRequest(`token${i}`, '/api/test', {})
      }

      expect(apiGateway.requestLog).toHaveLength(1000) // Should be capped at 1000
    })

    test('should handle storage errors gracefully', async () => {
      mockChromeStorage.local.get.mockRejectedValue(new Error('Storage unavailable'))

      const response = await apiGateway.exportCollection({})

      expect(response.success).toBe(false)
      expect(response.error.status).toBe(500)
      expect(response.error.message).toBe('Export Failed')
    })

    test('should provide usage statistics', async () => {
      mockChromeStorage.sync.get.mockResolvedValue({
        smartshelfSettings: { apiGatewayEnabled: true }
      })
      mockChromeStorage.local.get.mockResolvedValue({ apiTokens: [] })

      await apiGateway.initialize()
      await apiGateway.generateAPIToken('Token 1')
      await apiGateway.generateAPIToken('Token 2')

      const stats = apiGateway.getUsageStats()

      expect(stats.isEnabled).toBe(true)
      expect(stats.totalTokens).toBe(2)
      expect(stats.activeTokens).toBe(2)
    })
  })

  describe('Constitutional Compliance Verification', () => {
    test('should enforce read-only operations only', () => {
      const allowedEndpoints = apiGateway.allowedEndpoints

      // All endpoints must be read/export operations
      allowedEndpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/\/(export|stats|categories)\//)
        expect(endpoint).not.toMatch(/\/(create|update|delete|modify|admin)\//)
      })
    })

    test('should not expose private user data in any export', async () => {
      const privateUserItem = {
        id: 'item1',
        title: 'Personal Journal Entry',
        content: 'Very private thoughts and experiences',
        personalNotes: 'Sensitive personal notes',
        userEmail: 'user@private.com',
        browsingSessions: ['session1', 'session2'],
        privateSettings: { theme: 'dark' }
      }

      mockChromeStorage.local.get.mockResolvedValue({
        contentItems: [privateUserItem],
        collections: [],
        connections: []
      })

      mockChromeStorage.sync.get.mockResolvedValue({
        smartshelfSettings: { apiGatewayEnabled: true }
      })

      await apiGateway.initialize()
      const tokenInfo = await apiGateway.generateAPIToken('Test Token')

      const response = await apiGateway.processAPIRequest('/api/export/collection', tokenInfo.token, {
        include: 'summary,tags,categories,content'
      })

      expect(response.success).toBe(true)
      const exportedItem = response.data.items[0]

      // Verify no private data is exposed
      expect(exportedItem.personalNotes).toBeUndefined()
      expect(exportedItem.userEmail).toBeUndefined()
      expect(exportedItem.browsingSessions).toBeUndefined()
      expect(exportedItem.privateSettings).toBeUndefined()
      expect(exportedItem.content).toBeUndefined() // Full content not exposed

      // Only basic metadata should be available
      expect(exportedItem.id).toBe('item1')
      expect(exportedItem.title).toBe('Personal Journal Entry')
    })

    test('should implement proper rate limiting to prevent abuse', () => {
      const defaultRateLimit = 100 // Per hour

      // Verify default rate limit is reasonable
      expect(defaultRateLimit).toBeLessThanOrEqual(1000) // Not too high
      expect(defaultRateLimit).toBeGreaterThanOrEqual(10) // Not too restrictive

      // Verify rate limiting is enforced
      const tokenData = { rateLimitPerHour: 5 }
      apiGateway.apiTokens.set('test-token', tokenData)

      // Simulate 5 requests within an hour
      const now = Date.now()
      apiGateway.rateLimiter.set('test-token', [now, now, now, now, now])

      const result = apiGateway.checkRateLimit('test-token')
      expect(result.allowed).toBe(false)
    })
  })
})

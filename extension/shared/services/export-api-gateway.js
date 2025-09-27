// Export-Only API Gateway Service - Constitutional Compliance for External Access
// Provides read-only access to user's knowledge base while maintaining privacy principles

/**
 * Export-Only API Gateway Service
 * Implements constitutional-compliant external access with read-only operations
 */
class ExportOnlyAPIGateway {
  constructor() {
    this.isEnabled = false
    this.apiTokens = new Map() // tokenId -> token data
    this.requestLog = []
    this.rateLimiter = new Map() // tokenId -> request timestamps
    this.allowedEndpoints = [
      '/api/export/collection',
      '/api/export/items',
      '/api/export/categories',
      '/api/export/stats'
    ]
  }

  /**
   * Initialize API gateway if enabled in settings
   */
  async initialize() {
    try {
      const { smartshelfSettings } = await chrome.storage.sync.get('smartshelfSettings')

      if (smartshelfSettings?.apiGatewayEnabled) {
        this.isEnabled = true
        await this.loadAPITokens()
        console.log('Export-Only API Gateway initialized')
        return true
      } else {
        console.log('API Gateway disabled in settings')
        return false
      }
    } catch (error) {
      console.error('Failed to initialize API Gateway:', error)
      return false
    }
  }

  /**
   * Generate new API token for external access
   * @param {string} name - Human-readable name for the token
   * @param {Array} permissions - Array of allowed operations
   * @param {Date} expiresAt - Token expiration date (optional)
   * @returns {Object} Generated token information
   */
  async generateAPIToken(name, permissions = ['read'], expiresAt = null) {
    try {
      const tokenId = this.generateSecureToken()
      const tokenData = {
        id: tokenId,
        name: name || `API Token ${Date.now()}`,
        token: tokenId,
        permissions: permissions.filter(p => ['read', 'export'].includes(p)), // Only allow safe permissions
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        createdAt: new Date().toISOString(),
        lastUsed: null,
        isActive: true,
        rateLimitPerHour: 100, // Conservative rate limit
        totalRequests: 0
      }

      this.apiTokens.set(tokenId, tokenData)
      await this.saveAPITokens()

      console.log(`Generated API token: ${name}`)
      return {
        tokenId,
        token: tokenId,
        name: tokenData.name,
        permissions: tokenData.permissions,
        expiresAt: tokenData.expiresAt
      }
    } catch (error) {
      console.error('Failed to generate API token:', error)
      throw error
    }
  }

  /**
   * Revoke API token
   * @param {string} tokenId - Token ID to revoke
   */
  async revokeAPIToken(tokenId) {
    try {
      const tokenData = this.apiTokens.get(tokenId)
      if (tokenData) {
        tokenData.isActive = false
        tokenData.revokedAt = new Date().toISOString()
        await this.saveAPITokens()
        console.log(`Revoked API token: ${tokenData.name}`)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to revoke API token:', error)
      return false
    }
  }

  /**
   * Process API request (read-only operations only)
   * @param {string} endpoint - API endpoint
   * @param {string} token - API token
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} API response
   */
  async processAPIRequest(endpoint, token, params = {}) {
    try {
      // Validate token
      const authResult = await this.authenticateRequest(token)
      if (!authResult.isValid) {
        return this.createErrorResponse(401, 'Unauthorized', authResult.reason)
      }

      // Check rate limiting
      const rateLimitResult = this.checkRateLimit(token)
      if (!rateLimitResult.allowed) {
        return this.createErrorResponse(429, 'Too Many Requests', 'Rate limit exceeded')
      }

      // Validate endpoint
      if (!this.allowedEndpoints.includes(endpoint)) {
        return this.createErrorResponse(404, 'Not Found', 'Endpoint not found or not allowed')
      }

      // Log request
      this.logAPIRequest(token, endpoint, params)

      // Process request based on endpoint
      let response
      switch (endpoint) {
        case '/api/export/collection':
          response = await this.exportCollection(params)
          break
        case '/api/export/items':
          response = await this.exportItems(params)
          break
        case '/api/export/categories':
          response = await this.exportCategories(params)
          break
        case '/api/export/stats':
          response = await this.exportStats(params)
          break
        default:
          response = this.createErrorResponse(404, 'Not Found', 'Endpoint not implemented')
      }

      return response
    } catch (error) {
      console.error('API request processing failed:', error)
      return this.createErrorResponse(500, 'Internal Server Error', 'Request processing failed')
    }
  }

  /**
   * Export full collection data (read-only)
   * @param {Object} params - Request parameters
   * @returns {Object} Collection export data
   */
  async exportCollection(params = {}) {
    try {
      const { contentItems = [] } = await chrome.storage.local.get('contentItems')
      const { collections = [] } = await chrome.storage.local.get('collections')
      const { connections = [] } = await chrome.storage.local.get('connections')

      // Filter data based on parameters
      const includeFields = params.include ? params.include.split(',') : ['summary', 'tags', 'categories']
      const format = params.format || 'json'
      const limit = Math.min(parseInt(params.limit) || 1000, 1000) // Max 1000 items

      // Create export data (sanitized for external use)
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalItems: contentItems.length,
          totalCollections: collections.length,
          totalConnections: connections.length,
          exportedItems: Math.min(limit, contentItems.length),
          format,
          version: '1.0.0'
        },
        items: contentItems.slice(0, limit).map(item => this.sanitizeItemForExport(item, includeFields)),
        collections: collections.map(collection => ({
          id: collection.id,
          name: collection.name,
          description: collection.description,
          itemCount: collection.itemIds ? collection.itemIds.length : 0,
          dateCreated: collection.dateCreated,
          isPrivate: collection.isPrivate
        })),
        connections: connections.filter(conn => conn.isUserVerified || conn.strength >= 0.7).map(conn => ({
          id: conn.id,
          connectionType: conn.connectionType,
          strength: conn.strength,
          description: conn.description,
          dateDiscovered: conn.dateDiscovered
        }))
      }

      return this.createSuccessResponse(exportData)
    } catch (error) {
      console.error('Collection export failed:', error)
      return this.createErrorResponse(500, 'Export Failed', 'Failed to export collection')
    }
  }

  /**
   * Export specific items (read-only)
   * @param {Object} params - Request parameters
   * @returns {Object} Items export data
   */
  async exportItems(params = {}) {
    try {
      const { contentItems = [] } = await chrome.storage.local.get('contentItems')

      let filteredItems = contentItems

      // Apply filters
      if (params.category) {
        filteredItems = filteredItems.filter(item =>
          item.categories && item.categories.includes(params.category)
        )
      }

      if (params.type) {
        filteredItems = filteredItems.filter(item => item.type === params.type)
      }

      if (params.isPhysical !== undefined) {
        const isPhysical = params.isPhysical === 'true'
        filteredItems = filteredItems.filter(item => item.isPhysical === isPhysical)
      }

      // Apply pagination
      const limit = Math.min(parseInt(params.limit) || 100, 1000)
      const offset = parseInt(params.offset) || 0
      const paginatedItems = filteredItems.slice(offset, offset + limit)

      const includeFields = params.include ? params.include.split(',') : ['summary', 'tags', 'categories']

      const exportData = {
        items: paginatedItems.map(item => this.sanitizeItemForExport(item, includeFields)),
        pagination: {
          total: filteredItems.length,
          limit,
          offset,
          hasMore: offset + limit < filteredItems.length
        }
      }

      return this.createSuccessResponse(exportData)
    } catch (error) {
      console.error('Items export failed:', error)
      return this.createErrorResponse(500, 'Export Failed', 'Failed to export items')
    }
  }

  /**
   * Export categories and statistics
   * @param {Object} params - Request parameters
   * @returns {Object} Categories export data
   */
  async exportCategories(params = {}) {
    try {
      const { contentItems = [] } = await chrome.storage.local.get('contentItems')

      // Count items by category
      const categoryStats = {}
      contentItems.forEach(item => {
        if (item.categories && Array.isArray(item.categories)) {
          item.categories.forEach(category => {
            categoryStats[category] = (categoryStats[category] || 0) + 1
          })
        }
      })

      const exportData = {
        categories: Object.entries(categoryStats).map(([name, count]) => ({
          name,
          itemCount: count,
          percentage: Math.round((count / contentItems.length) * 100)
        })).sort((a, b) => b.itemCount - a.itemCount)
      }

      return this.createSuccessResponse(exportData)
    } catch (error) {
      console.error('Categories export failed:', error)
      return this.createErrorResponse(500, 'Export Failed', 'Failed to export categories')
    }
  }

  /**
   * Export collection statistics
   * @param {Object} params - Request parameters
   * @returns {Object} Statistics export data
   */
  async exportStats(params = {}) {
    try {
      const { contentItems = [] } = await chrome.storage.local.get('contentItems')
      const { collections = [] } = await chrome.storage.local.get('collections')
      const { connections = [] } = await chrome.storage.local.get('connections')

      // Calculate statistics
      const stats = {
        overview: {
          totalItems: contentItems.length,
          totalCollections: collections.length,
          totalConnections: connections.length,
          physicalItems: contentItems.filter(item => item.isPhysical).length,
          digitalItems: contentItems.filter(item => !item.isPhysical).length,
          processedItems: contentItems.filter(item => item.status === 'processed').length
        },
        contentTypes: {},
        processingStatus: {},
        recentActivity: {
          itemsAddedLast7Days: 0,
          itemsAddedLast30Days: 0
        }
      }

      // Count by type
      contentItems.forEach(item => {
        stats.contentTypes[item.type] = (stats.contentTypes[item.type] || 0) + 1
        stats.processingStatus[item.status] = (stats.processingStatus[item.status] || 0) + 1
      })

      // Calculate recent activity
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      contentItems.forEach(item => {
        const itemDate = new Date(item.dateAdded)
        if (itemDate >= sevenDaysAgo) stats.recentActivity.itemsAddedLast7Days++
        if (itemDate >= thirtyDaysAgo) stats.recentActivity.itemsAddedLast30Days++
      })

      return this.createSuccessResponse(stats)
    } catch (error) {
      console.error('Stats export failed:', error)
      return this.createErrorResponse(500, 'Export Failed', 'Failed to export statistics')
    }
  }

  /**
   * Sanitize item for external export (remove sensitive data)
   * @param {Object} item - Content item
   * @param {Array} includeFields - Fields to include in export
   * @returns {Object} Sanitized item
   */
  sanitizeItemForExport(item, includeFields) {
    const sanitized = {
      id: item.id,
      title: item.title,
      type: item.type,
      isPhysical: item.isPhysical,
      dateAdded: item.dateAdded,
      dateModified: item.dateModified,
      status: item.status
    }

    // Only include requested fields
    if (includeFields.includes('summary') && item.summary) {
      sanitized.summary = item.summary
    }

    if (includeFields.includes('tags') && item.tags) {
      sanitized.tags = item.tags
    }

    if (includeFields.includes('categories') && item.categories) {
      sanitized.categories = item.categories
    }

    if (includeFields.includes('content') && item.contentText) {
      // Truncate content for export
      sanitized.contentPreview = item.contentText.substring(0, 1000)
    }

    // Physical item specific fields
    if (item.isPhysical) {
      if (includeFields.includes('author') && item.author) sanitized.author = item.author
      if (includeFields.includes('isbn') && item.isbn) sanitized.isbn = item.isbn
      if (item.digitalVersion) {
        sanitized.hasDigitalVersion = true
        sanitized.digitalSource = item.digitalVersion.source
      }
    }

    return sanitized
  }

  /**
   * Authenticate API request
   * @param {string} token - API token
   * @returns {Object} Authentication result
   */
  async authenticateRequest(token) {
    if (!this.isEnabled) {
      return { isValid: false, reason: 'API Gateway disabled' }
    }

    if (!token) {
      return { isValid: false, reason: 'Missing API token' }
    }

    const tokenData = this.apiTokens.get(token)
    if (!tokenData) {
      return { isValid: false, reason: 'Invalid token' }
    }

    if (!tokenData.isActive) {
      return { isValid: false, reason: 'Token revoked' }
    }

    if (tokenData.expiresAt && new Date() > new Date(tokenData.expiresAt)) {
      return { isValid: false, reason: 'Token expired' }
    }

    // Update last used
    tokenData.lastUsed = new Date().toISOString()
    tokenData.totalRequests = (tokenData.totalRequests || 0) + 1

    return { isValid: true, tokenData }
  }

  /**
   * Check rate limiting for token
   * @param {string} token - API token
   * @returns {Object} Rate limit result
   */
  checkRateLimit(token) {
    const tokenData = this.apiTokens.get(token)
    if (!tokenData) return { allowed: false, reason: 'Invalid token' }

    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    // Get recent requests for this token
    if (!this.rateLimiter.has(token)) {
      this.rateLimiter.set(token, [])
    }

    const recentRequests = this.rateLimiter.get(token).filter(timestamp => timestamp > oneHourAgo)

    if (recentRequests.length >= tokenData.rateLimitPerHour) {
      return { allowed: false, reason: 'Rate limit exceeded', resetTime: oneHourAgo + 60 * 60 * 1000 }
    }

    // Add current request
    recentRequests.push(now)
    this.rateLimiter.set(token, recentRequests)

    return { allowed: true, remainingRequests: tokenData.rateLimitPerHour - recentRequests.length }
  }

  /**
   * Log API request for security monitoring
   * @param {string} token - API token
   * @param {string} endpoint - Requested endpoint
   * @param {Object} params - Request parameters
   */
  logAPIRequest(token, endpoint, params) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      token: `${token.substring(0, 8)}...`, // Log only partial token for security
      endpoint,
      params: Object.keys(params), // Log parameter names, not values
      userAgent: 'Extension API'
    }

    this.requestLog.push(logEntry)

    // Keep only last 1000 log entries
    if (this.requestLog.length > 1000) {
      this.requestLog = this.requestLog.slice(-1000)
    }
  }

  /**
   * Create success response
   * @param {Object} data - Response data
   * @returns {Object} Formatted success response
   */
  createSuccessResponse(data) {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }

  /**
   * Create error response
   * @param {number} status - HTTP status code
   * @param {string} error - Error message
   * @param {string} details - Error details
   * @returns {Object} Formatted error response
   */
  createErrorResponse(status, error, details) {
    return {
      success: false,
      error: {
        status,
        message: error,
        details
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Generate secure API token
   * @returns {string} Secure token
   */
  generateSecureToken() {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return `shs_${Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')}`
  }

  /**
   * Load API tokens from storage
   */
  async loadAPITokens() {
    try {
      const { apiTokens = [] } = await chrome.storage.local.get('apiTokens')
      this.apiTokens.clear()
      apiTokens.forEach(tokenData => {
        this.apiTokens.set(tokenData.id, tokenData)
      })
    } catch (error) {
      console.error('Failed to load API tokens:', error)
    }
  }

  /**
   * Save API tokens to storage
   */
  async saveAPITokens() {
    try {
      const apiTokens = Array.from(this.apiTokens.values())
      await chrome.storage.local.set({ apiTokens })
    } catch (error) {
      console.error('Failed to save API tokens:', error)
    }
  }

  /**
   * Get API usage statistics
   * @returns {Object} Usage statistics
   */
  getUsageStats() {
    return {
      isEnabled: this.isEnabled,
      totalTokens: this.apiTokens.size,
      activeTokens: Array.from(this.apiTokens.values()).filter(t => t.isActive).length,
      totalRequests: this.requestLog.length,
      recentRequests: this.requestLog.filter(log =>
        Date.now() - new Date(log.timestamp).getTime() < 24 * 60 * 60 * 1000
      ).length
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportOnlyAPIGateway
} else if (typeof window !== 'undefined') {
  window.ExportOnlyAPIGateway = ExportOnlyAPIGateway
}

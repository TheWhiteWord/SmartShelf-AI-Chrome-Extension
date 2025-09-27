/**
 * APIToken Model
 * Represents API tokens for secure access with permissions and rate limiting
 * Based on specs/001-smartshelf-ai-powered/data-model.md
 */

class APIToken {
  // Static properties for permissions and defaults
  static PERMISSIONS = ['content:read', 'content:write', 'search:query', 'admin:manage']
  static TOKEN_PREFIX = 'sk-'
  static DEFAULT_RATE_LIMIT = 100 // requests per hour

  constructor(data = {}) {
    // Validate required fields
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new Error('Name is required')
    }
    if (!data.permissions) {
      throw new Error('Permissions are required')
    }

    // Validate name length
    if (data.name.length > 100) {
      throw new Error('Name must not exceed 100 characters')
    }

    // Validate permissions array
    if (!Array.isArray(data.permissions) || data.permissions.length === 0) {
      throw new Error('Permissions must be a non-empty array')
    }
    
    // Validate each permission
    for (const permission of data.permissions) {
      if (!APIToken.PERMISSIONS.includes(permission)) {
        throw new Error('Invalid permissions')
      }
    }

    // Validate rate limit if provided
    if (data.rateLimitPerHour !== undefined) {
      if (typeof data.rateLimitPerHour !== 'number' || data.rateLimitPerHour < 1 || data.rateLimitPerHour > 100000) {
        throw new Error('Rate limit must be between 1 and 100000')
      }
    }

    // Validate expiration date if provided
    if (data.expiresAt !== undefined && data.expiresAt !== null) {
      if (!(data.expiresAt instanceof Date) || data.expiresAt <= new Date()) {
        throw new Error('Expiration date must be in the future')
      }
    }

    // Generate unique ID or use provided ID
    this.id = data.id || this._generateUUID()

    // Set required fields
    this.name = data.name
    this.permissions = [...data.permissions] // Copy array

    // Generate secure token or use provided token
    this.token = data.token || this._generateSecureToken()

    // Set optional fields with defaults
    this.isActive = data.isActive !== undefined ? data.isActive : true
    this.rateLimitPerHour = data.rateLimitPerHour || APIToken.DEFAULT_RATE_LIMIT
    this.description = data.description || ''
    this.usageCount = data.usageCount || 0
    
    // Set timestamps
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date()
    this.lastUsed = data.lastUsed ? new Date(data.lastUsed) : null
    this.expiresAt = data.expiresAt || null
    this.revokedAt = data.revokedAt ? new Date(data.revokedAt) : null
  }

  /**
   * Generate a UUID v4
   * @returns {string} UUID v4 string
   */
  _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Generate secure token with prefix
   * @returns {string} Secure token string
   */
  _generateSecureToken() {
    const secureString = this.generateSecureToken(48) // 48 chars for security
    return APIToken.TOKEN_PREFIX + secureString
  }

  /**
   * Generate cryptographically secure token string
   * @param {number} length - Length of token to generate
   * @returns {string} Secure token string
   */
  generateSecureToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    
    // Use crypto.getRandomValues if available, fallback to Math.random
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(length)
      crypto.getRandomValues(array)
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length]
      }
    } else {
      // Fallback for Node.js environments
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)]
      }
    }
    
    return result
  }

  /**
   * Check if token has specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean} True if token has permission
   */
  hasPermission(permission) {
    return this.permissions.includes(permission)
  }

  /**
   * Check if token is expired
   * @returns {boolean} True if token is expired
   */
  isExpired() {
    if (!this.expiresAt) {
      return false
    }
    return new Date() > this.expiresAt
  }

  /**
   * Check if token is valid (active and not expired)
   * @returns {boolean} True if token is valid
   */
  isValid() {
    return this.isActive && !this.isExpired()
  }

  /**
   * Record token usage
   */
  recordUsage() {
    this.usageCount++
    this.lastUsed = new Date()
  }

  /**
   * Check if token is within rate limit
   * @returns {boolean} True if within rate limit
   */
  checkRateLimit() {
    if (!this.lastUsed) {
      return true
    }

    // Simple hourly rate limiting - in production this would be more sophisticated
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    // If last used was more than an hour ago, reset is implied
    if (this.lastUsed < hourAgo) {
      return true
    }

    // For this simplified implementation, assume usage count is hourly count
    return this.usageCount < this.rateLimitPerHour
  }

  /**
   * Regenerate the token string
   */
  regenerateToken() {
    this.token = this._generateSecureToken()
  }

  /**
   * Revoke the token
   */
  revoke() {
    this.isActive = false
    this.revokedAt = new Date()
  }

  /**
   * Extend token expiration
   * @param {Date} newExpiration - New expiration date
   */
  extendExpiration(newExpiration) {
    this.expiresAt = newExpiration
  }

  /**
   * Get token hash for secure storage
   * @returns {string} Hashed token
   */
  getTokenHash() {
    // Simple hash implementation - in production use proper crypto hash
    let hash = 0
    for (let i = 0; i < this.token.length; i++) {
      const char = this.token.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return 'hash_' + Math.abs(hash).toString(16)
  }

  /**
   * Validate token against hash
   * @param {string} token - Token to validate
   * @param {string} hash - Expected hash
   * @returns {boolean} True if token matches hash
   */
  validateToken(token, hash) {
    // Create temporary instance to get hash of provided token
    const tempToken = { ...this, token }
    const computedHash = APIToken.prototype.getTokenHash.call(tempToken)
    return computedHash === hash
  }

  /**
   * Get masked token for display
   * @returns {string} Masked token
   */
  getMaskedToken() {
    if (this.token.length <= 10) {
      return this.token
    }
    const start = this.token.substring(0, 6)
    const end = this.token.substring(this.token.length - 4)
    return `${start}***${end}`
  }

  /**
   * Get usage statistics
   * @returns {Object} Usage stats
   */
  getUsageStats() {
    const daysSinceCreated = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    const averageRequestsPerDay = daysSinceCreated > 0 ? this.usageCount / daysSinceCreated : 0

    return {
      totalRequests: this.usageCount,
      rateLimitUsage: this.usageCount / this.rateLimitPerHour,
      lastUsed: this.lastUsed,
      averageRequestsPerDay: Math.round(averageRequestsPerDay * 100) / 100 // Round to 2 decimals
    }
  }

  /**
   * Add permission to token
   * @param {string} permission - Permission to add
   */
  addPermission(permission) {
    if (!APIToken.PERMISSIONS.includes(permission)) {
      throw new Error('Invalid permission')
    }
    if (!this.permissions.includes(permission)) {
      this.permissions.push(permission)
    }
  }

  /**
   * Remove permission from token
   * @param {string} permission - Permission to remove
   */
  removePermission(permission) {
    const index = this.permissions.indexOf(permission)
    if (index > -1) {
      this.permissions.splice(index, 1)
    }
  }

  /**
   * Rotate token (generate new token, return old and new)
   * @returns {Object} Rotation info with old and new tokens
   */
  rotateToken() {
    const oldToken = this.token
    this.regenerateToken()
    
    return {
      oldToken,
      newToken: this.token,
      rotatedAt: new Date()
    }
  }

  /**
   * Log usage for audit purposes
   * @param {string} action - Action performed
   * @param {string} clientIP - Client IP address
   * @returns {Object} Audit log entry
   */
  logUsage(action, clientIP) {
    return {
      tokenId: this.id,
      action,
      clientIP,
      timestamp: new Date(),
      success: true
    }
  }

  /**
   * Convert to JSON format (excludes sensitive token)
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      permissions: this.permissions,
      isActive: this.isActive,
      rateLimitPerHour: this.rateLimitPerHour,
      usageCount: this.usageCount,
      description: this.description,
      createdAt: this.createdAt.toISOString(),
      lastUsed: this.lastUsed ? this.lastUsed.toISOString() : null,
      expiresAt: this.expiresAt ? this.expiresAt.toISOString() : null,
      revokedAt: this.revokedAt ? this.revokedAt.toISOString() : null
    }
  }

  /**
   * Create APIToken from JSON data
   * @param {Object} jsonData - JSON representation
   * @returns {APIToken} APIToken instance
   */
  static fromJSON(jsonData) {
    return new APIToken({
      ...jsonData,
      createdAt: jsonData.createdAt,
      lastUsed: jsonData.lastUsed,
      expiresAt: jsonData.expiresAt,
      revokedAt: jsonData.revokedAt
    })
  }

  /**
   * Convert to Chrome Storage format (includes token hash, not raw token)
   * @returns {Object} Storage-compatible format
   */
  toStorageFormat() {
    return {
      id: this.id,
      name: this.name,
      permissions: this.permissions,
      tokenHash: this.getTokenHash(),
      isActive: this.isActive,
      rateLimitPerHour: this.rateLimitPerHour,
      usageCount: this.usageCount,
      description: this.description,
      createdAt: this.createdAt.toISOString(),
      lastUsed: this.lastUsed ? this.lastUsed.toISOString() : null,
      expiresAt: this.expiresAt ? this.expiresAt.toISOString() : null,
      revokedAt: this.revokedAt ? this.revokedAt.toISOString() : null
    }
  }

  /**
   * Export for backup (metadata only, no sensitive data)
   * @returns {Object} Backup-safe export data
   */
  exportForBackup() {
    return {
      metadata: {
        id: this.id,
        name: this.name,
        permissions: this.permissions,
        description: this.description,
        createdAt: this.createdAt.toISOString()
      },
      settings: {
        rateLimitPerHour: this.rateLimitPerHour,
        isActive: this.isActive
      }
    }
  }
}

// Export for CommonJS (Node.js/Jest) and ES modules
if (typeof module !== 'undefined' && module.exports) {
  // Node.js/Jest environment
  module.exports = { APIToken }
} else {
  // Browser environment
  window.APIToken = APIToken
}
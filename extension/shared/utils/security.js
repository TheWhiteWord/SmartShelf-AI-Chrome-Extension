/**
 * Security Utilities
 * Cryptographic and security-related utility functions
 * 
 * Functions:
 * - generateUUID() - UUID v4 generation
 * - generateSecureToken(length) - Cryptographically secure token
 * - hashToken(token) - Token hashing (simple checksum)
 * - sanitizeInput(input) - Input sanitization
 * - validateTokenFormat(token) - Token format validation
 */

/**
 * Generate a UUID v4
 * Uses Math.random() for simplicity (not cryptographically secure for IDs)
 * For secure tokens, use generateSecureToken() instead
 * 
 * @returns {string} UUID v4 string (format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
 * 
 * @example
 * const id = generateUUID()
 * // Returns: "550e8400-e29b-41d4-a716-446655440000"
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Generate cryptographically secure random token
 * Uses crypto.getRandomValues() with fallback to Math.random()
 * 
 * @param {number} length - Length of token to generate (default: 32)
 * @returns {string} Secure random token string (alphanumeric)
 * 
 * @example
 * const token = generateSecureToken(48)
 * // Returns: "aBcD1234eFgH5678iJkL9012mNoPqRsTuVwXyZ345678ABCD"
 */
function generateSecureToken(length = 32) {
  // Validate length
  if (typeof length !== 'number' || length < 1 || length > 1024) {
    throw new Error('Token length must be between 1 and 1024')
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  // Use crypto.getRandomValues if available (browser/modern Node.js)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length]
    }
  } else {
    // Fallback for older Node.js environments (testing)
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
  }
  
  return result
}

/**
 * Hash token using simple checksum algorithm
 * NOT cryptographically secure - use for basic token validation only
 * For production, consider using Web Crypto API's SubtleCrypto.digest()
 * 
 * @param {string} token - Token string to hash
 * @returns {string} Hexadecimal hash string
 * 
 * @example
 * const hash = hashToken('my-secret-token')
 * // Returns: "a3f5b9c2" (8-character hex string)
 */
function hashToken(token) {
  if (!token || typeof token !== 'string') {
    return ''
  }

  // Simple checksum algorithm (DJB2)
  let hash = 5381
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) + hash) + token.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Convert to unsigned and return as hex
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 * Removes/escapes dangerous characters and patterns
 * 
 * @param {string} input - User input string to sanitize
 * @returns {string} Sanitized string safe for display/storage
 * 
 * @example
 * const clean = sanitizeInput('<script>alert("XSS")</script>')
 * // Returns: "scriptalert(XSS)/script" (tags removed)
 */
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return ''
  }

  let sanitized = input

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Remove HTML tags FIRST (matches valid HTML tag names only)
  // Pattern: </?tagname...> where tagname starts with letter
  // This won't match "< 100 >" because "100" doesn't start with a letter
  sanitized = sanitized.replace(/<\/?[a-z][a-z0-9]*[^>]*>/gi, '')

  // Remove SQL injection patterns (BEFORE HTML escaping to avoid removing entity semicolons)
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--|;|\/\*|\*\/)/g,
    /('|")\s*(OR|AND)\s*('|")/gi
  ]

  for (const pattern of sqlPatterns) {
    sanitized = sanitized.replace(pattern, '')
  }

  // Remove JavaScript event handlers
  sanitized = sanitized.replace(/on\w+\s*=/gi, '')

  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/(javascript|data):/gi, '')

  // Escape HTML entities for safety (AFTER SQL prevention to preserve entity semicolons)
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  // Limit length for safety (10,000 characters)
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000)
  }

  return sanitized
}

/**
 * Validate token format
 * Checks if string matches common token patterns (UUID, prefixed tokens)
 * 
 * @param {string} token - Token string to validate
 * @returns {boolean} True if token format is valid
 * 
 * @example
 * validateTokenFormat('550e8400-e29b-41d4-a716-446655440000') // true (UUID)
 * validateTokenFormat('sk-aBcD1234eFgH5678') // true (prefixed token)
 * validateTokenFormat('invalid token!') // false
 */
function validateTokenFormat(token) {
  if (!token || typeof token !== 'string') {
    return false
  }

  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  // Prefixed token format: prefix-alphanumeric (e.g., sk-abc123..., ghp_abc123...)
  // Allows hyphens, underscores in prefix
  const prefixedTokenPattern = /^[a-z_]{2,10}[-_][A-Za-z0-9]{16,}$/

  // Simple alphanumeric token (at least 16 characters)
  // Exclude 32-char hex strings (could be UUID without hyphens)
  const simpleTokenPattern = /^[A-Za-z0-9]{16,}$/
  const hexPattern = /^[0-9a-f]{32}$/i

  return (
    uuidPattern.test(token) ||
    prefixedTokenPattern.test(token) ||
    (simpleTokenPattern.test(token) && !hexPattern.test(token))
  )
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateUUID,
    generateSecureToken,
    hashToken,
    sanitizeInput,
    validateTokenFormat
  }
}

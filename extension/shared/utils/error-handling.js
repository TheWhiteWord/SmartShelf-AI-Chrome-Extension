/**
 * Error Handling Utilities
 * Error creation, detection, formatting, and retry logic utilities
 * 
 * Functions:
 * - createError(message, code, details) - Custom error creation
 * - isNetworkError(error) - Network error detection
 * - isAuthError(error) - Authentication error detection
 * - formatErrorMessage(error) - User-friendly error formatting
 * - retryOperation(fn, options) - Retry logic with exponential backoff
 */

/**
 * Create custom error with code and details
 * Extends Error class with additional properties for better error tracking
 * 
 * @param {string} message - Error message (required)
 * @param {string} [code] - Error code (optional, e.g., 'NETWORK_ERROR', 'AUTH_ERROR')
 * @param {object} [details] - Additional error details (optional)
 * @returns {Error} Custom error object with code and details properties
 * 
 * @example
 * const error = createError('Failed to fetch data', 'NETWORK_ERROR', { url: 'https://api.example.com' })
 * console.log(error.code) // 'NETWORK_ERROR'
 * console.log(error.details) // { url: 'https://api.example.com' }
 */
function createError(message, code, details) {
  if (!message || typeof message !== 'string') {
    throw new TypeError('Error message must be a non-empty string')
  }

  const error = new Error(message)
  
  if (code) {
    error.code = code
  }
  
  if (details && typeof details === 'object') {
    error.details = details
  }
  
  // Capture stack trace (V8 specific)
  if (Error.captureStackTrace) {
    Error.captureStackTrace(error, createError)
  }
  
  return error
}

/**
 * Detect if error is a network-related error
 * Checks error message, code, and type for network error indicators
 * 
 * @param {Error|object} error - Error object to check
 * @returns {boolean} True if error is network-related
 * 
 * @example
 * const error = new TypeError('Failed to fetch')
 * isNetworkError(error) // true
 * 
 * const error2 = createError('Network timeout', 'NETWORK_ERROR')
 * isNetworkError(error2) // true
 */
function isNetworkError(error) {
  if (!error || typeof error !== 'object') {
    return false
  }

  // Check error code
  if (error.code && typeof error.code === 'string') {
    const networkCodes = [
      'NETWORK_ERROR',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNRESET',
      'ERR_NETWORK',
      'ERR_CONNECTION_REFUSED',
      'ERR_CONNECTION_TIMED_OUT',
      'ERR_INTERNET_DISCONNECTED'
    ]
    if (networkCodes.includes(error.code)) {
      return true
    }
  }

  // Check error name/type
  if (error.name && typeof error.name === 'string') {
    const networkTypes = ['NetworkError', 'TypeError']
    if (networkTypes.includes(error.name)) {
      return true
    }
  }

  // Check error message for network-related keywords
  if (error.message && typeof error.message === 'string') {
    const networkKeywords = [
      'network',
      'fetch',
      'connection',
      'timeout',
      'offline',
      'internet',
      'dns',
      'unreachable',
      'failed to fetch',
      'load failed'
    ]
    const lowerMessage = error.message.toLowerCase()
    if (networkKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return true
    }
  }

  return false
}

/**
 * Detect if error is an authentication/authorization error
 * Checks error message, code, and status for auth error indicators
 * 
 * @param {Error|object} error - Error object to check
 * @returns {boolean} True if error is auth-related
 * 
 * @example
 * const error = createError('Unauthorized access', 'AUTH_ERROR')
 * isAuthError(error) // true
 * 
 * const error2 = { status: 401, message: 'Invalid credentials' }
 * isAuthError(error2) // true
 */
function isAuthError(error) {
  if (!error || typeof error !== 'object') {
    return false
  }

  // Check error code
  if (error.code && typeof error.code === 'string') {
    const authCodes = [
      'AUTH_ERROR',
      'AUTHENTICATION_ERROR',
      'AUTHORIZATION_ERROR',
      'INVALID_TOKEN',
      'TOKEN_EXPIRED',
      'INVALID_CREDENTIALS',
      'UNAUTHORIZED',
      'FORBIDDEN'
    ]
    if (authCodes.includes(error.code)) {
      return true
    }
  }

  // Check HTTP status code
  if (error.status && typeof error.status === 'number') {
    const authStatuses = [401, 403]
    if (authStatuses.includes(error.status)) {
      return true
    }
  }

  // Check error message for auth-related keywords
  if (error.message && typeof error.message === 'string') {
    const authKeywords = [
      'unauthorized',
      'forbidden',
      'authentication',
      'authorization',
      'credentials',
      'token',
      'permission',
      'access denied',
      'invalid token',
      'expired token',
      'login required'
    ]
    const lowerMessage = error.message.toLowerCase()
    if (authKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return true
    }
  }

  return false
}

/**
 * Format error message for user-friendly display
 * Converts technical error messages to human-readable format
 * 
 * @param {Error|object} error - Error object to format
 * @returns {string} User-friendly error message
 * 
 * @example
 * const error = createError('ENOTFOUND api.example.com', 'NETWORK_ERROR')
 * formatErrorMessage(error)
 * // Returns: "Network connection failed. Please check your internet connection."
 */
function formatErrorMessage(error) {
  if (!error) {
    return 'An unknown error occurred'
  }

  // Handle non-Error objects
  if (typeof error === 'string') {
    return error
  }

  if (typeof error !== 'object') {
    return 'An unknown error occurred'
  }

  // Check for specific error types and provide friendly messages
  if (isNetworkError(error)) {
    return 'Network connection failed. Please check your internet connection.'
  }

  if (isAuthError(error)) {
    return 'Authentication failed. Please check your credentials and try again.'
  }

  // Check for validation errors
  if (error.code === 'VALIDATION_ERROR' || (error.name && error.name === 'ValidationError')) {
    return 'Invalid input. Please check your data and try again.'
  }

  // Check for rate limit errors
  if (error.code === 'RATE_LIMIT_ERROR' || (error.status && error.status === 429)) {
    return 'Too many requests. Please wait a moment and try again.'
  }

  // Check for server errors
  if (error.status && error.status >= 500) {
    return 'Server error. Please try again later.'
  }

  // Return original error message if available
  if (error.message && typeof error.message === 'string') {
    return error.message
  }

  return 'An unknown error occurred'
}

/**
 * Retry operation with exponential backoff
 * Executes function with configurable retry logic and backoff delays
 * 
 * @param {Function} fn - Async function to retry
 * @param {object} [options] - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @param {number} [options.initialDelay=1000] - Initial delay in milliseconds
 * @param {number} [options.maxDelay=30000] - Maximum delay in milliseconds
 * @param {number} [options.backoffMultiplier=2] - Delay multiplier for exponential backoff
 * @param {Function} [options.shouldRetry] - Custom function to determine if error should be retried
 * @returns {Promise<any>} Result of successful function execution
 * @throws {Error} Last error if all retries fail
 * 
 * @example
 * const result = await retryOperation(
 *   async () => fetch('https://api.example.com/data'),
 *   { maxRetries: 5, initialDelay: 500 }
 * )
 */
async function retryOperation(fn, options = {}) {
  // Validate function parameter
  if (typeof fn !== 'function') {
    throw new TypeError('First argument must be a function')
  }

  // Default options
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    shouldRetry = () => true
  } = options

  // Validate options
  if (typeof maxRetries !== 'number' || maxRetries < 0) {
    throw new TypeError('maxRetries must be a non-negative number')
  }

  if (typeof initialDelay !== 'number' || initialDelay < 0) {
    throw new TypeError('initialDelay must be a non-negative number')
  }

  if (typeof maxDelay !== 'number' || maxDelay < 0) {
    throw new TypeError('maxDelay must be a non-negative number')
  }

  if (typeof backoffMultiplier !== 'number' || backoffMultiplier < 1) {
    throw new TypeError('backoffMultiplier must be >= 1')
  }

  if (typeof shouldRetry !== 'function') {
    throw new TypeError('shouldRetry must be a function')
  }

  let lastError
  let attempt = 0

  while (attempt <= maxRetries) {
    try {
      // Execute function
      const result = await fn()
      return result
    } catch (error) {
      lastError = error
      attempt++

      // Check if we should retry this error
      if (attempt > maxRetries || !shouldRetry(error)) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      )

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // Should never reach here, but throw last error just in case
  throw lastError
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createError,
    isNetworkError,
    isAuthError,
    formatErrorMessage,
    retryOperation
  }
}

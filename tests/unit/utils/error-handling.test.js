/**
 * Unit Tests: Error Handling Utilities (T071K)
 * Test suite for extension/shared/utils/error-handling.js
 * 
 * Following TDD principles established in this project
 * 
 * Functions tested:
 * - createError(message, code, details) - Custom error creation
 * - isNetworkError(error) - Network error detection
 * - isAuthError(error) - Authentication error detection
 * - formatErrorMessage(error) - User-friendly error formatting
 * - retryOperation(fn, options) - Retry logic with exponential backoff
 * 
 * Test scenarios:
 * - Error creation: message, code, stack trace
 * - Error type detection: network, auth, validation
 * - Error message formatting: technical vs user-friendly
 * - Retry logic: success on nth attempt, max retries, backoff delays
 * - Edge cases: non-Error objects, missing properties
 */

const {
  createError,
  isNetworkError,
  isAuthError,
  formatErrorMessage,
  retryOperation
} = require('../../../extension/shared/utils/error-handling.js')

describe('Error Handling Utilities (T071K)', () => {
  
  // ============================================================================
  // createError() Tests
  // ============================================================================
  
  describe('createError()', () => {
    
    describe('Error creation with message only', () => {
      it('should create error with message', () => {
        const error = createError('Test error message')
        
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('Test error message')
      })

      it('should have stack trace', () => {
        const error = createError('Test error')
        
        expect(error.stack).toBeDefined()
        expect(typeof error.stack).toBe('string')
        expect(error.stack.length).toBeGreaterThan(0)
      })

      it('should not have code or details properties', () => {
        const error = createError('Test error')
        
        expect(error.code).toBeUndefined()
        expect(error.details).toBeUndefined()
      })
    })

    describe('Error creation with code', () => {
      it('should create error with message and code', () => {
        const error = createError('Network failure', 'NETWORK_ERROR')
        
        expect(error.message).toBe('Network failure')
        expect(error.code).toBe('NETWORK_ERROR')
      })

      it('should handle various error codes', () => {
        const codes = ['AUTH_ERROR', 'VALIDATION_ERROR', 'RATE_LIMIT_ERROR', 'INTERNAL_ERROR']
        
        codes.forEach(code => {
          const error = createError('Test message', code)
          expect(error.code).toBe(code)
        })
      })
    })

    describe('Error creation with details', () => {
      it('should create error with message, code, and details', () => {
        const details = { url: 'https://api.example.com', status: 500 }
        const error = createError('API request failed', 'NETWORK_ERROR', details)
        
        expect(error.message).toBe('API request failed')
        expect(error.code).toBe('NETWORK_ERROR')
        expect(error.details).toEqual(details)
      })

      it('should handle complex details objects', () => {
        const details = {
          url: 'https://api.example.com/users',
          method: 'POST',
          status: 401,
          headers: { 'Content-Type': 'application/json' },
          body: { username: 'test' }
        }
        const error = createError('Request failed', 'AUTH_ERROR', details)
        
        expect(error.details).toEqual(details)
      })

      it('should handle null details gracefully', () => {
        const error = createError('Test error', 'TEST_CODE', null)
        
        expect(error.message).toBe('Test error')
        expect(error.code).toBe('TEST_CODE')
        expect(error.details).toBeUndefined()
      })
    })

    describe('Error creation edge cases', () => {
      it('should throw TypeError for missing message', () => {
        expect(() => createError()).toThrow(TypeError)
        expect(() => createError()).toThrow('Error message must be a non-empty string')
      })

      it('should throw TypeError for non-string message', () => {
        expect(() => createError(123)).toThrow(TypeError)
        expect(() => createError(null)).toThrow(TypeError)
        expect(() => createError({})).toThrow(TypeError)
      })

      it('should throw TypeError for empty string message', () => {
        expect(() => createError('')).toThrow(TypeError)
      })

      it('should ignore non-object details', () => {
        const error1 = createError('Test', 'CODE', 'string details')
        expect(error1.details).toBeUndefined()

        const error2 = createError('Test', 'CODE', 123)
        expect(error2.details).toBeUndefined()
      })
    })
  })

  // ============================================================================
  // isNetworkError() Tests
  // ============================================================================
  
  describe('isNetworkError()', () => {
    
    describe('Network error detection by code', () => {
      it('should detect NETWORK_ERROR code', () => {
        const error = createError('Network failed', 'NETWORK_ERROR')
        expect(isNetworkError(error)).toBe(true)
      })

      it('should detect Node.js network error codes', () => {
        const codes = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET']
        
        codes.forEach(code => {
          const error = createError('Network issue', code)
          expect(isNetworkError(error)).toBe(true)
        })
      })

      it('should detect Chrome extension network error codes', () => {
        const codes = [
          'ERR_NETWORK',
          'ERR_CONNECTION_REFUSED',
          'ERR_CONNECTION_TIMED_OUT',
          'ERR_INTERNET_DISCONNECTED'
        ]
        
        codes.forEach(code => {
          const error = createError('Network issue', code)
          expect(isNetworkError(error)).toBe(true)
        })
      })
    })

    describe('Network error detection by error type', () => {
      it('should detect NetworkError type', () => {
        const error = new Error('Failed to fetch')
        error.name = 'NetworkError'
        
        expect(isNetworkError(error)).toBe(true)
      })

      it('should detect TypeError (common for fetch failures)', () => {
        const error = new TypeError('Failed to fetch')
        
        expect(isNetworkError(error)).toBe(true)
      })
    })

    describe('Network error detection by message', () => {
      it('should detect network-related keywords', () => {
        const messages = [
          'Network connection failed',
          'Failed to fetch data',
          'Connection timeout',
          'Device is offline',
          'No internet connection',
          'DNS lookup failed',
          'Host unreachable',
          'Load failed'
        ]
        
        messages.forEach(message => {
          const error = new Error(message)
          expect(isNetworkError(error)).toBe(true)
        })
      })

      it('should be case-insensitive for message matching', () => {
        const error1 = new Error('NETWORK ERROR')
        const error2 = new Error('Network Error')
        const error3 = new Error('network error')
        
        expect(isNetworkError(error1)).toBe(true)
        expect(isNetworkError(error2)).toBe(true)
        expect(isNetworkError(error3)).toBe(true)
      })
    })

    describe('Non-network errors', () => {
      it('should return false for auth errors', () => {
        const error = createError('Unauthorized', 'AUTH_ERROR')
        expect(isNetworkError(error)).toBe(false)
      })

      it('should return false for validation errors', () => {
        const error = createError('Invalid input', 'VALIDATION_ERROR')
        expect(isNetworkError(error)).toBe(false)
      })

      it('should return false for generic errors', () => {
        const error = new Error('Something went wrong')
        expect(isNetworkError(error)).toBe(false)
      })
    })

    describe('Edge cases', () => {
      it('should return false for null/undefined', () => {
        expect(isNetworkError(null)).toBe(false)
        expect(isNetworkError(undefined)).toBe(false)
      })

      it('should return false for non-object types', () => {
        expect(isNetworkError('error string')).toBe(false)
        expect(isNetworkError(123)).toBe(false)
        expect(isNetworkError(true)).toBe(false)
      })

      it('should return false for empty object', () => {
        expect(isNetworkError({})).toBe(false)
      })
    })
  })

  // ============================================================================
  // isAuthError() Tests
  // ============================================================================
  
  describe('isAuthError()', () => {
    
    describe('Auth error detection by code', () => {
      it('should detect AUTH_ERROR code', () => {
        const error = createError('Authentication failed', 'AUTH_ERROR')
        expect(isAuthError(error)).toBe(true)
      })

      it('should detect authentication error codes', () => {
        const codes = [
          'AUTHENTICATION_ERROR',
          'AUTHORIZATION_ERROR',
          'INVALID_TOKEN',
          'TOKEN_EXPIRED',
          'INVALID_CREDENTIALS',
          'UNAUTHORIZED',
          'FORBIDDEN'
        ]
        
        codes.forEach(code => {
          const error = createError('Auth issue', code)
          expect(isAuthError(error)).toBe(true)
        })
      })
    })

    describe('Auth error detection by HTTP status', () => {
      it('should detect 401 Unauthorized status', () => {
        const error = { status: 401, message: 'Unauthorized' }
        expect(isAuthError(error)).toBe(true)
      })

      it('should detect 403 Forbidden status', () => {
        const error = { status: 403, message: 'Forbidden' }
        expect(isAuthError(error)).toBe(true)
      })

      it('should not detect other HTTP status codes', () => {
        expect(isAuthError({ status: 400 })).toBe(false)
        expect(isAuthError({ status: 404 })).toBe(false)
        expect(isAuthError({ status: 500 })).toBe(false)
      })
    })

    describe('Auth error detection by message', () => {
      it('should detect auth-related keywords', () => {
        const messages = [
          'Unauthorized access',
          'Forbidden resource',
          'Authentication required',
          'Authorization failed',
          'Invalid credentials',
          'Invalid token provided',
          'Token expired',
          'Permission denied',
          'Access denied',
          'Login required'
        ]
        
        messages.forEach(message => {
          const error = new Error(message)
          expect(isAuthError(error)).toBe(true)
        })
      })

      it('should be case-insensitive for message matching', () => {
        const error1 = new Error('UNAUTHORIZED')
        const error2 = new Error('Unauthorized')
        const error3 = new Error('unauthorized')
        
        expect(isAuthError(error1)).toBe(true)
        expect(isAuthError(error2)).toBe(true)
        expect(isAuthError(error3)).toBe(true)
      })
    })

    describe('Non-auth errors', () => {
      it('should return false for network errors', () => {
        const error = createError('Connection failed', 'NETWORK_ERROR')
        expect(isAuthError(error)).toBe(false)
      })

      it('should return false for validation errors', () => {
        const error = createError('Invalid input', 'VALIDATION_ERROR')
        expect(isAuthError(error)).toBe(false)
      })

      it('should return false for generic errors', () => {
        const error = new Error('Something went wrong')
        expect(isAuthError(error)).toBe(false)
      })
    })

    describe('Edge cases', () => {
      it('should return false for null/undefined', () => {
        expect(isAuthError(null)).toBe(false)
        expect(isAuthError(undefined)).toBe(false)
      })

      it('should return false for non-object types', () => {
        expect(isAuthError('error string')).toBe(false)
        expect(isAuthError(123)).toBe(false)
        expect(isAuthError(true)).toBe(false)
      })

      it('should return false for empty object', () => {
        expect(isAuthError({})).toBe(false)
      })
    })
  })

  // ============================================================================
  // formatErrorMessage() Tests
  // ============================================================================
  
  describe('formatErrorMessage()', () => {
    
    describe('Network error formatting', () => {
      it('should format network errors with friendly message', () => {
        const error = createError('ENOTFOUND api.example.com', 'NETWORK_ERROR')
        const message = formatErrorMessage(error)
        
        expect(message).toBe('Network connection failed. Please check your internet connection.')
      })

      it('should format fetch failures', () => {
        const error = new TypeError('Failed to fetch')
        const message = formatErrorMessage(error)
        
        expect(message).toBe('Network connection failed. Please check your internet connection.')
      })
    })

    describe('Auth error formatting', () => {
      it('should format authentication errors with friendly message', () => {
        const error = createError('Invalid credentials', 'AUTH_ERROR')
        const message = formatErrorMessage(error)
        
        expect(message).toBe('Authentication failed. Please check your credentials and try again.')
      })

      it('should format 401 errors', () => {
        const error = { status: 401, message: 'Unauthorized' }
        const message = formatErrorMessage(error)
        
        expect(message).toBe('Authentication failed. Please check your credentials and try again.')
      })
    })

    describe('Validation error formatting', () => {
      it('should format validation errors with friendly message', () => {
        const error = createError('Invalid email format', 'VALIDATION_ERROR')
        const message = formatErrorMessage(error)
        
        expect(message).toBe('Invalid input. Please check your data and try again.')
      })

      it('should format ValidationError by name', () => {
        const error = new Error('Field is required')
        error.name = 'ValidationError'
        const message = formatErrorMessage(error)
        
        expect(message).toBe('Invalid input. Please check your data and try again.')
      })
    })

    describe('Rate limit error formatting', () => {
      it('should format rate limit errors with friendly message', () => {
        const error = createError('Too many requests', 'RATE_LIMIT_ERROR')
        const message = formatErrorMessage(error)
        
        expect(message).toBe('Too many requests. Please wait a moment and try again.')
      })

      it('should format 429 status errors', () => {
        const error = { status: 429, message: 'Rate limit exceeded' }
        const message = formatErrorMessage(error)
        
        expect(message).toBe('Too many requests. Please wait a moment and try again.')
      })
    })

    describe('Server error formatting', () => {
      it('should format 500 errors', () => {
        const error = { status: 500, message: 'Internal server error' }
        const message = formatErrorMessage(error)
        
        expect(message).toBe('Server error. Please try again later.')
      })

      it('should format 503 errors', () => {
        const error = { status: 503, message: 'Service unavailable' }
        const message = formatErrorMessage(error)
        
        expect(message).toBe('Server error. Please try again later.')
      })
    })

    describe('Generic error formatting', () => {
      it('should return original message for unknown errors', () => {
        const error = new Error('Custom error message')
        const message = formatErrorMessage(error)
        
        expect(message).toBe('Custom error message')
      })

      it('should handle string errors', () => {
        const message = formatErrorMessage('Simple error string')
        
        expect(message).toBe('Simple error string')
      })
    })

    describe('Edge cases', () => {
      it('should handle null/undefined errors', () => {
        expect(formatErrorMessage(null)).toBe('An unknown error occurred')
        expect(formatErrorMessage(undefined)).toBe('An unknown error occurred')
      })

      it('should handle non-object, non-string types', () => {
        expect(formatErrorMessage(123)).toBe('An unknown error occurred')
        expect(formatErrorMessage(true)).toBe('An unknown error occurred')
      })

      it('should handle objects without message property', () => {
        const error = { code: 'UNKNOWN' }
        expect(formatErrorMessage(error)).toBe('An unknown error occurred')
      })
    })
  })

  // ============================================================================
  // retryOperation() Tests
  // ============================================================================
  
  describe('retryOperation()', () => {
    
    describe('Successful operations', () => {
      it('should return result on first success', async () => {
        const fn = jest.fn().mockResolvedValue('success')
        
        const result = await retryOperation(fn)
        
        expect(result).toBe('success')
        expect(fn).toHaveBeenCalledTimes(1)
      })

      it('should not retry when operation succeeds', async () => {
        const fn = jest.fn().mockResolvedValue({ data: 'test' })
        
        const result = await retryOperation(fn, { maxRetries: 5 })
        
        expect(result).toEqual({ data: 'test' })
        expect(fn).toHaveBeenCalledTimes(1)
      })
    })

    describe('Retry on failure', () => {
      it('should retry on failure and succeed on second attempt', async () => {
        const fn = jest.fn()
          .mockRejectedValueOnce(new Error('First failure'))
          .mockResolvedValueOnce('success')
        
        const result = await retryOperation(fn, { maxRetries: 3, initialDelay: 10 })
        
        expect(result).toBe('success')
        expect(fn).toHaveBeenCalledTimes(2)
      })

      it('should retry multiple times before success', async () => {
        const fn = jest.fn()
          .mockRejectedValueOnce(new Error('Failure 1'))
          .mockRejectedValueOnce(new Error('Failure 2'))
          .mockRejectedValueOnce(new Error('Failure 3'))
          .mockResolvedValueOnce('success')
        
        const result = await retryOperation(fn, { maxRetries: 5, initialDelay: 10 })
        
        expect(result).toBe('success')
        expect(fn).toHaveBeenCalledTimes(4)
      })

      it('should throw error after max retries exceeded', async () => {
        const error = new Error('Persistent failure')
        const fn = jest.fn().mockRejectedValue(error)
        
        await expect(retryOperation(fn, { maxRetries: 3, initialDelay: 10 }))
          .rejects.toThrow('Persistent failure')
        
        expect(fn).toHaveBeenCalledTimes(4) // Initial + 3 retries
      })
    })

    describe('Exponential backoff delays', () => {
      it('should use exponential backoff for retries', async () => {
        const fn = jest.fn()
          .mockRejectedValueOnce(new Error('Fail 1'))
          .mockRejectedValueOnce(new Error('Fail 2'))
          .mockResolvedValueOnce('success')
        
        const startTime = Date.now()
        await retryOperation(fn, {
          maxRetries: 3,
          initialDelay: 100,
          backoffMultiplier: 2
        })
        const endTime = Date.now()
        
        // Should have delays: 100ms (1st retry) + 200ms (2nd retry) = 300ms minimum
        expect(endTime - startTime).toBeGreaterThanOrEqual(280) // Allow some margin
      })

      it('should respect maxDelay cap', async () => {
        const fn = jest.fn()
          .mockRejectedValueOnce(new Error('Fail 1'))
          .mockRejectedValueOnce(new Error('Fail 2'))
          .mockResolvedValueOnce('success')
        
        const startTime = Date.now()
        await retryOperation(fn, {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 500, // Cap at 500ms
          backoffMultiplier: 2
        })
        const endTime = Date.now()
        
        // Delays would be 1000ms, 2000ms without cap
        // With cap: 500ms, 500ms = 1000ms total
        expect(endTime - startTime).toBeLessThan(1500) // Should be capped
      })
    })

    describe('Custom shouldRetry function', () => {
      it('should use custom shouldRetry to skip retries', async () => {
        const networkError = createError('Network failure', 'NETWORK_ERROR')
        const fn = jest.fn().mockRejectedValue(networkError)
        
        const shouldRetry = (error) => isNetworkError(error)
        
        await expect(retryOperation(fn, { maxRetries: 3, initialDelay: 10, shouldRetry }))
          .rejects.toThrow('Network failure')
        
        // Should retry network errors
        expect(fn).toHaveBeenCalledTimes(4)
      })

      it('should not retry when shouldRetry returns false', async () => {
        const authError = createError('Unauthorized', 'AUTH_ERROR')
        const fn = jest.fn().mockRejectedValue(authError)
        
        const shouldRetry = (error) => !isAuthError(error)
        
        await expect(retryOperation(fn, { maxRetries: 3, initialDelay: 10, shouldRetry }))
          .rejects.toThrow('Unauthorized')
        
        // Should not retry auth errors
        expect(fn).toHaveBeenCalledTimes(1)
      })

      it('should retry only specific error types', async () => {
        const fn = jest.fn()
          .mockRejectedValueOnce(createError('Network issue', 'NETWORK_ERROR'))
          .mockRejectedValueOnce(createError('Auth issue', 'AUTH_ERROR'))
        
        const shouldRetry = (error) => isNetworkError(error)
        
        await expect(retryOperation(fn, { maxRetries: 3, initialDelay: 10, shouldRetry }))
          .rejects.toThrow('Auth issue')
        
        // Should retry network error once, then fail on auth error
        expect(fn).toHaveBeenCalledTimes(2)
      })
    })

    describe('Options validation', () => {
      it('should throw TypeError for non-function argument', async () => {
        await expect(retryOperation('not a function'))
          .rejects.toThrow(TypeError)
        await expect(retryOperation('not a function'))
          .rejects.toThrow('First argument must be a function')
      })

      it('should throw TypeError for invalid maxRetries', async () => {
        const fn = jest.fn()
        
        await expect(retryOperation(fn, { maxRetries: -1 }))
          .rejects.toThrow(TypeError)
        await expect(retryOperation(fn, { maxRetries: 'invalid' }))
          .rejects.toThrow(TypeError)
      })

      it('should throw TypeError for invalid initialDelay', async () => {
        const fn = jest.fn()
        
        await expect(retryOperation(fn, { initialDelay: -100 }))
          .rejects.toThrow(TypeError)
        await expect(retryOperation(fn, { initialDelay: 'invalid' }))
          .rejects.toThrow(TypeError)
      })

      it('should throw TypeError for invalid maxDelay', async () => {
        const fn = jest.fn()
        
        await expect(retryOperation(fn, { maxDelay: -1000 }))
          .rejects.toThrow(TypeError)
        await expect(retryOperation(fn, { maxDelay: 'invalid' }))
          .rejects.toThrow(TypeError)
      })

      it('should throw TypeError for invalid backoffMultiplier', async () => {
        const fn = jest.fn()
        
        await expect(retryOperation(fn, { backoffMultiplier: 0.5 }))
          .rejects.toThrow(TypeError)
        await expect(retryOperation(fn, { backoffMultiplier: 'invalid' }))
          .rejects.toThrow(TypeError)
      })

      it('should throw TypeError for invalid shouldRetry', async () => {
        const fn = jest.fn()
        
        await expect(retryOperation(fn, { shouldRetry: 'not a function' }))
          .rejects.toThrow(TypeError)
      })
    })

    describe('Edge cases', () => {
      it('should handle maxRetries of 0 (no retries)', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('Failure'))
        
        await expect(retryOperation(fn, { maxRetries: 0, initialDelay: 10 }))
          .rejects.toThrow('Failure')
        
        expect(fn).toHaveBeenCalledTimes(1) // Only initial attempt
      })

      it('should handle very large maxRetries', async () => {
        const fn = jest.fn()
          .mockRejectedValueOnce(new Error('Fail'))
          .mockResolvedValueOnce('success')
        
        const result = await retryOperation(fn, { maxRetries: 1000, initialDelay: 10 })
        
        expect(result).toBe('success')
        expect(fn).toHaveBeenCalledTimes(2) // Succeeds on 2nd attempt
      })

      it('should handle backoffMultiplier of 1 (no exponential growth)', async () => {
        const fn = jest.fn()
          .mockRejectedValueOnce(new Error('Fail 1'))
          .mockRejectedValueOnce(new Error('Fail 2'))
          .mockResolvedValueOnce('success')
        
        const startTime = Date.now()
        await retryOperation(fn, {
          maxRetries: 3,
          initialDelay: 50,
          backoffMultiplier: 1
        })
        const endTime = Date.now()
        
        // Should have constant delays: 50ms + 50ms = 100ms
        expect(endTime - startTime).toBeGreaterThanOrEqual(90)
        expect(endTime - startTime).toBeLessThan(200)
      })
    })

    describe('Integration with error detection', () => {
      it('should retry network errors but not auth errors', async () => {
        const fn = jest.fn()
          .mockRejectedValueOnce(createError('Connection failed', 'NETWORK_ERROR'))
          .mockRejectedValueOnce(createError('Unauthorized', 'AUTH_ERROR'))
        
        const shouldRetry = (error) => isNetworkError(error) && !isAuthError(error)
        
        await expect(retryOperation(fn, { maxRetries: 5, initialDelay: 10, shouldRetry }))
          .rejects.toThrow('Unauthorized')
        
        expect(fn).toHaveBeenCalledTimes(2)
      })

      it('should format error message on final failure', async () => {
        const networkError = createError('ENOTFOUND api.example.com', 'NETWORK_ERROR')
        const fn = jest.fn().mockRejectedValue(networkError)
        
        try {
          await retryOperation(fn, { maxRetries: 2, initialDelay: 10 })
        } catch (error) {
          const message = formatErrorMessage(error)
          expect(message).toBe('Network connection failed. Please check your internet connection.')
        }
      })
    })

    describe('Performance', () => {
      it('should complete retries with minimal overhead', async () => {
        const fn = jest.fn()
          .mockRejectedValueOnce(new Error('Fail'))
          .mockResolvedValueOnce('success')
        
        const startTime = Date.now()
        await retryOperation(fn, { maxRetries: 3, initialDelay: 10 })
        const endTime = Date.now()
        
        // Should complete in ~10ms (one retry delay)
        expect(endTime - startTime).toBeLessThan(100)
      })

      it('should handle concurrent retry operations', async () => {
        const fn1 = jest.fn()
          .mockRejectedValueOnce(new Error('Fail'))
          .mockResolvedValueOnce('success 1')
        
        const fn2 = jest.fn()
          .mockRejectedValueOnce(new Error('Fail'))
          .mockResolvedValueOnce('success 2')
        
        const [result1, result2] = await Promise.all([
          retryOperation(fn1, { maxRetries: 3, initialDelay: 10 }),
          retryOperation(fn2, { maxRetries: 3, initialDelay: 10 })
        ])
        
        expect(result1).toBe('success 1')
        expect(result2).toBe('success 2')
      })
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================
  
  describe('Integration: Error Handling Workflow', () => {
    
    it('should create, detect, format, and retry network errors', async () => {
      // Create network error
      const error = createError('Failed to fetch', 'NETWORK_ERROR', {
        url: 'https://api.example.com',
        status: 0
      })
      
      // Detect error type
      expect(isNetworkError(error)).toBe(true)
      expect(isAuthError(error)).toBe(false)
      
      // Format user-friendly message
      const message = formatErrorMessage(error)
      expect(message).toBe('Network connection failed. Please check your internet connection.')
      
      // Retry operation
      let attempts = 0
      const fn = jest.fn(async () => {
        attempts++
        if (attempts < 3) {
          throw error
        }
        return 'success'
      })
      
      const result = await retryOperation(fn, { maxRetries: 5, initialDelay: 10 })
      expect(result).toBe('success')
      expect(attempts).toBe(3)
    })

    it('should handle auth errors without retry', async () => {
      // Create auth error
      const error = createError('Invalid token', 'AUTH_ERROR', {
        status: 401,
        token: 'expired-token'
      })
      
      // Detect error type
      expect(isAuthError(error)).toBe(true)
      expect(isNetworkError(error)).toBe(false)
      
      // Format user-friendly message
      const message = formatErrorMessage(error)
      expect(message).toBe('Authentication failed. Please check your credentials and try again.')
      
      // Don't retry auth errors
      const fn = jest.fn().mockRejectedValue(error)
      const shouldRetry = (err) => !isAuthError(err)
      
      await expect(retryOperation(fn, { maxRetries: 3, initialDelay: 10, shouldRetry }))
        .rejects.toThrow('Invalid token')
      
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should handle complex error scenarios', async () => {
      const errors = [
        createError('Connection timeout', 'NETWORK_ERROR'),
        createError('Rate limit exceeded', 'RATE_LIMIT_ERROR'),
        { message: 'Server error', status: 500 }
      ]
      
      // Test error detection
      expect(isNetworkError(errors[0])).toBe(true)
      expect(isAuthError(errors[1])).toBe(false)
      
      // Test error formatting
      expect(formatErrorMessage(errors[0])).toBe('Network connection failed. Please check your internet connection.')
      expect(formatErrorMessage(errors[1])).toBe('Too many requests. Please wait a moment and try again.')
      expect(formatErrorMessage(errors[2])).toBe('Server error. Please try again later.')
    })
  })
})

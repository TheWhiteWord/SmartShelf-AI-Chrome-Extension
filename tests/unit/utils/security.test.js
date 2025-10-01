/**
 * Unit Tests: Security Utilities (T071H)
 * Test suite for extension/shared/utils/security.js
 * 
 * Following TDD principles established in this project
 * 
 * Functions tested:
 * - generateUUID() - UUID v4 generation
 * - generateSecureToken(length) - Cryptographically secure token
 * - hashToken(token) - Token hashing (simple checksum)
 * - sanitizeInput(input) - Input sanitization
 * - validateTokenFormat(token) - Token format validation
 * 
 * Test scenarios:
 * - UUID generation: proper format, uniqueness (1000+ samples)
 * - Token generation: length validation, character set, entropy
 * - Token hashing: consistency, collision resistance (basic)
 * - Input sanitization: XSS prevention, SQL injection patterns
 * - Token validation: valid formats, invalid formats
 * - Edge cases: very long inputs, binary data, null bytes
 */

const {
  generateUUID,
  generateSecureToken,
  hashToken,
  sanitizeInput,
  validateTokenFormat
} = require('../../../extension/shared/utils/security.js')

describe('Security Utilities (T071H)', () => {
  
  // ============================================================================
  // generateUUID() Tests
  // ============================================================================
  
  describe('generateUUID()', () => {
    
    describe('UUID format validation', () => {
      it('should generate UUID with correct format', () => {
        const uuid = generateUUID()
        
        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        
        expect(uuid).toMatch(uuidPattern)
      })

      it('should have correct version digit (4)', () => {
        const uuid = generateUUID()
        const versionDigit = uuid.charAt(14)
        
        expect(versionDigit).toBe('4')
      })

      it('should have correct variant digit (8, 9, a, or b)', () => {
        const uuid = generateUUID()
        const variantDigit = uuid.charAt(19).toLowerCase()
        
        expect(['8', '9', 'a', 'b']).toContain(variantDigit)
      })

      it('should generate UUID with 36 characters (including hyphens)', () => {
        const uuid = generateUUID()
        
        expect(uuid.length).toBe(36)
      })

      it('should have hyphens in correct positions', () => {
        const uuid = generateUUID()
        
        expect(uuid.charAt(8)).toBe('-')
        expect(uuid.charAt(13)).toBe('-')
        expect(uuid.charAt(18)).toBe('-')
        expect(uuid.charAt(23)).toBe('-')
      })
    })

    describe('UUID uniqueness', () => {
      it('should generate unique UUIDs (100 samples)', () => {
        const uuids = new Set()
        const sampleSize = 100
        
        for (let i = 0; i < sampleSize; i++) {
          uuids.add(generateUUID())
        }
        
        expect(uuids.size).toBe(sampleSize)
      })

      it('should generate unique UUIDs (1000 samples)', () => {
        const uuids = new Set()
        const sampleSize = 1000
        
        for (let i = 0; i < sampleSize; i++) {
          uuids.add(generateUUID())
        }
        
        expect(uuids.size).toBe(sampleSize)
      })

      it('should not generate sequential UUIDs', () => {
        const uuid1 = generateUUID()
        const uuid2 = generateUUID()
        const uuid3 = generateUUID()
        
        expect(uuid1).not.toBe(uuid2)
        expect(uuid2).not.toBe(uuid3)
        expect(uuid1).not.toBe(uuid3)
      })
    })

    describe('UUID consistency', () => {
      it('should generate different UUIDs on repeated calls', () => {
        const results = []
        
        for (let i = 0; i < 10; i++) {
          results.push(generateUUID())
        }
        
        const uniqueResults = [...new Set(results)]
        expect(uniqueResults.length).toBe(10)
      })
    })
  })

  // ============================================================================
  // generateSecureToken() Tests
  // ============================================================================
  
  describe('generateSecureToken()', () => {
    
    describe('Token generation with default length', () => {
      it('should generate token with default length (32)', () => {
        const token = generateSecureToken()
        
        expect(token.length).toBe(32)
      })

      it('should contain only alphanumeric characters', () => {
        const token = generateSecureToken()
        
        expect(token).toMatch(/^[A-Za-z0-9]+$/)
      })

      it('should generate different tokens on repeated calls', () => {
        const token1 = generateSecureToken()
        const token2 = generateSecureToken()
        
        expect(token1).not.toBe(token2)
      })
    })

    describe('Token generation with custom length', () => {
      it('should generate token with length 16', () => {
        const token = generateSecureToken(16)
        
        expect(token.length).toBe(16)
      })

      it('should generate token with length 48', () => {
        const token = generateSecureToken(48)
        
        expect(token.length).toBe(48)
      })

      it('should generate token with length 64', () => {
        const token = generateSecureToken(64)
        
        expect(token.length).toBe(64)
      })

      it('should generate token with length 128', () => {
        const token = generateSecureToken(128)
        
        expect(token.length).toBe(128)
      })

      it('should generate token with minimum length (1)', () => {
        const token = generateSecureToken(1)
        
        expect(token.length).toBe(1)
      })
    })

    describe('Token character set validation', () => {
      it('should use uppercase letters (A-Z)', () => {
        const tokens = []
        for (let i = 0; i < 10; i++) {
          tokens.push(generateSecureToken(100))
        }
        
        const combined = tokens.join('')
        expect(combined).toMatch(/[A-Z]/)
      })

      it('should use lowercase letters (a-z)', () => {
        const tokens = []
        for (let i = 0; i < 10; i++) {
          tokens.push(generateSecureToken(100))
        }
        
        const combined = tokens.join('')
        expect(combined).toMatch(/[a-z]/)
      })

      it('should use digits (0-9)', () => {
        const tokens = []
        for (let i = 0; i < 10; i++) {
          tokens.push(generateSecureToken(100))
        }
        
        const combined = tokens.join('')
        expect(combined).toMatch(/[0-9]/)
      })

      it('should not contain special characters', () => {
        const token = generateSecureToken(100)
        
        expect(token).not.toMatch(/[^A-Za-z0-9]/)
      })
    })

    describe('Token uniqueness and entropy', () => {
      it('should generate unique tokens (100 samples)', () => {
        const tokens = new Set()
        const sampleSize = 100
        
        for (let i = 0; i < sampleSize; i++) {
          tokens.add(generateSecureToken(32))
        }
        
        expect(tokens.size).toBe(sampleSize)
      })

      it('should generate unique tokens (1000 samples)', () => {
        const tokens = new Set()
        const sampleSize = 1000
        
        for (let i = 0; i < sampleSize; i++) {
          tokens.add(generateSecureToken(48))
        }
        
        expect(tokens.size).toBe(sampleSize)
      })

      it('should have good entropy (no obvious patterns)', () => {
        const token = generateSecureToken(100)
        
        // Check for repetitive patterns (same char repeated >5 times)
        expect(token).not.toMatch(/(.)\1{5,}/)
      })

      it('should have varied character distribution', () => {
        const token = generateSecureToken(100)
        
        // Count unique characters
        const uniqueChars = new Set(token).size
        
        // Should have at least 20 different characters in 100-char string
        expect(uniqueChars).toBeGreaterThan(20)
      })
    })

    describe('Token validation and edge cases', () => {
      it('should throw error for invalid length (0)', () => {
        expect(() => generateSecureToken(0)).toThrow('Token length must be between 1 and 1024')
      })

      it('should throw error for negative length', () => {
        expect(() => generateSecureToken(-10)).toThrow('Token length must be between 1 and 1024')
      })

      it('should throw error for length > 1024', () => {
        expect(() => generateSecureToken(1025)).toThrow('Token length must be between 1 and 1024')
      })

      it('should throw error for non-number length', () => {
        expect(() => generateSecureToken('32')).toThrow('Token length must be between 1 and 1024')
      })

      it('should throw error for null length', () => {
        expect(() => generateSecureToken(null)).toThrow('Token length must be between 1 and 1024')
      })
    })
  })

  // ============================================================================
  // hashToken() Tests
  // ============================================================================
  
  describe('hashToken()', () => {
    
    describe('Basic hash functionality', () => {
      it('should generate hash for simple token', () => {
        const token = 'my-secret-token'
        const hash = hashToken(token)
        
        expect(hash).toBeTruthy()
        expect(typeof hash).toBe('string')
      })

      it('should generate 8-character hex hash', () => {
        const token = 'test-token-123'
        const hash = hashToken(token)
        
        expect(hash.length).toBe(8)
        expect(hash).toMatch(/^[0-9a-f]{8}$/)
      })

      it('should generate consistent hash for same input', () => {
        const token = 'consistent-token'
        const hash1 = hashToken(token)
        const hash2 = hashToken(token)
        const hash3 = hashToken(token)
        
        expect(hash1).toBe(hash2)
        expect(hash2).toBe(hash3)
      })

      it('should generate different hashes for different inputs', () => {
        const hash1 = hashToken('token-1')
        const hash2 = hashToken('token-2')
        const hash3 = hashToken('token-3')
        
        expect(hash1).not.toBe(hash2)
        expect(hash2).not.toBe(hash3)
        expect(hash1).not.toBe(hash3)
      })
    })

    describe('Hash collision resistance (basic)', () => {
      it('should generate different hashes for similar strings', () => {
        const hash1 = hashToken('test')
        const hash2 = hashToken('Test')
        const hash3 = hashToken('test1')
        
        expect(hash1).not.toBe(hash2)
        expect(hash1).not.toBe(hash3)
      })

      it('should handle very long tokens', () => {
        const longToken = 'a'.repeat(10000)
        const hash = hashToken(longToken)
        
        expect(hash.length).toBe(8)
        expect(hash).toMatch(/^[0-9a-f]{8}$/)
      })

      it('should generate unique hashes for 100 different tokens', () => {
        const hashes = new Set()
        
        for (let i = 0; i < 100; i++) {
          const token = `token-${i}-${Math.random()}`
          hashes.add(hashToken(token))
        }
        
        // Expect at least 95% uniqueness (some collisions acceptable)
        expect(hashes.size).toBeGreaterThan(95)
      })
    })

    describe('Hash with special characters', () => {
      it('should hash token with spaces', () => {
        const token = 'token with spaces'
        const hash = hashToken(token)
        
        expect(hash.length).toBe(8)
      })

      it('should hash token with special characters', () => {
        const token = 'token!@#$%^&*()'
        const hash = hashToken(token)
        
        expect(hash.length).toBe(8)
      })

      it('should hash token with Unicode characters', () => {
        const token = 'token-café-日本語'
        const hash = hashToken(token)
        
        expect(hash.length).toBe(8)
      })

      it('should hash token with emojis', () => {
        const token = 'token-🔐🔑🛡️'
        const hash = hashToken(token)
        
        expect(hash.length).toBe(8)
      })
    })

    describe('Hash edge cases', () => {
      it('should return empty string for null token', () => {
        const hash = hashToken(null)
        
        expect(hash).toBe('')
      })

      it('should return empty string for undefined token', () => {
        const hash = hashToken(undefined)
        
        expect(hash).toBe('')
      })

      it('should return empty string for empty string', () => {
        const hash = hashToken('')
        
        expect(hash).toBe('')
      })

      it('should return empty string for non-string input', () => {
        const hash = hashToken(12345)
        
        expect(hash).toBe('')
      })

      it('should hash single character', () => {
        const hash = hashToken('a')
        
        expect(hash.length).toBe(8)
      })
    })
  })

  // ============================================================================
  // sanitizeInput() Tests
  // ============================================================================
  
  describe('sanitizeInput()', () => {
    
    describe('XSS prevention', () => {
      it('should remove script tags', () => {
        const input = '<script>alert("XSS")</script>'
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('<script>')
        expect(result).not.toContain('</script>')
      })

      it('should remove HTML tags', () => {
        const input = '<div>Hello <b>World</b></div>'
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('<div>')
        expect(result).not.toContain('<b>')
        expect(result).toContain('Hello')
        expect(result).toContain('World')
      })

      it('should escape HTML entities', () => {
        const input = 'Test & Demo < 100 > 50'
        const result = sanitizeInput(input)
        
        expect(result).toContain('&amp;')
        expect(result).toContain('&lt;')
        expect(result).toContain('&gt;')
      })

      it('should remove javascript: protocol', () => {
        const input = '<a href="javascript:alert(1)">Click</a>'
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('javascript:')
      })

      it('should remove data: protocol', () => {
        const input = '<img src="data:text/html,<script>alert(1)</script>">'
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('data:')
      })

      it('should remove event handlers', () => {
        const input = '<div onclick="alert(1)">Click</div>'
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('onclick=')
      })

      it('should handle nested XSS attempts', () => {
        const input = '<scr<script>ipt>alert(1)</scr</script>ipt>'
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('<script>')
      })
    })

    describe('SQL injection prevention', () => {
      it('should remove SELECT statement', () => {
        const input = "test'; SELECT * FROM users; --"
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('SELECT')
      })

      it('should remove INSERT statement', () => {
        const input = "test'; INSERT INTO users VALUES ('admin', 'pass'); --"
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('INSERT')
      })

      it('should remove DROP statement', () => {
        const input = "test'; DROP TABLE users; --"
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('DROP')
      })

      it('should remove UPDATE statement', () => {
        const input = "test'; UPDATE users SET admin=1; --"
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('UPDATE')
      })

      it('should remove DELETE statement', () => {
        const input = "test'; DELETE FROM users; --"
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('DELETE')
      })

      it('should remove SQL comments (--)', () => {
        const input = "test' OR 1=1 --"
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('--')
      })

      it('should remove SQL comments (/* */)', () => {
        const input = "test /* comment */ OR 1=1"
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('/*')
        expect(result).not.toContain('*/')
      })

      it('should remove OR/AND with quotes', () => {
        const input = "test' OR '1'='1"
        const result = sanitizeInput(input)
        
        expect(result).not.toMatch(/'.*OR.*'/)
      })

      it('should remove UNION statement', () => {
        const input = "test' UNION SELECT * FROM passwords --"
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('UNION')
      })
    })

    describe('Binary data and null bytes', () => {
      it('should remove null bytes', () => {
        const input = 'test\0value'
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('\0')
        expect(result).toBe('testvalue')
      })

      it('should handle multiple null bytes', () => {
        const input = 'test\0\0\0value'
        const result = sanitizeInput(input)
        
        expect(result).toBe('testvalue')
      })
    })

    describe('Input normalization', () => {
      it('should normalize whitespace', () => {
        const input = 'test    multiple     spaces'
        const result = sanitizeInput(input)
        
        expect(result).toBe('test multiple spaces')
      })

      it('should trim leading and trailing whitespace', () => {
        const input = '   test value   '
        const result = sanitizeInput(input)
        
        expect(result).toBe('test value')
      })

      it('should handle newlines and tabs', () => {
        const input = 'test\n\tvalue'
        const result = sanitizeInput(input)
        
        expect(result).toBe('test value')
      })
    })

    describe('Length limits', () => {
      it('should limit very long input (> 10,000 chars)', () => {
        const input = 'a'.repeat(15000)
        const result = sanitizeInput(input)
        
        expect(result.length).toBe(10000)
      })

      it('should not truncate normal length input', () => {
        const input = 'a'.repeat(5000)
        const result = sanitizeInput(input)
        
        expect(result.length).toBe(5000)
      })
    })

    describe('Edge cases', () => {
      it('should return empty string for null', () => {
        const result = sanitizeInput(null)
        
        expect(result).toBe('')
      })

      it('should return empty string for undefined', () => {
        const result = sanitizeInput(undefined)
        
        expect(result).toBe('')
      })

      it('should return empty string for empty string', () => {
        const result = sanitizeInput('')
        
        expect(result).toBe('')
      })

      it('should return empty string for non-string input', () => {
        const result = sanitizeInput(12345)
        
        expect(result).toBe('')
      })

      it('should handle Unicode characters', () => {
        const input = 'café résumé über'
        const result = sanitizeInput(input)
        
        expect(result).toContain('café')
        expect(result).toContain('résumé')
      })

      it('should handle emojis', () => {
        const input = 'Hello 👋 World 🌍'
        const result = sanitizeInput(input)
        
        expect(result).toContain('Hello')
        expect(result).toContain('World')
      })
    })

    describe('Real-world XSS payloads', () => {
      it('should sanitize image onerror XSS', () => {
        const input = '<img src=x onerror=alert(1)>'
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('onerror')
        expect(result).not.toContain('<img')
      })

      it('should sanitize SVG XSS', () => {
        const input = '<svg/onload=alert(1)>'
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('onload')
        expect(result).not.toContain('<svg')
      })

      it('should sanitize iframe XSS', () => {
        const input = '<iframe src="javascript:alert(1)"></iframe>'
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('javascript:')
        expect(result).not.toContain('<iframe')
      })

      it('should sanitize form action XSS', () => {
        const input = '<form action="javascript:alert(1)"><button>Submit</button></form>'
        const result = sanitizeInput(input)
        
        expect(result).not.toContain('javascript:')
        expect(result).not.toContain('<form')
      })
    })
  })

  // ============================================================================
  // validateTokenFormat() Tests
  // ============================================================================
  
  describe('validateTokenFormat()', () => {
    
    describe('UUID v4 format validation', () => {
      it('should validate correct UUID v4 format', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000'
        const result = validateTokenFormat(uuid)
        
        expect(result).toBe(true)
      })

      it('should validate UUID v4 with uppercase', () => {
        const uuid = '550E8400-E29B-41D4-A716-446655440000'
        const result = validateTokenFormat(uuid)
        
        expect(result).toBe(true)
      })

      it('should validate UUID v4 with mixed case', () => {
        const uuid = '550e8400-E29B-41d4-A716-446655440000'
        const result = validateTokenFormat(uuid)
        
        expect(result).toBe(true)
      })

      it('should reject UUID with wrong version (3 instead of 4)', () => {
        const uuid = '550e8400-e29b-31d4-a716-446655440000'
        const result = validateTokenFormat(uuid)
        
        expect(result).toBe(false)
      })

      it('should reject UUID with wrong variant', () => {
        const uuid = '550e8400-e29b-41d4-1716-446655440000'
        const result = validateTokenFormat(uuid)
        
        expect(result).toBe(false)
      })

      it('should reject UUID without hyphens', () => {
        const uuid = '550e8400e29b41d4a716446655440000'
        const result = validateTokenFormat(uuid)
        
        expect(result).toBe(false)
      })
    })

    describe('Prefixed token format validation', () => {
      it('should validate prefixed token (sk- prefix)', () => {
        const token = 'sk-aBcD1234eFgH5678iJkL9012mNoPqRsT'
        const result = validateTokenFormat(token)
        
        expect(result).toBe(true)
      })

      it('should validate prefixed token (api- prefix)', () => {
        const token = 'api-1234567890abcdef1234567890abcdef'
        const result = validateTokenFormat(token)
        
        expect(result).toBe(true)
      })

      it('should validate prefixed token (token- prefix)', () => {
        const token = 'token-xyz123abc456def789ghi012jkl345'
        const result = validateTokenFormat(token)
        
        expect(result).toBe(true)
      })

      it('should reject prefixed token with short value (<16 chars)', () => {
        const token = 'sk-abc123'
        const result = validateTokenFormat(token)
        
        expect(result).toBe(false)
      })

      it('should reject prefixed token with invalid prefix (too long)', () => {
        const token = 'verylongprefix-abcdef1234567890abcdef'
        const result = validateTokenFormat(token)
        
        expect(result).toBe(false)
      })

      it('should reject prefixed token with invalid prefix (too short)', () => {
        const token = 'a-abcdef1234567890abcdef'
        const result = validateTokenFormat(token)
        
        expect(result).toBe(false)
      })
    })

    describe('Simple alphanumeric token validation', () => {
      it('should validate simple alphanumeric token (16+ chars)', () => {
        const token = 'abcdef1234567890'
        const result = validateTokenFormat(token)
        
        expect(result).toBe(true)
      })

      it('should validate simple alphanumeric token (32 chars)', () => {
        const token = 'aBcD1234eFgH5678iJkL9012mNoPqRsT'
        const result = validateTokenFormat(token)
        
        expect(result).toBe(true)
      })

      it('should validate simple alphanumeric token (64 chars)', () => {
        const token = 'a'.repeat(32) + 'B'.repeat(32)
        const result = validateTokenFormat(token)
        
        expect(result).toBe(true)
      })

      it('should reject simple token with special characters', () => {
        const token = 'abcdef1234567890!@#$'
        const result = validateTokenFormat(token)
        
        expect(result).toBe(false)
      })

      it('should reject simple token with spaces', () => {
        const token = 'abcd ef12 3456 7890'
        const result = validateTokenFormat(token)
        
        expect(result).toBe(false)
      })

      it('should reject simple token too short (<16 chars)', () => {
        const token = 'abc123xyz789'
        const result = validateTokenFormat(token)
        
        expect(result).toBe(false)
      })
    })

    describe('Invalid token formats', () => {
      it('should reject empty string', () => {
        const result = validateTokenFormat('')
        
        expect(result).toBe(false)
      })

      it('should reject null', () => {
        const result = validateTokenFormat(null)
        
        expect(result).toBe(false)
      })

      it('should reject undefined', () => {
        const result = validateTokenFormat(undefined)
        
        expect(result).toBe(false)
      })

      it('should reject non-string input', () => {
        const result = validateTokenFormat(12345)
        
        expect(result).toBe(false)
      })

      it('should reject token with invalid characters', () => {
        const token = 'invalid-token-with-!@#$%^&*()'
        const result = validateTokenFormat(token)
        
        expect(result).toBe(false)
      })

      it('should reject token with only special characters', () => {
        const token = '!@#$%^&*()_+-=[]{}|;:,.<>?/'
        const result = validateTokenFormat(token)
        
        expect(result).toBe(false)
      })
    })

    describe('Real-world token examples', () => {
      it('should validate GitHub token format', () => {
        const token = 'ghp_' + 'a'.repeat(36) // GitHub personal access token format
        const result = validateTokenFormat(token)
        
        expect(result).toBe(true)
      })

      it('should validate API key format', () => {
        const token = 'AIza' + 'B'.repeat(35) // Google API key format
        const result = validateTokenFormat(token)
        
        expect(result).toBe(true)
      })

      it('should validate generated UUID', () => {
        const uuid = generateUUID()
        const result = validateTokenFormat(uuid)
        
        expect(result).toBe(true)
      })

      it('should validate generated secure token', () => {
        const token = generateSecureToken(48)
        const result = validateTokenFormat(token)
        
        expect(result).toBe(true)
      })
    })
  })

  // ============================================================================
  // Performance Tests
  // ============================================================================
  
  describe('Performance', () => {
    
    it('should generate 1000 UUIDs in reasonable time', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        generateUUID()
      }
      
      const duration = Date.now() - startTime
      
      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100)
    })

    it('should generate 1000 secure tokens in reasonable time', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        generateSecureToken(32)
      }
      
      const duration = Date.now() - startTime
      
      // Should complete in less than 200ms
      expect(duration).toBeLessThan(200)
    })

    it('should hash 1000 tokens in reasonable time', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        hashToken(`token-${i}`)
      }
      
      const duration = Date.now() - startTime
      
      // Should complete in less than 50ms
      expect(duration).toBeLessThan(50)
    })

    it('should sanitize 1000 inputs in reasonable time', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        sanitizeInput(`<script>alert(${i})</script>`)
      }
      
      const duration = Date.now() - startTime
      
      // Should complete in less than 500ms
      expect(duration).toBeLessThan(500)
    })

    it('should validate 1000 token formats in reasonable time', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        validateTokenFormat(`token-${i}`)
      }
      
      const duration = Date.now() - startTime
      
      // Should complete in less than 50ms
      expect(duration).toBeLessThan(50)
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================
  
  describe('Integration', () => {
    
    it('should generate, hash, and validate UUID', () => {
      const uuid = generateUUID()
      const hash = hashToken(uuid)
      const isValid = validateTokenFormat(uuid)
      
      expect(uuid).toBeTruthy()
      expect(hash).toBeTruthy()
      expect(hash.length).toBe(8)
      expect(isValid).toBe(true)
    })

    it('should generate, hash, and validate secure token', () => {
      const token = generateSecureToken(48)
      const hash = hashToken(token)
      const isValid = validateTokenFormat(token)
      
      expect(token).toBeTruthy()
      expect(token.length).toBe(48)
      expect(hash).toBeTruthy()
      expect(hash.length).toBe(8)
      expect(isValid).toBe(true)
    })

    it('should sanitize and validate user input', () => {
      const userInput = '<script>alert("XSS")</script>Hello World'
      const sanitized = sanitizeInput(userInput)
      const hash = hashToken(sanitized)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toContain('Hello World')
      expect(hash).toBeTruthy()
    })

    it('should complete full security workflow', () => {
      // Generate secure token
      const token = generateSecureToken(32)
      expect(token.length).toBe(32)
      
      // Validate token format
      expect(validateTokenFormat(token)).toBe(true)
      
      // Hash token for storage
      const hash = hashToken(token)
      expect(hash.length).toBe(8)
      
      // Verify hash consistency
      expect(hashToken(token)).toBe(hash)
      
      // Sanitize related user input
      const userInput = `Token: ${token} <script>steal()</script>`
      const sanitized = sanitizeInput(userInput)
      expect(sanitized).toContain('Token:')
      expect(sanitized).not.toContain('<script>')
    })
  })
})

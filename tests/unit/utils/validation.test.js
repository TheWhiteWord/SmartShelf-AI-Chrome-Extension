/**
 * Unit Tests: Validation Utilities (T071G)
 * Test suite for extension/shared/utils/validation.js
 * 
 * Following TDD principles - comprehensive validation testing
 * 
 * Functions tested:
 * - validateUrl(url) - URL validation (RFC 3986)
 * - validateEmail(email) - Email validation
 * - validateHexColor(color) - Hex color format (#RGB or #RRGGBB)
 * - validateUUID(uuid) - UUID v4 validation
 * - validateISBN(isbn) - ISBN-10/13 validation
 * - validateDateFormat(date) - ISO 8601 date validation
 */

const {
  validateUrl,
  validateEmail,
  validateHexColor,
  validateUUID,
  validateISBN,
  validateDateFormat
} = require('../../../extension/shared/utils/validation.js')

describe('Validation Utilities', () => {
  
  describe('validateUrl()', () => {
    
    describe('Valid URLs', () => {
      it('should validate simple HTTP URL', () => {
        const url = 'http://example.com'
        expect(validateUrl(url)).toBe(true)
      })

      it('should validate simple HTTPS URL', () => {
        const url = 'https://example.com'
        expect(validateUrl(url)).toBe(true)
      })

      it('should validate FTP URL', () => {
        const url = 'ftp://files.example.com'
        expect(validateUrl(url)).toBe(true)
      })

      it('should validate file:// URL', () => {
        const url = 'file:///home/user/document.pdf'
        expect(validateUrl(url)).toBe(true)
      })

      it('should validate URL with path', () => {
        const url = 'https://example.com/path/to/page'
        expect(validateUrl(url)).toBe(true)
      })

      it('should validate URL with query parameters', () => {
        const url = 'https://example.com/search?q=test&page=1'
        expect(validateUrl(url)).toBe(true)
      })

      it('should validate URL with hash fragment', () => {
        const url = 'https://example.com/page#section'
        expect(validateUrl(url)).toBe(true)
      })

      it('should validate URL with port', () => {
        const url = 'https://example.com:8080/api'
        expect(validateUrl(url)).toBe(true)
      })

      it('should validate URL with subdomain', () => {
        const url = 'https://api.example.com/v1/users'
        expect(validateUrl(url)).toBe(true)
      })

      it('should validate localhost URL', () => {
        const url = 'http://localhost:3000'
        expect(validateUrl(url)).toBe(true)
      })

      it('should validate IP address URL', () => {
        const url = 'http://192.168.1.1'
        expect(validateUrl(url)).toBe(true)
      })
    })

    describe('Invalid URLs', () => {
      it('should reject URL without protocol', () => {
        const url = 'example.com'
        expect(validateUrl(url)).toBe(false)
      })

      it('should reject URL with invalid protocol', () => {
        const url = 'javascript:alert(1)'
        expect(validateUrl(url)).toBe(false)
      })

      it('should reject URL with unsupported protocol', () => {
        const url = 'mailto:user@example.com'
        expect(validateUrl(url)).toBe(false)
      })

      it('should reject malformed URL with broken syntax', () => {
        const url = 'http://example..com'
        expect(validateUrl(url)).toBe(false)
      })

      it('should reject URL with spaces', () => {
        const url = 'http://example .com'
        expect(validateUrl(url)).toBe(false)
      })

      it('should reject empty string', () => {
        expect(validateUrl('')).toBe(false)
      })

      it('should reject whitespace-only string', () => {
        expect(validateUrl('   ')).toBe(false)
      })

      it('should reject null', () => {
        expect(validateUrl(null)).toBe(false)
      })

      it('should reject undefined', () => {
        expect(validateUrl(undefined)).toBe(false)
      })

      it('should reject non-string input', () => {
        expect(validateUrl(12345)).toBe(false)
      })
    })
  })

  describe('validateEmail()', () => {
    
    describe('Valid Emails', () => {
      it('should validate simple email', () => {
        const email = 'user@example.com'
        expect(validateEmail(email)).toBe(true)
      })

      it('should validate email with subdomain', () => {
        const email = 'user@mail.example.com'
        expect(validateEmail(email)).toBe(true)
      })

      it('should validate email with plus sign', () => {
        const email = 'user+tag@example.com'
        expect(validateEmail(email)).toBe(true)
      })

      it('should validate email with dots', () => {
        const email = 'first.last@example.com'
        expect(validateEmail(email)).toBe(true)
      })

      it('should validate email with numbers', () => {
        const email = 'user123@example.com'
        expect(validateEmail(email)).toBe(true)
      })

      it('should validate email with hyphens in domain', () => {
        const email = 'user@my-company.com'
        expect(validateEmail(email)).toBe(true)
      })

      it('should validate email with underscore', () => {
        const email = 'user_name@example.com'
        expect(validateEmail(email)).toBe(true)
      })

      it('should validate email with multiple TLDs', () => {
        const email = 'user@example.co.uk'
        expect(validateEmail(email)).toBe(true)
      })
    })

    describe('Invalid Emails', () => {
      it('should reject email without @', () => {
        const email = 'userexample.com'
        expect(validateEmail(email)).toBe(false)
      })

      it('should reject email without domain', () => {
        const email = 'user@'
        expect(validateEmail(email)).toBe(false)
      })

      it('should reject email without local part', () => {
        const email = '@example.com'
        expect(validateEmail(email)).toBe(false)
      })

      it('should reject email with multiple @ signs', () => {
        const email = 'user@@example.com'
        expect(validateEmail(email)).toBe(false)
      })

      it('should reject email with spaces', () => {
        const email = 'user @example.com'
        expect(validateEmail(email)).toBe(false)
      })

      it('should reject email without TLD', () => {
        const email = 'user@example'
        expect(validateEmail(email)).toBe(false)
      })

      it('should reject email with invalid characters', () => {
        const email = 'user!#$%@example.com'
        expect(validateEmail(email)).toBe(false)
      })

      it('should reject empty string', () => {
        expect(validateEmail('')).toBe(false)
      })

      it('should reject whitespace-only string', () => {
        expect(validateEmail('   ')).toBe(false)
      })

      it('should reject null', () => {
        expect(validateEmail(null)).toBe(false)
      })

      it('should reject undefined', () => {
        expect(validateEmail(undefined)).toBe(false)
      })
    })
  })

  describe('validateHexColor()', () => {
    
    describe('Valid Hex Colors', () => {
      it('should validate 3-digit hex color (#RGB)', () => {
        const color = '#FFF'
        expect(validateHexColor(color)).toBe(true)
      })

      it('should validate 6-digit hex color (#RRGGBB)', () => {
        const color = '#FFFFFF'
        expect(validateHexColor(color)).toBe(true)
      })

      it('should validate lowercase hex color', () => {
        const color = '#ffffff'
        expect(validateHexColor(color)).toBe(true)
      })

      it('should validate mixed case hex color', () => {
        const color = '#FfFfFf'
        expect(validateHexColor(color)).toBe(true)
      })

      it('should validate 3-digit hex color with numbers', () => {
        const color = '#123'
        expect(validateHexColor(color)).toBe(true)
      })

      it('should validate 6-digit hex color with numbers', () => {
        const color = '#123456'
        expect(validateHexColor(color)).toBe(true)
      })

      it('should validate hex color with letters and numbers', () => {
        const color = '#A1B2C3'
        expect(validateHexColor(color)).toBe(true)
      })

      it('should validate black color', () => {
        const color = '#000'
        expect(validateHexColor(color)).toBe(true)
      })

      it('should validate white color', () => {
        const color = '#FFF'
        expect(validateHexColor(color)).toBe(true)
      })
    })

    describe('Invalid Hex Colors', () => {
      it('should reject hex color without #', () => {
        const color = 'FFFFFF'
        expect(validateHexColor(color)).toBe(false)
      })

      it('should reject hex color with invalid length (4 digits)', () => {
        const color = '#FFFF'
        expect(validateHexColor(color)).toBe(false)
      })

      it('should reject hex color with invalid length (5 digits)', () => {
        const color = '#FFFFF'
        expect(validateHexColor(color)).toBe(false)
      })

      it('should reject hex color with invalid length (7 digits)', () => {
        const color = '#FFFFFFF'
        expect(validateHexColor(color)).toBe(false)
      })

      it('should reject hex color with invalid characters', () => {
        const color = '#GGGGGG'
        expect(validateHexColor(color)).toBe(false)
      })

      it('should reject hex color with special characters', () => {
        const color = '#FFF@FF'
        expect(validateHexColor(color)).toBe(false)
      })

      it('should reject empty string', () => {
        expect(validateHexColor('')).toBe(false)
      })

      it('should reject whitespace-only string', () => {
        expect(validateHexColor('   ')).toBe(false)
      })

      it('should reject null', () => {
        expect(validateHexColor(null)).toBe(false)
      })

      it('should reject undefined', () => {
        expect(validateHexColor(undefined)).toBe(false)
      })
    })
  })

  describe('validateUUID()', () => {
    
    describe('Valid UUIDs', () => {
      it('should validate proper UUID v4 format (lowercase)', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000'
        expect(validateUUID(uuid)).toBe(true)
      })

      it('should validate proper UUID v4 format (uppercase)', () => {
        const uuid = '550E8400-E29B-41D4-A716-446655440000'
        expect(validateUUID(uuid)).toBe(true)
      })

      it('should validate proper UUID v4 format (mixed case)', () => {
        const uuid = '550e8400-E29B-41d4-A716-446655440000'
        expect(validateUUID(uuid)).toBe(true)
      })

      it('should validate UUID v4 with version digit 4', () => {
        const uuid = '12345678-1234-4234-8234-123456789012'
        expect(validateUUID(uuid)).toBe(true)
      })

      it('should validate UUID v4 with variant digit 8', () => {
        const uuid = '12345678-1234-4234-8234-123456789012'
        expect(validateUUID(uuid)).toBe(true)
      })

      it('should validate UUID v4 with variant digit 9', () => {
        const uuid = '12345678-1234-4234-9234-123456789012'
        expect(validateUUID(uuid)).toBe(true)
      })

      it('should validate UUID v4 with variant digit a', () => {
        const uuid = '12345678-1234-4234-a234-123456789012'
        expect(validateUUID(uuid)).toBe(true)
      })

      it('should validate UUID v4 with variant digit b', () => {
        const uuid = '12345678-1234-4234-b234-123456789012'
        expect(validateUUID(uuid)).toBe(true)
      })
    })

    describe('Invalid UUIDs', () => {
      it('should reject UUID with wrong version digit (3)', () => {
        const uuid = '12345678-1234-3234-8234-123456789012'
        expect(validateUUID(uuid)).toBe(false)
      })

      it('should reject UUID with wrong version digit (5)', () => {
        const uuid = '12345678-1234-5234-8234-123456789012'
        expect(validateUUID(uuid)).toBe(false)
      })

      it('should reject UUID with wrong variant digit (c)', () => {
        const uuid = '12345678-1234-4234-c234-123456789012'
        expect(validateUUID(uuid)).toBe(false)
      })

      it('should reject UUID with wrong variant digit (f)', () => {
        const uuid = '12345678-1234-4234-f234-123456789012'
        expect(validateUUID(uuid)).toBe(false)
      })

      it('should reject UUID without hyphens', () => {
        const uuid = '550e8400e29b41d4a716446655440000'
        expect(validateUUID(uuid)).toBe(false)
      })

      it('should reject UUID with wrong format (too short)', () => {
        const uuid = '550e8400-e29b-41d4-a716-44665544000'
        expect(validateUUID(uuid)).toBe(false)
      })

      it('should reject UUID with wrong format (too long)', () => {
        const uuid = '550e8400-e29b-41d4-a716-4466554400000'
        expect(validateUUID(uuid)).toBe(false)
      })

      it('should reject UUID with invalid characters', () => {
        const uuid = '550e8400-e29b-41d4-a716-44665544000g'
        expect(validateUUID(uuid)).toBe(false)
      })

      it('should reject empty string', () => {
        expect(validateUUID('')).toBe(false)
      })

      it('should reject whitespace-only string', () => {
        expect(validateUUID('   ')).toBe(false)
      })

      it('should reject null', () => {
        expect(validateUUID(null)).toBe(false)
      })

      it('should reject undefined', () => {
        expect(validateUUID(undefined)).toBe(false)
      })
    })
  })

  describe('validateISBN()', () => {
    
    describe('Valid ISBN-10', () => {
      it('should validate ISBN-10 without hyphens', () => {
        const isbn = '0306406152'
        expect(validateISBN(isbn)).toBe(true)
      })

      it('should validate ISBN-10 with hyphens', () => {
        const isbn = '0-306-40615-2'
        expect(validateISBN(isbn)).toBe(true)
      })

      it('should validate ISBN-10 with X check digit', () => {
        const isbn = '043942089X'
        expect(validateISBN(isbn)).toBe(true)
      })

      it('should validate ISBN-10 with X check digit (lowercase)', () => {
        const isbn = '043942089x'
        expect(validateISBN(isbn)).toBe(true)
      })

      it('should validate ISBN-10 with spaces', () => {
        const isbn = '0 306 40615 2'
        expect(validateISBN(isbn)).toBe(true)
      })

      it('should validate ISBN-10: "The Hobbit"', () => {
        const isbn = '0-395-07122-4'
        expect(validateISBN(isbn)).toBe(true)
      })
    })

    describe('Valid ISBN-13', () => {
      it('should validate ISBN-13 without hyphens', () => {
        const isbn = '9780306406157'
        expect(validateISBN(isbn)).toBe(true)
      })

      it('should validate ISBN-13 with hyphens', () => {
        const isbn = '978-0-306-40615-7'
        expect(validateISBN(isbn)).toBe(true)
      })

      it('should validate ISBN-13 with spaces', () => {
        const isbn = '978 0 306 40615 7'
        expect(validateISBN(isbn)).toBe(true)
      })

      it('should validate ISBN-13: "Harry Potter"', () => {
        const isbn = '978-0-545-01022-1'
        expect(validateISBN(isbn)).toBe(true)
      })

      it('should validate ISBN-13: "1984"', () => {
        const isbn = '978-0-452-28423-4'
        expect(validateISBN(isbn)).toBe(true)
      })
    })

    describe('Invalid ISBNs', () => {
      it('should reject ISBN-10 with wrong check digit', () => {
        const isbn = '0306406153'
        expect(validateISBN(isbn)).toBe(false)
      })

      it('should reject ISBN-13 with wrong check digit', () => {
        const isbn = '9780306406158'
        expect(validateISBN(isbn)).toBe(false)
      })

      it('should reject ISBN with wrong length (9 digits)', () => {
        const isbn = '030640615'
        expect(validateISBN(isbn)).toBe(false)
      })

      it('should reject ISBN with wrong length (11 digits)', () => {
        const isbn = '03064061522'
        expect(validateISBN(isbn)).toBe(false)
      })

      it('should reject ISBN with wrong length (12 digits)', () => {
        const isbn = '978030640615'
        expect(validateISBN(isbn)).toBe(false)
      })

      it('should reject ISBN with invalid characters', () => {
        const isbn = '030640615A'
        expect(validateISBN(isbn)).toBe(false)
      })

      it('should reject ISBN-10 with X in wrong position', () => {
        const isbn = '0X06406152'
        expect(validateISBN(isbn)).toBe(false)
      })

      it('should reject empty string', () => {
        expect(validateISBN('')).toBe(false)
      })

      it('should reject whitespace-only string', () => {
        expect(validateISBN('   ')).toBe(false)
      })

      it('should reject null', () => {
        expect(validateISBN(null)).toBe(false)
      })

      it('should reject undefined', () => {
        expect(validateISBN(undefined)).toBe(false)
      })
    })
  })

  describe('validateDateFormat()', () => {
    
    describe('Valid ISO 8601 Dates', () => {
      it('should validate YYYY-MM-DD format', () => {
        const date = '2024-01-15'
        expect(validateDateFormat(date)).toBe(true)
      })

      it('should validate YYYY-MM-DDTHH:mm:ss format', () => {
        const date = '2024-01-15T10:30:45'
        expect(validateDateFormat(date)).toBe(true)
      })

      it('should validate YYYY-MM-DDTHH:mm:ss.sss format', () => {
        const date = '2024-01-15T10:30:45.123'
        expect(validateDateFormat(date)).toBe(true)
      })

      it('should validate YYYY-MM-DDTHH:mm:ss.sssZ format (UTC)', () => {
        const date = '2024-01-15T10:30:45.123Z'
        expect(validateDateFormat(date)).toBe(true)
      })

      it('should validate YYYY-MM-DDTHH:mm:ss+HH:mm format (timezone)', () => {
        const date = '2024-01-15T10:30:45+05:30'
        expect(validateDateFormat(date)).toBe(true)
      })

      it('should validate YYYY-MM-DDTHH:mm:ss-HH:mm format (negative timezone)', () => {
        const date = '2024-01-15T10:30:45-08:00'
        expect(validateDateFormat(date)).toBe(true)
      })

      it('should validate leap year date', () => {
        const date = '2024-02-29'
        expect(validateDateFormat(date)).toBe(true)
      })

      it('should validate date with single-digit milliseconds', () => {
        const date = '2024-01-15T10:30:45.1Z'
        expect(validateDateFormat(date)).toBe(true)
      })

      it('should validate date with double-digit milliseconds', () => {
        const date = '2024-01-15T10:30:45.12Z'
        expect(validateDateFormat(date)).toBe(true)
      })

      it('should validate current date', () => {
        const date = new Date().toISOString().split('T')[0]
        expect(validateDateFormat(date)).toBe(true)
      })
    })

    describe('Invalid ISO 8601 Dates', () => {
      it('should reject date with invalid month (00)', () => {
        const date = '2024-00-15'
        expect(validateDateFormat(date)).toBe(false)
      })

      it('should reject date with invalid month (13)', () => {
        const date = '2024-13-15'
        expect(validateDateFormat(date)).toBe(false)
      })

      it('should reject date with invalid day (00)', () => {
        const date = '2024-01-00'
        expect(validateDateFormat(date)).toBe(false)
      })

      it('should reject date with invalid day (32)', () => {
        const date = '2024-01-32'
        expect(validateDateFormat(date)).toBe(false)
      })

      it('should reject date with impossible date (Feb 30)', () => {
        const date = '2024-02-30'
        expect(validateDateFormat(date)).toBe(false)
      })

      it('should reject date with impossible date (Feb 29 in non-leap year)', () => {
        const date = '2023-02-29'
        expect(validateDateFormat(date)).toBe(false)
      })

      it('should reject date with invalid hour (24)', () => {
        const date = '2024-01-15T24:00:00'
        expect(validateDateFormat(date)).toBe(false)
      })

      it('should reject date with invalid minute (60)', () => {
        const date = '2024-01-15T10:60:00'
        expect(validateDateFormat(date)).toBe(false)
      })

      it('should reject date with invalid second (60)', () => {
        const date = '2024-01-15T10:30:60'
        expect(validateDateFormat(date)).toBe(false)
      })

      it('should reject date with wrong format (DD-MM-YYYY)', () => {
        const date = '15-01-2024'
        expect(validateDateFormat(date)).toBe(false)
      })

      it('should reject date with wrong separator (slash)', () => {
        const date = '2024/01/15'
        expect(validateDateFormat(date)).toBe(false)
      })

      it('should reject date with missing parts', () => {
        const date = '2024-01'
        expect(validateDateFormat(date)).toBe(false)
      })

      it('should reject empty string', () => {
        expect(validateDateFormat('')).toBe(false)
      })

      it('should reject whitespace-only string', () => {
        expect(validateDateFormat('   ')).toBe(false)
      })

      it('should reject null', () => {
        expect(validateDateFormat(null)).toBe(false)
      })

      it('should reject undefined', () => {
        expect(validateDateFormat(undefined)).toBe(false)
      })
    })

    describe('Edge Cases', () => {
      it('should validate minimum date (0001-01-01)', () => {
        const date = '0001-01-01'
        expect(validateDateFormat(date)).toBe(true)
      })

      it('should validate maximum day in January (31)', () => {
        const date = '2024-01-31'
        expect(validateDateFormat(date)).toBe(true)
      })

      it('should validate maximum day in April (30)', () => {
        const date = '2024-04-30'
        expect(validateDateFormat(date)).toBe(true)
      })

      it('should reject April 31 (invalid)', () => {
        const date = '2024-04-31'
        expect(validateDateFormat(date)).toBe(false)
      })

      it('should validate last day of year', () => {
        const date = '2024-12-31'
        expect(validateDateFormat(date)).toBe(true)
      })

      it('should validate midnight time', () => {
        const date = '2024-01-15T00:00:00'
        expect(validateDateFormat(date)).toBe(true)
      })

      it('should validate end of day time', () => {
        const date = '2024-01-15T23:59:59'
        expect(validateDateFormat(date)).toBe(true)
      })
    })
  })

  describe('Integration Tests', () => {
    
    it('should handle multiple validation checks in sequence', () => {
      expect(validateUrl('https://example.com')).toBe(true)
      expect(validateEmail('user@example.com')).toBe(true)
      expect(validateHexColor('#FFFFFF')).toBe(true)
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(validateISBN('978-0-306-40615-7')).toBe(true)
      expect(validateDateFormat('2024-01-15T10:30:45Z')).toBe(true)
    })

    it('should reject invalid inputs across all validators', () => {
      expect(validateUrl('invalid')).toBe(false)
      expect(validateEmail('invalid')).toBe(false)
      expect(validateHexColor('invalid')).toBe(false)
      expect(validateUUID('invalid')).toBe(false)
      expect(validateISBN('invalid')).toBe(false)
      expect(validateDateFormat('invalid')).toBe(false)
    })

    it('should handle edge cases consistently', () => {
      expect(validateUrl('')).toBe(false)
      expect(validateEmail('')).toBe(false)
      expect(validateHexColor('')).toBe(false)
      expect(validateUUID('')).toBe(false)
      expect(validateISBN('')).toBe(false)
      expect(validateDateFormat('')).toBe(false)
    })

    it('should handle null inputs consistently', () => {
      expect(validateUrl(null)).toBe(false)
      expect(validateEmail(null)).toBe(false)
      expect(validateHexColor(null)).toBe(false)
      expect(validateUUID(null)).toBe(false)
      expect(validateISBN(null)).toBe(false)
      expect(validateDateFormat(null)).toBe(false)
    })
  })

  describe('Performance Tests', () => {
    
    it('should validate 1000 URLs in under 100ms', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        validateUrl('https://example.com/page' + i)
      }
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(100)
    })

    it('should validate 1000 emails in under 100ms', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        validateEmail('user' + i + '@example.com')
      }
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(100)
    })

    it('should validate 1000 hex colors in under 50ms', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        validateHexColor('#FFFFFF')
      }
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(50)
    })

    it('should validate 1000 UUIDs in under 50ms', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        validateUUID('550e8400-e29b-41d4-a716-446655440000')
      }
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(50)
    })

    it('should validate 1000 ISBNs in under 100ms', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        validateISBN('978-0-306-40615-7')
      }
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(100)
    })

    it('should validate 1000 dates in under 200ms', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        validateDateFormat('2024-01-15T10:30:45Z')
      }
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(200)
    })
  })
})

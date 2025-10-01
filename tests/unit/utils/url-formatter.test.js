/**
 * Unit Tests: URL Formatting Utilities (T071D)
 * Test suite for extension/shared/utils/url-formatter.js
 * 
 * Following TDD principles - these tests MUST FAIL before implementation
 * 
 * Functions tested:
 * - formatUrl(url) - URL shortening for display
 * - formatSource(url) - Extract domain name
 * - extractDomain(url) - Domain extraction
 * - truncatePath(path, maxLength) - Path truncation
 */

const {
  formatUrl,
  formatSource,
  extractDomain,
  truncatePath
} = require('../../../extension/shared/utils/url-formatter.js')

describe('URL Formatting Utilities', () => {
  
  describe('formatUrl()', () => {
    
    describe('Standard HTTP/HTTPS URLs', () => {
      it('should format simple HTTP URL with domain only', () => {
        const url = 'http://example.com'
        const result = formatUrl(url)
        
        expect(result).toBe('example.com')
      })

      it('should format HTTPS URL with domain only', () => {
        const url = 'https://example.com'
        const result = formatUrl(url)
        
        expect(result).toBe('example.com')
      })

      it('should format URL with short path', () => {
        const url = 'https://example.com/about'
        const result = formatUrl(url)
        
        expect(result).toBe('example.com/about')
      })

      it('should format URL with multiple path segments', () => {
        const url = 'https://example.com/blog/2024/article'
        const result = formatUrl(url)
        
        expect(result).toBe('example.com/blog/2024/article')
      })
    })

    describe('URLs with www prefix', () => {
      it('should remove www prefix from domain', () => {
        const url = 'https://www.example.com'
        const result = formatUrl(url)
        
        expect(result).toBe('example.com')
      })

      it('should remove www prefix from URL with path', () => {
        const url = 'https://www.example.com/page'
        const result = formatUrl(url)
        
        expect(result).toBe('example.com/page')
      })

      it('should preserve www in subdomain other than www', () => {
        const url = 'https://www2.example.com'
        const result = formatUrl(url)
        
        expect(result).toBe('www2.example.com')
      })
    })

    describe('Long URLs (>50 chars)', () => {
      it('should truncate long path to 50 characters', () => {
        const url = 'https://example.com/very/long/path/with/many/segments/that/exceeds/fifty/characters/limit'
        const result = formatUrl(url)
        
        expect(result.length).toBeLessThanOrEqual(54) // domain + 50 chars + '...'
        expect(result).toContain('example.com')
        expect(result).toContain('...')
      })

      it('should truncate at word boundary when possible', () => {
        const url = 'https://example.com/path/to/some/very/long/article/title/that/should/be/truncated'
        const result = formatUrl(url)
        
        expect(result).toContain('example.com')
        expect(result).toMatch(/\.\.\.$/)
      })

      it('should not truncate URLs under 50 characters', () => {
        const url = 'https://example.com/short/path'
        const result = formatUrl(url)
        
        expect(result).toBe('example.com/short/path')
        expect(result).not.toContain('...')
      })
    })

    describe('URLs with query parameters', () => {
      it('should include query parameters in formatted URL', () => {
        const url = 'https://example.com/search?q=test'
        const result = formatUrl(url)
        
        expect(result).toContain('example.com/search')
        expect(result).toContain('?q=test')
      })

      it('should truncate URL with query parameters if too long', () => {
        const url = 'https://example.com/search?query=very+long+search+term+that+makes+url+exceed+limit&filter=all&sort=recent'
        const result = formatUrl(url)
        
        expect(result.length).toBeLessThanOrEqual(54)
        expect(result).toContain('...')
      })

      it('should handle multiple query parameters', () => {
        const url = 'https://example.com/page?a=1&b=2&c=3'
        const result = formatUrl(url)
        
        expect(result).toContain('example.com/page')
        expect(result).toContain('?')
      })
    })

    describe('URLs with hash fragments', () => {
      it('should include hash fragment in formatted URL', () => {
        const url = 'https://example.com/page#section'
        const result = formatUrl(url)
        
        expect(result).toContain('example.com/page')
        expect(result).toContain('#section')
      })

      it('should truncate URL with hash if too long', () => {
        const url = 'https://example.com/very/long/path/to/content#very-long-section-name-that-exceeds-limit'
        const result = formatUrl(url)
        
        expect(result.length).toBeLessThanOrEqual(54)
        expect(result).toContain('...')
      })

      it('should handle both query and hash', () => {
        const url = 'https://example.com/page?id=123#section'
        const result = formatUrl(url)
        
        expect(result).toContain('example.com/page')
        expect(result).toContain('?')
        expect(result).toContain('#')
      })
    })

    describe('Relative URLs', () => {
      it('should return relative URL as-is when no protocol', () => {
        const url = '/path/to/page'
        const result = formatUrl(url)
        
        expect(result).toBe('/path/to/page')
      })

      it('should handle relative URL with query', () => {
        const url = '/search?q=test'
        const result = formatUrl(url)
        
        expect(result).toBe('/search?q=test')
      })
    })

    describe('Invalid URLs', () => {
      it('should return original string for invalid URL', () => {
        const url = 'not a valid url'
        const result = formatUrl(url)
        
        expect(result).toBe('not a valid url')
      })

      it('should handle empty string', () => {
        const url = ''
        const result = formatUrl(url)
        
        expect(result).toBe('')
      })

      it('should handle null gracefully', () => {
        const url = null
        const result = formatUrl(url)
        
        expect(result).toBe('')
      })

      it('should handle undefined gracefully', () => {
        const url = undefined
        const result = formatUrl(url)
        
        expect(result).toBe('')
      })
    })

    describe('Edge cases', () => {
      it('should format localhost URL', () => {
        const url = 'http://localhost:3000/page'
        const result = formatUrl(url)
        
        expect(result).toContain('localhost:3000')
        expect(result).toContain('/page')
      })

      it('should format IP address URL', () => {
        const url = 'http://192.168.1.1:8080/admin'
        const result = formatUrl(url)
        
        expect(result).toContain('192.168.1.1:8080')
        expect(result).toContain('/admin')
      })

      it('should handle IDN (international domain names)', () => {
        const url = 'https://münchen.de/page'
        const result = formatUrl(url)
        
        // Node.js URL parser converts IDN to punycode (xn--mnchen-3ya.de)
        // Both forms are acceptable for display
        expect(result).toMatch(/(?:münchen|xn--mnchen-3ya)\.de/)
        expect(result).toContain('/page')
      })

      it('should format URL with port number', () => {
        const url = 'https://example.com:8443/secure'
        const result = formatUrl(url)
        
        expect(result).toContain('example.com:8443')
        expect(result).toContain('/secure')
      })

      it('should handle URLs with trailing slash', () => {
        const url = 'https://example.com/path/'
        const result = formatUrl(url)
        
        expect(result).toBe('example.com/path/')
      })

      it('should handle file:// protocol', () => {
        const url = 'file:///home/user/document.pdf'
        const result = formatUrl(url)
        
        expect(result).toContain('/home/user/document.pdf')
      })
    })
  })

  describe('formatSource()', () => {
    
    describe('Standard URLs', () => {
      it('should extract domain from HTTP URL', () => {
        const url = 'http://example.com/page'
        const result = formatSource(url)
        
        expect(result).toBe('example.com')
      })

      it('should extract domain from HTTPS URL', () => {
        const url = 'https://example.com/page'
        const result = formatSource(url)
        
        expect(result).toBe('example.com')
      })

      it('should extract domain with subdomain', () => {
        const url = 'https://blog.example.com/post'
        const result = formatSource(url)
        
        expect(result).toBe('blog.example.com')
      })
    })

    describe('URLs with www prefix', () => {
      it('should remove www prefix', () => {
        const url = 'https://www.example.com'
        const result = formatSource(url)
        
        expect(result).toBe('example.com')
      })

      it('should remove www from subdomain', () => {
        const url = 'https://www.blog.example.com'
        const result = formatSource(url)
        
        expect(result).toBe('blog.example.com')
      })
    })

    describe('Edge cases', () => {
      it('should handle localhost', () => {
        const url = 'http://localhost:3000'
        const result = formatSource(url)
        
        expect(result).toBe('localhost:3000')
      })

      it('should handle IP address', () => {
        const url = 'http://192.168.1.1:8080'
        const result = formatSource(url)
        
        expect(result).toBe('192.168.1.1:8080')
      })

      it('should handle URLs with port', () => {
        const url = 'https://example.com:8443'
        const result = formatSource(url)
        
        expect(result).toBe('example.com:8443')
      })

      it('should return original string for invalid URL', () => {
        const url = 'not a url'
        const result = formatSource(url)
        
        expect(result).toBe('not a url')
      })

      it('should handle empty string', () => {
        const url = ''
        const result = formatSource(url)
        
        expect(result).toBe('')
      })

      it('should handle null', () => {
        const url = null
        const result = formatSource(url)
        
        expect(result).toBe('')
      })
    })
  })

  describe('extractDomain()', () => {
    
    describe('Standard domain extraction', () => {
      it('should extract domain from HTTP URL', () => {
        const url = 'http://example.com/page'
        const result = extractDomain(url)
        
        expect(result).toBe('example.com')
      })

      it('should extract domain from HTTPS URL', () => {
        const url = 'https://example.com/page'
        const result = extractDomain(url)
        
        expect(result).toBe('example.com')
      })

      it('should preserve subdomain', () => {
        const url = 'https://blog.example.com/post'
        const result = extractDomain(url)
        
        expect(result).toBe('blog.example.com')
      })

      it('should preserve www prefix', () => {
        const url = 'https://www.example.com'
        const result = extractDomain(url)
        
        expect(result).toBe('www.example.com')
      })
    })

    describe('URLs with port numbers', () => {
      it('should include port in domain', () => {
        const url = 'https://example.com:8443/page'
        const result = extractDomain(url)
        
        expect(result).toBe('example.com:8443')
      })

      it('should handle localhost with port', () => {
        const url = 'http://localhost:3000'
        const result = extractDomain(url)
        
        expect(result).toBe('localhost:3000')
      })
    })

    describe('Special cases', () => {
      it('should extract domain from IP address URL', () => {
        const url = 'http://192.168.1.1:8080/admin'
        const result = extractDomain(url)
        
        expect(result).toBe('192.168.1.1:8080')
      })

      it('should handle IDN domains', () => {
        const url = 'https://münchen.de/page'
        const result = extractDomain(url)
        
        expect(result).toContain('de')
      })

      it('should handle file:// URLs', () => {
        const url = 'file:///home/user/file.html'
        const result = extractDomain(url)
        
        expect(result).toBe('')
      })

      it('should return empty string for invalid URL', () => {
        const url = 'not a url'
        const result = extractDomain(url)
        
        expect(result).toBe('')
      })

      it('should handle null', () => {
        const url = null
        const result = extractDomain(url)
        
        expect(result).toBe('')
      })

      it('should handle undefined', () => {
        const url = undefined
        const result = extractDomain(url)
        
        expect(result).toBe('')
      })
    })
  })

  describe('truncatePath()', () => {
    
    describe('Standard truncation', () => {
      it('should not truncate path shorter than maxLength', () => {
        const path = '/short/path'
        const result = truncatePath(path, 20)
        
        expect(result).toBe('/short/path')
      })

      it('should truncate path longer than maxLength', () => {
        const path = '/very/long/path/to/some/resource/file.html'
        const result = truncatePath(path, 20)
        
        expect(result.length).toBe(23) // 20 + '...'
        expect(result).toContain('...')
        expect(result).toMatch(/^\/very\/long\/path/)
      })

      it('should use default maxLength of 50', () => {
        const path = '/a'.repeat(60)
        const result = truncatePath(path)
        
        expect(result.length).toBe(53) // 50 + '...'
        expect(result).toContain('...')
      })
    })

    describe('Path with segments', () => {
      it('should truncate at path segment boundary when possible', () => {
        const path = '/blog/2024/january/article/very-long-title'
        const result = truncatePath(path, 25)
        
        expect(result).toMatch(/^\/blog\/2024\/january/)
        expect(result).toContain('...')
      })

      it('should handle path with query parameters', () => {
        const path = '/search?q=test&filter=all&sort=recent&limit=100'
        const result = truncatePath(path, 20)
        
        expect(result.length).toBe(23)
        expect(result).toContain('...')
      })

      it('should handle path with hash fragment', () => {
        const path = '/page#very-long-section-identifier'
        const result = truncatePath(path, 15)
        
        expect(result.length).toBe(18)
        expect(result).toContain('...')
      })
    })

    describe('Edge cases', () => {
      it('should handle empty path', () => {
        const path = ''
        const result = truncatePath(path, 20)
        
        expect(result).toBe('')
      })

      it('should handle root path', () => {
        const path = '/'
        const result = truncatePath(path, 20)
        
        expect(result).toBe('/')
      })

      it('should handle path with trailing slash', () => {
        const path = '/path/to/resource/'
        const result = truncatePath(path, 10)
        
        expect(result).toContain('...')
        expect(result.length).toBe(13)
      })

      it('should handle null path', () => {
        const path = null
        const result = truncatePath(path, 20)
        
        expect(result).toBe('')
      })

      it('should handle undefined path', () => {
        const path = undefined
        const result = truncatePath(path, 20)
        
        expect(result).toBe('')
      })

      it('should handle very small maxLength', () => {
        const path = '/long/path'
        const result = truncatePath(path, 5)
        
        expect(result).toBe('/long...')
      })

      it('should handle path without leading slash', () => {
        const path = 'path/to/resource'
        const result = truncatePath(path, 10)
        
        expect(result).toContain('...')
      })
    })

    describe('Special characters', () => {
      it('should handle URL-encoded characters', () => {
        const path = '/search?q=hello%20world&filter=all'
        const result = truncatePath(path, 20)
        
        expect(result.length).toBe(23)
        expect(result).toContain('...')
      })

      it('should handle unicode characters', () => {
        const path = '/article/测试文章/内容'
        const result = truncatePath(path, 15)
        
        expect(result.length).toBeLessThanOrEqual(18)
      })

      it('should handle special characters in path', () => {
        const path = '/path/with-dashes/and_underscores/and.dots'
        const result = truncatePath(path, 25)
        
        expect(result.length).toBe(28)
        expect(result).toContain('...')
      })
    })
  })

  describe('Integration scenarios', () => {
    
    it('should work together: formatUrl uses extractDomain and truncatePath', () => {
      const url = 'https://www.example.com/very/long/path/to/some/article/with/many/segments'
      const formatted = formatUrl(url)
      const domain = extractDomain(url)
      
      expect(formatted).toContain(domain.replace('www.', ''))
      expect(formatted.length).toBeLessThanOrEqual(54)
    })

    it('should work together: formatSource uses extractDomain', () => {
      const url = 'https://www.blog.example.com/article'
      const source = formatSource(url)
      const domain = extractDomain(url)
      
      expect(source).toBe(domain.replace('www.', ''))
    })

    it('should handle complete URL formatting workflow', () => {
      const urls = [
        'https://example.com',
        'https://www.example.com/path',
        'https://subdomain.example.com/very/long/path/that/exceeds/limit',
        'http://localhost:3000',
        'not a url'
      ]

      urls.forEach(url => {
        const formatted = formatUrl(url)
        const source = formatSource(url)
        
        expect(typeof formatted).toBe('string')
        expect(typeof source).toBe('string')
      })
    })
  })
})

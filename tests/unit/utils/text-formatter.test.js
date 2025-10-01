/**
 * Unit Tests: Text Formatting Utilities (T071F)
 * Test suite for extension/shared/utils/text-formatter.js
 * 
 * Following TDD principles established in this project
 * 
 * Functions tested:
 * - escapeHtml(text) - HTML entity escaping
 * - truncateText(text, maxLength) - Text truncation with ellipsis
 * - capitalizeWords(text) - Title case conversion
 * - slugify(text) - URL-safe slug generation
 * - stripHtml(html) - HTML tag removal
 * 
 * Test scenarios:
 * - Special characters: <, >, &, ", '
 * - Unicode characters and emojis
 * - Long text truncation (preserve word boundaries)
 * - Various capitalization inputs
 * - Special characters in slugs (spaces, punctuation)
 * - Nested HTML tags
 * - Edge cases: empty strings, null, undefined
 */

const {
  escapeHtml,
  truncateText,
  capitalizeWords,
  slugify,
  stripHtml
} = require('../../../extension/shared/utils/text-formatter.js')

describe('Text Formatting Utilities (T071F)', () => {
  
  // ============================================================================
  // escapeHtml() Tests
  // ============================================================================
  
  describe('escapeHtml()', () => {
    
    describe('Basic HTML entity escaping', () => {
      it('should escape ampersand (&)', () => {
        const text = 'Cats & Dogs'
        const result = escapeHtml(text)
        
        expect(result).toBe('Cats &amp; Dogs')
      })

      it('should escape less than (<)', () => {
        const text = '5 < 10'
        const result = escapeHtml(text)
        
        expect(result).toBe('5 &lt; 10')
      })

      it('should escape greater than (>)', () => {
        const text = '10 > 5'
        const result = escapeHtml(text)
        
        expect(result).toBe('10 &gt; 5')
      })

      it('should escape double quotes (")', () => {
        const text = 'He said "Hello"'
        const result = escapeHtml(text)
        
        expect(result).toBe('He said &quot;Hello&quot;')
      })

      it('should escape single quotes (\')', () => {
        const text = "It's a test"
        const result = escapeHtml(text)
        
        expect(result).toBe('It&#39;s a test')
      })
    })

    describe('Multiple special characters', () => {
      it('should escape all special characters in text', () => {
        const text = '<script>alert("XSS & injection")</script>'
        const result = escapeHtml(text)
        
        expect(result).toBe('&lt;script&gt;alert(&quot;XSS &amp; injection&quot;)&lt;/script&gt;')
      })

      it('should handle text with mixed special characters', () => {
        const text = 'Cats & Dogs > "Pets" <3'
        const result = escapeHtml(text)
        
        expect(result).toBe('Cats &amp; Dogs &gt; &quot;Pets&quot; &lt;3')
      })

      it('should escape attributes with quotes and special chars', () => {
        const text = 'onclick="alert(\'XSS\')"'
        const result = escapeHtml(text)
        
        expect(result).toBe('onclick=&quot;alert(&#39;XSS&#39;)&quot;')
      })
    })

    describe('Unicode and emojis', () => {
      it('should preserve Unicode characters', () => {
        const text = 'Café & Résumé'
        const result = escapeHtml(text)
        
        expect(result).toBe('Café &amp; Résumé')
      })

      it('should preserve emojis', () => {
        const text = '👋 Hello & 🌍 World!'
        const result = escapeHtml(text)
        
        expect(result).toBe('👋 Hello &amp; 🌍 World!')
      })

      it('should handle CJK characters with special chars', () => {
        const text = '你好 & "世界"'
        const result = escapeHtml(text)
        
        expect(result).toBe('你好 &amp; &quot;世界&quot;')
      })
    })

    describe('Edge cases', () => {
      it('should handle empty string', () => {
        const result = escapeHtml('')
        
        expect(result).toBe('')
      })

      it('should handle null input', () => {
        const result = escapeHtml(null)
        
        expect(result).toBe('')
      })

      it('should handle undefined input', () => {
        const result = escapeHtml(undefined)
        
        expect(result).toBe('')
      })

      it('should handle text without special characters', () => {
        const text = 'Hello World'
        const result = escapeHtml(text)
        
        expect(result).toBe('Hello World')
      })

      it('should handle numbers converted to string', () => {
        const result = escapeHtml(12345)
        
        expect(result).toBe('12345')
      })

      it('should handle boolean converted to string', () => {
        const result = escapeHtml(true)
        
        expect(result).toBe('true')
      })
    })
  })

  // ============================================================================
  // truncateText() Tests
  // ============================================================================
  
  describe('truncateText()', () => {
    
    describe('Basic truncation', () => {
      it('should not truncate text shorter than maxLength', () => {
        const text = 'Short text'
        const result = truncateText(text, 50)
        
        expect(result).toBe('Short text')
      })

      it('should truncate text longer than maxLength', () => {
        const text = 'This is a very long text that needs to be truncated'
        const result = truncateText(text, 20)
        
        expect(result).toMatch(/^.{17,20}\.\.\.$/u)
        expect(result.endsWith('...')).toBe(true)
      })

      it('should use default maxLength of 100', () => {
        const text = 'a'.repeat(150)
        const result = truncateText(text)
        
        expect(result.length).toBeLessThanOrEqual(103) // 100 + '...'
        expect(result.endsWith('...')).toBe(true)
      })

      it('should truncate text exactly at maxLength', () => {
        const text = 'This is exactly fifty characters in length here!'
        const result = truncateText(text, 30)
        
        expect(result.length).toBeLessThanOrEqual(33) // maxLength + '...'
        expect(result.endsWith('...')).toBe(true)
      })
    })

    describe('Word boundary preservation', () => {
      it('should preserve word boundaries when possible', () => {
        const text = 'The quick brown fox jumps over the lazy dog'
        const result = truncateText(text, 25)
        
        // Should break at space, not mid-word
        // With 85% threshold, breaks at 'fox ' (20 chars, 80%) instead of 'jumps' (26 chars)
        expect(result).toBe('The quick brown fox jumps...')
      })

      it('should not break words in middle', () => {
        const text = 'Supercalifragilisticexpialidocious is a long word'
        const result = truncateText(text, 20)
        
        // Should preserve the long word or break cleanly
        expect(result.endsWith('...')).toBe(true)
        expect(result.length).toBeLessThanOrEqual(23)
      })

      it('should handle text with no spaces (single long word)', () => {
        const text = 'averylongwordwithoutanyspacesinit'
        const result = truncateText(text, 20)
        
        expect(result).toBe('averylongwordwithout...')
      })

      it('should preserve word boundaries near end of maxLength', () => {
        const text = 'This is a test of the word boundary preservation algorithm'
        const result = truncateText(text, 30)
        
        // Should break at word boundary
        expect(result).toMatch(/\s\.\.\.$|[a-z]\.\.\.$/u)
      })
    })

    describe('Special characters in truncation', () => {
      it('should handle Unicode characters in truncation', () => {
        const text = 'Café résumé naïve Zürich über München'
        const result = truncateText(text, 20)
        
        expect(result.length).toBeLessThanOrEqual(23)
        expect(result.endsWith('...')).toBe(true)
      })

      it('should handle emojis in truncation', () => {
        const text = '👋 Hello 🌍 World 🎉 This is a test with emojis'
        const result = truncateText(text, 25)
        
        expect(result.length).toBeLessThanOrEqual(28)
        expect(result.endsWith('...')).toBe(true)
      })

      it('should handle newlines and tabs', () => {
        const text = 'Line 1\nLine 2\tTabbed\nLine 3 with more content here'
        const result = truncateText(text, 30)
        
        expect(result.length).toBeLessThanOrEqual(33)
        expect(result.endsWith('...')).toBe(true)
      })
    })

    describe('Edge cases', () => {
      it('should handle empty string', () => {
        const result = truncateText('', 50)
        
        expect(result).toBe('')
      })

      it('should handle null input', () => {
        const result = truncateText(null, 50)
        
        expect(result).toBe('')
      })

      it('should handle undefined input', () => {
        const result = truncateText(undefined, 50)
        
        expect(result).toBe('')
      })

      it('should handle very short maxLength (1)', () => {
        const text = 'Hello World'
        const result = truncateText(text, 1)
        
        expect(result).toBe('H...')
      })

      it('should handle zero maxLength (default to 100)', () => {
        const text = 'a'.repeat(150)
        const result = truncateText(text, 0)
        
        expect(result.length).toBeLessThanOrEqual(103)
      })

      it('should handle negative maxLength (default to 100)', () => {
        const text = 'a'.repeat(150)
        const result = truncateText(text, -10)
        
        expect(result.length).toBeLessThanOrEqual(103)
      })

      it('should handle non-string input (number)', () => {
        const result = truncateText(123456789, 5)
        
        expect(result).toBe('12345...')
      })

      it('should handle very long text (1000+ chars)', () => {
        const text = 'a'.repeat(1000)
        const result = truncateText(text, 50)
        
        expect(result).toBe('a'.repeat(50) + '...')
      })
    })
  })

  // ============================================================================
  // capitalizeWords() Tests
  // ============================================================================
  
  describe('capitalizeWords()', () => {
    
    describe('Basic capitalization', () => {
      it('should capitalize single word', () => {
        const text = 'hello'
        const result = capitalizeWords(text)
        
        expect(result).toBe('Hello')
      })

      it('should capitalize multiple words', () => {
        const text = 'hello world'
        const result = capitalizeWords(text)
        
        expect(result).toBe('Hello World')
      })

      it('should handle already capitalized text', () => {
        const text = 'Hello World'
        const result = capitalizeWords(text)
        
        expect(result).toBe('Hello World')
      })

      it('should handle all uppercase text', () => {
        const text = 'HELLO WORLD'
        const result = capitalizeWords(text)
        
        expect(result).toBe('Hello World')
      })

      it('should handle mixed case text', () => {
        const text = 'hELLo WoRLd'
        const result = capitalizeWords(text)
        
        expect(result).toBe('Hello World')
      })
    })

    describe('Punctuation and special characters', () => {
      it('should capitalize words after hyphen', () => {
        const text = 'mother-in-law'
        const result = capitalizeWords(text)
        
        expect(result).toBe('Mother-In-Law')
      })

      it('should handle words with apostrophes', () => {
        const text = "it's a beautiful day"
        const result = capitalizeWords(text)
        
        expect(result).toBe("It's A Beautiful Day")
      })

      it('should handle words separated by en-dash', () => {
        const text = 'pre–post analysis'
        const result = capitalizeWords(text)
        
        expect(result).toBe('Pre–Post Analysis')
      })

      it('should handle words separated by em-dash', () => {
        const text = 'hello—world—test'
        const result = capitalizeWords(text)
        
        expect(result).toBe('Hello—World—Test')
      })

      it('should preserve multiple spaces', () => {
        const text = 'hello  world   test'
        const result = capitalizeWords(text)
        
        expect(result).toBe('Hello  World   Test')
      })

      it('should handle text with punctuation', () => {
        const text = 'hello, world! how are you?'
        const result = capitalizeWords(text)
        
        expect(result).toBe('Hello, World! How Are You?')
      })
    })

    describe('Unicode and emojis', () => {
      it('should capitalize words with accented characters', () => {
        const text = 'café résumé'
        const result = capitalizeWords(text)
        
        expect(result).toBe('Café Résumé')
      })

      it('should preserve emojis', () => {
        const text = '👋 hello world 🌍'
        const result = capitalizeWords(text)
        
        expect(result).toBe('👋 Hello World 🌍')
      })

      it('should handle CJK characters', () => {
        const text = '你好 世界'
        const result = capitalizeWords(text)
        
        // CJK characters don't have case, so they're preserved
        expect(result).toBe('你好 世界')
      })
    })

    describe('Edge cases', () => {
      it('should handle empty string', () => {
        const result = capitalizeWords('')
        
        expect(result).toBe('')
      })

      it('should handle null input', () => {
        const result = capitalizeWords(null)
        
        expect(result).toBe('')
      })

      it('should handle undefined input', () => {
        const result = capitalizeWords(undefined)
        
        expect(result).toBe('')
      })

      it('should handle single character', () => {
        const result = capitalizeWords('a')
        
        expect(result).toBe('A')
      })

      it('should handle numbers and letters', () => {
        const text = 'test123 hello456'
        const result = capitalizeWords(text)
        
        expect(result).toBe('Test123 Hello456')
      })

      it('should handle non-string input (number)', () => {
        const result = capitalizeWords(12345)
        
        expect(result).toBe('12345')
      })

      it('should handle text with only spaces', () => {
        const result = capitalizeWords('   ')
        
        expect(result).toBe('   ')
      })

      it('should handle text with tabs and newlines', () => {
        const text = 'hello\tworld\ntest'
        const result = capitalizeWords(text)
        
        expect(result).toBe('Hello\tWorld\nTest')
      })
    })
  })

  // ============================================================================
  // slugify() Tests
  // ============================================================================
  
  describe('slugify()', () => {
    
    describe('Basic slug generation', () => {
      it('should convert text to lowercase', () => {
        const text = 'Hello World'
        const result = slugify(text)
        
        expect(result).toBe('hello-world')
      })

      it('should replace spaces with hyphens', () => {
        const text = 'this is a test'
        const result = slugify(text)
        
        expect(result).toBe('this-is-a-test')
      })

      it('should replace multiple spaces with single hyphen', () => {
        const text = 'hello    world'
        const result = slugify(text)
        
        expect(result).toBe('hello-world')
      })

      it('should replace underscores with hyphens', () => {
        const text = 'hello_world_test'
        const result = slugify(text)
        
        expect(result).toBe('hello-world-test')
      })

      it('should handle already slug-like text', () => {
        const text = 'hello-world'
        const result = slugify(text)
        
        expect(result).toBe('hello-world')
      })
    })

    describe('Special characters removal', () => {
      it('should remove punctuation', () => {
        const text = 'Hello, World!'
        const result = slugify(text)
        
        expect(result).toBe('hello-world')
      })

      it('should remove parentheses', () => {
        const text = 'Test (with parentheses)'
        const result = slugify(text)
        
        expect(result).toBe('test-with-parentheses')
      })

      it('should remove quotes', () => {
        const text = `"Hello" and 'World'`
        const result = slugify(text)
        
        expect(result).toBe('hello-and-world')
      })

      it('should remove special characters', () => {
        const text = 'Test @#$% Special ^&* Chars!'
        const result = slugify(text)
        
        expect(result).toBe('test-special-chars')
      })

      it('should remove ampersands', () => {
        const text = 'Cats & Dogs'
        const result = slugify(text)
        
        expect(result).toBe('cats-dogs')
      })

      it('should remove slashes', () => {
        const text = 'Test/with/slashes'
        const result = slugify(text)
        
        expect(result).toBe('testwithslashes')
      })
    })

    describe('Unicode and accented characters', () => {
      it('should preserve accented characters', () => {
        const text = 'Café Résumé'
        const result = slugify(text)
        
        expect(result).toBe('café-résumé')
      })

      it('should preserve German umlauts', () => {
        const text = 'Über München'
        const result = slugify(text)
        
        expect(result).toBe('über-münchen')
      })

      it('should handle French accents', () => {
        const text = 'Naïve façade'
        const result = slugify(text)
        
        expect(result).toBe('naïve-façade')
      })

      it('should handle Spanish characters', () => {
        const text = 'Mañana Niño'
        const result = slugify(text)
        
        expect(result).toBe('mañana-niño')
      })
    })

    describe('Edge cases', () => {
      it('should handle empty string', () => {
        const result = slugify('')
        
        expect(result).toBe('')
      })

      it('should handle null input', () => {
        const result = slugify(null)
        
        expect(result).toBe('')
      })

      it('should handle undefined input', () => {
        const result = slugify(undefined)
        
        expect(result).toBe('')
      })

      it('should trim leading spaces', () => {
        const text = '   hello world'
        const result = slugify(text)
        
        expect(result).toBe('hello-world')
      })

      it('should trim trailing spaces', () => {
        const text = 'hello world   '
        const result = slugify(text)
        
        expect(result).toBe('hello-world')
      })

      it('should remove leading hyphens', () => {
        const text = '---hello world'
        const result = slugify(text)
        
        expect(result).toBe('hello-world')
      })

      it('should remove trailing hyphens', () => {
        const text = 'hello world---'
        const result = slugify(text)
        
        expect(result).toBe('hello-world')
      })

      it('should handle text with only special characters', () => {
        const text = '!@#$%^&*()'
        const result = slugify(text)
        
        expect(result).toBe('')
      })

      it('should handle numbers', () => {
        const text = 'Test 123 Article'
        const result = slugify(text)
        
        expect(result).toBe('test-123-article')
      })

      it('should handle non-string input (number)', () => {
        const result = slugify(12345)
        
        expect(result).toBe('12345')
      })

      it('should collapse multiple consecutive hyphens', () => {
        const text = 'hello---world---test'
        const result = slugify(text)
        
        expect(result).toBe('hello-world-test')
      })

      it('should handle very long text', () => {
        const text = 'This is a very long title that will become a very long slug for testing purposes'
        const result = slugify(text)
        
        expect(result).toBe('this-is-a-very-long-title-that-will-become-a-very-long-slug-for-testing-purposes')
      })
    })
  })

  // ============================================================================
  // stripHtml() Tests
  // ============================================================================
  
  describe('stripHtml()', () => {
    
    describe('Basic HTML tag removal', () => {
      it('should remove simple paragraph tags', () => {
        const html = '<p>Hello World</p>'
        const result = stripHtml(html)
        
        expect(result).toBe('Hello World')
      })

      it('should remove div tags', () => {
        const html = '<div>Test content</div>'
        const result = stripHtml(html)
        
        expect(result).toBe('Test content')
      })

      it('should remove span tags', () => {
        const html = '<span>Inline text</span>'
        const result = stripHtml(html)
        
        expect(result).toBe('Inline text')
      })

      it('should remove multiple tags', () => {
        const html = '<p>Paragraph</p><div>Division</div><span>Span</span>'
        const result = stripHtml(html)
        
        expect(result).toBe('Paragraph Division Span')
      })

      it('should preserve text between tags', () => {
        const html = '<p>First</p> Middle <div>Last</div>'
        const result = stripHtml(html)
        
        expect(result).toBe('First Middle Last')
      })
    })

    describe('Nested HTML tags', () => {
      it('should remove nested tags', () => {
        const html = '<div><p>Nested <span>content</span> here</p></div>'
        const result = stripHtml(html)
        
        expect(result).toBe('Nested content here')
      })

      it('should handle deeply nested tags', () => {
        const html = '<div><section><article><p><strong><em>Text</em></strong></p></article></section></div>'
        const result = stripHtml(html)
        
        expect(result).toBe('Text')
      })

      it('should handle nested formatting tags', () => {
        const html = '<p>This is <strong>bold</strong> and <em>italic</em> text</p>'
        const result = stripHtml(html)
        
        expect(result).toBe('This is bold and italic text')
      })

      it('should handle nested lists', () => {
        const html = '<ul><li>Item 1</li><li>Item 2<ul><li>Nested</li></ul></li></ul>'
        const result = stripHtml(html)
        
        expect(result).toBe('Item 1 Item 2 Nested')
      })
    })

    describe('HTML attributes', () => {
      it('should remove tags with attributes', () => {
        const html = '<div class="container">Content</div>'
        const result = stripHtml(html)
        
        expect(result).toBe('Content')
      })

      it('should remove tags with multiple attributes', () => {
        const html = '<a href="https://example.com" class="link" id="test">Link</a>'
        const result = stripHtml(html)
        
        expect(result).toBe('Link')
      })

      it('should handle self-closing tags', () => {
        const html = 'Before<br/>After'
        const result = stripHtml(html)
        
        expect(result).toBe('Before After')
      })

      it('should handle img tags with attributes', () => {
        const html = 'Text <img src="image.jpg" alt="description"/> more text'
        const result = stripHtml(html)
        
        expect(result).toBe('Text more text')
      })
    })

    describe('HTML entities', () => {
      it('should decode ampersand entity', () => {
        const html = 'Cats &amp; Dogs'
        const result = stripHtml(html)
        
        expect(result).toBe('Cats & Dogs')
      })

      it('should decode less than entity', () => {
        const html = '5 &lt; 10'
        const result = stripHtml(html)
        
        expect(result).toBe('5 < 10')
      })

      it('should decode greater than entity', () => {
        const html = '10 &gt; 5'
        const result = stripHtml(html)
        
        expect(result).toBe('10 > 5')
      })

      it('should decode quote entity', () => {
        const html = 'He said &quot;Hello&quot;'
        const result = stripHtml(html)
        
        expect(result).toBe('He said "Hello"')
      })

      it('should decode apostrophe entity', () => {
        const html = 'It&#39;s working'
        const result = stripHtml(html)
        
        expect(result).toBe("It's working")
      })

      it('should decode nbsp entity', () => {
        const html = 'Word&nbsp;spacing'
        const result = stripHtml(html)
        
        expect(result).toBe('Word spacing')
      })

      it('should decode multiple entities', () => {
        const html = '&lt;p&gt;Text &amp; more &quot;text&quot;&lt;/p&gt;'
        const result = stripHtml(html)
        
        expect(result).toBe('<p>Text & more "text"</p>')
      })
    })

    describe('Whitespace normalization', () => {
      it('should normalize multiple spaces', () => {
        const html = '<p>Text    with    spaces</p>'
        const result = stripHtml(html)
        
        expect(result).toBe('Text with spaces')
      })

      it('should normalize newlines', () => {
        const html = '<p>Line 1\n\nLine 2</p>'
        const result = stripHtml(html)
        
        expect(result).toBe('Line 1 Line 2')
      })

      it('should normalize tabs', () => {
        const html = '<p>Text\t\twith\ttabs</p>'
        const result = stripHtml(html)
        
        expect(result).toBe('Text with tabs')
      })

      it('should trim leading and trailing whitespace', () => {
        const html = '   <p>Text</p>   '
        const result = stripHtml(html)
        
        expect(result).toBe('Text')
      })
    })

    describe('Edge cases', () => {
      it('should handle empty string', () => {
        const result = stripHtml('')
        
        expect(result).toBe('')
      })

      it('should handle null input', () => {
        const result = stripHtml(null)
        
        expect(result).toBe('')
      })

      it('should handle undefined input', () => {
        const result = stripHtml(undefined)
        
        expect(result).toBe('')
      })

      it('should handle plain text without tags', () => {
        const text = 'Plain text without HTML'
        const result = stripHtml(text)
        
        expect(result).toBe('Plain text without HTML')
      })

      it('should handle malformed HTML', () => {
        const html = '<p>Unclosed paragraph'
        const result = stripHtml(html)
        
        expect(result).toBe('Unclosed paragraph')
      })

      it('should handle empty tags', () => {
        const html = '<p></p><div></div>Text'
        const result = stripHtml(html)
        
        expect(result).toBe('Text')
      })

      it('should handle script tags', () => {
        const html = '<script>alert("XSS")</script>Safe content'
        const result = stripHtml(html)
        
        expect(result).toBe('alert("XSS") Safe content')
      })

      it('should handle style tags', () => {
        const html = '<style>.class { color: red; }</style>Visible text'
        const result = stripHtml(html)
        
        expect(result).toBe('.class { color: red; } Visible text')
      })

      it('should handle non-string input (number)', () => {
        const result = stripHtml(12345)
        
        expect(result).toBe('12345')
      })

      it('should handle very long HTML', () => {
        const html = '<p>' + 'a'.repeat(1000) + '</p>'
        const result = stripHtml(html)
        
        expect(result).toBe('a'.repeat(1000))
      })
    })

    describe('Integration scenarios', () => {
      it('should handle complex HTML document', () => {
        const html = `
          <div class="container">
            <h1>Title</h1>
            <p>This is a <strong>paragraph</strong> with <em>formatting</em>.</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
            <p>Another paragraph with a <a href="#">link</a>.</p>
          </div>
        `
        const result = stripHtml(html)
        
        expect(result).toContain('Title')
        expect(result).toContain('paragraph')
        expect(result).toContain('formatting')
        expect(result).toContain('Item 1')
        expect(result).toContain('Item 2')
        expect(result).toContain('link')
        expect(result).not.toContain('<')
        expect(result).not.toContain('>')
      })

      it('should handle HTML with entities and nested tags', () => {
        const html = '<p>Text with <strong>&quot;quotes&quot;</strong> &amp; <em>emphasis</em></p>'
        const result = stripHtml(html)
        
        expect(result).toBe('Text with "quotes" & emphasis')
      })
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================
  
  describe('Integration: Combined utility functions', () => {
    
    it('should escape HTML then truncate safely', () => {
      const text = '<script>alert("XSS")</script> This is a long text that needs truncation'
      const escaped = escapeHtml(text)
      const result = truncateText(escaped, 50)
      
      expect(result).toContain('&lt;script&gt;')
      expect(result.endsWith('...')).toBe(true)
    })

    it('should strip HTML then create slug', () => {
      const html = '<h1>My Article Title!</h1>'
      const stripped = stripHtml(html)
      const result = slugify(stripped)
      
      expect(result).toBe('my-article-title')
    })

    it('should capitalize then slugify', () => {
      const text = 'hello world article'
      const capitalized = capitalizeWords(text)
      const result = slugify(capitalized)
      
      expect(result).toBe('hello-world-article')
    })

    it('should complete workflow: HTML to display', () => {
      const html = '<p>This is a <strong>test article</strong> about "Web Development" & more!</p>'
      
      // Strip HTML
      const stripped = stripHtml(html)
      expect(stripped).toBe('This is a test article about "Web Development" & more!')
      
      // Truncate
      const truncated = truncateText(stripped, 40)
      expect(truncated.length).toBeLessThanOrEqual(43)
      
      // Create slug
      const slug = slugify(stripped)
      expect(slug).toBe('this-is-a-test-article-about-web-development-more')
    })
  })

})

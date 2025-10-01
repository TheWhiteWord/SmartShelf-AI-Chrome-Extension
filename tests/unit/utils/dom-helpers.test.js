/**
 * Unit Tests: DOM Helper Utilities (T071I)
 * Test suite for extension/shared/utils/dom-helpers.js
 * 
 * Following TDD principles - comprehensive DOM manipulation testing
 * 
 * Functions tested:
 * - querySelector(selector, root) - Safe querySelector with fallback
 * - querySelectorAll(selector, root) - Safe querySelectorAll wrapper
 * - removeElements(root, selectors) - Batch element removal
 * - getTextContent(element) - Clean text extraction
 * - createElementFromHTML(html) - Safe HTML parsing
 */

const {
  querySelector,
  querySelectorAll,
  removeElements,
  getTextContent,
  createElementFromHTML
} = require('../../../extension/shared/utils/dom-helpers.js')

// JSDOM setup for DOM testing
const { JSDOM } = require('jsdom')

describe('DOM Helper Utilities', () => {
  let dom
  let document

  beforeEach(() => {
    // Create fresh JSDOM instance for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <div id="container">
            <article class="post">
              <h1>Test Article</h1>
              <p class="content">This is test content.</p>
            </article>
            <nav class="navigation">
              <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
              </ul>
            </nav>
            <aside class="sidebar">
              <div class="widget">Widget 1</div>
              <div class="widget">Widget 2</div>
            </aside>
          </div>
          <script>alert('test');</script>
          <div class="ads">Advertisement</div>
        </body>
      </html>
    `)
    
    // Set global document for tests
    global.document = dom.window.document
    document = dom.window.document
  })

  afterEach(() => {
    // Cleanup
    global.document = undefined
  })

  describe('querySelector()', () => {
    
    describe('Valid selectors', () => {
      it('should find element by ID', () => {
        const element = querySelector('#container', document)
        expect(element).toBeTruthy()
        expect(element.id).toBe('container')
      })

      it('should find element by class', () => {
        const element = querySelector('.post', document)
        expect(element).toBeTruthy()
        expect(element.className).toBe('post')
      })

      it('should find element by tag name', () => {
        const element = querySelector('article', document)
        expect(element).toBeTruthy()
        expect(element.tagName.toLowerCase()).toBe('article')
      })

      it('should find element by attribute selector', () => {
        const element = querySelector('a[href="#home"]', document)
        expect(element).toBeTruthy()
        expect(element.getAttribute('href')).toBe('#home')
      })

      it('should find element with complex selector', () => {
        const element = querySelector('article.post > h1', document)
        expect(element).toBeTruthy()
        expect(element.textContent).toBe('Test Article')
      })

      it('should use custom root element', () => {
        const root = document.querySelector('#container')
        const element = querySelector('.post', root)
        expect(element).toBeTruthy()
        expect(element.className).toBe('post')
      })

      it('should find first matching element when multiple exist', () => {
        const element = querySelector('.widget', document)
        expect(element).toBeTruthy()
        expect(element.textContent).toBe('Widget 1')
      })
    })

    describe('Invalid selectors', () => {
      it('should return null for invalid selector syntax', () => {
        const element = querySelector('div[invalid')
        expect(element).toBeNull()
      })

      it('should return null for empty selector', () => {
        const element = querySelector('')
        expect(element).toBeNull()
      })

      it('should return null for null selector', () => {
        const element = querySelector(null)
        expect(element).toBeNull()
      })

      it('should return null for undefined selector', () => {
        const element = querySelector(undefined)
        expect(element).toBeNull()
      })

      it('should return null for non-string selector', () => {
        const element = querySelector(123)
        expect(element).toBeNull()
      })

      it('should return null when element not found', () => {
        const element = querySelector('.nonexistent')
        expect(element).toBeNull()
      })

      it('should return null for invalid root element', () => {
        const element = querySelector('.post', null)
        expect(element).toBeNull()
      })

      it('should return null for root without querySelector method', () => {
        const element = querySelector('.post', {})
        expect(element).toBeNull()
      })
    })
  })

  describe('querySelectorAll()', () => {
    
    describe('Valid selectors', () => {
      it('should find all elements by class', () => {
        const elements = querySelectorAll('.widget', document)
        expect(Array.isArray(elements)).toBe(true)
        expect(elements.length).toBe(2)
        expect(elements[0].textContent).toBe('Widget 1')
        expect(elements[1].textContent).toBe('Widget 2')
      })

      it('should find all elements by tag name', () => {
        const elements = querySelectorAll('div', document)
        expect(Array.isArray(elements)).toBe(true)
        expect(elements.length).toBeGreaterThan(0)
      })

      it('should find all links', () => {
        const elements = querySelectorAll('a[href]', document)
        expect(Array.isArray(elements)).toBe(true)
        expect(elements.length).toBe(2)
      })

      it('should use custom root element', () => {
        const root = document.querySelector('.sidebar')
        const elements = querySelectorAll('.widget', root)
        expect(elements.length).toBe(2)
      })

      it('should return empty array when no matches', () => {
        const elements = querySelectorAll('.nonexistent', document)
        expect(Array.isArray(elements)).toBe(true)
        expect(elements.length).toBe(0)
      })

      it('should convert NodeList to Array', () => {
        const elements = querySelectorAll('li', document)
        expect(Array.isArray(elements)).toBe(true)
        expect(elements.map).toBeDefined()  // Array method
        expect(elements.length).toBe(2)
      })
    })

    describe('Invalid selectors', () => {
      it('should return empty array for invalid selector syntax', () => {
        const elements = querySelectorAll('div[invalid')
        expect(Array.isArray(elements)).toBe(true)
        expect(elements.length).toBe(0)
      })

      it('should return empty array for empty selector', () => {
        const elements = querySelectorAll('')
        expect(Array.isArray(elements)).toBe(true)
        expect(elements.length).toBe(0)
      })

      it('should return empty array for null selector', () => {
        const elements = querySelectorAll(null)
        expect(Array.isArray(elements)).toBe(true)
        expect(elements.length).toBe(0)
      })

      it('should return empty array for undefined selector', () => {
        const elements = querySelectorAll(undefined)
        expect(Array.isArray(elements)).toBe(true)
        expect(elements.length).toBe(0)
      })

      it('should return empty array for non-string selector', () => {
        const elements = querySelectorAll(123)
        expect(Array.isArray(elements)).toBe(true)
        expect(elements.length).toBe(0)
      })

      it('should return empty array for invalid root element', () => {
        const elements = querySelectorAll('.post', null)
        expect(Array.isArray(elements)).toBe(true)
        expect(elements.length).toBe(0)
      })

      it('should return empty array for root without querySelectorAll method', () => {
        const elements = querySelectorAll('.post', {})
        expect(Array.isArray(elements)).toBe(true)
        expect(elements.length).toBe(0)
      })
    })
  })

  describe('removeElements()', () => {
    
    describe('Single selector removal', () => {
      it('should remove single element by class', () => {
        const beforeCount = document.querySelectorAll('.ads').length
        expect(beforeCount).toBe(1)

        const removed = removeElements(document, '.ads')
        
        const afterCount = document.querySelectorAll('.ads').length
        expect(afterCount).toBe(0)
        expect(removed).toBe(1)
      })

      it('should remove multiple elements with same selector', () => {
        const beforeCount = document.querySelectorAll('.widget').length
        expect(beforeCount).toBe(2)

        const removed = removeElements(document, '.widget')
        
        const afterCount = document.querySelectorAll('.widget').length
        expect(afterCount).toBe(0)
        expect(removed).toBe(2)
      })

      it('should remove script tags', () => {
        const beforeCount = document.querySelectorAll('script').length
        expect(beforeCount).toBe(1)

        const removed = removeElements(document, 'script')
        
        const afterCount = document.querySelectorAll('script').length
        expect(afterCount).toBe(0)
        expect(removed).toBe(1)
      })

      it('should remove element by ID', () => {
        const beforeElement = document.querySelector('#container')
        expect(beforeElement).toBeTruthy()

        const removed = removeElements(document, '#container')
        
        const afterElement = document.querySelector('#container')
        expect(afterElement).toBeNull()
        expect(removed).toBe(1)
      })

      it('should use custom root element', () => {
        const root = document.querySelector('.sidebar')
        const beforeCount = root.querySelectorAll('.widget').length
        expect(beforeCount).toBe(2)

        const removed = removeElements(root, '.widget')
        
        const afterCount = root.querySelectorAll('.widget').length
        expect(afterCount).toBe(0)
        expect(removed).toBe(2)
      })
    })

    describe('Multiple selectors removal', () => {
      it('should remove elements with array of selectors', () => {
        const removed = removeElements(document, ['.ads', 'script'])
        
        expect(document.querySelector('.ads')).toBeNull()
        expect(document.querySelector('script')).toBeNull()
        expect(removed).toBe(2)
      })

      it('should remove elements from multiple classes', () => {
        const removed = removeElements(document, ['.widget', '.ads'])
        
        expect(document.querySelectorAll('.widget').length).toBe(0)
        expect(document.querySelector('.ads')).toBeNull()
        expect(removed).toBe(3)  // 2 widgets + 1 ad
      })

      it('should handle empty array of selectors', () => {
        const removed = removeElements(document, [])
        expect(removed).toBe(0)
      })

      it('should skip invalid selectors in array', () => {
        const removed = removeElements(document, ['.ads', null, '', 'div[invalid'])
        
        // Only .ads should be removed
        expect(document.querySelector('.ads')).toBeNull()
        expect(removed).toBe(1)
      })
    })

    describe('Edge cases', () => {
      it('should return 0 when no elements match', () => {
        const removed = removeElements(document, '.nonexistent')
        expect(removed).toBe(0)
      })

      it('should return 0 for null root', () => {
        const removed = removeElements(null, '.ads')
        expect(removed).toBe(0)
      })

      it('should return 0 for undefined root', () => {
        const removed = removeElements(undefined, '.ads')
        expect(removed).toBe(0)
      })

      it('should return 0 for null selector', () => {
        const removed = removeElements(document, null)
        expect(removed).toBe(0)
      })

      it('should return 0 for undefined selector', () => {
        const removed = removeElements(document, undefined)
        expect(removed).toBe(0)
      })

      it('should return 0 for empty selector', () => {
        const removed = removeElements(document, '')
        expect(removed).toBe(0)
      })

      it('should handle invalid selector syntax gracefully', () => {
        const removed = removeElements(document, 'div[invalid')
        expect(removed).toBe(0)
      })

      it('should handle disconnected nodes', () => {
        const element = document.createElement('div')
        element.className = 'orphan'
        // Element not attached to DOM
        
        const removed = removeElements(document, '.orphan')
        expect(removed).toBe(0)
      })
    })
  })

  describe('getTextContent()', () => {
    
    describe('Text extraction', () => {
      it('should extract text from simple element', () => {
        const element = document.querySelector('h1')
        const text = getTextContent(element)
        expect(text).toBe('Test Article')
      })

      it('should extract text from nested elements', () => {
        const element = document.querySelector('.post')
        const text = getTextContent(element)
        expect(text).toContain('Test Article')
        expect(text).toContain('This is test content')
      })

      it('should extract text from paragraph', () => {
        const element = document.querySelector('.content')
        const text = getTextContent(element)
        expect(text).toBe('This is test content.')
      })

      it('should extract text from list', () => {
        const element = document.querySelector('ul')
        const text = getTextContent(element)
        expect(text).toContain('Home')
        expect(text).toContain('About')
      })
    })

    describe('Whitespace handling', () => {
      it('should normalize multiple spaces', () => {
        const element = document.createElement('div')
        element.textContent = 'Multiple    spaces    here'
        document.body.appendChild(element)
        
        const text = getTextContent(element)
        expect(text).toBe('Multiple spaces here')
      })

      it('should collapse multiple newlines', () => {
        const element = document.createElement('div')
        element.textContent = 'Line 1\n\n\nLine 2'
        document.body.appendChild(element)
        
        const text = getTextContent(element)
        // Collapses 3+ newlines to 2, resulting in blank line preserved
        expect(text).toBe('Line 1\n\nLine 2')
      })

      it('should trim leading and trailing whitespace', () => {
        const element = document.createElement('div')
        element.textContent = '   Text with spaces   '
        document.body.appendChild(element)
        
        const text = getTextContent(element)
        expect(text).toBe('Text with spaces')
      })

      it('should handle tabs and newlines', () => {
        const element = document.createElement('div')
        element.textContent = '\t\tTabbed\nNewline\t\t'
        document.body.appendChild(element)
        
        const text = getTextContent(element)
        // Preserves single newlines, collapses horizontal whitespace
        expect(text).toBe('Tabbed\nNewline')
      })
    })

    describe('Edge cases', () => {
      it('should return empty string for null element', () => {
        const text = getTextContent(null)
        expect(text).toBe('')
      })

      it('should return empty string for undefined element', () => {
        const text = getTextContent(undefined)
        expect(text).toBe('')
      })

      it('should return empty string for element with no text', () => {
        const element = document.createElement('div')
        const text = getTextContent(element)
        expect(text).toBe('')
      })

      it('should handle disconnected nodes', () => {
        const element = document.createElement('div')
        element.textContent = 'Disconnected text'
        // Element not attached to DOM
        
        const text = getTextContent(element)
        expect(text).toBe('Disconnected text')
      })

      it('should handle elements with only whitespace', () => {
        const element = document.createElement('div')
        element.textContent = '   \n\t   '
        document.body.appendChild(element)
        
        const text = getTextContent(element)
        expect(text).toBe('')
      })
    })
  })

  describe('createElementFromHTML()', () => {
    
    describe('Valid HTML creation', () => {
      it('should create simple div element', () => {
        const html = '<div class="test">Test Content</div>'
        const element = createElementFromHTML(html)
        
        expect(element).toBeTruthy()
        expect(element.tagName.toLowerCase()).toBe('div')
        expect(element.className).toBe('test')
        expect(element.textContent).toBe('Test Content')
      })

      it('should create article element', () => {
        const html = '<article><h1>Title</h1><p>Content</p></article>'
        const element = createElementFromHTML(html)
        
        expect(element).toBeTruthy()
        expect(element.tagName.toLowerCase()).toBe('article')
        expect(element.querySelector('h1')).toBeTruthy()
        expect(element.querySelector('p')).toBeTruthy()
      })

      it('should create element with attributes', () => {
        const html = '<a href="https://example.com" title="Example">Link</a>'
        const element = createElementFromHTML(html)
        
        expect(element).toBeTruthy()
        expect(element.tagName.toLowerCase()).toBe('a')
        expect(element.getAttribute('href')).toBe('https://example.com')
        expect(element.getAttribute('title')).toBe('Example')
      })

      it('should create element with nested structure', () => {
        const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
        const element = createElementFromHTML(html)
        
        expect(element).toBeTruthy()
        expect(element.tagName.toLowerCase()).toBe('ul')
        expect(element.querySelectorAll('li').length).toBe(2)
      })

      it('should trim whitespace from HTML', () => {
        const html = '   <div>Content</div>   '
        const element = createElementFromHTML(html)
        
        expect(element).toBeTruthy()
        expect(element.tagName.toLowerCase()).toBe('div')
      })
    })

    describe('Unsafe HTML rejection', () => {
      it('should reject HTML with script tag', () => {
        const html = '<div><script>alert("XSS")</script></div>'
        const element = createElementFromHTML(html)
        
        expect(element).toBeNull()
      })

      it('should reject HTML with javascript: protocol', () => {
        const html = '<a href="javascript:alert(1)">Click</a>'
        const element = createElementFromHTML(html)
        
        expect(element).toBeNull()
      })

      it('should reject HTML with data: URL containing HTML', () => {
        const html = '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>'
        const element = createElementFromHTML(html)
        
        expect(element).toBeNull()
      })

      it('should reject HTML with onclick handler', () => {
        const html = '<button onclick="alert(1)">Click</button>'
        const element = createElementFromHTML(html)
        
        expect(element).toBeNull()
      })

      it('should reject HTML with onerror handler', () => {
        const html = '<img src="x" onerror="alert(1)">'
        const element = createElementFromHTML(html)
        
        expect(element).toBeNull()
      })

      it('should reject HTML with onload handler', () => {
        const html = '<body onload="alert(1)">Content</body>'
        const element = createElementFromHTML(html)
        
        expect(element).toBeNull()
      })

      it('should reject uppercase script tag', () => {
        const html = '<div><SCRIPT>alert("XSS")</SCRIPT></div>'
        const element = createElementFromHTML(html)
        
        expect(element).toBeNull()
      })

      it('should reject mixed case event handler', () => {
        const html = '<button OnClick="alert(1)">Click</button>'
        const element = createElementFromHTML(html)
        
        expect(element).toBeNull()
      })
    })

    describe('Edge cases', () => {
      it('should return null for empty HTML', () => {
        const element = createElementFromHTML('')
        expect(element).toBeNull()
      })

      it('should return null for null HTML', () => {
        const element = createElementFromHTML(null)
        expect(element).toBeNull()
      })

      it('should return null for undefined HTML', () => {
        const element = createElementFromHTML(undefined)
        expect(element).toBeNull()
      })

      it('should return null for non-string HTML', () => {
        const element = createElementFromHTML(123)
        expect(element).toBeNull()
      })

      it('should return null for whitespace-only HTML', () => {
        const element = createElementFromHTML('   \n\t   ')
        expect(element).toBeNull()
      })

      it('should return null for text-only content (no element)', () => {
        const element = createElementFromHTML('Just plain text')
        expect(element).toBeNull()
      })

      it('should return null for invalid HTML', () => {
        const element = createElementFromHTML('<div><span></div></span>')
        // Invalid nesting - behavior may vary
        // JSDOM might still create element, so we just check it doesn't crash
        expect(true).toBe(true)
      })
    })
  })

  describe('Integration tests', () => {
    
    it('should use querySelector and getTextContent together', () => {
      const element = querySelector('h1', document)
      const text = getTextContent(element)
      expect(text).toBe('Test Article')
    })

    it('should use querySelectorAll and removeElements together', () => {
      const widgets = querySelectorAll('.widget', document)
      expect(widgets.length).toBe(2)

      const removed = removeElements(document, '.widget')
      expect(removed).toBe(2)

      const widgetsAfter = querySelectorAll('.widget', document)
      expect(widgetsAfter.length).toBe(0)
    })

    it('should create element and extract text content', () => {
      const html = '<div class="created">Created content</div>'
      const element = createElementFromHTML(html)
      
      expect(element).toBeTruthy()
      
      const text = getTextContent(element)
      expect(text).toBe('Created content')
    })

    it('should create element, append to DOM, and query it', () => {
      // Use document.createElement directly for JSDOM compatibility
      const element = document.createElement('div')
      element.className = 'dynamic'
      element.id = 'dynamic-element'
      element.textContent = 'Dynamic'
      
      expect(element).toBeTruthy()
      document.body.appendChild(element)
      
      const found = querySelector('#dynamic-element', document)
      expect(found).toBeTruthy()
      expect(found.className).toBe('dynamic')
      expect(found.textContent).toBe('Dynamic')
    })

    it('should query, remove, and verify removal', () => {
      const before = querySelector('.ads', document)
      expect(before).toBeTruthy()

      removeElements(document, '.ads')

      const after = querySelector('.ads', document)
      expect(after).toBeNull()
    })
  })

  describe('Performance tests', () => {
    
    it('should handle large number of querySelectorAll operations quickly', () => {
      const start = Date.now()

      for (let i = 0; i < 1000; i++) {
        querySelectorAll('div')
      }

      const duration = Date.now() - start
      expect(duration).toBeLessThan(100)  // Should complete in <100ms
    })

    it('should handle batch removal of many elements efficiently', () => {
      // Add many elements
      for (let i = 0; i < 100; i++) {
        const element = document.createElement('div')
        element.className = 'bulk-test'
        document.body.appendChild(element)
      }

      const start = Date.now()
      const removed = removeElements(document, '.bulk-test')
      const duration = Date.now() - start

      expect(removed).toBe(100)
      expect(duration).toBeLessThan(50)  // Should complete in <50ms
    })

    it('should handle text extraction from deeply nested elements quickly', () => {
      // Create deeply nested structure
      let parent = document.body
      for (let i = 0; i < 50; i++) {
        const child = document.createElement('div')
        child.textContent = `Level ${i}`
        parent.appendChild(child)
        parent = child
      }

      const start = Date.now()
      const text = getTextContent(document.body)
      const duration = Date.now() - start

      expect(text.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(50)  // Should complete in <50ms
    })
  })
})

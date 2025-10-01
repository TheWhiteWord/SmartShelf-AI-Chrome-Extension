/**
 * Unit Tests: Content Extraction Utilities
 * Test suite for extension/shared/utils/content-extraction.js
 * 
 * Following TDD principles - these tests MUST FAIL before implementation
 */

const { JSDOM } = require('jsdom')
const {
  extractMainContent,
  extractMetadata,
  extractStructuredData,
  extractMicrodataProperties,
  extractImages,
  extractLinks
} = require('../../../extension/shared/utils/content-extraction.js')

describe('Content Extraction Utilities', () => {
  
  describe('extractMainContent()', () => {
    
    it('should extract content from article element', () => {
      const html = `
        <html>
          <body>
            <header>Header content</header>
            <article>
              <h1>Main Article Title</h1>
              <p>This is the main content of the article.</p>
              <p>It contains multiple paragraphs.</p>
            </article>
            <footer>Footer content</footer>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const content = extractMainContent(document)
      
      expect(content).toContain('Main Article Title')
      expect(content).toContain('main content of the article')
      expect(content).not.toContain('Header content')
      expect(content).not.toContain('Footer content')
    })

    it('should extract content from main element when article not present', () => {
      const html = `
        <html>
          <body>
            <nav>Navigation</nav>
            <main>
              <h1>Main Content</h1>
              <p>Content in main tag.</p>
            </main>
            <aside>Sidebar</aside>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const content = extractMainContent(document)
      
      expect(content).toContain('Main Content')
      expect(content).toContain('Content in main tag')
    })

    it('should extract content from .content class when semantic tags not present', () => {
      const html = `
        <html>
          <body>
            <div class="header">Header</div>
            <div class="content">
              <h1>Content Area</h1>
              <p>Main content here.</p>
            </div>
            <div class="sidebar">Sidebar</div>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const content = extractMainContent(document)
      
      expect(content).toContain('Content Area')
      expect(content).toContain('Main content here')
    })

    it('should fallback to body when no content area identified', () => {
      const html = `
        <html>
          <body>
            <div>Simple page content</div>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const content = extractMainContent(document)
      
      expect(content).toContain('Simple page content')
    })

    it('should remove script and style tags from extracted content', () => {
      const html = `
        <html>
          <body>
            <article>
              <h1>Article Title</h1>
              <script>console.log('test')</script>
              <p>Visible content</p>
              <style>.test { color: red; }</style>
            </article>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const content = extractMainContent(document)
      
      expect(content).toContain('Article Title')
      expect(content).toContain('Visible content')
      expect(content).not.toContain('console.log')
      expect(content).not.toContain('.test { color: red')
    })

    it('should remove navigation, header, and footer elements', () => {
      const html = `
        <html>
          <body>
            <article>
              <nav>Navigation menu</nav>
              <header>Page header</header>
              <h1>Main Content</h1>
              <p>Article text</p>
              <footer>Page footer</footer>
            </article>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const content = extractMainContent(document)
      
      expect(content).toContain('Main Content')
      expect(content).toContain('Article text')
      expect(content).not.toContain('Navigation menu')
      expect(content).not.toContain('Page header')
      expect(content).not.toContain('Page footer')
    })

    it('should remove advertisement and sidebar elements', () => {
      const html = `
        <html>
          <body>
            <article>
              <h1>Article</h1>
              <div class="advertisement">Ad content</div>
              <p>Real content</p>
              <div class="sidebar">Sidebar content</div>
              <div class="ad">Another ad</div>
            </article>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const content = extractMainContent(document)
      
      expect(content).toContain('Article')
      expect(content).toContain('Real content')
      expect(content).not.toContain('Ad content')
      expect(content).not.toContain('Sidebar content')
      expect(content).not.toContain('Another ad')
    })

    it('should clean up whitespace (multiple spaces, newlines)', () => {
      const html = `
        <html>
          <body>
            <article>
              <h1>Title</h1>
              
              
              <p>Paragraph    with     extra    spaces</p>
            </article>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const content = extractMainContent(document)
      
      expect(content).not.toMatch(/\s{2,}/)
      expect(content).toMatch(/^[^\s].*[^\s]$/) // No leading/trailing whitespace
    })

    it('should limit content to 10000 characters', () => {
      const longText = 'A'.repeat(15000)
      const html = `
        <html>
          <body>
            <article>${longText}</article>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const content = extractMainContent(document)
      
      expect(content.length).toBe(10000)
    })

    it('should handle empty document gracefully', () => {
      const html = '<html><body></body></html>'
      const { document } = new JSDOM(html).window
      const content = extractMainContent(document)
      
      expect(content).toBe('')
    })

    it('should handle document with only scripts and styles', () => {
      const html = `
        <html>
          <body>
            <script>console.log('test')</script>
            <style>body { margin: 0; }</style>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const content = extractMainContent(document)
      
      expect(content).toBe('')
    })

    it('should return empty string for null document', () => {
      const content = extractMainContent(null)
      expect(content).toBe('')
    })

    it('should return empty string for document without body', () => {
      const html = '<html></html>'
      const { document } = new JSDOM(html).window
      const content = extractMainContent(document)
      
      expect(content).toBe('')
    })

    it('should handle broken HTML gracefully', () => {
      const html = `
        <html>
          <body>
            <article>
              <p>Normal paragraph
              <div>Unclosed div
              <p>Another paragraph</p>
            </article>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const content = extractMainContent(document)
      
      expect(content).toContain('Normal paragraph')
      expect(content).toContain('Another paragraph')
    })

    it('should perform efficiently on large documents (10k+ elements)', () => {
      const elements = Array(10000).fill('<p>Test paragraph</p>').join('')
      const html = `
        <html>
          <body>
            <article>${elements}</article>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      
      const startTime = Date.now()
      const content = extractMainContent(document)
      const endTime = Date.now()
      
      expect(content.length).toBeGreaterThan(0)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete in < 1 second
    })
  })

  describe('extractMetadata()', () => {
    
    it('should extract standard meta tags', () => {
      const html = `
        <html>
          <head>
            <meta name="description" content="Page description">
            <meta name="keywords" content="test, keywords">
            <meta name="author" content="John Doe">
            <meta name="publisher" content="Test Publisher">
          </head>
        </html>
      `
      const { document } = new JSDOM(html).window
      const meta = extractMetadata(document)
      
      expect(meta.description).toBe('Page description')
      expect(meta.keywords).toBe('test, keywords')
      expect(meta.author).toBe('John Doe')
      expect(meta.publisher).toBe('Test Publisher')
    })

    it('should extract Open Graph tags', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="OG Title">
            <meta property="og:description" content="OG Description">
            <meta property="og:image" content="https://example.com/image.jpg">
            <meta property="og:url" content="https://example.com">
            <meta property="og:type" content="article">
          </head>
        </html>
      `
      const { document } = new JSDOM(html).window
      const meta = extractMetadata(document)
      
      expect(meta.og_title).toBe('OG Title')
      expect(meta.og_description).toBe('OG Description')
      expect(meta.og_image).toBe('https://example.com/image.jpg')
      expect(meta.og_url).toBe('https://example.com')
      expect(meta.og_type).toBe('article')
    })

    it('should extract Twitter Card tags', () => {
      const html = `
        <html>
          <head>
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="Twitter Title">
            <meta name="twitter:description" content="Twitter Description">
            <meta name="twitter:image" content="https://example.com/twitter.jpg">
            <meta name="twitter:creator" content="@username">
          </head>
        </html>
      `
      const { document } = new JSDOM(html).window
      const meta = extractMetadata(document)
      
      expect(meta.twitter_card).toBe('summary_large_image')
      expect(meta.twitter_title).toBe('Twitter Title')
      expect(meta.twitter_description).toBe('Twitter Description')
      expect(meta.twitter_image).toBe('https://example.com/twitter.jpg')
      expect(meta.twitter_creator).toBe('@username')
    })

    it('should extract Article tags', () => {
      const html = `
        <html>
          <head>
            <meta property="article:published_time" content="2025-01-01T00:00:00Z">
            <meta property="article:author" content="Jane Smith">
            <meta property="article:section" content="Technology">
            <meta property="article:tag" content="AI">
          </head>
        </html>
      `
      const { document } = new JSDOM(html).window
      const meta = extractMetadata(document)
      
      expect(meta.article_published_time).toBe('2025-01-01T00:00:00Z')
      expect(meta.article_author).toBe('Jane Smith')
      expect(meta.article_section).toBe('Technology')
      expect(meta.article_tag).toBe('AI')
    })

    it('should extract canonical URL', () => {
      const html = `
        <html>
          <head>
            <link rel="canonical" href="https://example.com/canonical-page">
          </head>
        </html>
      `
      const { document } = new JSDOM(html).window
      const meta = extractMetadata(document)
      
      expect(meta.canonical_url).toBe('https://example.com/canonical-page')
    })

    it('should extract all meta tag types together', () => {
      const html = `
        <html>
          <head>
            <meta name="description" content="Standard description">
            <meta property="og:title" content="OG Title">
            <meta name="twitter:card" content="summary">
            <meta property="article:author" content="Author Name">
            <link rel="canonical" href="https://example.com/page">
          </head>
        </html>
      `
      const { document } = new JSDOM(html).window
      const meta = extractMetadata(document)
      
      expect(meta.description).toBe('Standard description')
      expect(meta.og_title).toBe('OG Title')
      expect(meta.twitter_card).toBe('summary')
      expect(meta.article_author).toBe('Author Name')
      expect(meta.canonical_url).toBe('https://example.com/page')
    })

    it('should return empty object when no meta tags present', () => {
      const html = '<html><head></head></html>'
      const { document } = new JSDOM(html).window
      const meta = extractMetadata(document)
      
      expect(meta).toEqual({})
    })

    it('should handle missing content attributes gracefully', () => {
      const html = `
        <html>
          <head>
            <meta name="description">
            <meta property="og:title">
          </head>
        </html>
      `
      const { document } = new JSDOM(html).window
      const meta = extractMetadata(document)
      
      // Meta tags without content attributes are skipped (empty object)
      expect(Object.keys(meta).length).toBe(0)
    })

    it('should handle malformed meta tags', () => {
      const html = `
        <html>
          <head>
            <meta name="description" content="Valid description">
            <meta property content="Missing property name">
            <meta name content="Missing name value">
          </head>
        </html>
      `
      const { document } = new JSDOM(html).window
      const meta = extractMetadata(document)
      
      expect(meta.description).toBe('Valid description')
      expect(Object.keys(meta).length).toBe(1)
    })

    it('should return empty object for null document', () => {
      const meta = extractMetadata(null)
      expect(meta).toEqual({})
    })
  })

  describe('extractStructuredData()', () => {
    
    it('should extract JSON-LD structured data', () => {
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': 'Test Article',
        'author': 'John Doe'
      }
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              ${JSON.stringify(jsonLd)}
            </script>
          </head>
        </html>
      `
      const { document } = new JSDOM(html).window
      const data = extractStructuredData(document)
      
      expect(data).toHaveLength(1)
      expect(data[0].type).toBe('json-ld')
      expect(data[0].data).toEqual(jsonLd)
    })

    it('should extract multiple JSON-LD blocks', () => {
      const jsonLd1 = { '@type': 'Article', 'headline': 'Article 1' }
      const jsonLd2 = { '@type': 'BreadcrumbList', 'itemListElement': [] }
      const html = `
        <html>
          <head>
            <script type="application/ld+json">${JSON.stringify(jsonLd1)}</script>
            <script type="application/ld+json">${JSON.stringify(jsonLd2)}</script>
          </head>
        </html>
      `
      const { document } = new JSDOM(html).window
      const data = extractStructuredData(document)
      
      expect(data).toHaveLength(2)
      expect(data[0].data).toEqual(jsonLd1)
      expect(data[1].data).toEqual(jsonLd2)
    })

    it('should handle malformed JSON-LD gracefully', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              { invalid json content }
            </script>
            <script type="application/ld+json">
              {"@type": "Article", "valid": true}
            </script>
          </head>
        </html>
      `
      const { document } = new JSDOM(html).window
      const data = extractStructuredData(document)
      
      // Should skip malformed and include valid
      expect(data).toHaveLength(1)
      expect(data[0].data.valid).toBe(true)
    })

    it('should extract microdata with itemscope', () => {
      const html = `
        <html>
          <body>
            <div itemscope itemtype="https://schema.org/Person">
              <span itemprop="name">John Doe</span>
              <span itemprop="jobTitle">Software Engineer</span>
            </div>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const data = extractStructuredData(document)
      
      expect(data).toHaveLength(1)
      expect(data[0].type).toBe('microdata')
      expect(data[0].itemType).toBe('https://schema.org/Person')
      expect(data[0].properties.name).toBe('John Doe')
      expect(data[0].properties.jobTitle).toBe('Software Engineer')
    })

    it('should extract nested microdata structures', () => {
      const html = `
        <html>
          <body>
            <div itemscope itemtype="https://schema.org/Article">
              <h1 itemprop="headline">Article Title</h1>
              <div itemprop="author" itemscope itemtype="https://schema.org/Person">
                <span itemprop="name">Jane Smith</span>
              </div>
            </div>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const data = extractStructuredData(document)
      
      // Should extract both parent and nested microdata
      expect(data.length).toBeGreaterThanOrEqual(1)
      const articleData = data.find(d => d.itemType === 'https://schema.org/Article')
      expect(articleData).toBeDefined()
      expect(articleData.properties.headline).toBe('Article Title')
    })

    it('should combine JSON-LD and microdata', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              {"@type": "Article", "headline": "JSON-LD Article"}
            </script>
          </head>
          <body>
            <div itemscope itemtype="https://schema.org/Person">
              <span itemprop="name">John Doe</span>
            </div>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const data = extractStructuredData(document)
      
      expect(data).toHaveLength(2)
      expect(data[0].type).toBe('json-ld')
      expect(data[1].type).toBe('microdata')
    })

    it('should return empty array when no structured data present', () => {
      const html = '<html><body><p>No structured data</p></body></html>'
      const { document } = new JSDOM(html).window
      const data = extractStructuredData(document)
      
      expect(data).toEqual([])
    })

    it('should return empty array for null document', () => {
      const data = extractStructuredData(null)
      expect(data).toEqual([])
    })

    it('should handle microdata without itemtype', () => {
      const html = `
        <html>
          <body>
            <div itemscope>
              <span itemprop="name">Test</span>
            </div>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const data = extractStructuredData(document)
      
      // Should skip microdata without itemtype
      expect(data).toEqual([])
    })
  })

  describe('extractMicrodataProperties()', () => {
    
    it('should extract simple microdata properties', () => {
      const html = `
        <div itemscope>
          <span itemprop="name">Product Name</span>
          <span itemprop="price" content="29.99">$29.99</span>
        </div>
      `
      const { document } = new JSDOM(html).window
      const element = document.querySelector('[itemscope]')
      const props = extractMicrodataProperties(element)
      
      expect(props.name).toBe('Product Name')
      expect(props.price).toBe('29.99')
    })

    it('should prefer content attribute over text content', () => {
      const html = `
        <div itemscope>
          <meta itemprop="datePublished" content="2025-01-01">
          <span itemprop="displayDate">January 1, 2025</span>
        </div>
      `
      const { document } = new JSDOM(html).window
      const element = document.querySelector('[itemscope]')
      const props = extractMicrodataProperties(element)
      
      expect(props.datePublished).toBe('2025-01-01')
      expect(props.displayDate).toBe('January 1, 2025')
    })

    it('should extract datetime attribute for time elements', () => {
      const html = `
        <div itemscope>
          <time itemprop="datePublished" datetime="2025-01-01T12:00:00Z">
            January 1, 2025
          </time>
        </div>
      `
      const { document } = new JSDOM(html).window
      const element = document.querySelector('[itemscope]')
      const props = extractMicrodataProperties(element)
      
      expect(props.datePublished).toBe('2025-01-01T12:00:00Z')
    })

    it('should handle multiple values for same property', () => {
      const html = `
        <div itemscope>
          <span itemprop="tag">JavaScript</span>
          <span itemprop="tag">TypeScript</span>
          <span itemprop="tag">Node.js</span>
        </div>
      `
      const { document } = new JSDOM(html).window
      const element = document.querySelector('[itemscope]')
      const props = extractMicrodataProperties(element)
      
      expect(Array.isArray(props.tag)).toBe(true)
      expect(props.tag).toEqual(['JavaScript', 'TypeScript', 'Node.js'])
    })

    it('should handle nested itemprops correctly', () => {
      const html = `
        <div itemscope>
          <span itemprop="name">Main Item</span>
          <div itemprop="relatedItem" itemscope>
            <span itemprop="name">Nested Item</span>
          </div>
        </div>
      `
      const { document } = new JSDOM(html).window
      const element = document.querySelector('[itemscope]')
      const props = extractMicrodataProperties(element)
      
      // Should extract all itemprop elements, including nested ones
      expect(props.name).toBeDefined()
    })

    it('should trim whitespace from text content', () => {
      const html = `
        <div itemscope>
          <span itemprop="name">
            
            Product Name With Spaces
            
          </span>
        </div>
      `
      const { document } = new JSDOM(html).window
      const element = document.querySelector('[itemscope]')
      const props = extractMicrodataProperties(element)
      
      expect(props.name).toBe('Product Name With Spaces')
    })

    it('should skip properties without values', () => {
      const html = `
        <div itemscope>
          <span itemprop="name">Valid Name</span>
          <span itemprop="empty"></span>
          <span itemprop></span>
        </div>
      `
      const { document } = new JSDOM(html).window
      const element = document.querySelector('[itemscope]')
      const props = extractMicrodataProperties(element)
      
      expect(props.name).toBe('Valid Name')
      expect(props.empty).toBeUndefined()
      expect(Object.keys(props).length).toBe(1)
    })

    it('should return empty object for null element', () => {
      const props = extractMicrodataProperties(null)
      expect(props).toEqual({})
    })

    it('should return empty object for element without itemprop children', () => {
      const html = '<div itemscope><p>No properties</p></div>'
      const { document } = new JSDOM(html).window
      const element = document.querySelector('[itemscope]')
      const props = extractMicrodataProperties(element)
      
      expect(props).toEqual({})
    })
  })

  describe('extractImages()', () => {
    
    it('should extract images with valid dimensions', () => {
      const html = `
        <html>
          <body>
            <img src="https://example.com/image1.jpg" alt="Image 1" width="500" height="300">
            <img src="https://example.com/image2.jpg" alt="Image 2" width="800" height="600">
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      
      const extracted = extractImages(document)
      
      expect(extracted).toHaveLength(2)
      expect(extracted[0].src).toBe('https://example.com/image1.jpg')
      expect(extracted[0].alt).toBe('Image 1')
      expect(extracted[0].width).toBe(500)
      expect(extracted[0].height).toBe(300)
    })

    it('should filter out small images (icons/decorative)', () => {
      const html = `
        <html>
          <body>
            <img src="https://example.com/icon.png" alt="Icon" width="50" height="50">
            <img src="https://example.com/large.jpg" alt="Large Image" width="800" height="600">
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      
      const extracted = extractImages(document)
      
      expect(extracted).toHaveLength(1)
      expect(extracted[0].alt).toBe('Large Image')
    })

    it('should skip images without src', () => {
      const html = `
        <html>
          <body>
            <img alt="No source">
            <img src="https://example.com/valid.jpg" alt="Valid" width="500" height="300">
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      
      const extracted = extractImages(document)
      
      expect(extracted).toHaveLength(1)
      expect(extracted[0].alt).toBe('Valid')
    })

    it('should limit to maxCount images (default 5)', () => {
      const html = `
        <html>
          <body>
            ${Array(10).fill('<img src="https://example.com/img.jpg" alt="Image" width="500" height="300">').join('')}
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      
      const extracted = extractImages(document)
      
      expect(extracted).toHaveLength(5)
    })

    it('should respect custom maxCount option', () => {
      const html = `
        <html>
          <body>
            ${Array(10).fill('<img src="https://example.com/img.jpg" alt="Image" width="500" height="300">').join('')}
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      
      const extracted = extractImages(document, { maxCount: 3 })
      
      expect(extracted).toHaveLength(3)
    })

    it('should respect custom minWidth and minHeight options', () => {
      const html = `
        <html>
          <body>
            <img src="https://example.com/small.jpg" alt="Small" width="150" height="150">
            <img src="https://example.com/large.jpg" alt="Large" width="500" height="500">
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      
      const extracted = extractImages(document, { minWidth: 200, minHeight: 200 })
      
      expect(extracted).toHaveLength(1)
      expect(extracted[0].alt).toBe('Large')
    })

    it('should include title attribute if present', () => {
      const html = `
        <html>
          <body>
            <img src="https://example.com/img.jpg" alt="Image" title="Image Title" width="500" height="300">
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      
      const extracted = extractImages(document)
      
      expect(extracted[0].title).toBe('Image Title')
    })

    it('should handle missing alt and title attributes', () => {
      const html = `
        <html>
          <body>
            <img src="https://example.com/img.jpg" width="500" height="300">
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      
      const extracted = extractImages(document)
      
      expect(extracted[0].alt).toBe('')
      expect(extracted[0].title).toBe('')
    })

    it('should return empty array for null document', () => {
      const extracted = extractImages(null)
      expect(extracted).toEqual([])
    })

    it('should return empty array when no valid images found', () => {
      const html = '<html><body><p>No images</p></body></html>'
      const { document } = new JSDOM(html).window
      const extracted = extractImages(document)
      
      expect(extracted).toEqual([])
    })
  })

  describe('extractLinks()', () => {
    
    it('should extract links with href and text', () => {
      const html = `
        <html>
          <body>
            <a href="https://example.com/page1">Page 1</a>
            <a href="https://example.com/page2">Page 2</a>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const links = extractLinks(document)
      
      expect(links).toHaveLength(2)
      expect(links[0]).toEqual({
        url: 'https://example.com/page1',
        text: 'Page 1',
        title: ''
      })
      expect(links[1]).toEqual({
        url: 'https://example.com/page2',
        text: 'Page 2',
        title: ''
      })
    })

    it('should skip links without href', () => {
      const html = `
        <html>
          <body>
            <a>No href</a>
            <a href="https://example.com/valid">Valid link</a>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const links = extractLinks(document)
      
      expect(links).toHaveLength(1)
      expect(links[0].text).toBe('Valid link')
    })

    it('should skip links without text content', () => {
      const html = `
        <html>
          <body>
            <a href="https://example.com/empty"></a>
            <a href="https://example.com/valid">Valid text</a>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const links = extractLinks(document)
      
      expect(links).toHaveLength(1)
      expect(links[0].text).toBe('Valid text')
    })

    it('should skip javascript: links', () => {
      const html = `
        <html>
          <body>
            <a href="javascript:void(0)">JavaScript link</a>
            <a href="https://example.com/valid">Valid link</a>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const links = extractLinks(document)
      
      expect(links).toHaveLength(1)
      expect(links[0].url).toBe('https://example.com/valid')
    })

    it('should skip anchor links (hash only)', () => {
      const html = `
        <html>
          <body>
            <a href="#section">Anchor link</a>
            <a href="https://example.com/page">Valid link</a>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const links = extractLinks(document)
      
      expect(links).toHaveLength(1)
      expect(links[0].url).toBe('https://example.com/page')
    })

    it('should deduplicate links by URL', () => {
      const html = `
        <html>
          <body>
            <a href="https://example.com/page">Link 1</a>
            <a href="https://example.com/page">Link 2 (duplicate)</a>
            <a href="https://example.com/other">Other link</a>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const links = extractLinks(document)
      
      expect(links).toHaveLength(2)
      expect(links[0].text).toBe('Link 1')
      expect(links[1].url).toBe('https://example.com/other')
    })

    it('should limit to maxCount links (default 20)', () => {
      const linkTags = Array(30).fill(0).map((_, i) => 
        `<a href="https://example.com/page${i}">Link ${i}</a>`
      ).join('')
      const html = `<html><body>${linkTags}</body></html>`
      const { document } = new JSDOM(html).window
      const links = extractLinks(document)
      
      expect(links).toHaveLength(20)
    })

    it('should respect custom maxCount option', () => {
      const linkTags = Array(30).fill(0).map((_, i) => 
        `<a href="https://example.com/page${i}">Link ${i}</a>`
      ).join('')
      const html = `<html><body>${linkTags}</body></html>`
      const { document } = new JSDOM(html).window
      const links = extractLinks(document, { maxCount: 10 })
      
      expect(links).toHaveLength(10)
    })

    it('should include title attribute if present', () => {
      const html = `
        <html>
          <body>
            <a href="https://example.com/page" title="Page Title">Link text</a>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const links = extractLinks(document)
      
      expect(links[0].title).toBe('Page Title')
    })

    it('should trim whitespace from link text', () => {
      const html = `
        <html>
          <body>
            <a href="https://example.com/page">
              
              Link with spaces
              
            </a>
          </body>
        </html>
      `
      const { document } = new JSDOM(html).window
      const links = extractLinks(document)
      
      expect(links[0].text).toBe('Link with spaces')
    })

    it('should return empty array for null document', () => {
      const links = extractLinks(null)
      expect(links).toEqual([])
    })

    it('should return empty array when no valid links found', () => {
      const html = '<html><body><p>No links</p></body></html>'
      const { document } = new JSDOM(html).window
      const links = extractLinks(document)
      
      expect(links).toEqual([])
    })
  })
})

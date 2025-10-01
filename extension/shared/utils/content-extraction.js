/**
 * Content Extraction Utilities
 * Extracted from content-script.js for better testability and reusability
 */

/**
 * Extract main content from a document
 * @param {Document} document - DOM document to extract from
 * @returns {string} Extracted main content text
 */
function extractMainContent(document) {
  if (!document || !document.body) {
    return ''
  }

  // Try to find main content area
  let contentElement = document.querySelector('article') ||
                      document.querySelector('main') ||
                      document.querySelector('.content') ||
                      document.querySelector('#content') ||
                      document.querySelector('.post') ||
                      document.querySelector('.entry-content')

  // Fallback to body if no main content area found
  if (!contentElement) {
    contentElement = document.body
  }

  // Clean up and extract text
  const clonedElement = contentElement.cloneNode(true)

  // Remove unwanted elements
  const unwantedSelectors = [
    'script', 'style', 'nav', 'header', 'footer',
    '.advertisement', '.ad', '.sidebar', '.menu',
    '.social-share', '.comments', '.related-posts'
  ]

  unwantedSelectors.forEach(selector => {
    const elements = clonedElement.querySelectorAll(selector)
    elements.forEach(el => el.remove())
  })

  // Extract text content
  let textContent = clonedElement.innerText || clonedElement.textContent || ''

  // Clean up whitespace
  textContent = textContent.replace(/\s+/g, ' ').trim()

  // Limit content length (first 10000 characters)
  return textContent.slice(0, 10000)
}

/**
 * Extract page metadata (OG, Twitter, Article tags)
 * @param {Document} document - DOM document to extract from
 * @returns {Object} Metadata object with various meta tags
 */
function extractMetadata(document) {
  if (!document) {
    return {}
  }

  const meta = {}

  // Standard meta tags
  const metaTags = {
    description: 'meta[name="description"]',
    keywords: 'meta[name="keywords"]',
    author: 'meta[name="author"]',
    publisher: 'meta[name="publisher"]',
    language: 'meta[name="language"]',
    robots: 'meta[name="robots"]'
  }

  Object.entries(metaTags).forEach(([key, selector]) => {
    const element = document.querySelector(selector)
    if (element && element.content) {
      meta[key] = element.content
    }
  })

  // Open Graph tags
  const ogTags = document.querySelectorAll('meta[property^="og:"]')
  ogTags.forEach(tag => {
    const property = tag.getAttribute('property').replace('og:', '')
    if (tag.content) {
      meta[`og_${property}`] = tag.content
    }
  })

  // Twitter Card tags
  const twitterTags = document.querySelectorAll('meta[name^="twitter:"]')
  twitterTags.forEach(tag => {
    const property = tag.getAttribute('name').replace('twitter:', '')
    if (tag.content) {
      meta[`twitter_${property}`] = tag.content
    }
  })

  // Article metadata
  const articleTags = document.querySelectorAll('meta[property^="article:"]')
  articleTags.forEach(tag => {
    const property = tag.getAttribute('property').replace('article:', '')
    if (tag.content) {
      meta[`article_${property}`] = tag.content
    }
  })

  // Canonical URL
  const canonical = document.querySelector('link[rel="canonical"]')
  if (canonical) {
    meta.canonical_url = canonical.href
  }

  return meta
}

/**
 * Extract structured data (JSON-LD and microdata)
 * @param {Document} document - DOM document to extract from
 * @returns {Array} Array of structured data objects
 */
function extractStructuredData(document) {
  if (!document) {
    return []
  }

  const structuredData = []

  // JSON-LD
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
  jsonLdScripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent)
      structuredData.push({
        type: 'json-ld',
        data
      })
    } catch (error) {
      // Skip malformed JSON-LD
      console.warn('Failed to parse JSON-LD:', error)
    }
  })

  // Microdata (basic extraction)
  const microdataItems = document.querySelectorAll('[itemscope]')
  microdataItems.forEach(item => {
    const itemType = item.getAttribute('itemtype')
    if (itemType) {
      structuredData.push({
        type: 'microdata',
        itemType,
        properties: extractMicrodataProperties(item)
      })
    }
  })

  return structuredData
}

/**
 * Extract microdata properties from an element
 * @param {Element} element - DOM element with microdata
 * @returns {Object} Object with microdata properties
 */
function extractMicrodataProperties(element) {
  if (!element) {
    return {}
  }

  const properties = {}
  const propElements = element.querySelectorAll('[itemprop]')

  propElements.forEach(propEl => {
    const propName = propEl.getAttribute('itemprop')
    const propValue = propEl.getAttribute('content') ||
                   propEl.getAttribute('datetime') ||
                   propEl.textContent.trim()

    if (propName && propValue) {
      if (properties[propName]) {
        // Handle multiple values
        if (Array.isArray(properties[propName])) {
          properties[propName].push(propValue)
        } else {
          properties[propName] = [properties[propName], propValue]
        }
      } else {
        properties[propName] = propValue
      }
    }
  })

  return properties
}

/**
 * Extract images from document with size and alt filtering
 * @param {Document} document - DOM document to extract from
 * @param {Object} options - Options for filtering (minWidth, minHeight, maxCount)
 * @returns {Array} Array of image objects
 */
function extractImages(document, options = {}) {
  if (!document) {
    return []
  }

  const {
    minWidth = 100,
    minHeight = 100,
    maxCount = 5
  } = options

  const images = []
  const imgElements = document.querySelectorAll('img')

  imgElements.forEach(img => {
    // Skip images without src
    if (!img.src) {
      return
    }

    // Get dimensions - prefer natural dimensions, fallback to attributes for testing
    // naturalWidth/naturalHeight are read-only in browsers but can be mocked in tests
    const width = img.naturalWidth || parseInt(img.getAttribute('width')) || 0
    const height = img.naturalHeight || parseInt(img.getAttribute('height')) || 0

    // Skip images with zero dimensions (not loaded) or too small (icons/decorative)
    if (width === 0 || height === 0 || width < minWidth || height < minHeight) {
      return
    }

    images.push({
      src: img.src,
      alt: img.alt || '',
      width,
      height,
      title: img.title || ''
    })
  })

  // Limit to maxCount images
  return images.slice(0, maxCount)
}

/**
 * Extract links from document with deduplication
 * @param {Document} document - DOM document to extract from
 * @param {Object} options - Options for filtering (maxCount)
 * @returns {Array} Array of link objects
 */
function extractLinks(document, options = {}) {
  if (!document) {
    return []
  }

  const { maxCount = 20 } = options

  const links = []
  const seenUrls = new Set()
  const linkElements = document.querySelectorAll('a[href]')

  linkElements.forEach(link => {
    const href = link.href
    const text = link.textContent.trim()

    // Skip invalid links
    // Note: JSDOM resolves # to absolute URLs like 'about:blank#section'
    if (!href || !text || href.startsWith('javascript:') || 
        href.includes('#') && href.split('#')[1] && !href.split('#')[0].startsWith('http')) {
      return
    }

    // Deduplicate by URL
    if (seenUrls.has(href)) {
      return
    }

    seenUrls.add(href)
    links.push({
      url: href,
      text,
      title: link.title || ''
    })
  })

  // Limit to maxCount links
  return links.slice(0, maxCount)
}

// Export functions for testing and reuse
module.exports = {
  extractMainContent,
  extractMetadata,
  extractStructuredData,
  extractMicrodataProperties,
  extractImages,
  extractLinks
}

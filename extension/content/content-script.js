// SmartShelf Content Script
// Handles page content extraction and user interface injection

console.log('SmartShelf Content Script loaded');

// Initialize content script
(function() {
  'use strict'

  // Avoid multiple injections
  if (window.smartShelfInjected) {
    return
  }
  window.smartShelfInjected = true

  // Add visual feedback for saved content
  let saveIndicator = null

  // Listen for messages from other extension components
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request)

    switch (request.action) {
      case 'extract_content': {
        const pageData = extractPageContent()
        sendResponse({ success: true, data: pageData })
        break
      }

      case 'show_save_success':
        showSaveIndicator('✅ Saved to SmartShelf')
        sendResponse({ success: true })
        break

      case 'show_save_error':
        showSaveIndicator('❌ Failed to save', 'error')
        sendResponse({ success: true })
        break

      case 'focus_search':
        // This will be handled if we add search overlay to pages
        sendResponse({ success: true })
        break
    }
  })

  // Extract comprehensive page content optimized for AI processing
  function extractPageContent() {
    try {
      // Basic page information
      const pageData = {
        title: document.title || '',
        url: window.location.href,
        timestamp: Date.now(),
        domain: window.location.hostname
      }

      // Extract main content
      pageData.content = extractMainContent()

      // Extract comprehensive metadata
      pageData.meta = extractMetadata()

      // Extract structured data (JSON-LD, microdata, etc.)
      pageData.structuredData = extractStructuredData()

      // Detect content type based on page analysis
      pageData.type = detectContentType()

      // Extract images with metadata
      pageData.images = extractImages()

      // Extract links and references
      pageData.links = extractLinks()

      // Estimate reading time
      pageData.readingTime = estimateReadingTime(pageData.content)

      // Extract content quality indicators
      pageData.quality = assessContentQuality(pageData)

      console.log('Extracted page content:', pageData)
      return pageData
    } catch (error) {
      console.error('Failed to extract page content:', error)
      return {
        title: document.title || '',
        url: window.location.href,
        content: '',
        timestamp: Date.now(),
        error: error.message
      }
    }
  }

  // Extract main content from page
  function extractMainContent() {
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

  // Extract page metadata
  function extractMetadata() {
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
      if (element) {
        meta[key] = element.content
      }
    })

    // Open Graph tags
    const ogTags = document.querySelectorAll('meta[property^="og:"]')
    ogTags.forEach(tag => {
      const property = tag.getAttribute('property').replace('og:', '')
      meta[`og_${property}`] = tag.content
    })

    // Twitter Card tags
    const twitterTags = document.querySelectorAll('meta[name^="twitter:"]')
    twitterTags.forEach(tag => {
      const property = tag.getAttribute('name').replace('twitter:', '')
      meta[`twitter_${property}`] = tag.content
    })

    // Article metadata
    const articleTags = document.querySelectorAll('meta[property^="article:"]')
    articleTags.forEach(tag => {
      const property = tag.getAttribute('property').replace('article:', '')
      meta[`article_${property}`] = tag.content
    })

    // Canonical URL
    const canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) {
      meta.canonical_url = canonical.href
    }

    return meta
  }

  // Extract structured data (JSON-LD, microdata)
  function extractStructuredData() {
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

  // Extract microdata properties
  function extractMicrodataProperties(element) {
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

  // Detect content type based on URL and content
  function detectContentType() {
    const url = window.location.href.toLowerCase()
    const hostname = window.location.hostname.toLowerCase()

    // Video platforms
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'video'
    }
    if (hostname.includes('vimeo.com') || hostname.includes('dailymotion.com')) {
      return 'video'
    }

    // Social media
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return 'social'
    }
    if (hostname.includes('linkedin.com') || hostname.includes('facebook.com')) {
      return 'social'
    }

    // Academic/Research
    if (hostname.includes('arxiv.org') || hostname.includes('pubmed.ncbi.nlm.nih.gov')) {
      return 'research'
    }
    if (hostname.includes('scholar.google.com') || hostname.includes('researchgate.net')) {
      return 'research'
    }

    // Documentation
    if (hostname.includes('docs.') || url.includes('/docs/') || url.includes('/documentation/')) {
      return 'documentation'
    }

    // News sites
    const newsSites = ['cnn.com', 'bbc.com', 'reuters.com', 'npr.org', 'nytimes.com', 'guardian.com']
    if (newsSites.some(site => hostname.includes(site))) {
      return 'news'
    }

    // Blogs
    if (hostname.includes('medium.com') || hostname.includes('substack.com')) {
      return 'blog'
    }

    // Check for PDF
    if (url.includes('.pdf') || document.contentType === 'application/pdf') {
      return 'document'
    }

    // Default to article
    return 'article'
  }

  // Extract relevant images
  function extractImages() {
    const images = []

    // Get main content images
    const imgElements = document.querySelectorAll('img')

    imgElements.forEach(img => {
      // Skip very small images (likely icons/decorative)
      if (img.naturalWidth < 100 || img.naturalHeight < 100) {
        return
      }

      // Skip images without src
      if (!img.src) {
        return
      }

      images.push({
        src: img.src,
        alt: img.alt || '',
        width: img.naturalWidth,
        height: img.naturalHeight,
        title: img.title || ''
      })
    })

    // Limit to first 5 images
    return images.slice(0, 5)
  }

  // Show save indicator to user
  function showSaveIndicator(message, type = 'success') {
    // Remove existing indicator
    if (saveIndicator) {
      saveIndicator.remove()
    }

    // Create indicator element
    saveIndicator = document.createElement('div')
    saveIndicator.textContent = message
    saveIndicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f44336' : '#4caf50'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateX(100px);
    `

    document.body.appendChild(saveIndicator)

    // Animate in
    setTimeout(() => {
      saveIndicator.style.opacity = '1'
      saveIndicator.style.transform = 'translateX(0)'
    }, 10)

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (saveIndicator) {
        saveIndicator.style.opacity = '0'
        saveIndicator.style.transform = 'translateX(100px)'
        setTimeout(() => {
          if (saveIndicator) {
            saveIndicator.remove()
            saveIndicator = null
          }
        }, 300)
      }
    }, 3000)
  }

  // Add keyboard shortcut listener
  document.addEventListener('keydown', (event) => {
    // Check for Ctrl+Shift+S (or Cmd+Shift+S on Mac)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
      event.preventDefault()

      // Extract content and send to service worker
      const pageData = extractPageContent()

      chrome.runtime.sendMessage({
        action: 'save_content',
        data: pageData
      }).then(response => {
        if (response && response.success) {
          showSaveIndicator('✅ Saved to SmartShelf')
        } else {
          showSaveIndicator('❌ Failed to save', 'error')
        }
      }).catch(error => {
        console.error('Failed to save content:', error)
        showSaveIndicator('❌ Failed to save', 'error')
      })
    }
  })

  // Extract links and references
  function extractLinks() {
    const links = []
    const linkElements = document.querySelectorAll('a[href]')

    linkElements.forEach(link => {
      const href = link.href
      const text = link.textContent.trim()

      if (href && text && !href.startsWith('javascript:') && !href.startsWith('#')) {
        links.push({
          url: href,
          text,
          title: link.title || ''
        })
      }
    })

    return links.slice(0, 20) // Limit to first 20 links
  }

  // Estimate reading time based on word count
  function estimateReadingTime(content) {
    const wordsPerMinute = 200 // Average reading speed
    const words = (content || '').split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)

    return {
      words,
      minutes,
      text: minutes === 1 ? '1 min read' : `${minutes} min read`
    }
  }

  // Assess content quality for AI processing
  function assessContentQuality(pageData) {
    const content = pageData.content || ''
    const title = pageData.title || ''

    const indicators = {
      hasTitle: title.length > 0,
      hasContent: content.length > 100,
      hasDescription: (pageData.meta?.description || '').length > 0,
      hasImages: (pageData.images || []).length > 0,
      hasLinks: (pageData.links || []).length > 0,
      wordCount: content.split(/\s+/).length,
      titleLength: title.length,
      contentLength: content.length
    }

    // Calculate quality score (0-100)
    let score = 0
    if (indicators.hasTitle) score += 20
    if (indicators.hasContent) score += 30
    if (indicators.hasDescription) score += 15
    if (indicators.hasImages) score += 10
    if (indicators.hasLinks) score += 10
    if (indicators.wordCount > 300) score += 15

    return {
      score: Math.min(score, 100),
      indicators,
      rating: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'
    }
  }

  console.log('SmartShelf Content Script initialized')
})()

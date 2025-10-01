/**
 * DOM Helper Utilities
 * Safe DOM manipulation and element utilities for Chrome Extension
 * Part of SmartShelf AI-Powered Chrome Extension
 * 
 * Functions:
 * - querySelector(selector, root) - Safe querySelector with fallback
 * - querySelectorAll(selector, root) - Safe querySelectorAll wrapper
 * - removeElements(root, selectors) - Batch element removal
 * - getTextContent(element) - Clean text extraction
 * - createElementFromHTML(html) - Safe HTML parsing
 */

/**
 * Safe querySelector with fallback to null
 * Prevents exceptions from invalid selectors
 * @param {string} selector - CSS selector
 * @param {Element|Document} root - Root element to query from (default: document)
 * @returns {Element|null} - Found element or null
 */
function querySelector(selector, root) {
  if (!selector || typeof selector !== 'string') {
    return null
  }

  // Use provided root or global document
  const context = root || (typeof document !== 'undefined' ? document : null)
  
  if (!context || typeof context.querySelector !== 'function') {
    return null
  }

  try {
    return context.querySelector(selector)
  } catch (error) {
    console.warn(`Invalid selector: "${selector}"`, error)
    return null
  }
}

/**
 * Safe querySelectorAll with fallback to empty array
 * Prevents exceptions from invalid selectors
 * @param {string} selector - CSS selector
 * @param {Element|Document} root - Root element to query from (default: document)
 * @returns {Element[]} - Array of found elements (empty if error)
 */
function querySelectorAll(selector, root) {
  if (!selector || typeof selector !== 'string') {
    return []
  }

  // Use provided root or global document
  const context = root || (typeof document !== 'undefined' ? document : null)
  
  if (!context || typeof context.querySelectorAll !== 'function') {
    return []
  }

  try {
    const nodeList = context.querySelectorAll(selector)
    return Array.from(nodeList)
  } catch (error) {
    console.warn(`Invalid selector: "${selector}"`, error)
    return []
  }
}

/**
 * Remove multiple elements matching selectors
 * Handles single selector string or array of selectors
 * @param {Element|Document} root - Root element to remove from
 * @param {string|string[]} selectors - Selector(s) to remove
 * @returns {number} - Count of elements removed
 */
function removeElements(root, selectors) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return 0
  }

  if (!selectors) {
    return 0
  }

  // Normalize to array
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors]
  
  let removedCount = 0

  for (const selector of selectorArray) {
    if (!selector || typeof selector !== 'string') {
      continue
    }

    try {
      const elements = root.querySelectorAll(selector)
      elements.forEach(element => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element)
          removedCount++
        }
      })
    } catch (error) {
      console.warn(`Failed to remove elements with selector: "${selector}"`, error)
    }
  }

  return removedCount
}

/**
 * Extract clean text content from element
 * Handles nested elements, whitespace normalization
 * @param {Element} element - Element to extract text from
 * @returns {string} - Cleaned text content
 */
function getTextContent(element) {
  if (!element) {
    return ''
  }

  // Handle disconnected nodes
  if (!element.textContent && element.innerText === undefined) {
    return ''
  }

  try {
    // Use textContent for standard elements
    let text = element.textContent || element.innerText || ''

    // Normalize whitespace (but preserve single newlines)
    text = text
      .replace(/[ \t]+/g, ' ')  // Collapse horizontal whitespace only
      .replace(/\n{3,}/g, '\n\n')  // Collapse 3+ newlines to 2
      .trim()

    return text
  } catch (error) {
    console.warn('Failed to extract text content', error)
    return ''
  }
}

/**
 * Create element from HTML string with safety checks
 * Sanitizes script tags and event handlers
 * @param {string} html - HTML string to parse
 * @returns {Element|null} - Created element or null if unsafe
 */
function createElementFromHTML(html) {
  if (!html || typeof html !== 'string') {
    return null
  }

  // Security checks - reject dangerous content
  const dangerousPatterns = [
    /<script[^>]*>/i,  // Script tags
    /javascript:/i,  // javascript: protocol
    /data:text\/html/i,  // data: URLs with HTML
    /on\w+\s*=/i  // Event handlers (onclick, onerror, etc.)
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(html)) {
      console.warn('Unsafe HTML content detected, rejecting')
      return null
    }
  }

  try {
    // Create temporary container
    const container = (typeof document !== 'undefined' && document.createElement) 
      ? document.createElement('div') 
      : null
    
    if (!container) {
      console.warn('Document createElement not available')
      return null
    }
    
    // Parse HTML
    container.innerHTML = html.trim()

    // Return first child element
    const element = container.firstElementChild

    if (!element) {
      console.warn('No valid element created from HTML')
      return null
    }

    return element
  } catch (error) {
    console.warn('Failed to create element from HTML', error)
    return null
  }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    querySelector,
    querySelectorAll,
    removeElements,
    getTextContent,
    createElementFromHTML
  }
}

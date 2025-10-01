/**
 * Text Formatting Utilities
 * Provides text manipulation functions for display and data processing
 * Part of SmartShelf AI-Powered Chrome Extension
 * 
 * Functions:
 * - escapeHtml(text) - HTML entity escaping for safe display
 * - truncateText(text, maxLength) - Text truncation with ellipsis
 * - capitalizeWords(text) - Title case conversion
 * - slugify(text) - URL-safe slug generation
 * - stripHtml(html) - HTML tag removal
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - HTML-safe text
 */
function escapeHtml(text) {
  if (text === null || text === undefined) {
    return ''
  }

  if (typeof text !== 'string') {
    text = String(text)
  }

  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }

  return text.replace(/[&<>"']/g, char => htmlEntities[char])
}

/**
 * Truncate text to specified length with ellipsis
 * Preserves word boundaries when possible
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default: 100)
 * @returns {string} - Truncated text with ellipsis if needed
 */
function truncateText(text, maxLength = 100) {
  if (text === null || text === undefined) {
    return ''
  }

  if (typeof text !== 'string') {
    text = String(text)
  }

  if (typeof maxLength !== 'number' || maxLength < 1) {
    maxLength = 100
  }

  // No truncation needed
  if (text.length <= maxLength) {
    return text
  }

  // Truncate at max length
  let truncated = text.substring(0, maxLength)

  // Try to preserve word boundaries
  const lastSpace = truncated.lastIndexOf(' ')
  
  // Only use word boundary if it's reasonably close to the end
  // (at least 85% of maxLength to avoid too-short truncations)
  if (lastSpace > maxLength * 0.85) {
    truncated = truncated.substring(0, lastSpace)
  }

  return truncated + '...'
}

/**
 * Convert text to title case (capitalize first letter of each word)
 * @param {string} text - Text to capitalize
 * @returns {string} - Title-cased text
 */
function capitalizeWords(text) {
  if (text === null || text === undefined) {
    return ''
  }

  if (typeof text !== 'string') {
    text = String(text)
  }

  if (text.length === 0) {
    return ''
  }

  // Split by whitespace and punctuation boundaries
  return text
    .toLowerCase()
    .split(/(\s+|[-–—])/) // Split on whitespace and dashes, keeping delimiters
    .map(word => {
      if (word.length === 0 || /^\s+$/.test(word) || /^[-–—]$/.test(word)) {
        return word // Keep whitespace and punctuation as-is
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join('')
}

/**
 * Convert text to URL-safe slug
 * @param {string} text - Text to convert
 * @returns {string} - URL-safe slug (lowercase, hyphenated)
 */
function slugify(text) {
  if (text === null || text === undefined) {
    return ''
  }

  if (typeof text !== 'string') {
    text = String(text)
  }

  return text
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove special characters (keep alphanumeric, hyphens, and some Unicode)
    .replace(/[^\w\u00C0-\u017F-]+/g, '')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
}

/**
 * Remove HTML tags from text
 * @param {string} html - HTML string
 * @returns {string} - Plain text without HTML tags
 */
function stripHtml(html) {
  if (html === null || html === undefined) {
    return ''
  }

  if (typeof html !== 'string') {
    html = String(html)
  }

  // Remove HTML tags (add space when removing to preserve word boundaries)
  let text = html.replace(/<[^>]*>/g, ' ')

  // Decode common HTML entities
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  }

  Object.keys(entities).forEach(entity => {
    text = text.replace(new RegExp(entity, 'g'), entities[entity])
  })

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim()

  return text
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    truncateText,
    capitalizeWords,
    slugify,
    stripHtml
  }
}

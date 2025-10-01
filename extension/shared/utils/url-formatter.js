/**
 * URL Formatting Utilities
 * 
 * Provides functions for formatting URLs for display in the extension UI.
 * Extracted from popup.js and sidepanel.js for reusability and testing.
 * 
 * Functions:
 * - formatUrl(url) - Format URL for display with truncation
 * - formatSource(url) - Extract domain name from URL
 * - extractDomain(url) - Get domain with port (no www removal)
 * - truncatePath(path, maxLength) - Truncate path with ellipsis
 */

/**
 * Format URL for display by removing protocol and truncating long paths
 * 
 * @param {string} url - The URL to format
 * @returns {string} Formatted URL suitable for display
 * 
 * @example
 * formatUrl('https://www.example.com/page')
 * // Returns: 'example.com/page'
 * 
 * formatUrl('https://example.com/very/long/path/to/resource')
 * // Returns: 'example.com/very/long/path/to...'
 */
function formatUrl(url) {
  // Handle null/undefined/empty
  if (!url) {
    return ''
  }

  try {
    // Parse URL
    const urlObj = new URL(url)
    
    // Extract domain without www
    const domain = urlObj.hostname.replace(/^www\./, '')
    
    // Include port if non-standard
    const port = urlObj.port ? `:${urlObj.port}` : ''
    
    // Get path, query, and hash
    const path = urlObj.pathname
    const query = urlObj.search
    const hash = urlObj.hash
    
    // Build full path string
    const fullPath = path + query + hash
    
    // If only root path, return domain only
    if (fullPath === '/' || fullPath === '') {
      return domain + port
    }
    
    // Build complete URL string
    const completeUrl = domain + port + fullPath
    
    // Truncate if too long (max 50 chars for display)
    const maxLength = 50
    if (completeUrl.length > maxLength) {
      // Try to truncate at path boundary
      const domainWithPort = domain + port
      const availableLength = maxLength - domainWithPort.length
      
      if (availableLength > 10) {
        return domainWithPort + truncatePath(fullPath, availableLength)
      }
      
      // If domain itself is too long, truncate the whole thing
      return completeUrl.slice(0, maxLength) + '...'
    }
    
    return completeUrl
    
  } catch (error) {
    // If URL parsing fails, return original string
    return url
  }
}

/**
 * Extract domain name from URL for display as content source
 * Removes www prefix for cleaner display
 * 
 * @param {string} url - The URL to extract domain from
 * @returns {string} Domain name without www prefix
 * 
 * @example
 * formatSource('https://www.example.com/page')
 * // Returns: 'example.com'
 * 
 * formatSource('https://blog.example.com')
 * // Returns: 'blog.example.com'
 */
function formatSource(url) {
  // Handle null/undefined/empty
  if (!url) {
    return ''
  }

  try {
    // Parse URL
    const urlObj = new URL(url)
    
    // Get hostname with port if present
    const hostname = urlObj.hostname
    const port = urlObj.port ? `:${urlObj.port}` : ''
    
    // Remove www prefix
    const domain = hostname.replace(/^www\./, '')
    
    return domain + port
    
  } catch (error) {
    // If URL parsing fails, return original string
    return url
  }
}

/**
 * Extract domain from URL including port, preserving www prefix
 * Used for domain extraction without modification
 * 
 * @param {string} url - The URL to extract domain from
 * @returns {string} Domain name with port (preserves www)
 * 
 * @example
 * extractDomain('https://www.example.com:8443/page')
 * // Returns: 'www.example.com:8443'
 * 
 * extractDomain('https://example.com')
 * // Returns: 'example.com'
 */
function extractDomain(url) {
  // Handle null/undefined/empty
  if (!url) {
    return ''
  }

  try {
    // Parse URL
    const urlObj = new URL(url)
    
    // Get hostname with port if present
    const hostname = urlObj.hostname
    const port = urlObj.port ? `:${urlObj.port}` : ''
    
    return hostname + port
    
  } catch (error) {
    // If URL parsing fails, return empty string
    return ''
  }
}

/**
 * Truncate path to maximum length with ellipsis
 * Attempts to truncate at path segment boundaries
 * 
 * @param {string} path - The path to truncate (including query and hash)
 * @param {number} maxLength - Maximum length (default: 50)
 * @returns {string} Truncated path with '...' if needed
 * 
 * @example
 * truncatePath('/very/long/path/to/resource', 15)
 * // Returns: '/very/long/path...'
 * 
 * truncatePath('/short', 20)
 * // Returns: '/short'
 */
function truncatePath(path, maxLength = 50) {
  // Handle null/undefined/empty
  if (!path) {
    return ''
  }

  // Convert to string and check length
  const pathStr = String(path)
  
  if (pathStr.length <= maxLength) {
    return pathStr
  }

  // Always truncate to exactly maxLength and add '...'
  const truncated = pathStr.slice(0, maxLength)
  
  return truncated + '...'
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatUrl,
    formatSource,
    extractDomain,
    truncatePath
  }
}

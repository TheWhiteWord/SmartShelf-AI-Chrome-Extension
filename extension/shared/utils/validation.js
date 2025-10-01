/**
 * Validation Utilities
 * Comprehensive validation functions for URLs, emails, colors, UUIDs, ISBNs, and dates
 * 
 * Functions:
 * - validateUrl(url) - URL validation (RFC 3986)
 * - validateEmail(email) - Email validation
 * - validateHexColor(color) - Hex color format (#RGB or #RRGGBB)
 * - validateUUID(uuid) - UUID v4 validation
 * - validateISBN(isbn) - ISBN-10/13 validation
 * - validateDateFormat(date) - ISO 8601 date validation
 */

/**
 * Validate URL according to RFC 3986
 * Supports http, https, ftp, file protocols
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
function validateUrl(url) {
  if (typeof url !== 'string' || url.trim() === '') {
    return false
  }

  try {
    // Try to parse as URL
    const urlObj = new URL(url)
    
    // Check for supported protocols
    const validProtocols = ['http:', 'https:', 'ftp:', 'file:']
    if (!validProtocols.includes(urlObj.protocol)) {
      return false
    }

    // For http/https/ftp, ensure hostname is present and valid
    if (['http:', 'https:', 'ftp:'].includes(urlObj.protocol)) {
      if (!urlObj.hostname || urlObj.hostname === '') {
        return false
      }
      
      // Check for double dots in hostname (malformed)
      if (urlObj.hostname.includes('..')) {
        return false
      }
    }

    // Basic validation passed
    return true
  } catch (error) {
    // Invalid URL format
    return false
  }
}

/**
 * Validate email address format
 * Basic validation following common email patterns
 * 
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
function validateEmail(email) {
  if (typeof email !== 'string' || email.trim() === '') {
    return false
  }

  // RFC 5322 simplified email regex with TLD requirement
  // This covers most common email formats and requires at least one dot in domain
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  
  return emailRegex.test(email)
}

/**
 * Validate hex color format
 * Accepts #RGB or #RRGGBB format (case-insensitive)
 * 
 * @param {string} color - Hex color string to validate
 * @returns {boolean} - True if valid hex color
 */
function validateHexColor(color) {
  if (typeof color !== 'string' || color.trim() === '') {
    return false
  }

  // Hex color regex: #RGB or #RRGGBB (case-insensitive)
  const hexRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/
  
  return hexRegex.test(color)
}

/**
 * Validate UUID v4 format
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hexadecimal digit and y is one of 8, 9, A, or B
 * 
 * @param {string} uuid - UUID string to validate
 * @returns {boolean} - True if valid UUID v4
 */
function validateUUID(uuid) {
  if (typeof uuid !== 'string' || uuid.trim() === '') {
    return false
  }

  // UUID v4 regex
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where y is one of [8, 9, a, b, A, B]
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  
  return uuidRegex.test(uuid)
}

/**
 * Calculate ISBN-10 check digit
 * Uses modulo 11 algorithm
 * 
 * @param {string} isbn - ISBN-10 without check digit (9 digits)
 * @returns {string} - Check digit (0-9 or X)
 */
function calculateISBN10CheckDigit(isbn) {
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(isbn[i]) * (10 - i)
  }
  
  const checkDigit = (11 - (sum % 11)) % 11
  return checkDigit === 10 ? 'X' : checkDigit.toString()
}

/**
 * Calculate ISBN-13 check digit
 * Uses modulo 10 algorithm with alternating 1 and 3 weights
 * 
 * @param {string} isbn - ISBN-13 without check digit (12 digits)
 * @returns {string} - Check digit (0-9)
 */
function calculateISBN13CheckDigit(isbn) {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const weight = i % 2 === 0 ? 1 : 3
    sum += parseInt(isbn[i]) * weight
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit.toString()
}

/**
 * Validate ISBN-10 or ISBN-13
 * Accepts with or without hyphens
 * 
 * @param {string} isbn - ISBN string to validate
 * @returns {boolean} - True if valid ISBN-10 or ISBN-13
 */
function validateISBN(isbn) {
  if (typeof isbn !== 'string' || isbn.trim() === '') {
    return false
  }

  // Remove hyphens and spaces
  const cleanISBN = isbn.replace(/[-\s]/g, '')

  // Check length (10 or 13 digits)
  if (cleanISBN.length !== 10 && cleanISBN.length !== 13) {
    return false
  }

  if (cleanISBN.length === 10) {
    // ISBN-10 validation
    // Format: 9 digits + check digit (0-9 or X)
    const isbnRegex = /^[0-9]{9}[0-9X]$/i
    if (!isbnRegex.test(cleanISBN)) {
      return false
    }

    // Validate check digit
    const expectedCheckDigit = calculateISBN10CheckDigit(cleanISBN.substring(0, 9))
    const actualCheckDigit = cleanISBN[9].toUpperCase()
    
    return expectedCheckDigit === actualCheckDigit
  } else {
    // ISBN-13 validation
    // Format: 13 digits
    const isbnRegex = /^[0-9]{13}$/
    if (!isbnRegex.test(cleanISBN)) {
      return false
    }

    // Validate check digit
    const expectedCheckDigit = calculateISBN13CheckDigit(cleanISBN.substring(0, 12))
    const actualCheckDigit = cleanISBN[12]
    
    return expectedCheckDigit === actualCheckDigit
  }
}

/**
 * Validate ISO 8601 date format
 * Accepts various ISO 8601 formats:
 * - YYYY-MM-DD
 * - YYYY-MM-DDTHH:mm:ss
 * - YYYY-MM-DDTHH:mm:ss.sss
 * - YYYY-MM-DDTHH:mm:ss.sssZ
 * - YYYY-MM-DDTHH:mm:ss+HH:mm
 * 
 * @param {string} date - Date string to validate
 * @returns {boolean} - True if valid ISO 8601 date
 */
function validateDateFormat(date) {
  if (typeof date !== 'string' || date.trim() === '') {
    return false
  }

  // ISO 8601 date regex
  // Supports: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, with optional milliseconds and timezone
  const iso8601Regex = /^(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?)?$/
  
  const match = iso8601Regex.test(date)
  if (!match) {
    return false
  }

  // Additional validation: check if date is actually valid
  try {
    const dateObj = new Date(date)
    
    // Check if date is valid (not NaN)
    if (isNaN(dateObj.getTime())) {
      return false
    }

    // Check for impossible dates (e.g., 2024-02-30)
    // Parse the date components
    const parts = date.match(iso8601Regex)
    const year = parseInt(parts[1])
    const month = parseInt(parts[2])
    const day = parseInt(parts[3])

    // Validate month
    if (month < 1 || month > 12) {
      return false
    }

    // Validate day
    const daysInMonth = new Date(year, month, 0).getDate()
    if (day < 1 || day > daysInMonth) {
      return false
    }

    // If time is present, validate time components
    if (parts[5] !== undefined) {
      const hour = parseInt(parts[5])
      const minute = parseInt(parts[6])
      const second = parseInt(parts[7])

      if (hour < 0 || hour > 23) return false
      if (minute < 0 || minute > 59) return false
      if (second < 0 || second > 59) return false
    }

    return true
  } catch (error) {
    return false
  }
}

// Export functions
module.exports = {
  validateUrl,
  validateEmail,
  validateHexColor,
  validateUUID,
  validateISBN,
  validateDateFormat
}

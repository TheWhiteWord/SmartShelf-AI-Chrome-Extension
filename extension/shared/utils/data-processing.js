/**
 * Data Processing Utilities
 * Provides performance optimization and data manipulation functions
 * Part of SmartShelf AI-Powered Chrome Extension
 * 
 * Functions:
 * - debounce(fn, delay) - Debounce function execution
 * - throttle(fn, limit) - Throttle function execution
 * - chunk(array, size) - Array chunking
 * - deduplicate(array, key) - Array deduplication
 * - deepClone(obj) - Deep object cloning
 * - deepMerge(target, source) - Deep object merging
 */

/**
 * Debounce function execution
 * Delays function execution until delay ms after the last call
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(fn, delay = 300) {
  if (typeof fn !== 'function') {
    throw new TypeError('First argument must be a function')
  }

  if (typeof delay !== 'number' || delay < 0) {
    throw new TypeError('Delay must be a non-negative number')
  }

  let timeoutId = null

  const debounced = function(...args) {
    const context = this

    // Clear existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    // Set new timeout
    timeoutId = setTimeout(() => {
      timeoutId = null
      fn.apply(context, args)
    }, delay)
  }

  // Add cancel method to clear pending execution
  debounced.cancel = function() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debounced
}

/**
 * Throttle function execution
 * Limits function execution to at most once per limit ms
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
function throttle(fn, limit = 300) {
  if (typeof fn !== 'function') {
    throw new TypeError('First argument must be a function')
  }

  if (typeof limit !== 'number' || limit < 0) {
    throw new TypeError('Limit must be a non-negative number')
  }

  let lastCall = 0
  let timeoutId = null

  const throttled = function(...args) {
    const context = this
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    // Clear any pending trailing call
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }

    if (timeSinceLastCall >= limit) {
      // Execute immediately
      lastCall = now
      fn.apply(context, args)
    } else {
      // Schedule trailing call
      const remaining = limit - timeSinceLastCall
      timeoutId = setTimeout(() => {
        lastCall = Date.now()
        timeoutId = null
        fn.apply(context, args)
      }, remaining)
    }
  }

  // Add cancel method to clear pending execution
  throttled.cancel = function() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return throttled
}

/**
 * Split array into chunks of specified size
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array<Array>} - Array of chunks
 */
function chunk(array, size = 1) {
  if (!Array.isArray(array)) {
    throw new TypeError('First argument must be an array')
  }

  if (typeof size !== 'number' || size < 1 || !Number.isInteger(size)) {
    throw new TypeError('Size must be a positive integer')
  }

  if (array.length === 0) {
    return []
  }

  const chunks = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }

  return chunks
}

/**
 * Remove duplicate items from array
 * For primitives: compares by value
 * For objects: compares by specified key property
 * @param {Array} array - Array to deduplicate
 * @param {string} [key] - Object property key for comparison (optional)
 * @returns {Array} - Deduplicated array
 */
function deduplicate(array, key = null) {
  if (!Array.isArray(array)) {
    throw new TypeError('First argument must be an array')
  }

  if (array.length === 0) {
    return []
  }

  if (key === null) {
    // Deduplicate primitives using Set
    return [...new Set(array)]
  }

  // Deduplicate objects by key
  if (typeof key !== 'string') {
    throw new TypeError('Key must be a string')
  }

  const seen = new Set()
  const result = []

  for (const item of array) {
    if (item === null || item === undefined) {
      continue
    }

    const keyValue = item[key]
    if (keyValue === undefined) {
      continue
    }

    if (!seen.has(keyValue)) {
      seen.add(keyValue)
      result.push(item)
    }
  }

  return result
}

/**
 * Deep clone an object or array
 * Handles nested objects, arrays, dates, and null values
 * Does NOT handle functions, symbols, or circular references
 * @param {*} obj - Object to clone
 * @returns {*} - Cloned object
 */
function deepClone(obj) {
  // Handle primitives and null
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item))
  }

  // Handle Object
  const cloned = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key])
    }
  }

  return cloned
}

/**
 * Deep merge two objects
 * Recursively merges nested objects and arrays
 * Source values override target values
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} - Merged object (new object, does not mutate inputs)
 */
function deepMerge(target, source) {
  // Handle null/undefined
  if (target === null || target === undefined) {
    target = {}
  }

  if (source === null || source === undefined) {
    return deepClone(target)
  }

  // Handle non-objects
  if (typeof target !== 'object' || typeof source !== 'object') {
    return deepClone(source)
  }

  // Handle arrays - replace target array with source array
  if (Array.isArray(source)) {
    return deepClone(source)
  }

  // Deep merge objects
  const result = deepClone(target)

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key]
      const targetValue = result[key]

      if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
        // Recursively merge nested objects
        if (typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
          result[key] = deepMerge(targetValue, sourceValue)
        } else {
          result[key] = deepClone(sourceValue)
        }
      } else {
        // Replace with source value (includes arrays)
        result[key] = deepClone(sourceValue)
      }
    }
  }

  return result
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    debounce,
    throttle,
    chunk,
    deduplicate,
    deepClone,
    deepMerge
  }
}

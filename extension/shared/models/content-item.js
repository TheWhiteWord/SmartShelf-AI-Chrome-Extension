/**
 * ContentItem Model - Core entity for SmartShelf Knowledge Hub
 * 
 * Represents any saved piece of digital or physical content in the user's collection.
 * Supports validation, methods, and Chrome Extension integration.
 */

// Check if already defined but don't prevent redefinition in test environments
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
  // In test environment, always proceed with definition
} else if ((typeof window !== 'undefined' && window.ContentItem) || 
    (typeof self !== 'undefined' && self.ContentItem) ||
    (typeof global !== 'undefined' && global.ContentItem)) {
  console.log('ContentItem already defined, skipping redefinition')
  // Exit the script if class already exists (except in tests)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ContentItem: window.ContentItem || self.ContentItem || global.ContentItem }
  }
  // Don't return in module environments to allow export
  if (typeof module === 'undefined') {
    if (typeof window !== 'undefined') {
      // Browser environment without module system
    } else if (typeof self !== 'undefined') {
      // Service worker environment
    }
  }
} 

// Always define the class (may redefine in tests)

class ContentItem {
  // Static properties for validation
  static TYPES = ['article', 'video', 'book', 'document', 'image', 'audio']
  static STATUSES = ['pending', 'processing', 'processed', 'error', 'manual']

  constructor(data) {
    // Validate required fields
    if (!data.title?.trim()) {
      throw new Error('Title is required')
    }
    
    // Validate type - handle undefined/null vs empty string differently
    if (data.type === undefined || data.type === null) {
      throw new Error('Type is required')
    }
    if (typeof data.type !== 'string') {
      throw new Error('Type is required')
    }
    // Empty string and invalid enum values should throw "Invalid content type"
    if (!ContentItem.TYPES.includes(data.type)) {
      throw new Error('Invalid content type')
    }
    
    // Source validation - digital items require valid source
    if (!data.isPhysical && !data.source?.trim()) {
      throw new Error('Source is required for digital items')
    }
    if (!data.source) {
      throw new Error('Source is required')
    }

    // Validate title length
    if (data.title.length > 200) {
      throw new Error('Title must not exceed 200 characters')
    }

    // Validate content type
    if (!ContentItem.TYPES.includes(data.type)) {
      throw new Error('Invalid content type')
    }

    // Validate status if provided
    if (data.status && !ContentItem.STATUSES.includes(data.status)) {
      throw new Error('Invalid status')
    }

    // Validate source for digital items
    if (!data.isPhysical && (!data.source || data.source.trim() === '')) {
      throw new Error('Source is required for digital items')
    }

    // Generate unique ID or use provided ID
    this.id = data.id || this._generateUUID()

    // Set required fields
    this.title = data.title
    this.type = data.type
    this.source = data.source

    // Set optional fields with defaults
    this.contentText = data.contentText || null
    this.summary = data.summary || null
    this.tags = data.tags || []
    this.categories = data.categories || []
    this.notes = data.notes || ''
    this.isPhysical = data.isPhysical || false
    this.status = data.status || 'pending'

    // Set timestamps
    this.dateAdded = data.dateAdded ? new Date(data.dateAdded) : new Date()
    this.dateModified = data.dateModified ? new Date(data.dateModified) : new Date()
  }

  /**
   * Generate a UUID v4
   * @returns {string} UUID v4 string
   */
  _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Validate the content item
   * @returns {Object} Validation result with isValid and errors
   */
  validate() {
    const errors = []

    // Title validation
    if (!this.title || this.title.trim() === '') {
      errors.push('Title is required')
    } else if (this.title.length > 200) {
      errors.push('Title must not exceed 200 characters')
    }

    // Type validation
    if (!ContentItem.TYPES.includes(this.type)) {
      errors.push('Invalid content type')
    }

    // Status validation
    if (!ContentItem.STATUSES.includes(this.status)) {
      errors.push('Invalid status')
    }

    // Source validation for digital items
    if (!this.isPhysical && (!this.source || this.source.trim() === '')) {
      errors.push('Source is required for digital items')
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }

  /**
   * Add a tag to the content item
   * @param {string} tag - Tag to add
   */
  addTag(tag) {
    if (tag && !this.tags.includes(tag)) {
      this.tags.push(tag)
      this.updateModifiedDate()
    }
  }

  /**
   * Remove a tag from the content item
   * @param {string} tag - Tag to remove
   */
  removeTag(tag) {
    const index = this.tags.indexOf(tag)
    if (index > -1) {
      this.tags.splice(index, 1)
      this.updateModifiedDate()
    }
  }

  /**
   * Add a category to the content item
   * @param {string} category - Category to add
   */
  addCategory(category) {
    if (category && !this.categories.includes(category)) {
      this.categories.push(category)
      this.updateModifiedDate()
    }
  }

  /**
   * Remove a category from the content item
   * @param {string} category - Category to remove
   */
  removeCategory(category) {
    const index = this.categories.indexOf(category)
    if (index > -1) {
      this.categories.splice(index, 1)
      this.updateModifiedDate()
    }
  }

  /**
   * Update the status of the content item
   * @param {string} status - New status
   */
  updateStatus(status) {
    if (ContentItem.STATUSES.includes(status)) {
      this.status = status
      this.updateModifiedDate()
    }
  }

  /**
   * Update the dateModified timestamp
   */
  updateModifiedDate() {
    // Ensure dateModified is always after dateAdded
    this.dateModified = new Date(Math.max(new Date().getTime(), this.dateAdded.getTime() + 1))
  }

  /**
   * Get the processing age in milliseconds
   * @returns {number} Age in milliseconds
   */
  getProcessingAge() {
    return Date.now() - this.dateAdded.getTime()
  }

  /**
   * Check if the item needs AI processing
   * @returns {boolean} True if needs processing
   */
  needsAIProcessing() {
    return this.status === 'pending' || this.status === 'error'
  }

  /**
   * Clone the content item with a new ID
   * @returns {ContentItem} Cloned content item
   */
  clone() {
    const clonedData = {
      title: this.title,
      type: this.type,
      source: this.source,
      contentText: this.contentText,
      summary: this.summary,
      tags: [...this.tags], // Deep copy arrays
      categories: [...this.categories],
      notes: this.notes,
      isPhysical: this.isPhysical,
      status: this.status
    }
    return new ContentItem(clonedData)
  }

  /**
   * Convert to JSON for serialization
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      type: this.type,
      source: this.source,
      contentText: this.contentText,
      summary: this.summary,
      tags: this.tags,
      categories: this.categories,
      dateAdded: this.dateAdded.toISOString(),
      dateModified: this.dateModified.toISOString(),
      isPhysical: this.isPhysical,
      notes: this.notes,
      status: this.status
    }
  }

  /**
   * Convert to Chrome Storage format
   * @returns {Object} Chrome Storage compatible format
   */
  toStorageFormat() {
    return this.toJSON()
  }

  /**
   * Convert to search index format
   * @returns {Object} Search index format
   */
  toSearchIndex() {
    const searchableText = [
      this.title,
      this.summary || '',
      this.contentText || '',
      ...this.tags,
      ...this.categories,
      this.notes
    ].filter(text => text && text.trim() !== '').join(' ')

    return {
      id: this.id,
      searchableText: searchableText,
      keywords: [...this.tags, ...this.categories],
      lastIndexed: new Date().toISOString()
    }
  }

  /**
   * Create ContentItem from JSON data
   * @param {Object} jsonData - JSON data
   * @returns {ContentItem} ContentItem instance
   */
  static fromJSON(jsonData) {
    return new ContentItem({
      ...jsonData,
      dateAdded: jsonData.dateAdded,
      dateModified: jsonData.dateModified
    })
  }
}

// Export for CommonJS (Node.js/Jest) and ES modules
if (typeof module !== 'undefined' && module.exports) {
  // Node.js/Jest environment
  module.exports = { ContentItem }
} else {
  // Browser/Extension environment - make it globally available
  if (typeof window !== 'undefined') {
    window.ContentItem = ContentItem
  }
  // Also support ES modules if available
  if (typeof globalThis !== 'undefined') {
    globalThis.ContentItem = ContentItem
  }
}

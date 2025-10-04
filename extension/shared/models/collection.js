// Collection Model - User-defined groups of related items for project-based organization

/**
 * Collection represents user-defined groups of related content items
 * Enables project-based organization and flexible content grouping
 */

// Prevent duplicate class definition in browser environment
if (typeof window !== 'undefined' && window.Collection) {
  console.log('Collection already defined, skipping redefinition')
} else {

class Collection {
  // Static properties for sorting and privacy options
  static SORT_OPTIONS = ['dateAdded', 'dateModified', 'title', 'relevance']
  static PRIVACY_LEVELS = ['public', 'private', 'shared']
  constructor(collectionData = {}) {
    // Validate required fields
    if (!collectionData.name || collectionData.name.trim() === '') {
      throw new Error('Name is required')
    }
    if (collectionData.description === undefined) {
      throw new Error('Description is required')
    }
    
    // Validate field lengths and formats
    if (collectionData.name.length > 100) {
      throw new Error('Name must not exceed 100 characters')
    }
    if (collectionData.description && collectionData.description.length > 500) {
      throw new Error('Description must not exceed 500 characters')
    }
    
    // Validate sortOrder enum
    if (collectionData.sortOrder && !Collection.SORT_OPTIONS.includes(collectionData.sortOrder)) {
      throw new Error('Invalid sort order')
    }
    
    // Validate color format (hex color or null)
    if (collectionData.color && collectionData.color !== null && !/^#[0-9A-Fa-f]{6}$/.test(collectionData.color)) {
      throw new Error('Invalid color format')
    }
    
    this.id = collectionData.id || this.generateId()
    this.name = collectionData.name
    this.description = collectionData.description
    this.isPrivate = collectionData.isPrivate !== undefined ? collectionData.isPrivate : true
    this.dateCreated = collectionData.dateCreated ? new Date(collectionData.dateCreated) : new Date()
    this.dateModified = collectionData.dateModified ? new Date(collectionData.dateModified) : new Date()
    this.itemIds = collectionData.itemIds || []
    this.shareToken = collectionData.shareToken || null
    this.color = collectionData.color || null // Default to null as expected by tests
    this.icon = collectionData.icon || '📁' // Default folder icon
    
    // Expose autoAddRules and sortOrder properties directly for test compatibility
    this.autoAddRules = collectionData.autoAddRules || []
    this.sortOrder = collectionData.sortOrder || 'dateAdded'

    // Collection metadata
    this.metadata = {
      createdBy: 'user',
      itemCount: this.itemIds.length,
      lastAccessed: null,
      accessCount: 0,
      tags: [],
      category: 'general',
      ...collectionData.metadata
    }

    // Collection settings - keep in metadata for storage but also expose directly
    this.settings = {
      autoAddRules: this.autoAddRules, // Rules for automatically adding items
      sortOrder: this.sortOrder, // How items are sorted in collection
      sortDirection: collectionData.sortDirection || 'desc', // asc or desc
      viewMode: collectionData.viewMode || 'grid', // grid, list, cards
      showSummary: collectionData.showSummary !== undefined ? collectionData.showSummary : true,
      showTags: collectionData.showTags !== undefined ? collectionData.showTags : true,
      ...collectionData.settings
    }
  }

  /**
   * Generate unique ID for collection
   * @returns {string} UUID identifier
   */
  generateId() {
    // Generate UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Validate collection data
   * @returns {Object} Validation result with isValid and errors
   */
  validate() {
    const errors = []

    // Name is required and should be reasonable length
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Collection name is required')
    }

    if (this.name && this.name.length > 100) {
      errors.push('Collection name must be 100 characters or less')
    }

    // Description length check
    if (this.description && this.description.length > 500) {
      errors.push('Description must be 500 characters or less')
    }

    // Color validation (hex color)
    if (this.color && !/^#[0-9A-Fa-f]{6}$/.test(this.color)) {
      errors.push('Invalid color format (must be hex)')
    }

    // Icon validation (should be emoji or short string)
    if (this.icon && this.icon.length > 5) {
      errors.push('Icon should be an emoji or short symbol')
    }

    // Item IDs should be array
    if (!Array.isArray(this.itemIds)) {
      errors.push('Item IDs must be an array')
    }

    // Settings validation
    if (this.settings) {
      const validSortOrders = ['dateAdded', 'dateModified', 'title', 'type', 'manual']
      if (!validSortOrders.includes(this.settings.sortOrder)) {
        errors.push('Invalid sort order')
      }

      const validSortDirections = ['asc', 'desc']
      if (!validSortDirections.includes(this.settings.sortDirection)) {
        errors.push('Invalid sort direction')
      }

      const validViewModes = ['grid', 'list', 'cards']
      if (!validViewModes.includes(this.settings.viewMode)) {
        errors.push('Invalid view mode')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Add item to collection
   * @param {string} itemId - Item ID to add
   * @returns {boolean} Whether item was added (false if already exists)
   */
  addItem(itemId) {
    if (!itemId || this.itemIds.includes(itemId)) {
      return false
    }

    this.itemIds.push(itemId)
    this.dateModified = new Date()
    this.metadata.itemCount = this.itemIds.length

    return true
  }

  /**
   * Add multiple items to collection
   * @param {Array} itemIds - Array of item IDs to add
   * @returns {number} Number of items actually added
   */
  addItems(itemIds) {
    if (!Array.isArray(itemIds)) return 0

    let addedCount = 0
    itemIds.forEach(itemId => {
      if (this.addItem(itemId)) {
        addedCount++
      }
    })

    return addedCount
  }

  /**
   * Remove item from collection
   * @param {string} itemId - Item ID to remove
   * @returns {boolean} Whether item was removed
   */
  removeItem(itemId) {
    const index = this.itemIds.indexOf(itemId)
    if (index === -1) {
      return false
    }

    this.itemIds.splice(index, 1)
    this.dateModified = new Date()
    this.metadata.itemCount = this.itemIds.length

    return true
  }

  /**
   * Remove multiple items from collection
   * @param {Array} itemIds - Array of item IDs to remove
   * @returns {number} Number of items actually removed
   */
  removeItems(itemIds) {
    if (!Array.isArray(itemIds)) return 0

    let removedCount = 0
    itemIds.forEach(itemId => {
      if (this.removeItem(itemId)) {
        removedCount++
      }
    })

    return removedCount
  }

  /**
   * Check if collection contains item
   * @param {string} itemId - Item ID to check
   * @returns {boolean} Whether collection contains the item
   */
  containsItem(itemId) {
    return this.itemIds.includes(itemId)
  }

  /**
   * Get count of items in collection
   * @returns {number} Number of items
   */
  getItemCount() {
    return this.itemIds.length
  }

  /**
   * Get items in collection with full item data
   * @param {Array} allItems - Array of all content items
   * @returns {Array} Array of items in this collection
   */
  getItems(allItems) {
    if (!allItems || !Array.isArray(allItems)) {
      return []
    }

    return allItems.filter(item => this.itemIds.includes(item.id))
  }

  /**
   * Get sorted items according to collection settings
   * @param {Array} allItems - Array of all content items
   * @returns {Array} Sorted array of items in this collection
   */
  getSortedItems(allItems) {
    const items = this.getItems(allItems)

    if (items.length === 0) return items

    const sortOrder = this.settings.sortOrder || 'dateAdded'
    const sortDirection = this.settings.sortDirection || 'desc'

    return items.sort((a, b) => {
      let aValue, bValue

      switch (sortOrder) {
        case 'dateAdded':
          aValue = new Date(a.dateAdded || 0)
          bValue = new Date(b.dateAdded || 0)
          break
        case 'dateModified':
          aValue = new Date(a.dateModified || 0)
          bValue = new Date(b.dateModified || 0)
          break
        case 'title':
          aValue = (a.title || '').toLowerCase()
          bValue = (b.title || '').toLowerCase()
          break
        case 'type':
          aValue = a.type || ''
          bValue = b.type || ''
          break
        case 'manual':
          // Use order in itemIds array
          aValue = this.itemIds.indexOf(a.id)
          bValue = this.itemIds.indexOf(b.id)
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  /**
   * Update collection settings
   * @param {Object} newSettings - New settings to apply
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings }
    this.dateModified = new Date()
  }

  /**
   * Generate share token for external access
   * @returns {string} Generated share token
   */
  generateShareToken() {
    const token = `share_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`
    this.shareToken = token
    this.dateModified = new Date()
    return token
  }

  /**
   * Revoke share token
   */
  revokeShareToken() {
    this.shareToken = null
    this.dateModified = new Date()
  }

  /**
   * Add auto-add rule
   * @param {Object} rule - Rule to add
   */
  addAutoAddRule(rule) {
    if (!rule || !rule.type || !rule.value) {
      throw new Error('Invalid rule format')
    }
    this.autoAddRules.push(rule)
    this.settings.autoAddRules = this.autoAddRules
    this.dateModified = new Date()
  }

  /**
   * Remove auto-add rule
   * @param {Object} rule - Rule to remove
   * @returns {boolean} Whether rule was removed
   */
  removeAutoAddRule(rule) {
    const index = this.autoAddRules.findIndex(r => r.type === rule.type && r.value === rule.value)
    if (index === -1) return false
    
    this.autoAddRules.splice(index, 1)
    this.settings.autoAddRules = this.autoAddRules
    this.dateModified = new Date()
    return true
  }

  /**
   * Check if item matches auto-add rules
   * @param {Object} item - Item to check
   * @returns {boolean} Whether item matches rules
   */
  matchesAutoAddRules(item) {
    return this.shouldAutoAddItem(item)
  }

  /**
   * Check if collection is empty
   * @returns {boolean} Whether collection has no items
   */
  isEmpty() {
    return this.itemIds.length === 0
  }

  /**
   * Get collection statistics
   * @param {Array} allItems - Array of all content items for detailed stats
   * @returns {Object} Collection statistics
   */
  getStatistics(allItems = []) {
    const items = this.getItems(allItems)

    const stats = {
      totalItems: this.itemIds.length,
      actualItems: items.length, // In case some items were deleted
      typeBreakdown: {},
      types: {},
      categories: {},
      tags: {},
      averageProcessingStatus: 'unknown',
      lastUpdated: this.dateModified
    }

    if (items.length > 0) {
      // Count by type
      items.forEach(item => {
        stats.types[item.type] = (stats.types[item.type] || 0) + 1
        stats.typeBreakdown[item.type] = (stats.typeBreakdown[item.type] || 0) + 1

        // Count categories
        if (item.categories && Array.isArray(item.categories)) {
          item.categories.forEach(cat => {
            stats.categories[cat] = (stats.categories[cat] || 0) + 1
          })
        }

        // Count tags
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach(tag => {
            stats.tags[tag] = (stats.tags[tag] || 0) + 1
          })
        }
      })

      // Processing status distribution
      const statusCounts = {}
      items.forEach(item => {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1
      })
      stats.processingStatus = statusCounts

      // Most recent activity
      const sortedByDate = [...items].sort((a, b) =>
        new Date(b.dateModified || b.dateAdded) - new Date(a.dateModified || a.dateAdded)
      )
      stats.mostRecentItem = sortedByDate[0]?.title || 'Unknown'
      stats.lastActivity = sortedByDate[0]?.dateModified || sortedByDate[0]?.dateAdded
    }

    return stats
  }

  /**
   * Record access to collection (for analytics)
   */
  recordAccess() {
    this.metadata.lastAccessed = new Date().toISOString()
    this.metadata.accessCount = (this.metadata.accessCount || 0) + 1
  }

  /**
   * Create collection from search query results
   * @param {string} name - Collection name
   * @param {Array} searchResults - Array of items from search
   * @param {string} query - Original search query
   * @returns {Collection} New collection with search results
   */
  static fromSearchResults(name, searchResults, query) {
    const itemIds = searchResults.map(item => item.id)

    return new Collection({
      name,
      description: `Collection created from search: "${query}"`,
      itemIds,
      metadata: {
        createdBy: 'search',
        originalQuery: query,
        searchDate: new Date().toISOString()
      }
    })
  }

  /**
   * Create collection from category filter
   * @param {string} categoryName - Category to create collection from
   * @param {Array} categoryItems - Items in the category
   * @returns {Collection} New collection with category items
   */
  static fromCategory(categoryName, categoryItems) {
    const itemIds = categoryItems.map(item => item.id)

    return new Collection({
      name: `${categoryName} Collection`,
      description: `All items in the ${categoryName} category`,
      itemIds,
      metadata: {
        createdBy: 'category-filter',
        sourceCategory: categoryName
      },
      settings: {
        autoAddRules: [{
          type: 'category',
          value: categoryName,
          enabled: true
        }]
      }
    })
  }

  /**
   * Apply auto-add rules to determine if item should be added
   * @param {Object} item - Content item to check
   * @returns {boolean} Whether item matches auto-add rules
   */
  shouldAutoAddItem(item) {
    if (!this.autoAddRules || this.autoAddRules.length === 0) {
      return false
    }

    return this.autoAddRules.some(rule => {
      if (rule.enabled === false) return false

      switch (rule.type) {
        case 'category':
          return item.categories && item.categories.includes(rule.value)
        case 'tag':
          return item.tags && item.tags.includes(rule.value)
        case 'type':
          return item.type === rule.value
        case 'keyword':
          const searchText = `${item.title} ${item.content} ${item.summary}`.toLowerCase()
          return searchText.includes(rule.value.toLowerCase())
        default:
          return false
      }
    })
  }

  /**
   * Convert to JSON-serializable object for storage
   * @returns {Object} Serializable representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      isPrivate: this.isPrivate,
      dateCreated: this.dateCreated instanceof Date ? this.dateCreated.toISOString() : this.dateCreated,
      dateModified: this.dateModified instanceof Date ? this.dateModified.toISOString() : this.dateModified,
      itemIds: this.itemIds,
      shareToken: this.shareToken,
      color: this.color,
      icon: this.icon,
      autoAddRules: this.autoAddRules,
      sortOrder: this.sortOrder,
      metadata: this.metadata,
      settings: this.settings
    }
  }

  /**
   * Create Collection from stored JSON data
   * @param {Object} jsonData - Stored JSON representation
   * @returns {Collection} New Collection instance
   */
  static fromJSON(jsonData) {
    return new Collection({
      ...jsonData,
      dateCreated: jsonData.dateCreated ? new Date(jsonData.dateCreated) : undefined,
      dateModified: jsonData.dateModified ? new Date(jsonData.dateModified) : undefined
    })
  }

  /**
   * Get display summary for UI
   * @returns {string} Human-readable collection summary
   */
  getDisplaySummary() {
    const itemCount = this.itemIds.length
    const itemText = itemCount === 1 ? 'item' : 'items'

    if (this.description && this.description.length > 0) {
      return `${itemCount} ${itemText} • ${this.description.substring(0, 100)}${this.description.length > 100 ? '...' : ''}`
    }

    return `${itemCount} ${itemText}`
  }

  /**
   * Clone collection with new name
   * @param {string} newName - Name for the cloned collection
   * @returns {Collection} New collection instance
   */
  clone(newName) {
    const clonedData = {
      ...this.toJSON(),
      id: undefined, // Will generate new ID
      name: newName || `${this.name} (Copy)`,
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      shareToken: null, // Don't copy share tokens
      metadata: {
        ...this.metadata,
        createdBy: 'clone',
        originalCollectionId: this.id
      }
    }

    return new Collection(clonedData)
  }

  /**
   * Convert to Chrome Storage format
   * @returns {Object} Storage-optimized representation
   */
  toStorageFormat() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      isPrivate: this.isPrivate,
      itemIds: this.itemIds,
      dateCreated: this.dateCreated instanceof Date ? this.dateCreated.toISOString() : this.dateCreated,
      dateModified: this.dateModified instanceof Date ? this.dateModified.toISOString() : this.dateModified,
      settings: this.settings,
      metadata: this.metadata
    }
  }

  /**
   * Convert to search index format
   * @returns {Object} Search-optimized representation
   */
  toSearchIndex() {
    return {
      id: this.id,
      type: 'collection',
      name: this.name,
      description: this.description,
      itemCount: this.itemIds.length,
      searchableText: `${this.name} ${this.description}`,
      searchText: `${this.name} ${this.description}`.toLowerCase(),
      keywords: [this.name.toLowerCase()],
      lastIndexed: new Date().toISOString(),
      tags: this.metadata.tags || [],
      dateCreated: this.dateCreated instanceof Date ? this.dateCreated.toISOString() : this.dateCreated
    }
  }

  /**
   * Get share URL for collection
   * @param {string} baseUrl - Base URL for sharing
   * @returns {string} Share URL
   */
  getShareUrl(baseUrl) {
    if (!this.shareToken) {
      throw new Error('No share token available')
    }
    return `${baseUrl}/shared/collection/${this.shareToken}?id=${this.id}`
  }

  /**
   * Merge with another collection
   * @param {Collection} otherCollection - Collection to merge with
   * @param {Object} options - Merge options
   * @returns {Collection} New merged collection
   */
  mergeWith(otherCollection, options = {}) {
    const mergedItemIds = [...new Set([...this.itemIds, ...otherCollection.itemIds])]
    
    return new Collection({
      name: options.name || `${this.name} + ${otherCollection.name}`,
      description: options.description || `Merged from: ${this.name} and ${otherCollection.name}`,
      itemIds: mergedItemIds,
      isPrivate: options.isPrivate !== undefined ? options.isPrivate : (this.isPrivate && otherCollection.isPrivate),
      autoAddRules: [...(this.autoAddRules || []), ...(otherCollection.autoAddRules || [])]
    })
  }

  /**
   * Find duplicate items in collection
   * @param {Array} allItems - All available items
   * @returns {Array} Array of duplicate item groups
   */
  findDuplicateItems(allItems) {
    const items = this.getItems(allItems)
    const duplicates = []
    const titleGroups = {}
    
    items.forEach(item => {
      const key = item.title.toLowerCase().trim()
      if (!titleGroups[key]) {
        titleGroups[key] = []
      }
      titleGroups[key].push(item)
    })
    
    Object.values(titleGroups).forEach(group => {
      if (group.length > 1) {
        duplicates.push(group)
      }
    })
    
    return duplicates
  }

  /**
   * Export collection to specified format
   * @param {string} format - Export format (json, csv, txt)
   * @param {Array} allItems - All available items
   * @returns {string} Exported data
   */
  exportToFormat(format, allItems = []) {
    const items = this.getItems(allItems)
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify({
          collection: this.toJSON(),
          items: items
        }, null, 2)
      
      case 'csv':
        const headers = 'Title,Type,Source,Date Added'
        const rows = items.map(item => 
          `"${item.title}","${item.type}","${item.source}","${item.dateAdded}"`
        )
        return [headers, ...rows].join('\n')
      
      case 'txt':
        return `Collection: ${this.name}\n\n${items.map(item => 
          `• ${item.title} (${item.type})`
        ).join('\n')}`
      
      default:
        throw new Error('Unsupported export format')
    }
  }
}

// Export for CommonJS (Node.js/Jest) and ES modules
if (typeof module !== 'undefined' && module.exports) {
  // Node.js/Jest environment
  module.exports = { Collection }
} else {
  // Browser environment
  window.Collection = Collection
}

} // End of guard clause

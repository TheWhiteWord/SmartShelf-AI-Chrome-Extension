/**
 * Content Repository - High-level CRUD operations for ContentItem entities
 * 
 * Provides a clean, domain-focused API for content management operations
 * while abstracting away the underlying storage complexity. Uses the Storage
 * Service for persistence and integrates with ContentItem model validation.
 * 
 * Features:
 * - Full CRUD operations (Create, Read, Update, Delete)
 * - Advanced search and filtering capabilities
 * - Batch operations for efficiency
 * - Content validation and business logic
 * - Event-driven architecture for notifications
 * - Integration with Storage Service and ContentItem model
 * - Support for both digital and physical items
 * - Duplicate detection and prevention
 */

class ContentRepository {
  constructor(storageService) {
    if (!storageService) {
      throw new Error('Storage service is required')
    }
    
    this.storageService = storageService
    this.isInitialized = false
    
    // Import ContentItem model dynamically
    this.ContentItem = null
    this._loadContentItemModel()
  }

  /**
   * Load ContentItem model for validation and instantiation
   */
  _loadContentItemModel() {
    try {
      if (typeof require !== 'undefined') {
        // Node.js/Jest environment
        const contentItemModule = require('../models/content-item.js')
        this.ContentItem = contentItemModule.ContentItem
      } else if (typeof window !== 'undefined' && window.ContentItem) {
        // Browser/Extension environment
        this.ContentItem = window.ContentItem
      }
    } catch (error) {
      console.warn('ContentItem model not available:', error.message)
    }
  }

  /**
   * Initialize the repository with storage service
   */
  async initialize() {
    try {
      const result = await this.storageService.initialize()
      this.isInitialized = result
      return result
    } catch (error) {
      console.error('Failed to initialize content repository:', error)
      this.isInitialized = false
      return false
    }
  }

  /**
   * Check if storage service is available
   */
  _ensureStorageAvailable() {
    const status = this.storageService.getStatus()
    if (!status.isInitialized) {
      throw new Error('Storage service not available')
    }
  }

  /**
   * Generate unique ID for content items
   */
  _generateId() {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `content_${timestamp}_${random}`
  }

  /**
   * Validate and prepare content item data
   */
  _prepareContentItem(data, isUpdate = false) {
    // Create ContentItem instance for validation if model is available
    if (this.ContentItem) {
      const contentItem = new this.ContentItem(data)
      
      // ContentItem model doesn't support all fields (like location for physical items)
      // and converts dates to Date objects, so we need to merge back original data
      const result = {
        ...data, // Preserve all original properties
        ...contentItem, // Apply validated properties from ContentItem
        // Ensure dates are strings for consistency
        dateAdded: contentItem.dateAdded instanceof Date ? 
          contentItem.dateAdded.toISOString() : contentItem.dateAdded,
        dateModified: contentItem.dateModified instanceof Date ? 
          contentItem.dateModified.toISOString() : contentItem.dateModified
      }
      
      return result
    }
    
    // Fallback validation if model not available
    if (!isUpdate && !data.title?.trim()) {
      throw new Error('Title is required')
    }
    if (!isUpdate && !data.type) {
      throw new Error('Type is required')
    }
    if (!isUpdate && !data.source && !data.isPhysical) {
      throw new Error('Source is required for digital items')
    }
    
    // Return the data as-is, preserving all properties
    return { ...data }
  }

  // ===========================================
  // CREATE OPERATIONS
  // ===========================================

  /**
   * Create a new content item
   */
  async create(contentData) {
    this._ensureStorageAvailable()
    
    try {
      // Generate ID and set defaults
      const itemData = {
        ...contentData,
        id: this._generateId(),
        status: contentData.status || 'pending',
        tags: contentData.tags || [],
        categories: contentData.categories || [],
        dateAdded: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        aiProcessed: false,
        viewCount: 0,
        lastViewed: null,
        connections: [],
        notes: contentData.notes || '',
        summary: contentData.summary || '',
        // Preserve physical item specific fields
        location: contentData.location,
        isbn: contentData.isbn,
        barcode: contentData.barcode
      }

      // Validate content item
      const validatedItem = this._prepareContentItem(itemData)

      // Save to storage
      await this.storageService.saveContentItem(validatedItem)

      // Emit creation event
      this.storageService.emitEvent('item:created', validatedItem)

      return validatedItem
    } catch (error) {
      throw new Error(`Failed to create content item: ${error.message}`)
    }
  }

  // ===========================================
  // READ OPERATIONS
  // ===========================================

  /**
   * Get content item by ID
   */
  async getById(itemId) {
    this._ensureStorageAvailable()
    
    try {
      return await this.storageService.getContentItem(itemId)
    } catch (error) {
      console.error('Failed to get content item:', error)
      return null
    }
  }

  /**
   * Get all content items with optional pagination and sorting
   */
  async getAll(options = {}) {
    this._ensureStorageAvailable()
    
    try {
      return await this.storageService.getAllContentItems(options)
    } catch (error) {
      console.error('Failed to get all content items:', error)
      return []
    }
  }

  /**
   * Search content items with query and filters
   */
  async search(query, options = {}) {
    this._ensureStorageAvailable()
    
    try {
      return await this.storageService.searchContentItems(query, options)
    } catch (error) {
      console.error('Failed to search content items:', error)
      return []
    }
  }

  /**
   * Get content items by status
   */
  async getByStatus(status) {
    this._ensureStorageAvailable()
    
    try {
      const allItems = await this.storageService.getAllContentItems()
      return allItems.filter(item => item.status === status)
    } catch (error) {
      console.error('Failed to get items by status:', error)
      return []
    }
  }

  /**
   * Get content items by type
   */
  async getByType(type) {
    this._ensureStorageAvailable()
    
    try {
      const allItems = await this.storageService.getAllContentItems()
      return allItems.filter(item => item.type === type)
    } catch (error) {
      console.error('Failed to get items by type:', error)
      return []
    }
  }

  // ===========================================
  // UPDATE OPERATIONS
  // ===========================================

  /**
   * Update existing content item
   */
  async update(itemId, updates) {
    this._ensureStorageAvailable()
    
    try {
      // Get existing item
      const existingItem = await this.storageService.getContentItem(itemId)
      if (!existingItem) {
        return null
      }

      // Prevent updating immutable fields
      const immutableFields = ['id', 'dateAdded']
      immutableFields.forEach(field => {
        if (updates.hasOwnProperty(field)) {
          delete updates[field]
        }
      })

      // Merge updates with existing item
      const updatedData = {
        ...existingItem,
        ...updates,
        dateModified: new Date().toISOString(),
        // Ensure immutable fields are preserved with original values (as strings)
        id: existingItem.id,
        dateAdded: typeof existingItem.dateAdded === 'string' ? 
          existingItem.dateAdded : 
          existingItem.dateAdded?.toISOString() || existingItem.dateAdded
      }

      // Validate updated data
      const validatedItem = this._prepareContentItem(updatedData, true)

      // Save to storage
      await this.storageService.saveContentItem(validatedItem)

      // Emit update event
      this.storageService.emitEvent('item:updated', validatedItem)

      return validatedItem
    } catch (error) {
      throw new Error(`Failed to update content item: ${error.message}`)
    }
  }

  // ===========================================
  // DELETE OPERATIONS
  // ===========================================

  /**
   * Delete content item by ID
   */
  async delete(itemId) {
    this._ensureStorageAvailable()
    
    try {
      // Check if item exists
      const existingItem = await this.storageService.getContentItem(itemId)
      if (!existingItem) {
        return false
      }

      // Delete from storage
      await this.storageService.deleteContentItem(itemId)

      // Emit deletion event
      this.storageService.emitEvent('item:deleted', { id: itemId })

      return true
    } catch (error) {
      throw new Error(`Failed to delete content item: ${error.message}`)
    }
  }

  /**
   * Delete multiple content items by IDs
   */
  async deleteMany(itemIds) {
    this._ensureStorageAvailable()
    
    let deleted = 0
    let failed = 0

    for (const itemId of itemIds) {
      try {
        const success = await this.delete(itemId)
        if (success) {
          deleted++
        } else {
          failed++
        }
      } catch (error) {
        failed++
        console.error(`Failed to delete item ${itemId}:`, error)
      }
    }

    return { deleted, failed }
  }

  // ===========================================
  // ADVANCED OPERATIONS
  // ===========================================

  /**
   * Count total content items
   */
  async count() {
    this._ensureStorageAvailable()
    
    try {
      const items = await this.storageService.getAllContentItems()
      return items.length
    } catch (error) {
      console.error('Failed to count content items:', error)
      return 0
    }
  }

  /**
   * Count content items by status
   */
  async countByStatus(status) {
    this._ensureStorageAvailable()
    
    try {
      const items = await this.getByStatus(status)
      return items.length
    } catch (error) {
      console.error('Failed to count items by status:', error)
      return 0
    }
  }

  /**
   * Check if content item exists
   */
  async exists(itemId) {
    this._ensureStorageAvailable()
    
    try {
      const item = await this.storageService.getContentItem(itemId)
      return item !== null
    } catch (error) {
      console.error('Failed to check item existence:', error)
      return false
    }
  }

  /**
   * Find duplicate items by URL
   */
  async findDuplicates(url) {
    this._ensureStorageAvailable()
    
    try {
      const allItems = await this.storageService.getAllContentItems()
      return allItems.filter(item => item.url === url)
    } catch (error) {
      console.error('Failed to find duplicates:', error)
      return []
    }
  }

  /**
   * Get content statistics
   */
  async getStatistics() {
    this._ensureStorageAvailable()
    
    try {
      const allItems = await this.storageService.getAllContentItems()
      
      const stats = {
        total: allItems.length,
        byType: {},
        byStatus: {},
        physical: 0,
        digital: 0,
        processed: 0,
        unprocessed: 0
      }

      allItems.forEach(item => {
        // Count by type
        stats.byType[item.type] = (stats.byType[item.type] || 0) + 1
        
        // Count by status
        stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1
        
        // Count physical vs digital
        if (item.isPhysical) {
          stats.physical++
        } else {
          stats.digital++
        }
        
        // Count processed vs unprocessed
        if (item.status === 'processed') {
          stats.processed++
        } else {
          stats.unprocessed++
        }
      })

      return stats
    } catch (error) {
      console.error('Failed to get statistics:', error)
      return null
    }
  }

  // ===========================================
  // EVENT HANDLING
  // ===========================================

  /**
   * Add event listener for content operations
   */
  addEventListener(event, callback) {
    this.storageService.addEventListener(event, callback)
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    this.storageService.removeEventListener(event, callback)
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Get repository status
   */
  getStatus() {
    const storageStatus = this.storageService.getStatus()
    
    return {
      isInitialized: this.isInitialized,
      storageService: storageStatus,
      contentItemModel: this.ContentItem !== null
    }
  }

  /**
   * Cleanup repository resources
   */
  cleanup() {
    this.isInitialized = false
    this.storageService.cleanup()
  }

  /**
   * Validate content item data structure
   */
  validateContentItem(data) {
    try {
      this._prepareContentItem(data)
      return { valid: true }
    } catch (error) {
      return { 
        valid: false, 
        error: error.message 
      }
    }
  }

  /**
   * Bulk import content items
   */
  async bulkImport(contentItems, options = {}) {
    this._ensureStorageAvailable()
    
    const { validateOnly = false, skipDuplicates = true } = options
    const results = {
      successful: 0,
      failed: 0,
      duplicates: 0,
      errors: []
    }

    for (const itemData of contentItems) {
      try {
        // Validate item
        const validation = this.validateContentItem(itemData)
        if (!validation.valid) {
          results.failed++
          results.errors.push({
            item: itemData,
            error: validation.error
          })
          continue
        }

        // Check for duplicates if enabled
        if (skipDuplicates && itemData.url) {
          const duplicates = await this.findDuplicates(itemData.url)
          if (duplicates.length > 0) {
            results.duplicates++
            continue
          }
        }

        // Skip actual creation if validation only
        if (validateOnly) {
          results.successful++
          continue
        }

        // Create item
        await this.create(itemData)
        results.successful++
      } catch (error) {
        results.failed++
        results.errors.push({
          item: itemData,
          error: error.message
        })
      }
    }

    return results
  }

  /**
   * Export content items
   */
  async exportItems(options = {}) {
    this._ensureStorageAvailable()
    
    try {
      const { 
        format = 'json',
        includeContent = true,
        filters = {}
      } = options

      let items = await this.storageService.getAllContentItems()

      // Apply filters
      if (filters.type) {
        items = items.filter(item => item.type === filters.type)
      }
      if (filters.status) {
        items = items.filter(item => item.status === filters.status)
      }
      if (filters.dateRange) {
        const { start, end } = filters.dateRange
        items = items.filter(item => {
          const itemDate = new Date(item.dateAdded)
          return itemDate >= new Date(start) && itemDate <= new Date(end)
        })
      }

      // Remove sensitive or large content if requested
      if (!includeContent) {
        items = items.map(item => {
          const { content, ...itemWithoutContent } = item
          return itemWithoutContent
        })
      }

      // Format output
      const exportData = {
        exportDate: new Date().toISOString(),
        itemCount: items.length,
        items
      }

      if (format === 'json') {
        return JSON.stringify(exportData, null, 2)
      } else if (format === 'csv') {
        // Basic CSV export (simplified)
        const headers = ['id', 'title', 'type', 'status', 'dateAdded', 'url']
        const csvContent = [
          headers.join(','),
          ...items.map(item => 
            headers.map(header => 
              JSON.stringify(item[header] || '')
            ).join(',')
          )
        ].join('\n')
        
        return csvContent
      }

      return exportData
    } catch (error) {
      console.error('Failed to export items:', error)
      throw error
    }
  }
}

// Export for CommonJS (Node.js/Jest) and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentRepository
} else if (typeof window !== 'undefined') {
  // Browser/Extension environment - make it globally available
  window.ContentRepository = ContentRepository
}
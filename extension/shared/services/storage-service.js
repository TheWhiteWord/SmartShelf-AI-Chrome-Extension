/**
 * Storage Service - Unified Chrome Storage API and IndexedDB Management
 * 
 * Provides a unified interface for Chrome Extension storage operations including:
 * - Chrome Storage API (sync/local) for settings and metadata
 * - IndexedDB for large data and offline support
 * - Data migration and synchronization
 * - Quota management and optimization
 * - Storage event handling and notifications
 * - Cross-storage search and indexing
 * 
 * Architecture:
 * - Chrome Storage (sync): User settings, preferences, API tokens (≤100KB)
 * - Chrome Storage (local): Content items, quick access data (≤5MB)
 * - IndexedDB: Large content, full-text search index, analytics (unlimited)
 */

class StorageService {
  // Storage area constants
  static STORAGE_AREAS = {
    SYNC: 'sync',
    LOCAL: 'local', 
    INDEXED_DB: 'indexeddb'
  }

  // Storage keys for different data types
  static STORAGE_KEYS = {
    // Sync storage (user settings)
    SETTINGS: 'smartshelfSettings',
    API_TOKENS: 'apiTokens',
    USER_PROFILE: 'userProfile',
    
    // Local storage (content data)
    CONTENT_ITEMS: 'contentItems',
    CATEGORIES: 'categories',
    TAGS: 'tags',
    CONNECTIONS: 'connections',
    COLLECTIONS: 'collections',
    SEARCH_INDEX: 'searchIndex',
    RECENT_SEARCHES: 'recentSearches',
    
    // IndexedDB stores
    FULL_CONTENT: 'fullContent',
    SEARCH_INDEX_FULL: 'searchIndexFull',
    ANALYTICS: 'analytics',
    BACKUPS: 'backups'
  }

  // Chrome Storage quota limits (bytes)
  static QUOTA_LIMITS = {
    SYNC: 102400, // 100KB
    LOCAL: 5242880, // 5MB
    INDEXED_DB: Number.MAX_SAFE_INTEGER // Unlimited (browser dependent)
  }

  constructor() {
    this.db = null
    this.isInitialized = false
    this.eventListeners = new Map()
    this.quotaWarningThreshold = 0.8 // 80% of quota
    
    // Note: Don't auto-initialize in constructor to avoid async issues in tests
    // Call initialize() explicitly when needed
  }

  /**
   * Initialize the storage service
   * Sets up IndexedDB connection and Chrome Storage listeners
   */
  async initialize() {
    try {
      // Initialize IndexedDB
      await this.initializeIndexedDB()
      
      // Set up Chrome Storage change listeners
      this.setupStorageListeners()
      
      // Check initial quota usage
      await this.checkQuotaUsage()
      
      this.isInitialized = true
      console.log('Storage service initialized successfully')
      
      return true
    } catch (error) {
      console.error('Failed to initialize storage service:', error)
      return false
    }
  }

  /**
   * Initialize IndexedDB database
   */
  async initializeIndexedDB() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        console.warn('IndexedDB not available')
        resolve()
        return
      }
      
      const request = indexedDB.open('SmartShelfDB', 2)
      
      request.onerror = () => {
        console.error('IndexedDB initialization failed')
        reject(new Error('IndexedDB initialization failed'))
      }
      
      request.onsuccess = (event) => {
        this.db = event.target.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        // Create object stores
        if (!db.objectStoreNames.contains('fullContent')) {
          const fullContentStore = db.createObjectStore('fullContent', { keyPath: 'id' })
          fullContentStore.createIndex('url', 'url', { unique: false })
          fullContentStore.createIndex('dateAdded', 'dateAdded', { unique: false })
          fullContentStore.createIndex('type', 'type', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('searchIndex')) {
          const searchStore = db.createObjectStore('searchIndex', { keyPath: 'term' })
          searchStore.createIndex('frequency', 'frequency', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('analytics')) {
          const analyticsStore = db.createObjectStore('analytics', { keyPath: 'id' })
          analyticsStore.createIndex('date', 'date', { unique: false })
          analyticsStore.createIndex('event', 'event', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('backups')) {
          const backupsStore = db.createObjectStore('backups', { keyPath: 'id' })
          backupsStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  /**
   * Set up Chrome Storage change listeners
   */
  setupStorageListeners() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        this.handleStorageChange(changes, area)
      })
    }
  }

  /**
   * Handle storage changes and emit events
   */
  handleStorageChange(changes, area) {
    Object.entries(changes).forEach(([key, change]) => {
      const eventType = `storage:${area}:${key}`
      this.emitEvent(eventType, {
        key,
        area,
        oldValue: change.oldValue,
        newValue: change.newValue
      })
    })
  }

  // ===========================================
  // CHROME STORAGE API METHODS
  // ===========================================

  /**
   * Store data in Chrome Storage (sync or local)
   */
  async chromeStorageSet(area, key, data) {
    try {
      if (!chrome?.storage?.[area]) {
        throw new Error(`Chrome Storage ${area} not available`)
      }

      // Check quota before storing
      await this.checkQuotaBeforeStore(area, key, data)
      
      const payload = { [key]: data }
      await chrome.storage[area].set(payload)
      
      console.log(`Stored to ${area}:`, key)
      return true
    } catch (error) {
      console.error(`Chrome Storage ${area} set failed:`, error)
      throw error
    }
  }

  /**
   * Retrieve data from Chrome Storage
   */
  async chromeStorageGet(area, keys) {
    try {
      if (!chrome?.storage?.[area]) {
        throw new Error(`Chrome Storage ${area} not available`)
      }

      const result = await chrome.storage[area].get(keys)
      return result
    } catch (error) {
      console.error(`Chrome Storage ${area} get failed:`, error)
      throw error
    }
  }

  /**
   * Remove data from Chrome Storage
   */
  async chromeStorageRemove(area, keys) {
    try {
      if (!chrome?.storage?.[area]) {
        throw new Error(`Chrome Storage ${area} not available`)
      }

      await chrome.storage[area].remove(keys)
      return true
    } catch (error) {
      console.error(`Chrome Storage ${area} remove failed:`, error)
      throw error
    }
  }

  /**
   * Clear all data from Chrome Storage area
   */
  async chromeStorageClear(area) {
    try {
      if (!chrome?.storage?.[area]) {
        throw new Error(`Chrome Storage ${area} not available`)
      }

      await chrome.storage[area].clear()
      console.log(`Cleared ${area} storage`)
      return true
    } catch (error) {
      console.error(`Chrome Storage ${area} clear failed:`, error)
      throw error
    }
  }

  /**
   * Get Chrome Storage quota information
   */
  async getChromeStorageQuota(area) {
    try {
      if (!chrome?.storage?.[area]) {
        return null
      }

      const bytesInUse = await chrome.storage[area].getBytesInUse()
      const quota = StorageService.QUOTA_LIMITS[area.toUpperCase()]
      
      return {
        bytesInUse,
        quota,
        percentageUsed: (bytesInUse / quota) * 100,
        remainingBytes: quota - bytesInUse
      }
    } catch (error) {
      console.error(`Failed to get ${area} quota:`, error)
      return null
    }
  }

  // ===========================================
  // INDEXEDDB METHODS
  // ===========================================

  /**
   * Store data in IndexedDB
   */
  async indexedDBSet(storeName, data) {
    try {
      if (!this.db) {
        throw new Error('IndexedDB not initialized')
      }

      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      
      if (Array.isArray(data)) {
        // Store multiple items
        for (const item of data) {
          await store.put(item)
        }
      } else {
        // Store single item
        await store.put(data)
      }
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(true)
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      console.error(`IndexedDB ${storeName} set failed:`, error)
      throw error
    }
  }

  /**
   * Retrieve data from IndexedDB
   */
  async indexedDBGet(storeName, key) {
    try {
      if (!this.db) {
        throw new Error('IndexedDB not initialized')
      }

      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`IndexedDB ${storeName} get failed:`, error)
      throw error
    }
  }

  /**
   * Get all data from IndexedDB store
   */
  async indexedDBGetAll(storeName, indexName = null, query = null) {
    try {
      if (!this.db) {
        throw new Error('IndexedDB not initialized')
      }

      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      
      let request
      if (indexName) {
        const index = store.index(indexName)
        request = query ? index.getAll(query) : index.getAll()
      } else {
        request = store.getAll()
      }
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`IndexedDB ${storeName} getAll failed:`, error)
      throw error
    }
  }

  /**
   * Remove data from IndexedDB
   */
  async indexedDBRemove(storeName, key) {
    try {
      if (!this.db) {
        throw new Error('IndexedDB not initialized')
      }

      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      store.delete(key)
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(true)
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      console.error(`IndexedDB ${storeName} remove failed:`, error)
      throw error
    }
  }

  /**
   * Clear all data from IndexedDB store
   */
  async indexedDBClear(storeName) {
    try {
      if (!this.db) {
        throw new Error('IndexedDB not initialized')
      }

      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      store.clear()
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          console.log(`Cleared IndexedDB store: ${storeName}`)
          resolve(true)
        }
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      console.error(`IndexedDB ${storeName} clear failed:`, error)
      throw error
    }
  }

  // ===========================================
  // HIGH-LEVEL DATA OPERATIONS
  // ===========================================

  /**
   * Save content item with intelligent storage allocation
   */
  async saveContentItem(contentItem) {
    try {
      // Store metadata in Chrome local storage for quick access
      const { contentItems = [] } = await this.chromeStorageGet('local', 'contentItems')
      
      // Create lightweight version for Chrome Storage
      const lightItem = {
        id: contentItem.id,
        title: contentItem.title,
        url: contentItem.url,
        type: contentItem.type,
        dateAdded: contentItem.dateAdded,
        dateModified: contentItem.dateModified,
        status: contentItem.status,
        tags: contentItem.tags || [],
        categories: contentItem.categories || [],
        summary: contentItem.summary || '',
        isPhysical: contentItem.isPhysical || false
      }
      
      // Add to Chrome Storage
      const updatedItems = contentItems.filter(item => item.id !== contentItem.id)
      updatedItems.push(lightItem)
      await this.chromeStorageSet('local', 'contentItems', updatedItems)
      
      // Store full content in IndexedDB
      await this.indexedDBSet('fullContent', contentItem)
      
      console.log('Content item saved successfully:', contentItem.id)
      return true
    } catch (error) {
      console.error('Failed to save content item:', error)
      throw error
    }
  }

  /**
   * Get content item with fallback from multiple storage areas
   */
  async getContentItem(itemId) {
    try {
      // Try IndexedDB first for full content
      const fullItem = await this.indexedDBGet('fullContent', itemId)
      if (fullItem) {
        return fullItem
      }
      
      // Fallback to Chrome Storage for lightweight version
      const { contentItems = [] } = await this.chromeStorageGet('local', 'contentItems')
      return contentItems.find(item => item.id === itemId) || null
    } catch (error) {
      console.error('Failed to get content item:', error)
      return null
    }
  }

  /**
   * Get all content items with pagination support
   */
  async getAllContentItems(options = {}) {
    try {
      const { limit, offset, sortBy = 'dateAdded', sortOrder = 'desc' } = options
      
      // Get from IndexedDB for full content
      let items = await this.indexedDBGetAll('fullContent')
      
      // Fallback to Chrome Storage if IndexedDB is empty
      if (items.length === 0) {
        const { contentItems = [] } = await this.chromeStorageGet('local', 'contentItems')
        items = contentItems
      }
      
      // Sort items
      items.sort((a, b) => {
        const aVal = a[sortBy]
        const bVal = b[sortBy]
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return sortOrder === 'desc' ? -comparison : comparison
      })
      
      // Apply pagination
      if (limit) {
        const start = offset || 0
        items = items.slice(start, start + limit)
      }
      
      return items
    } catch (error) {
      console.error('Failed to get all content items:', error)
      return []
    }
  }

  /**
   * Search content items across all storage areas
   */
  async searchContentItems(query, options = {}) {
    try {
      const { type, categories, tags, limit } = options
      const items = await this.getAllContentItems()
      const searchTerm = query.toLowerCase()
      
      let results = items.filter(item => {
        // Text search - only apply if query is not empty
        const textMatch = !searchTerm || searchTerm.length === 0 ||
          item.title?.toLowerCase().includes(searchTerm) ||
          item.content?.toLowerCase().includes(searchTerm) ||
          item.summary?.toLowerCase().includes(searchTerm)
        
        // Type filter
        const typeMatch = !type || item.type === type
        
        // Category filter
        const categoryMatch = !categories || 
          categories.some(cat => item.categories?.includes(cat))
        
        // Tag filter
        const tagMatch = !tags || 
          tags.some(tag => item.tags?.includes(tag))
        
        return textMatch && typeMatch && categoryMatch && tagMatch
      })
      
      // Apply limit
      if (limit) {
        results = results.slice(0, limit)
      }
      
      return results
    } catch (error) {
      console.error('Search failed:', error)
      return []
    }
  }

  /**
   * Delete content item from all storage areas
   */
  async deleteContentItem(itemId) {
    try {
      // Remove from Chrome Storage
      const { contentItems = [] } = await this.chromeStorageGet('local', 'contentItems')
      const updatedItems = contentItems.filter(item => item.id !== itemId)
      await this.chromeStorageSet('local', 'contentItems', updatedItems)
      
      // Remove from IndexedDB
      await this.indexedDBRemove('fullContent', itemId)
      
      console.log('Content item deleted:', itemId)
      return true
    } catch (error) {
      console.error('Failed to delete content item:', error)
      throw error
    }
  }

  /**
   * Save user settings to sync storage
   */
  async saveSettings(settings) {
    try {
      await this.chromeStorageSet('sync', StorageService.STORAGE_KEYS.SETTINGS, settings)
      console.log('Settings saved to sync storage')
      return true
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  }

  /**
   * Get user settings from sync storage
   */
  async getSettings() {
    try {
      const result = await this.chromeStorageGet('sync', StorageService.STORAGE_KEYS.SETTINGS)
      return result[StorageService.STORAGE_KEYS.SETTINGS] || null
    } catch (error) {
      console.error('Failed to get settings:', error)
      return null
    }
  }

  // ===========================================
  // QUOTA MANAGEMENT
  // ===========================================

  /**
   * Check quota usage across all storage areas
   */
  async checkQuotaUsage() {
    try {
      const quotaInfo = {
        sync: await this.getChromeStorageQuota('sync'),
        local: await this.getChromeStorageQuota('local'),
        indexedDB: await this.getIndexedDBUsage()
      }
      
      // Warn if any area is near quota limit
      Object.entries(quotaInfo).forEach(([area, info]) => {
        if (info && info.percentageUsed > this.quotaWarningThreshold * 100) {
          console.warn(`Storage ${area} usage warning: ${info.percentageUsed.toFixed(1)}%`)
          this.emitEvent('quota:warning', { area, info })
        }
      })
      
      return quotaInfo
    } catch (error) {
      console.error('Failed to check quota usage:', error)
      return null
    }
  }

  /**
   * Check quota before storing data
   */
  async checkQuotaBeforeStore(area, key, data) {
    try {
      const dataSize = new Blob([JSON.stringify(data)]).size
      const quotaInfo = await this.getChromeStorageQuota(area)
      
      if (quotaInfo && quotaInfo.remainingBytes < dataSize) {
        throw new Error(`Storage quota exceeded for ${area}. Required: ${dataSize}, Available: ${quotaInfo.remainingBytes}`)
      }
    } catch (error) {
      console.warn('Quota check failed:', error)
      // Rethrow quota exceeded errors, but allow other errors to pass through
      if (error.message.includes('Storage quota exceeded')) {
        throw error
      }
      // Don't throw other errors - allow storage attempt to proceed
    }
  }

  /**
   * Get IndexedDB usage estimate
   */
  async getIndexedDBUsage() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        return {
          bytesInUse: estimate.usage || 0,
          quota: estimate.quota || Number.MAX_SAFE_INTEGER,
          percentageUsed: estimate.usage ? (estimate.usage / estimate.quota) * 100 : 0,
          remainingBytes: estimate.quota ? estimate.quota - estimate.usage : Number.MAX_SAFE_INTEGER
        }
      }
    } catch (error) {
      console.error('Failed to get IndexedDB usage:', error)
    }
    return null
  }

  // ===========================================
  // EVENT SYSTEM
  // ===========================================

  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event).add(callback)
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  /**
   * Emit event to listeners
   */
  emitEvent(event, data) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Event listener error:', error)
        }
      })
    }
  }

  // ===========================================
  // BACKUP AND MIGRATION
  // ===========================================

  /**
   * Create data backup
   */
  async createBackup(includeContent = true) {
    try {
      const backup = {
        id: `backup_${Date.now()}`,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        data: {}
      }
      
      // Backup sync storage
      backup.data.sync = await chrome.storage.sync.get()
      
      // Backup local storage
      backup.data.local = await chrome.storage.local.get()
      
      // Backup IndexedDB if requested
      if (includeContent && this.db) {
        backup.data.indexedDB = {
          fullContent: await this.indexedDBGetAll('fullContent'),
          analytics: await this.indexedDBGetAll('analytics')
        }
      }
      
      // Store backup in IndexedDB
      await this.indexedDBSet('backups', backup)
      
      console.log('Backup created:', backup.id)
      return backup
    } catch (error) {
      console.error('Backup creation failed:', error)
      throw error
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId) {
    try {
      const backup = await this.indexedDBGet('backups', backupId)
      if (!backup) {
        throw new Error('Backup not found')
      }
      
      // Restore sync storage
      if (backup.data.sync) {
        await chrome.storage.sync.clear()
        await chrome.storage.sync.set(backup.data.sync)
      }
      
      // Restore local storage
      if (backup.data.local) {
        await chrome.storage.local.clear()
        await chrome.storage.local.set(backup.data.local)
      }
      
      // Restore IndexedDB
      if (backup.data.indexedDB) {
        if (backup.data.indexedDB.fullContent) {
          await this.indexedDBClear('fullContent')
          await this.indexedDBSet('fullContent', backup.data.indexedDB.fullContent)
        }
        if (backup.data.indexedDB.analytics) {
          await this.indexedDBClear('analytics')
          await this.indexedDBSet('analytics', backup.data.indexedDB.analytics)
        }
      }
      
      console.log('Restore completed from backup:', backupId)
      return true
    } catch (error) {
      console.error('Restore failed:', error)
      throw error
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Get storage service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      chromeStorageAvailable: typeof chrome !== 'undefined' && !!chrome.storage,
      indexedDBAvailable: !!this.db,
      eventListeners: this.eventListeners.size
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this.eventListeners.clear()
    this.isInitialized = false
    console.log('Storage service cleaned up')
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageService
}
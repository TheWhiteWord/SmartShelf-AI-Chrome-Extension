/**
 * Search Service - Natural Language Search with Advanced Features
 * 
 * Provides comprehensive search functionality for the SmartShelf Chrome Extension
 * including natural language processing, relevance ranking, filtering, and
 * performance optimization. Integrates with Storage Service and Content Repository
 * for efficient content discovery and retrieval.
 * 
 * Features:
 * - Natural language search queries
 * - Relevance ranking and scoring
 * - Advanced filtering (type, date, categories, tags)
 * - Search index optimization
 * - Query preprocessing and normalization
 * - Search history and suggestions
 * - Performance optimization for large collections
 * - Support for both digital and physical items
 * - Real-time search capabilities
 * - Search analytics and insights
 */

class SearchService {
  constructor(storageService, contentRepository = null) {
    if (!storageService) {
      throw new Error('Storage service is required')
    }
    
    this.storageService = storageService
    this.contentRepository = contentRepository
    this.isInitialized = false
    
    // Search configuration
    this.config = {
      maxResults: 100,
      minQueryLength: 1,
      indexUpdateDelay: 1000,
      searchTimeout: 5000,
      enableFuzzySearch: true,
      enableSearchHistory: true,
      maxHistoryItems: 50
    }
    
    // Search index cache for performance
    this.searchIndexCache = null
    this.lastIndexUpdate = null
    this.cacheValidityMs = 30000 // 30 seconds
    
    // Search history
    this.searchHistory = []
    
    // Event listeners
    this.eventListeners = new Map()
  }

  // ===========================================
  // INITIALIZATION AND CONFIGURATION
  // ===========================================

  /**
   * Initialize the search service
   */
  async initialize() {
    try {
      // Initialize storage service if needed
      if (!this.storageService.isInitialized) {
        const initResult = await this.storageService.initialize()
        if (!initResult) {
          throw new Error('Failed to initialize storage service')
        }
      }
      
      // Load search configuration from storage
      await this.loadConfiguration()
      
      // Load search history
      await this.loadSearchHistory()
      
      // Set up storage event listeners for index updates
      this.setupStorageListeners()
      
      this.isInitialized = true
      console.log('Search service initialized successfully')
      
      return true
    } catch (error) {
      console.error('Failed to initialize search service:', error)
      this.isInitialized = false
      return false
    }
  }

  /**
   * Load search configuration from storage
   */
  async loadConfiguration() {
    try {
      const settings = await this.storageService.getSettings()
      if (settings?.searchConfig) {
        this.config = { ...this.config, ...settings.searchConfig }
      }
    } catch (error) {
      console.warn('Failed to load search configuration:', error)
    }
  }

  /**
   * Load search history from storage
   */
  async loadSearchHistory() {
    try {
      const result = await this.storageService.chromeStorageGet('local', 'searchHistory')
      this.searchHistory = result.searchHistory || []
    } catch (error) {
      console.warn('Failed to load search history:', error)
    }
  }

  /**
   * Set up storage event listeners for automatic index updates
   */
  setupStorageListeners() {
    // Listen for content item changes to update search index
    this.storageService.addEventListener('item:created', (item) => {
      this.invalidateCache()
      this.updateSearchIndex([item])
    })
    
    this.storageService.addEventListener('item:updated', (item) => {
      this.invalidateCache()
      this.updateSearchIndex([item])
    })
    
    this.storageService.addEventListener('item:deleted', (data) => {
      this.invalidateCache()
      this.removeFromSearchIndex(data.id)
    })
  }

  // ===========================================
  // CORE SEARCH FUNCTIONALITY
  // ===========================================

  /**
   * Perform natural language search
   */
  async search(query, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Search service not initialized')
      }

      // Validate and preprocess query
      const processedQuery = this.preprocessQuery(query)
      if (!processedQuery.isValid) {
        return {
          results: [],
          totalCount: 0,
          query: query,
          processingTime: 0,
          error: processedQuery.error
        }
      }

      const startTime = Date.now()

      // Parse search options
      const searchOptions = {
        limit: options.limit || this.config.maxResults,
        offset: options.offset || 0,
        sortBy: options.sortBy || 'relevance',
        sortOrder: options.sortOrder || 'desc',
        filters: options.filters || {},
        includeHistory: options.includeHistory !== false
      }

      // Execute search strategy based on query complexity
      let results = []
      
      if (processedQuery.tokens.length === 1 && Object.keys(searchOptions.filters).length === 0) {
        // Simple single-term search - use index for performance
        results = await this.performIndexedSearch(processedQuery, searchOptions)
      } else {
        // Complex multi-term or filtered search - use full content search
        results = await this.performFullContentSearch(processedQuery, searchOptions)
      }

      // Apply post-processing
      results = this.postProcessResults(results, processedQuery, searchOptions)

      const processingTime = Date.now() - startTime

      // Save to search history
      if (searchOptions.includeHistory && query.trim().length > 0) {
        await this.saveToSearchHistory(query, results.length)
      }

      // Emit search event
      this.emitEvent('search:completed', {
        query,
        resultCount: results.length,
        processingTime
      })

      return {
        results,
        totalCount: results.length,
        query: processedQuery.original,
        processingTime,
        searchOptions
      }
    } catch (error) {
      console.error('Search failed:', error)
      
      return {
        results: [],
        totalCount: 0,
        query: query,
        processingTime: 0,
        error: error.message
      }
    }
  }

  /**
   * Preprocess and validate search query
   */
  preprocessQuery(query) {
    // Handle null/undefined queries
    if (query === null || query === undefined) {
      return {
        isValid: false,
        error: 'Invalid query'
      }
    }

    // Convert to string if needed
    const queryString = String(query)
    
    // Normalize query
    const normalized = queryString.trim()
    
    // Allow empty queries for filter-only searches
    // Check minimum length only for non-empty queries
    if (normalized.length > 0 && normalized.length < this.config.minQueryLength) {
      return {
        isValid: false,
        error: 'Query too short'
      }
    }

    // Truncate very long queries for performance
    const truncated = normalized.substring(0, 100)
    
    // Tokenize query (will return empty array for empty strings)
    const tokens = this.tokenizeQuery(truncated)
    
    return {
      isValid: true,
      original: query,
      normalized: truncated,
      tokens: tokens,
      tokenCount: tokens.length
    }
  }

  /**
   * Tokenize search query into searchable terms
   */
  tokenizeQuery(query) {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .split(/\s+/)
      .filter(token => token.length > 0)
      .filter(token => !this.isStopWord(token))
  }

  /**
   * Check if word is a stop word (common words to ignore)
   */
  isStopWord(word) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
      'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our'
    ])
    
    return stopWords.has(word.toLowerCase())
  }

  // ===========================================
  // SEARCH STRATEGIES
  // ===========================================

  /**
   * Perform indexed search for fast single-term queries
   */
  async performIndexedSearch(processedQuery, options) {
    try {
      const searchIndex = await this.getSearchIndex()
      const token = processedQuery.tokens[0]
      
      // Get item IDs from index
      const itemIds = searchIndex.tokens?.[token] || []
      
      if (itemIds.length === 0) {
        return []
      }

      // Get full item details
      const items = []
      for (const itemId of itemIds) {
        const item = await this.getContentItem(itemId)
        if (item) {
          items.push(item)
        }
      }

      // Apply filters
      return this.applyFilters(items, options.filters)
    } catch (error) {
      console.error('Indexed search failed:', error)
      // Fallback to full content search
      return this.performFullContentSearch(processedQuery, options)
    }
  }

  /**
   * Perform full content search for complex queries
   */
  async performFullContentSearch(processedQuery, options) {
    // Get all content items - don't catch errors here, let them propagate
    const allItems = await this.getAllContentItems()
    
    // Filter items based on search terms
    const searchResults = allItems.filter(item => {
      return this.matchesSearchTerms(item, processedQuery.tokens)
    })

    // Apply additional filters
    const filteredResults = this.applyFilters(searchResults, options.filters)

    // Calculate relevance scores
    return this.calculateRelevanceScores(filteredResults, processedQuery)
  }

  /**
   * Check if item matches search terms
   */
  matchesSearchTerms(item, tokens) {
    if (tokens.length === 0) {
      return true
    }

    // Create searchable text
    const searchableText = this.createSearchableText(item)
    
    // For multi-term queries, require at least one term to match
    return tokens.some(token => 
      searchableText.includes(token.toLowerCase())
    )
  }

  /**
   * Create searchable text from content item
   */
  createSearchableText(item) {
    const texts = [
      item.title || '',
      item.content || '',
      item.summary || '',
      ...(item.tags || []),
      ...(item.categories || []),
      ...(item.aiTags || []),
      ...(item.aiCategories || [])
    ]
    
    // Add physical item specific fields
    if (item.isPhysical) {
      texts.push(
        item.author || '',
        item.publisher || '',
        item.isbn || '',
        item.location || ''
      )
    }
    
    return texts.filter(text => text && text.trim().length > 0).join(' ').toLowerCase()
  }

  /**
   * Apply search filters to results
   */
  applyFilters(items, filters = {}) {
    let filteredItems = [...items]

    // Type filter
    if (filters.type) {
      filteredItems = filteredItems.filter(item => item.type === filters.type)
    }

    // Status filter
    if (filters.status) {
      filteredItems = filteredItems.filter(item => item.status === filters.status)
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      filteredItems = filteredItems.filter(item =>
        filters.categories.some(category =>
          (item.categories || []).includes(category) ||
          (item.aiCategories || []).includes(category)
        )
      )
    }

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      filteredItems = filteredItems.filter(item =>
        filters.tags.some(tag =>
          (item.tags || []).includes(tag) ||
          (item.aiTags || []).includes(tag)
        )
      )
    }

    // Date range filter
    if (filters.dateRange) {
      const { start, end } = filters.dateRange
      filteredItems = filteredItems.filter(item => {
        const itemDate = new Date(item.dateAdded)
        const startDate = start ? new Date(start) : new Date(0)
        const endDate = end ? new Date(end) : new Date()
        
        return itemDate >= startDate && itemDate <= endDate
      })
    }

    // Physical/Digital filter
    if (filters.isPhysical !== undefined) {
      filteredItems = filteredItems.filter(item => 
        Boolean(item.isPhysical) === Boolean(filters.isPhysical)
      )
    }

    return filteredItems
  }

  /**
   * Calculate relevance scores for search results
   */
  calculateRelevanceScores(items, processedQuery) {
    return items.map(item => {
      let score = 0
      const searchableText = this.createSearchableText(item)
      
      processedQuery.tokens.forEach(token => {
        // Title matches get highest score
        if ((item.title || '').toLowerCase().includes(token)) {
          score += 10
          
          // Extra points for exact title start
          if ((item.title || '').toLowerCase().startsWith(token)) {
            score += 5
          }
        }

        // Content matches get medium score
        if ((item.content || '').toLowerCase().includes(token)) {
          score += 5
        }

        // Summary matches get medium score
        if ((item.summary || '').toLowerCase().includes(token)) {
          score += 4
        }

        // Tag matches get lower score
        if ((item.tags || []).some(tag => tag.toLowerCase().includes(token))) {
          score += 3
        }

        // AI tag matches get lower score
        if ((item.aiTags || []).some(tag => tag.toLowerCase().includes(token))) {
          score += 2
        }

        // Category matches get lower score
        if ((item.categories || []).some(cat => cat.toLowerCase().includes(token))) {
          score += 2
        }
      })

      // Boost score for recent items
      const daysSinceAdded = (Date.now() - new Date(item.dateAdded)) / (1000 * 60 * 60 * 24)
      if (daysSinceAdded < 7) {
        score += 2
      }

      // Boost score for items with more interactions
      if (item.viewCount > 0) {
        score += Math.min(item.viewCount, 5)
      }

      return { ...item, searchScore: score }
    })
    .sort((a, b) => b.searchScore - a.searchScore)
  }

  /**
   * Post-process search results
   */
  postProcessResults(results, processedQuery, options) {
    let processedResults = [...results]

    // Apply sorting if not by relevance
    if (options.sortBy !== 'relevance') {
      processedResults = this.sortResults(processedResults, options.sortBy, options.sortOrder)
    }

    // Apply pagination
    if (options.limit || options.offset) {
      const start = options.offset || 0
      const end = start + (options.limit || processedResults.length)
      processedResults = processedResults.slice(start, end)
    }

    return processedResults
  }

  /**
   * Sort search results by specified field
   */
  sortResults(results, sortBy, sortOrder = 'desc') {
    return results.sort((a, b) => {
      let aVal = a[sortBy]
      let bVal = b[sortBy]

      // Handle date fields
      if (sortBy.includes('date') || sortBy.includes('Date')) {
        aVal = new Date(aVal || 0)
        bVal = new Date(bVal || 0)
      }

      // Handle numeric fields
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
      }

      // Handle string fields
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal)
        return sortOrder === 'desc' ? -comparison : comparison
      }

      // Default comparison
      if (aVal < bVal) return sortOrder === 'desc' ? 1 : -1
      if (aVal > bVal) return sortOrder === 'desc' ? -1 : 1
      return 0
    })
  }

  // ===========================================
  // SEARCH INDEX MANAGEMENT
  // ===========================================

  /**
   * Get search index with caching
   */
  async getSearchIndex() {
    try {
      // Check cache validity
      if (this.searchIndexCache && this.isIndexCacheValid()) {
        return this.searchIndexCache
      }

      // Load from storage
      const result = await this.storageService.chromeStorageGet('local', 'searchIndex')
      const searchIndex = result.searchIndex || { tokens: {}, items: {} }

      // Update cache
      this.searchIndexCache = searchIndex
      this.lastIndexUpdate = Date.now()

      return searchIndex
    } catch (error) {
      console.error('Failed to get search index:', error)
      return { tokens: {}, items: {} }
    }
  }

  /**
   * Check if search index cache is valid
   */
  isIndexCacheValid() {
    return this.lastIndexUpdate && 
           (Date.now() - this.lastIndexUpdate) < this.cacheValidityMs
  }

  /**
   * Invalidate search index cache
   */
  invalidateCache() {
    this.searchIndexCache = null
    this.lastIndexUpdate = null
  }

  /**
   * Update search index for content items
   */
  async updateSearchIndex(items) {
    try {
      const searchIndex = await this.getSearchIndex()

      items.forEach(item => {
        // Create searchable tokens
        const searchableText = this.createSearchableText(item)
        const tokens = this.tokenizeQuery(searchableText)

        // Update token mappings
        tokens.forEach(token => {
          if (!searchIndex.tokens[token]) {
            searchIndex.tokens[token] = []
          }
          
          if (!searchIndex.tokens[token].includes(item.id)) {
            searchIndex.tokens[token].push(item.id)
          }
        })

        // Update item information
        searchIndex.items[item.id] = {
          title: item.title,
          content: item.content?.substring(0, 200) || '', // Truncate for storage
          tags: item.tags || [],
          score: 1.0
        }
      })

      // Save updated index
      await this.storageService.chromeStorageSet('local', 'searchIndex', searchIndex)
      
      // Update cache
      this.searchIndexCache = searchIndex
      this.lastIndexUpdate = Date.now()

      console.log(`Search index updated for ${items.length} items`)
    } catch (error) {
      console.error('Failed to update search index:', error)
    }
  }

  /**
   * Remove item from search index
   */
  async removeFromSearchIndex(itemId) {
    try {
      const searchIndex = await this.getSearchIndex()

      // Remove from token mappings
      Object.keys(searchIndex.tokens).forEach(token => {
        const itemIds = searchIndex.tokens[token]
        const index = itemIds.indexOf(itemId)
        if (index > -1) {
          itemIds.splice(index, 1)
        }
        
        // Remove empty token entries
        if (itemIds.length === 0) {
          delete searchIndex.tokens[token]
        }
      })

      // Remove from items
      delete searchIndex.items[itemId]

      // Save updated index
      await this.storageService.chromeStorageSet('local', 'searchIndex', searchIndex)
      
      // Update cache
      this.searchIndexCache = searchIndex
      this.lastIndexUpdate = Date.now()

      console.log(`Removed item ${itemId} from search index`)
    } catch (error) {
      console.error('Failed to remove item from search index:', error)
    }
  }

  /**
   * Rebuild entire search index
   */
  async rebuildSearchIndex() {
    try {
      console.log('Rebuilding search index...')
      
      const allItems = await this.getAllContentItems()
      
      // Create fresh index
      const searchIndex = { tokens: {}, items: {} }
      
      // Save empty index first
      await this.storageService.chromeStorageSet('local', 'searchIndex', searchIndex)
      
      // Update with all items
      await this.updateSearchIndex(allItems)
      
      console.log(`Search index rebuilt with ${allItems.length} items`)
      return true
    } catch (error) {
      console.error('Failed to rebuild search index:', error)
      return false
    }
  }

  // ===========================================
  // SEARCH HISTORY MANAGEMENT
  // ===========================================

  /**
   * Save search query to history
   */
  async saveToSearchHistory(query, resultCount) {
    try {
      const historyEntry = {
        query: query.trim(),
        timestamp: new Date().toISOString(),
        resultCount
      }

      // Remove duplicates and add new entry
      this.searchHistory = this.searchHistory.filter(entry => 
        entry.query !== historyEntry.query
      )
      this.searchHistory.unshift(historyEntry)

      // Limit history size
      if (this.searchHistory.length > this.config.maxHistoryItems) {
        this.searchHistory = this.searchHistory.slice(0, this.config.maxHistoryItems)
      }

      // Save to storage
      await this.storageService.chromeStorageSet('local', 'searchHistory', this.searchHistory)
    } catch (error) {
      console.error('Failed to save search history:', error)
    }
  }

  /**
   * Get search history
   */
  getSearchHistory(limit = 10) {
    return this.searchHistory.slice(0, limit)
  }

  /**
   * Clear search history
   */
  async clearSearchHistory() {
    try {
      this.searchHistory = []
      await this.storageService.chromeStorageSet('local', 'searchHistory', [])
      console.log('Search history cleared')
    } catch (error) {
      console.error('Failed to clear search history:', error)
    }
  }

  // ===========================================
  // HELPER METHODS
  // ===========================================

  /**
   * Get content item (with fallback to different sources)
   */
  async getContentItem(itemId) {
    try {
      if (this.contentRepository) {
        return await this.contentRepository.getById(itemId)
      } else {
        return await this.storageService.getContentItem(itemId)
      }
    } catch (error) {
      console.error(`Failed to get content item ${itemId}:`, error)
      return null
    }
  }

  /**
   * Get all content items
   */
  async getAllContentItems() {
    try {
      if (this.contentRepository) {
        return await this.contentRepository.getAll()
      } else {
        return await this.storageService.getAllContentItems()
      }
    } catch (error) {
      console.error('Failed to get all content items:', error)
      return []
    }
  }

  // ===========================================
  // SEARCH SUGGESTIONS AND AUTOCOMPLETION
  // ===========================================

  /**
   * Get search suggestions based on query
   */
  async getSearchSuggestions(partialQuery, limit = 5) {
    try {
      const suggestions = []
      
      // Add history-based suggestions
      const historySuggestions = this.searchHistory
        .filter(entry => entry.query.toLowerCase().includes(partialQuery.toLowerCase()))
        .slice(0, Math.floor(limit / 2))
        .map(entry => ({
          text: entry.query,
          type: 'history',
          resultCount: entry.resultCount
        }))
      
      suggestions.push(...historySuggestions)

      // Add tag-based suggestions
      const searchIndex = await this.getSearchIndex()
      const tokenSuggestions = Object.keys(searchIndex.tokens)
        .filter(token => token.includes(partialQuery.toLowerCase()))
        .slice(0, limit - suggestions.length)
        .map(token => ({
          text: token,
          type: 'token',
          resultCount: searchIndex.tokens[token].length
        }))
      
      suggestions.push(...tokenSuggestions)

      return suggestions.slice(0, limit)
    } catch (error) {
      console.error('Failed to get search suggestions:', error)
      return []
    }
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
          console.error('Search event listener error:', error)
        }
      })
    }
  }

  // ===========================================
  // SEARCH ANALYTICS AND INSIGHTS
  // ===========================================

  /**
   * Get search analytics and performance metrics
   */
  getSearchAnalytics() {
    return {
      totalSearches: this.searchHistory.length,
      uniqueQueries: new Set(this.searchHistory.map(h => h.query)).size,
      averageResultCount: this.searchHistory.length > 0 
        ? this.searchHistory.reduce((sum, h) => sum + h.resultCount, 0) / this.searchHistory.length 
        : 0,
      mostSearchedTerms: this.getMostSearchedTerms(),
      cacheHitRate: this.searchIndexCache ? 1.0 : 0.0,
      indexSize: this.searchIndexCache 
        ? Object.keys(this.searchIndexCache.tokens).length 
        : 0
    }
  }

  /**
   * Get most searched terms from history
   */
  getMostSearchedTerms(limit = 10) {
    const termCounts = new Map()
    
    this.searchHistory.forEach(entry => {
      const tokens = this.tokenizeQuery(entry.query)
      tokens.forEach(token => {
        termCounts.set(token, (termCounts.get(token) || 0) + 1)
      })
    })

    return Array.from(termCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([term, count]) => ({ term, count }))
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Get search service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      storageService: this.storageService.getStatus(),
      contentRepository: this.contentRepository ? this.contentRepository.getStatus() : null,
      config: this.config,
      cacheStatus: {
        isValid: this.isIndexCacheValid(),
        lastUpdate: this.lastIndexUpdate,
        size: this.searchIndexCache ? Object.keys(this.searchIndexCache.tokens).length : 0
      },
      searchHistory: {
        count: this.searchHistory.length,
        enabled: this.config.enableSearchHistory
      }
    }
  }

  /**
   * Update search configuration
   */
  async updateConfiguration(newConfig) {
    try {
      this.config = { ...this.config, ...newConfig }
      
      // Save to storage
      const settings = await this.storageService.getSettings() || {}
      settings.searchConfig = this.config
      await this.storageService.saveSettings(settings)
      
      console.log('Search configuration updated')
      return true
    } catch (error) {
      console.error('Failed to update search configuration:', error)
      return false
    }
  }

  /**
   * Cleanup search service resources
   */
  cleanup() {
    this.invalidateCache()
    this.eventListeners.clear()
    this.searchHistory = []
    this.isInitialized = false
    console.log('Search service cleaned up')
  }
}

// Export for CommonJS (Node.js/Jest) and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchService
} else if (typeof window !== 'undefined') {
  // Browser/Extension environment - make it globally available
  window.SearchService = SearchService
}
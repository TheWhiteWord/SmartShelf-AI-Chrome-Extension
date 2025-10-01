/**
 * Background AI Processing Queue (T067)
 * 
 * Robust AI processing queue with progress tracking, error handling,
 * priority management, and concurrent processing limits.
 * 
 * Features:
 * - Priority-based queue management (high, normal, low)
 * - Concurrent processing with configurable limits
 * - Progress tracking with queue position updates
 * - Queue persistence across service worker restarts
 * - Rate limiting and throttling
 * - Dead letter queue for failed items
 * - Queue analytics and monitoring
 */
class AIProcessingQueue extends EventTarget {
  constructor(storageService, aiServices) {
    super()
    
    if (!storageService) {
      throw new Error('Storage service is required')
    }
    if (!aiServices) {
      throw new Error('AI services are required')
    }
    
    this.storageService = storageService
    this.aiServices = aiServices
    this.isInitialized = false
    
    // Configuration
    this.config = {
      maxConcurrentJobs: 3,
      maxQueueSize: 1000,
      processingTimeout: 300000, // 5 minutes
      retryConfig: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        exponentialBase: 2
      },
      rateLimiting: {
        enabled: false,
        requestsPerMinute: 60,
        burstLimit: 10
      },
      deadLetterQueue: {
        enabled: true,
        maxRetryAttempts: 5,
        retentionDays: 7
      }
    }
    
    // Queue state
    this.pendingQueue = [] // Items waiting to be processed
    this.processingItems = new Map() // Currently processing items
    this.completedItems = []
    this.deadLetterItems = []
    
    // Statistics
    this.statistics = {
      totalEnqueued: 0,
      totalProcessed: 0,
      totalFailed: 0,
      averageWaitTime: 0,
      averageProcessingTime: 0,
      throughput: 0,
      errorRate: 0
    }
    
    // Rate limiting state
    this.rateLimitingState = {
      requestCount: 0,
      windowStart: Date.now(),
      burstCount: 0
    }
    
    // Analytics
    this.analytics = {
      peakQueueSize: 0,
      peakQueueTime: null,
      processingTimes: [],
      waitTimes: []
    }
  }
  
  /**
   * Initialize queue and restore state
   */
  async initialize() {
    try {
      // Restore queue state from storage
      const storedState = await this.storageService.get('aiProcessingQueue')
      
      if (storedState && storedState.aiProcessingQueue) {
        const state = storedState.aiProcessingQueue
        
        this.pendingQueue = state.pending || []
        this.completedItems = state.completed || []
        this.deadLetterItems = state.deadLetter || []
        this.statistics = { ...this.statistics, ...(state.statistics || {}) }
        
        // Don't restore processing items - they should be re-queued
        const staleProcessingItems = state.processing || []
        this.pendingQueue.unshift(...staleProcessingItems)
        
        console.log(`Queue initialized: ${this.pendingQueue.length} pending, ${this.completedItems.length} completed`)
      }
      
      this.isInitialized = true
      
      // Start processing if there are items in queue
      if (this.pendingQueue.length > 0) {
        this.startProcessing()
      }
      
    } catch (error) {
      console.warn('Failed to restore queue state:', error.message)
      this.isInitialized = true // Continue with empty state
    }
  }
  
  /**
   * Get queue configuration
   */
  getConfiguration() {
    return { ...this.config }
  }
  
  /**
   * Set queue configuration
   */
  setConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig }
  }
  
  /**
   * Enqueue item for processing
   */
  async enqueue(contentItem, priority = 'normal') {
    if (!this.isInitialized) {
      throw new Error('Queue not initialized')
    }
    
    if (this.pendingQueue.length >= this.config.maxQueueSize) {
      throw new Error('Queue size limit exceeded')
    }
    
    const queueItem = {
      id: this.generateItemId(),
      content: { ...contentItem },
      priority,
      addedAt: Date.now(),
      attempts: 0,
      lastError: null,
      processingHistory: []
    }
    
    // Insert based on priority
    this.insertByPriority(queueItem)
    
    this.statistics.totalEnqueued++
    this.updatePeakQueueSize()
    
    // Save state
    await this.saveQueueState()
    
    // Emit queue update event
    this.emitQueueUpdate()
    
    // Start processing if not already running
    this.startProcessing()
    
    return queueItem.id
  }
  
  /**
   * Remove item from queue
   */
  async removeFromQueue(itemId) {
    const index = this.pendingQueue.findIndex(item => item.id === itemId)
    
    if (index >= 0) {
      this.pendingQueue.splice(index, 1)
      await this.saveQueueState()
      this.emitQueueUpdate()
      return true
    }
    
    return false
  }
  
  /**
   * Get queue position for item
   */
  async getQueuePosition(itemId) {
    const index = this.pendingQueue.findIndex(item => item.id === itemId)
    return index >= 0 ? index + 1 : -1
  }
  
  /**
   * Get queue status
   */
  async getQueueStatus() {
    return {
      pending: this.pendingQueue.length,
      processing: this.processingItems.size,
      completed: this.completedItems.length,
      failed: this.deadLetterItems.length,
      totalEnqueued: this.statistics.totalEnqueued
    }
  }
  
  /**
   * Get pending items
   */
  async getPendingItems() {
    return [...this.pendingQueue]
  }
  
  /**
   * Start processing queue
   */
  async startProcessing() {
    if (!this.isInitialized) return
    
    // Process items up to concurrency limit
    while (
      this.pendingQueue.length > 0 && 
      this.processingItems.size < this.config.maxConcurrentJobs
    ) {
      const item = this.pendingQueue.shift()
      
      if (item && this.shouldProcessItem(item)) {
        this.processItemAsync(item)
      }
    }
  }
  
  /**
   * Wait for queue completion
   */
  async waitForCompletion() {
    return new Promise((resolve) => {
      const checkCompletion = () => {
        if (this.pendingQueue.length === 0 && this.processingItems.size === 0) {
          resolve()
        } else {
          setTimeout(checkCompletion, 100)
        }
      }
      
      checkCompletion()
    })
  }
  
  /**
   * Process item asynchronously
   */
  async processItemAsync(item) {
    const startTime = Date.now()
    
    // Add to processing map
    this.processingItems.set(item.id, {
      ...item,
      processingStartTime: startTime
    })
    
    try {
      // Check rate limiting
      if (this.config.rateLimiting.enabled && !this.checkRateLimit()) {
        // Put item back in queue with delay
        setTimeout(() => {
          this.pendingQueue.unshift(item)
          this.startProcessing()
        }, 1000)
        return
      }
      
      // Process with AI
      const result = await this.processWithAI(item)
      
      // Calculate processing time
      const processingTime = Date.now() - startTime
      const waitTime = startTime - item.addedAt
      
      // Update statistics
      this.updateProcessingStats(processingTime, waitTime, true)
      
      // Mark as completed
      const completedItem = {
        ...item,
        result,
        completedAt: Date.now(),
        processingTime,
        waitTime,
        success: true
      }
      
      this.completedItems.push(completedItem)
      this.statistics.totalProcessed++
      
      // Emit success event
      this.emit('itemProcessed', {
        itemId: item.id,
        success: true,
        result,
        processingTime,
        waitTime
      })
      
    } catch (error) {
      await this.handleProcessingError(item, error, startTime)
    } finally {
      // Remove from processing map
      this.processingItems.delete(item.id)
      
      // Save state and continue processing
      await this.saveQueueState()
      this.emitQueueUpdate()
      this.startProcessing()
    }
  }
  
  /**
   * Process item with AI services
   */
  async processWithAI(item) {
    const { content } = item
    
    // Add processing attempt to history
    item.processingHistory.push({
      attempt: item.attempts + 1,
      startTime: Date.now(),
      error: null
    })
    
    item.attempts++
    
    // Process with AI services
    if (this.aiServices.processContent) {
      return await this.aiServices.processContent(content)
    } else {
      // Fallback processing
      return {
        summary: `Processed: ${content.title}`,
        tags: ['processed'],
        categories: ['General']
      }
    }
  }
  
  /**
   * Handle processing error
   */
  async handleProcessingError(item, error, startTime) {
    const processingTime = Date.now() - startTime
    const waitTime = startTime - item.addedAt
    
    // Update processing history
    if (item.processingHistory.length > 0) {
      item.processingHistory[item.processingHistory.length - 1].error = error.message
    }
    
    item.lastError = {
      message: error.message,
      timestamp: Date.now(),
      attempt: item.attempts
    }
    
    // Update statistics
    this.updateProcessingStats(processingTime, waitTime, false)
    this.statistics.totalFailed++
    
    // Check if should retry
    if (item.attempts < this.config.retryConfig.maxAttempts) {
      // Calculate retry delay
      const delay = this.calculateRetryDelay(item.attempts)
      
      setTimeout(() => {
        this.pendingQueue.unshift(item)
        this.startProcessing()
      }, delay)
      
      console.log(`Retrying item ${item.id} in ${delay}ms (attempt ${item.attempts}/${this.config.retryConfig.maxAttempts})`)
      
    } else {
      // Move to dead letter queue
      const failedItem = {
        ...item,
        failedAt: Date.now(),
        failureReason: error.message,
        attemptCount: item.attempts
      }
      
      this.deadLetterItems.push(failedItem)
      
      console.error(`Item ${item.id} moved to dead letter queue after ${item.attempts} attempts:`, error.message)
      
      // Emit failure event
      this.emit('itemFailed', {
        itemId: item.id,
        error: error.message,
        attempts: item.attempts
      })
    }
  }
  
  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempts) {
    const { baseDelayMs, exponentialBase } = this.config.retryConfig
    const exponentialDelay = baseDelayMs * Math.pow(exponentialBase, attempts - 1)
    
    // Add jitter to avoid thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay
    
    return Math.floor(exponentialDelay + jitter)
  }
  
  /**
   * Check rate limiting
   */
  checkRateLimit() {
    if (!this.config.rateLimiting.enabled) return true
    
    const now = Date.now()
    const windowDuration = 60000 // 1 minute
    
    // Reset window if expired
    if (now - this.rateLimitingState.windowStart > windowDuration) {
      this.rateLimitingState.windowStart = now
      this.rateLimitingState.requestCount = 0
      this.rateLimitingState.burstCount = 0
    }
    
    // Check burst limit
    if (this.rateLimitingState.burstCount >= this.config.rateLimiting.burstLimit) {
      return false
    }
    
    // Check rate limit
    if (this.rateLimitingState.requestCount >= this.config.rateLimiting.requestsPerMinute) {
      return false
    }
    
    // Allow request
    this.rateLimitingState.requestCount++
    this.rateLimitingState.burstCount++
    
    // Reset burst count after delay
    setTimeout(() => {
      this.rateLimitingState.burstCount = Math.max(0, this.rateLimitingState.burstCount - 1)
    }, 6000) // 6 seconds
    
    return true
  }
  
  /**
   * Insert item by priority
   */
  insertByPriority(item) {
    const priorities = { high: 3, normal: 2, low: 1 }
    const itemPriority = priorities[item.priority] || 2
    
    // Find insertion point
    let insertIndex = this.pendingQueue.length
    
    for (let i = 0; i < this.pendingQueue.length; i++) {
      const queuePriority = priorities[this.pendingQueue[i].priority] || 2
      
      if (itemPriority > queuePriority) {
        insertIndex = i
        break
      }
    }
    
    this.pendingQueue.splice(insertIndex, 0, item)
  }
  
  /**
   * Should process item (additional checks)
   */
  shouldProcessItem(item) {
    // Check if item is too old
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    if (Date.now() - item.addedAt > maxAge) {
      console.warn(`Skipping old item ${item.id}`)
      return false
    }
    
    return true
  }
  
  /**
   * Update processing statistics
   */
  updateProcessingStats(processingTime, waitTime, success) {
    this.analytics.processingTimes.push(processingTime)
    this.analytics.waitTimes.push(waitTime)
    
    // Keep only recent measurements (last 100)
    if (this.analytics.processingTimes.length > 100) {
      this.analytics.processingTimes = this.analytics.processingTimes.slice(-100)
    }
    if (this.analytics.waitTimes.length > 100) {
      this.analytics.waitTimes = this.analytics.waitTimes.slice(-100)
    }
    
    // Update averages
    this.statistics.averageProcessingTime = this.calculateAverage(this.analytics.processingTimes)
    this.statistics.averageWaitTime = this.calculateAverage(this.analytics.waitTimes)
    
    // Update throughput (items per minute)
    const totalProcessed = this.statistics.totalProcessed + this.statistics.totalFailed
    if (totalProcessed > 0) {
      const totalTime = this.analytics.processingTimes.reduce((sum, time) => sum + time, 0) + 
                       this.analytics.waitTimes.reduce((sum, time) => sum + time, 0)
      this.statistics.throughput = (totalProcessed / (totalTime / 60000)) || 0
    }
    
    // Update error rate
    if (this.statistics.totalEnqueued > 0) {
      this.statistics.errorRate = this.statistics.totalFailed / this.statistics.totalEnqueued
    }
  }
  
  /**
   * Update peak queue size
   */
  updatePeakQueueSize() {
    const currentSize = this.pendingQueue.length + this.processingItems.size
    
    if (currentSize > this.analytics.peakQueueSize) {
      this.analytics.peakQueueSize = currentSize
      this.analytics.peakQueueTime = new Date().toISOString()
    }
  }
  
  /**
   * Calculate average
   */
  calculateAverage(values) {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }
  
  /**
   * Get processing result
   */
  async getProcessingResult(itemId) {
    const completed = this.completedItems.find(item => item.id === itemId)
    if (completed) return completed
    
    const failed = this.deadLetterItems.find(item => item.id === itemId)
    if (failed) return { ...failed, success: false }
    
    const processing = this.processingItems.get(itemId)
    if (processing) return { ...processing, status: 'processing' }
    
    const pending = this.pendingQueue.find(item => item.id === itemId)
    if (pending) return { ...pending, status: 'pending' }
    
    return null
  }
  
  /**
   * Get dead letter queue
   */
  async getDeadLetterQueue() {
    return [...this.deadLetterItems]
  }
  
  /**
   * Get completion estimates
   */
  async getCompletionEstimates() {
    const totalItems = this.pendingQueue.length + this.processingItems.size
    const avgProcessingTime = this.statistics.averageProcessingTime || 5000 // 5s default
    
    const estimatedCompletionTime = Date.now() + (totalItems * avgProcessingTime / this.config.maxConcurrentJobs)
    
    return {
      totalItems,
      estimatedCompletionTime,
      averageProcessingTime: avgProcessingTime
    }
  }
  
  /**
   * Get statistics
   */
  async getStatistics() {
    return { ...this.statistics }
  }
  
  /**
   * Get analytics
   */
  async getAnalytics() {
    return {
      ...this.statistics,
      ...this.analytics
    }
  }
  
  /**
   * Save queue state to storage
   */
  async saveQueueState() {
    try {
      const state = {
        pending: this.pendingQueue,
        processing: Array.from(this.processingItems.values()),
        completed: this.completedItems.slice(-100), // Keep last 100
        deadLetter: this.deadLetterItems,
        statistics: this.statistics,
        analytics: this.analytics
      }
      
      await this.storageService.set('aiProcessingQueue', state)
    } catch (error) {
      console.error('Failed to save queue state:', error)
    }
  }
  
  /**
   * Emit queue update event
   */
  emitQueueUpdate() {
    this.emit('queueUpdate', {
      pending: this.pendingQueue.length,
      processing: this.processingItems.size,
      completed: this.completedItems.length,
      failed: this.deadLetterItems.length
    })
  }
  
  /**
   * Emit custom event
   */
  emit(eventType, data) {
    const event = new CustomEvent(eventType, { detail: data })
    this.dispatchEvent(event)
  }
  
  /**
   * Generate unique item ID
   */
  generateItemId() {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export for both CommonJS and ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIProcessingQueue
}

// For browser/service worker environments
if (typeof self !== 'undefined') {
  self.AIProcessingQueue = AIProcessingQueue
}
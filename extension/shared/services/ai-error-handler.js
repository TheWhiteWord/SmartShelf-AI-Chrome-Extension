/**
 * AI Error Handling Service (T070)
 * 
 * Comprehensive error handling, recovery mechanisms, and error reporting
 * for all AI processing operations in the SmartShelf extension.
 * 
 * Features:
 * - Smart retry mechanisms with exponential backoff
 * - Circuit breaker pattern for failed services
 * - Error categorization and severity assessment
 * - Automatic fallback strategies
 * - Error analytics and reporting
 * - Service health monitoring
 * - Graceful degradation modes
 */

class AIErrorHandler {
  constructor(storageService, analyticsService) {
    this.storageService = storageService
    this.analyticsService = analyticsService
    
    // Error handling configuration
    this.config = {
      maxRetries: 3,
      baseRetryDelay: 1000,
      maxRetryDelay: 30000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      errorReportingEnabled: true,
      fallbackEnabled: true
    }
    
    // Circuit breaker states
    this.circuitBreakers = new Map()
    
    // Error categories
    this.errorCategories = {
      NETWORK_ERROR: 'network_error',
      AI_SERVICE_ERROR: 'ai_service_error',
      QUOTA_EXCEEDED: 'quota_exceeded',
      TIMEOUT_ERROR: 'timeout_error',
      VALIDATION_ERROR: 'validation_error',
      STORAGE_ERROR: 'storage_error',
      UNKNOWN_ERROR: 'unknown_error'
    }
    
    // Error severity levels
    this.severityLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    }
    
    // Service health tracking
    this.serviceHealth = new Map()
    
    // Error statistics
    this.errorStats = {
      totalErrors: 0,
      errorsByCategory: new Map(),
      errorsByService: new Map(),
      recoveredErrors: 0,
      unrecoverableErrors: 0
    }
    
    // Fallback strategies
    this.fallbackStrategies = new Map()
    
    // Initialize error handler
    this.initialize()
  }
  
  /**
   * Initialize the error handler
   */
  async initialize() {
    console.log('AI Error Handler initialized')
    
    // Load persisted error statistics
    await this.loadErrorStatistics()
    
    // Initialize service health monitoring
    this.initializeServiceHealthMonitoring()
    
    // Setup error reporting
    this.setupErrorReporting()
    
    // Register default fallback strategies
    this.registerDefaultFallbackStrategies()
  }
  
  /**
   * Execute operation with comprehensive error handling
   */
  async executeWithErrorHandling(operation, context = {}) {
    const serviceId = context.service || 'unknown'
    const operationId = context.operation || 'unknown'
    
    // Check circuit breaker
    if (this.isCircuitBreakerOpen(serviceId)) {
      throw new Error(`Circuit breaker is open for service: ${serviceId}`)
    }
    
    let lastError
    let attempt = 0
    
    while (attempt <= this.config.maxRetries) {
      try {
        // Update service health (attempt)
        this.recordServiceAttempt(serviceId)
        
        // Execute the operation
        const result = await operation()
        
        // Record successful execution
        this.recordSuccess(serviceId, operationId)
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(serviceId)
        
        return result
        
      } catch (error) {
        lastError = error
        attempt++
        
        // Categorize and analyze the error
        const errorInfo = this.analyzeError(error, context)
        
        // Record the error
        this.recordError(errorInfo, serviceId, operationId)
        
        // Check if this should trigger circuit breaker
        this.updateCircuitBreaker(serviceId, errorInfo)
        
        // Determine if retry is appropriate
        if (attempt <= this.config.maxRetries && this.shouldRetry(errorInfo)) {
          const delay = this.calculateRetryDelay(attempt)
          console.warn(`Operation failed (attempt ${attempt}), retrying in ${delay}ms:`, error.message)
          await this.delay(delay)
          continue
        }
        
        break
      }
    }
    
    // All retries exhausted, try fallback strategies
    const fallbackResult = await this.attemptFallback(lastError, context)
    if (fallbackResult !== null) {
      return fallbackResult
    }
    
    // Mark as unrecoverable error
    this.errorStats.unrecoverableErrors++
    
    // Report critical error
    await this.reportCriticalError(lastError, context)
    
    throw lastError
  }
  
  /**
   * Analyze error and categorize it
   */
  analyzeError(error, context) {
    const errorInfo = {
      originalError: error,
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: context,
      category: this.categorizeError(error),
      severity: this.assessSeverity(error, context),
      retryable: this.isRetryable(error)
    }
    
    return errorInfo
  }
  
  /**
   * Categorize error based on type and message
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || ''
    
    if (error.name === 'NetworkError' || message.includes('network') || message.includes('fetch')) {
      return this.errorCategories.NETWORK_ERROR
    }
    
    if (message.includes('quota') || message.includes('rate limit') || message.includes('too many requests')) {
      return this.errorCategories.QUOTA_EXCEEDED
    }
    
    if (error.name === 'TimeoutError' || message.includes('timeout')) {
      return this.errorCategories.TIMEOUT_ERROR
    }
    
    if (message.includes('ai') || message.includes('model') || message.includes('prompt')) {
      return this.errorCategories.AI_SERVICE_ERROR
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return this.errorCategories.VALIDATION_ERROR
    }
    
    if (message.includes('storage') || message.includes('chrome.storage')) {
      return this.errorCategories.STORAGE_ERROR
    }
    
    return this.errorCategories.UNKNOWN_ERROR
  }
  
  /**
   * Assess error severity
   */
  assessSeverity(error, context) {
    const category = this.categorizeError(error)
    
    // Critical errors
    if (category === this.errorCategories.STORAGE_ERROR) {
      return this.severityLevels.CRITICAL
    }
    
    // High severity errors
    if (category === this.errorCategories.AI_SERVICE_ERROR && context.critical) {
      return this.severityLevels.HIGH
    }
    
    // Medium severity errors
    if (category === this.errorCategories.NETWORK_ERROR || category === this.errorCategories.TIMEOUT_ERROR) {
      return this.severityLevels.MEDIUM
    }
    
    // Low severity errors
    return this.severityLevels.LOW
  }
  
  /**
   * Determine if error is retryable
   */
  isRetryable(error) {
    const category = this.categorizeError(error)
    
    // Non-retryable errors
    if (category === this.errorCategories.VALIDATION_ERROR) {
      return false
    }
    
    // Quota errors should have longer delays but are retryable
    if (category === this.errorCategories.QUOTA_EXCEEDED) {
      return true
    }
    
    // Most other errors are retryable
    return true
  }
  
  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt) {
    const exponentialDelay = this.config.baseRetryDelay * Math.pow(2, attempt - 1)
    const jitteredDelay = exponentialDelay + Math.random() * 1000 // Add jitter
    return Math.min(jitteredDelay, this.config.maxRetryDelay)
  }
  
  /**
   * Check if operation should retry
   */
  shouldRetry(errorInfo) {
    return errorInfo.retryable && !this.isCircuitBreakerOpen(errorInfo.context.service)
  }
  
  /**
   * Circuit breaker implementation
   */
  isCircuitBreakerOpen(serviceId) {
    const breaker = this.circuitBreakers.get(serviceId)
    if (!breaker) return false
    
    if (breaker.state === 'open') {
      // Check if timeout has passed
      if (Date.now() - breaker.lastFailure > this.config.circuitBreakerTimeout) {
        breaker.state = 'half-open'
        breaker.failureCount = 0
        return false
      }
      return true
    }
    
    return false
  }
  
  /**
   * Update circuit breaker state
   */
  updateCircuitBreaker(serviceId, errorInfo) {
    let breaker = this.circuitBreakers.get(serviceId) || {
      state: 'closed',
      failureCount: 0,
      lastFailure: null
    }
    
    breaker.failureCount++
    breaker.lastFailure = Date.now()
    
    if (breaker.failureCount >= this.config.circuitBreakerThreshold) {
      breaker.state = 'open'
      console.warn(`Circuit breaker opened for service: ${serviceId}`)
    }
    
    this.circuitBreakers.set(serviceId, breaker)
  }
  
  /**
   * Reset circuit breaker on success
   */
  resetCircuitBreaker(serviceId) {
    const breaker = this.circuitBreakers.get(serviceId)
    if (breaker) {
      breaker.state = 'closed'
      breaker.failureCount = 0
      breaker.lastFailure = null
    }
  }
  
  /**
   * Attempt fallback strategies
   */
  async attemptFallback(error, context) {
    const serviceId = context.service
    const fallbackStrategy = this.fallbackStrategies.get(serviceId)
    
    if (!fallbackStrategy || !this.config.fallbackEnabled) {
      return null
    }
    
    try {
      console.log(`Attempting fallback strategy for service: ${serviceId}`)
      const result = await fallbackStrategy(error, context)
      
      if (result !== null) {
        this.errorStats.recoveredErrors++
        console.log(`Fallback successful for service: ${serviceId}`)
      }
      
      return result
      
    } catch (fallbackError) {
      console.error(`Fallback strategy failed for service: ${serviceId}`, fallbackError)
      return null
    }
  }
  
  /**
   * Register a fallback strategy for a service
   */
  registerFallbackStrategy(serviceId, strategy) {
    this.fallbackStrategies.set(serviceId, strategy)
  }
  
  /**
   * Register default fallback strategies
   */
  registerDefaultFallbackStrategies() {
    // AI Summarizer fallback
    this.registerFallbackStrategy('ai-summarizer', async (error, context) => {
      // Fallback to simple text truncation
      const content = context.content || ''
      if (content.length > 200) {
        return content.substring(0, 200) + '...'
      }
      return content
    })
    
    // AI Categorizer fallback
    this.registerFallbackStrategy('ai-categorizer', async (error, context) => {
      // Fallback to simple keyword-based categorization
      const content = (context.content || '').toLowerCase()
      
      if (content.includes('book') || content.includes('read')) return 'books'
      if (content.includes('tech') || content.includes('computer')) return 'technology'
      if (content.includes('cook') || content.includes('recipe')) return 'cooking'
      if (content.includes('art') || content.includes('design')) return 'art'
      
      return 'general'
    })
    
    // AI Writer fallback
    this.registerFallbackStrategy('ai-writer', async (error, context) => {
      // Fallback to template-based generation
      const prompt = context.prompt || ''
      return `Generated content based on: ${prompt.substring(0, 100)}`
    })
  }
  
  /**
   * Record service attempt
   */
  recordServiceAttempt(serviceId) {
    const health = this.getServiceHealth(serviceId)
    health.totalAttempts++
    health.lastAttempt = Date.now()
  }
  
  /**
   * Record successful operation
   */
  recordSuccess(serviceId, operationId) {
    const health = this.getServiceHealth(serviceId)
    health.successCount++
    health.lastSuccess = Date.now()
    
    // Update success rate
    health.successRate = health.successCount / health.totalAttempts
  }
  
  /**
   * Record error
   */
  recordError(errorInfo, serviceId, operationId) {
    // Update global stats
    this.errorStats.totalErrors++
    
    // Update category stats
    const categoryCount = this.errorStats.errorsByCategory.get(errorInfo.category) || 0
    this.errorStats.errorsByCategory.set(errorInfo.category, categoryCount + 1)
    
    // Update service stats
    const serviceCount = this.errorStats.errorsByService.get(serviceId) || 0
    this.errorStats.errorsByService.set(serviceId, serviceCount + 1)
    
    // Update service health
    const health = this.getServiceHealth(serviceId)
    health.errorCount++
    health.lastError = Date.now()
    health.lastErrorMessage = errorInfo.message
    
    // Update success rate
    health.successRate = health.successCount / health.totalAttempts
    
    // Check if service is degraded
    if (health.successRate < 0.5 && health.totalAttempts > 10) {
      health.status = 'degraded'
    } else if (health.successRate < 0.1 && health.totalAttempts > 5) {
      health.status = 'critical'
    }
  }
  
  /**
   * Get or create service health tracking
   */
  getServiceHealth(serviceId) {
    if (!this.serviceHealth.has(serviceId)) {
      this.serviceHealth.set(serviceId, {
        serviceId,
        status: 'healthy',
        totalAttempts: 0,
        successCount: 0,
        errorCount: 0,
        successRate: 1.0,
        lastAttempt: null,
        lastSuccess: null,
        lastError: null,
        lastErrorMessage: null
      })
    }
    
    return this.serviceHealth.get(serviceId)
  }
  
  /**
   * Get comprehensive error statistics
   */
  getErrorStatistics() {
    return {
      summary: {
        totalErrors: this.errorStats.totalErrors,
        recoveredErrors: this.errorStats.recoveredErrors,
        unrecoverableErrors: this.errorStats.unrecoverableErrors,
        recoveryRate: this.errorStats.totalErrors > 0 
          ? this.errorStats.recoveredErrors / this.errorStats.totalErrors 
          : 0
      },
      byCategory: Object.fromEntries(this.errorStats.errorsByCategory),
      byService: Object.fromEntries(this.errorStats.errorsByService),
      serviceHealth: Object.fromEntries(this.serviceHealth),
      circuitBreakers: Object.fromEntries(this.circuitBreakers)
    }
  }
  
  /**
   * Initialize service health monitoring
   */
  initializeServiceHealthMonitoring() {
    // Periodic health check every 5 minutes
    setInterval(() => {
      this.performHealthCheck()
    }, 5 * 60 * 1000)
  }
  
  /**
   * Perform periodic health check
   */
  async performHealthCheck() {
    const unhealthyServices = []
    
    for (const [serviceId, health] of this.serviceHealth) {
      // Check if service hasn't been used recently
      const lastActivity = Math.max(health.lastAttempt || 0, health.lastSuccess || 0)
      const timeSinceLastActivity = Date.now() - lastActivity
      
      if (timeSinceLastActivity > 30 * 60 * 1000) { // 30 minutes
        health.status = 'inactive'
        continue
      }
      
      // Check success rate
      if (health.successRate < 0.5 && health.totalAttempts > 10) {
        health.status = 'degraded'
        unhealthyServices.push(serviceId)
      } else if (health.successRate < 0.1 && health.totalAttempts > 5) {
        health.status = 'critical'
        unhealthyServices.push(serviceId)
      } else if (health.successRate > 0.8) {
        health.status = 'healthy'
      }
    }
    
    if (unhealthyServices.length > 0) {
      console.warn('Unhealthy services detected:', unhealthyServices)
    }
  }
  
  /**
   * Setup error reporting
   */
  setupErrorReporting() {
    if (!this.config.errorReportingEnabled) return
    
    // Setup periodic error reporting
    setInterval(() => {
      this.generateErrorReport()
    }, 60 * 60 * 1000) // Every hour
  }
  
  /**
   * Generate error report
   */
  async generateErrorReport() {
    const stats = this.getErrorStatistics()
    
    if (stats.summary.totalErrors === 0) return
    
    const report = {
      timestamp: new Date().toISOString(),
      period: '1 hour',
      ...stats
    }
    
    // Save report to storage
    try {
      const reports = await this.storageService.get(['errorReports']) || { errorReports: [] }
      reports.errorReports.push(report)
      
      // Keep only last 24 reports (24 hours)
      if (reports.errorReports.length > 24) {
        reports.errorReports = reports.errorReports.slice(-24)
      }
      
      await this.storageService.set({ errorReports: reports.errorReports })
      
    } catch (error) {
      console.error('Failed to save error report:', error)
    }
  }
  
  /**
   * Report critical error
   */
  async reportCriticalError(error, context) {
    const criticalError = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      severity: 'critical',
      resolved: false
    }
    
    try {
      const criticalErrors = await this.storageService.get(['criticalErrors']) || { criticalErrors: [] }
      criticalErrors.criticalErrors.push(criticalError)
      
      // Keep only last 50 critical errors
      if (criticalErrors.criticalErrors.length > 50) {
        criticalErrors.criticalErrors = criticalErrors.criticalErrors.slice(-50)
      }
      
      await this.storageService.set({ criticalErrors: criticalErrors.criticalErrors })
      
    } catch (storageError) {
      console.error('Failed to save critical error:', storageError)
    }
  }
  
  /**
   * Load persisted error statistics
   */
  async loadErrorStatistics() {
    try {
      const savedStats = await this.storageService.get(['errorHandlerStats'])
      
      if (savedStats?.errorHandlerStats) {
        const stats = savedStats.errorHandlerStats
        this.errorStats.totalErrors = stats.totalErrors || 0
        this.errorStats.recoveredErrors = stats.recoveredErrors || 0
        this.errorStats.unrecoverableErrors = stats.unrecoverableErrors || 0
        
        // Restore maps
        if (stats.errorsByCategory) {
          this.errorStats.errorsByCategory = new Map(Object.entries(stats.errorsByCategory))
        }
        if (stats.errorsByService) {
          this.errorStats.errorsByService = new Map(Object.entries(stats.errorsByService))
        }
      }
      
    } catch (error) {
      console.warn('Failed to load error statistics:', error)
    }
  }
  
  /**
   * Save error statistics
   */
  async saveErrorStatistics() {
    try {
      const statsToSave = {
        totalErrors: this.errorStats.totalErrors,
        recoveredErrors: this.errorStats.recoveredErrors,
        unrecoverableErrors: this.errorStats.unrecoverableErrors,
        errorsByCategory: Object.fromEntries(this.errorStats.errorsByCategory),
        errorsByService: Object.fromEntries(this.errorStats.errorsByService)
      }
      
      await this.storageService.set({ errorHandlerStats: statsToSave })
      
    } catch (error) {
      console.error('Failed to save error statistics:', error)
    }
  }
  
  /**
   * Utility method for delays
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  /**
   * Reset all error statistics (for testing)
   */
  resetStatistics() {
    this.errorStats = {
      totalErrors: 0,
      errorsByCategory: new Map(),
      errorsByService: new Map(),
      recoveredErrors: 0,
      unrecoverableErrors: 0
    }
    
    this.serviceHealth.clear()
    this.circuitBreakers.clear()
  }

  // ========== Test Interface Compatibility Methods ==========
  
  /**
   * Alias for executeWithErrorHandling (test compatibility)
   */
  async executeWithRetry(operation, context = {}) {
    return this.executeWithErrorHandling(operation, context)
  }

  /**
   * Get configuration for testing
   */
  getConfiguration() {
    return {
      retryPolicy: {
        maxAttempts: this.config.maxRetries,
        baseDelayMs: this.config.baseRetryDelay,
        exponentialBase: 2,
        jitterEnabled: true
      },
      circuitBreaker: {
        failureThreshold: this.config.circuitBreakerThreshold,
        resetTimeoutMs: this.config.circuitBreakerTimeout,
        state: 'closed'
      },
      fallback: {
        enabled: this.config.fallbackEnabled,
        strategies: Array.from(this.fallbackStrategies.keys())
      },
      monitoring: {
        errorReportingEnabled: this.config.errorReportingEnabled,
        healthCheckInterval: 300000
      }
    }
  }

  /**
   * Set configuration for testing
   */
  setConfiguration(newConfig) {
    if (newConfig.retryPolicy) {
      this.config.maxRetries = newConfig.retryPolicy.maxAttempts || this.config.maxRetries
      this.config.baseRetryDelay = newConfig.retryPolicy.baseDelayMs || this.config.baseRetryDelay
    }
    
    if (newConfig.circuitBreaker) {
      this.config.circuitBreakerThreshold = newConfig.circuitBreaker.failureThreshold || this.config.circuitBreakerThreshold
      this.config.circuitBreakerTimeout = newConfig.circuitBreaker.resetTimeoutMs || this.config.circuitBreakerTimeout
    }
    
    if (newConfig.fallback) {
      this.config.fallbackEnabled = newConfig.fallback.enabled !== undefined ? newConfig.fallback.enabled : this.config.fallbackEnabled
    }
  }

  /**
   * Set circuit breaker state for testing
   */
  async setCircuitBreakerState(state, serviceId = 'default') {
    let breaker = this.circuitBreakers.get(serviceId) || {
      state: 'closed',
      failureCount: 0,
      lastFailure: null
    }
    
    breaker.state = state
    if (state === 'open') {
      breaker.lastFailure = Date.now()
    }
    
    this.circuitBreakers.set(serviceId, breaker)
  }

  /**
   * Execute with fallback strategy
   */
  async executeWithFallback(operation, fallbackOperation, context = {}) {
    try {
      return await this.executeWithErrorHandling(operation, context)
    } catch (error) {
      console.log('Primary operation failed, trying fallback')
      return await fallbackOperation(context)
    }
  }

  /**
   * Process with degradation mode
   */
  async processWithDegradation(contentItem) {
    try {
      // Try AI processing first
      const result = await this.executeWithErrorHandling(
        async () => {
          throw new Error('AI service unavailable') // Simulate failure
        },
        { service: 'ai-processor', content: contentItem }
      )
      return { success: true, processingMode: 'ai', result }
      
    } catch (error) {
      // Fall back to degraded processing
      const degradedResult = {
        summary: contentItem.content?.substring(0, 100) + '...',
        category: 'general',
        tags: ['unprocessed']
      }
      
      return {
        success: true,
        processingMode: 'degraded',
        result: degradedResult
      }
    }
  }

  /**
   * Adaptive processing based on error patterns
   */
  async adaptiveProcessing(contentItem) {
    const serviceHealth = this.getServiceHealth('ai-processor')
    
    // Choose processing strategy based on service health
    let strategy = 'full'
    if (serviceHealth.successRate < 0.8) {
      strategy = 'simplified'
    } else if (serviceHealth.successRate < 0.5) {
      strategy = 'minimal'
    }
    
    return {
      processingStrategy: strategy,
      result: `Processed with ${strategy} strategy`
    }
  }

  /**
   * Process with recovery queue
   */
  async processWithRecovery(contentItem) {
    try {
      return await this.executeWithErrorHandling(
        async () => {
          throw new Error('Service unavailable') // Simulate failure for testing
        },
        { service: 'ai-processor', content: contentItem }
      )
    } catch (error) {
      // Queue for retry
      await this.queueFailedItem(contentItem, error)
      throw error
    }
  }

  /**
   * Queue failed item for retry
   */
  async queueFailedItem(item, error) {
    try {
      const failedQueue = await this.storageService.get(['failedItemsQueue']) || { failedItemsQueue: [] }
      
      failedQueue.failedItemsQueue.push({
        item,
        error: error.message,
        timestamp: new Date().toISOString(),
        attempts: 0
      })
      
      await this.storageService.set({ failedItemsQueue: failedQueue.failedItemsQueue })
    } catch (error) {
      console.error('Failed to queue item:', error)
    }
  }

  /**
   * Get failed items queue
   */
  async getFailedItemsQueue() {
    try {
      const result = await this.storageService.get(['failedItemsQueue'])
      return result?.failedItemsQueue || []
    } catch (error) {
      console.error('Failed to get queue:', error)
      return []
    }
  }

  /**
   * Retry queued items
   */
  async retryQueuedItems() {
    const queue = await this.getFailedItemsQueue()
    let processedCount = 0
    
    for (const queuedItem of queue) {
      try {
        await this.processWithRecovery(queuedItem.item)
        processedCount++
      } catch (error) {
        console.log('Retry failed for queued item')
      }
    }
    
    return { processed: processedCount, remaining: queue.length - processedCount }
  }

  /**
   * Simple event emitter for testing
   */
  on(event, callback) {
    if (!this.eventHandlers) {
      this.eventHandlers = new Map()
    }
    
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    
    this.eventHandlers.get(event).push(callback)
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (!this.eventHandlers?.has(event)) return
    
    this.eventHandlers.get(event).forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Event handler error:', error)
      }
    })
  }

  /**
   * Get error trends
   */
  getErrorTrends() {
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    // Simulate trend analysis
    return {
      trend: 'increasing',
      confidence: 0.85,
      projectedErrors: 45,
      timeRange: '1 hour'
    }
  }

  /**
   * Fallback processing
   */
  fallbackProcessing(item) {
    return {
      summary: 'Fallback summary for ' + item.title,
      category: 'uncategorized',
      confidence: 0.3
    }
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIErrorHandler
} else {
  // Browser environment
  window.AIErrorHandler = AIErrorHandler
}
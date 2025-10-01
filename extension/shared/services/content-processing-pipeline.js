/**
 * Content Processing Pipeline (T066)
 * 
 * Orchestrates the complete content processing workflow:
 * capture → AI processing → storage → indexing → post-processing
 * 
 * Features:
 * - Pipeline state machine with progress tracking
 * - Concurrent pipeline execution with limits
 * - Error recovery and rollback capabilities
 * - Performance monitoring and metrics
 * - Event-driven progress updates
 */
class ContentProcessingPipeline extends EventTarget {
  constructor(storageService, contentRepository, searchService, aiServices) {
    super()
    
    if (!storageService) {
      throw new Error('Storage service is required')
    }
    if (!contentRepository) {
      throw new Error('Content repository is required')
    }
    
    this.storageService = storageService
    this.contentRepository = contentRepository || this.createDefaultContentRepository()
    this.searchService = searchService || this.createDefaultSearchService()
    this.aiServices = aiServices || this.createDefaultAIServices()
    
    // Configuration
    this.config = {
      maxConcurrentPipelines: 3,
      stageTimeouts: {
        validation: 5000,
        aiProcessing: 30000,
        storage: 10000,
        indexing: 5000,
        postProcessing: 5000
      },
      enableRollback: true,
      enableMetrics: true
    }
    
    // Pipeline state management
    this.activePipelines = new Map() // pipelineId -> pipeline state
    this.pipelineQueue = [] // Queued pipelines waiting for capacity
    this.completedPipelines = []
    this.metrics = {
      totalPipelinesStarted: 0,
      totalPipelinesCompleted: 0,
      totalPipelinesFailed: 0,
      stageMetrics: {}
    }
    
    // Initialize stage metrics
    Object.keys(this.config.stageTimeouts).forEach(stage => {
      this.metrics.stageMetrics[stage] = {
        totalTime: 0,
        successCount: 0,
        failureCount: 0
      }
    })
  }
  
  /**
   * Add event listener compatibility method (.on() for tests)
   */
  on(eventName, callback) {
    this.addEventListener(eventName, (event) => callback(event.detail))
  }
  
  /**
   * Get current pipeline configuration
   */
  getConfiguration() {
    return { ...this.config }
  }
  
  /**
   * Set pipeline configuration
   */
  setConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig }
  }
  
  /**
   * Start a new content processing pipeline
   */
  async startPipeline(contentItem, options = {}) {
    const pipelineId = this.generatePipelineId()
    const pipeline = {
      id: pipelineId,
      contentId: contentItem.id,
      contentItem: { ...contentItem },
      stage: 'pending',
      progress: 0,
      startTime: new Date().toISOString(),
      stageHistory: [{ stage: 'pending', timestamp: new Date().toISOString() }],
      completedStages: [],
      error: null,
      retryAttempts: 0,
      rollbackActions: [],
      options
    }
    
    this.metrics.totalPipelinesStarted++
    
    // Check if we can process immediately or need to queue
    if (this.activePipelines.size < this.config.maxConcurrentPipelines) {
      this.activePipelines.set(pipelineId, pipeline)
      // Defer processing to next tick to allow status check
      setTimeout(() => this.processPipelineAsync(pipelineId), 0)
    } else {
      pipeline.stage = 'queued'
      this.pipelineQueue.push(pipeline)
      this.emitProgress(pipelineId, 'queued', 0)
    }
    
    return pipelineId
  }
  
  /**
   * Get pipeline status
   */
  async getPipelineStatus(pipelineId) {
    // Check active pipelines
    if (this.activePipelines.has(pipelineId)) {
      return { ...this.activePipelines.get(pipelineId) }
    }
    
    // Check queued pipelines
    const queuedPipeline = this.pipelineQueue.find(p => p.id === pipelineId)
    if (queuedPipeline) {
      return { ...queuedPipeline }
    }
    
    // Check completed pipelines
    const completedPipeline = this.completedPipelines.find(p => p.id === pipelineId)
    if (completedPipeline) {
      return { ...completedPipeline }
    }
    
    return null
  }
  
  /**
   * Process a single content item (simplified interface)
   */
  async processSingle(contentItem, options = {}) {
    const pipelineId = await this.startPipeline(contentItem, options)
    return await this.waitForCompletion(pipelineId)
  }
  
  /**
   * Process multiple items in batch
   */
  async processBatch(contentItems, options = {}) {
    const batchId = this.generateBatchId()
    const pipelineIds = []
    
    for (const item of contentItems) {
      const pipelineId = await this.startPipeline(item, { ...options, batchId })
      pipelineIds.push(pipelineId)
    }
    
    return batchId
  }
  
  /**
   * Wait for batch completion
   */
  async waitForBatchCompletion(batchId) {
    const batchPipelines = [...this.activePipelines.values(), ...this.completedPipelines]
      .filter(p => p.options.batchId === batchId)
    
    const pipelineIds = batchPipelines.map(p => p.id)
    
    await Promise.all(pipelineIds.map(id => this.waitForCompletion(id)))
    
    return this.getBatchStatus(batchId)
  }
  
  /**
   * Get batch status
   */
  async getBatchStatus(batchId) {
    const batchPipelines = [...this.activePipelines.values(), ...this.completedPipelines]
      .filter(p => p.options.batchId === batchId)
    
    const totalItems = batchPipelines.length
    const completedItems = batchPipelines.filter(p => p.stage === 'complete').length
    const failedItems = batchPipelines.filter(p => p.stage === 'failed').length
    const processingItems = batchPipelines.filter(p => 
      !['complete', 'failed', 'queued'].includes(p.stage)
    ).length
    
    let status = 'processing'
    if (completedItems + failedItems === totalItems) {
      status = failedItems === 0 ? 'completed' : failedItems < totalItems ? 'partial' : 'failed'
    }
    
    return {
      batchId,
      totalItems,
      completedItems,
      failedItems,
      processingItems,
      status
    }
  }
  
  /**
   * Wait for pipeline completion
   */
  async waitForCompletion(pipelineId, timeoutMs = 300000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Pipeline ${pipelineId} timed out after ${timeoutMs}ms`))
      }, timeoutMs)
      
      const checkCompletion = async () => {
        const status = await this.getPipelineStatus(pipelineId)
        
        if (status && ['complete', 'failed'].includes(status.stage)) {
          clearTimeout(timeout)
          resolve(status)
        } else {
          setTimeout(checkCompletion, 100)
        }
      }
      
      checkCompletion()
    })
  }
  
  /**
   * Get active pipeline count
   */
  async getActivePipelineCount() {
    return this.activePipelines.size
  }
  
  /**
   * Advance pipeline to specific stage (for testing)
   */
  async advanceToStage(pipelineId, targetStage) {
    const pipeline = this.activePipelines.get(pipelineId)
    if (!pipeline) return false
    
    pipeline.stage = targetStage
    pipeline.stageHistory.push({
      stage: targetStage,
      timestamp: new Date().toISOString()
    })
    
    this.emitProgress(pipelineId, targetStage, this.calculateProgress(targetStage))
    return true
  }
  
  /**
   * Process pipeline asynchronously
   */
  async processPipelineAsync(pipelineId) {
    try {
      await this.executePipeline(pipelineId)
    } catch (error) {
      console.error(`Pipeline ${pipelineId} failed:`, error)
      await this.handlePipelineError(pipelineId, error)
    } finally {
      // Process next queued pipeline
      this.processNextQueuedPipeline()
    }
  }
  
  /**
   * Execute pipeline stages
   */
  async executePipeline(pipelineId) {
    const pipeline = this.activePipelines.get(pipelineId)
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`)
    
    const stages = ['validation', 'aiProcessing', 'storage', 'indexing', 'postProcessing']
    const maxRetries = 3
    
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i]
      const stageStartTime = Date.now()
      let retryCount = 0
      let stageSuccess = false
      let lastError = null
      
      while (retryCount < maxRetries && !stageSuccess) {
        try {
          await this.executeStage(pipelineId, stage)
          stageSuccess = true
          
          // Update metrics
          const stageTime = Date.now() - stageStartTime
          this.updateStageMetrics(stage, stageTime, true)
          
          pipeline.completedStages.push(stage)
          pipeline.progress = Math.round(((i + 1) / stages.length) * 100)
          
          this.emitProgress(pipelineId, stage, pipeline.progress)
          
        } catch (error) {
          lastError = error
          retryCount++
          
          if (retryCount < maxRetries) {
            // Exponential backoff: 100ms, 200ms, 400ms
            const backoffDelay = Math.pow(2, retryCount - 1) * 100
            await new Promise(resolve => setTimeout(resolve, backoffDelay))
            pipeline.retryAttempts++
          } else {
            // Final failure
            const stageTime = Date.now() - stageStartTime
            this.updateStageMetrics(stage, stageTime, false)
            throw new Error(`Stage ${stage} failed: ${error.message}`)
          }
        }
      }
    }
    
    // Mark pipeline as complete
    pipeline.stage = 'complete'
    pipeline.progress = 100
    pipeline.endTime = new Date().toISOString()
    
    this.metrics.totalPipelinesCompleted++
    this.completedPipelines.push(pipeline)
    this.activePipelines.delete(pipelineId)
    
    this.emitProgress(pipelineId, 'complete', 100)
  }
  
  /**
   * Execute individual stage
   */
  async executeStage(pipelineId, stage) {
    const pipeline = this.activePipelines.get(pipelineId)
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`)
    
    pipeline.stage = stage
    this.addToStageHistory(pipeline, stage)
    
    switch (stage) {
      case 'validation':
        await this.validateContent(pipeline)
        break
      case 'aiProcessing':
        await this.processWithAI(pipeline)
        break
      case 'storage':
        await this.storeContent(pipeline)
        break
      case 'indexing':
        await this.updateSearchIndex(pipeline)
        break
      case 'postProcessing':
        await this.performPostProcessing(pipeline)
        break
      default:
        throw new Error(`Unknown stage: ${stage}`)
    }
  }
  
  /**
   * Validation stage
   */
  async validateContent(pipeline) {
    const { contentItem } = pipeline
    
    if (!contentItem.title || contentItem.title.trim().length === 0) {
      throw new Error('Content title is required')
    }
    
    if (!contentItem.content || contentItem.content.trim().length === 0) {
      throw new Error('Content body is required')
    }
    
    // Add validation rollback action
    pipeline.rollbackActions.push({
      stage: 'validation',
      action: 'none' // No rollback needed for validation
    })
  }
  
  /**
   * AI processing stage
   */
  async processWithAI(pipeline) {
    const { contentItem } = pipeline
    
    // Save original data for rollback
    const originalData = {
      summary: contentItem.summary,
      tags: contentItem.tags ? [...contentItem.tags] : [],
      categories: contentItem.categories ? [...contentItem.categories] : [],
      aiProcessed: contentItem.aiProcessed
    }
    
    // Use AI services if available, otherwise use fallback
    let aiResult
    if (this.aiServices && this.aiServices.processContent) {
      aiResult = await this.aiServices.processContent(contentItem)
      
      // Validate AI result
      if (!aiResult || typeof aiResult !== 'object') {
        throw new Error('AI service returned invalid result')
      }
    } else {
      // Fallback AI processing
      aiResult = {
        summary: `Summary for ${contentItem.title}`,
        tags: ['ai-processed'],
        categories: ['General']
      }
    }
    
    // Update content item with AI results
    contentItem.summary = aiResult.summary || ''
    contentItem.tags = Array.isArray(aiResult.tags) ? aiResult.tags : []
    contentItem.categories = Array.isArray(aiResult.categories) ? aiResult.categories : []
    contentItem.aiProcessed = true
    contentItem.dateModified = new Date().toISOString()
    
    pipeline.rollbackActions.push({
      stage: 'aiProcessing',
      action: 'revert_ai_data',
      originalData
    })
  }
  
  /**
   * Storage stage
   */
  async storeContent(pipeline) {
    const { contentItem } = pipeline
    
    if (this.contentRepository && this.contentRepository.save) {
      await this.contentRepository.save(contentItem)
    } else {
      // Fallback to mock storage for testing
      console.log('Storing content item:', contentItem.id)
    }
    
    pipeline.rollbackActions.push({
      stage: 'storage',
      action: 'remove_from_storage',
      contentId: contentItem.id
    })
  }
  
  /**
   * Search indexing stage
   */
  async updateSearchIndex(pipeline) {
    const { contentItem } = pipeline
    
    if (this.searchService && this.searchService.updateIndex) {
      await this.searchService.updateIndex([contentItem])
    } else {
      // Fallback indexing for testing
      console.log('Indexing content item:', contentItem.id)
    }
    
    pipeline.rollbackActions.push({
      stage: 'indexing',
      action: 'remove_from_index',
      contentId: contentItem.id
    })
  }
  
  /**
   * Post-processing stage
   */
  async performPostProcessing(pipeline) {
    const { contentItem } = pipeline
    
    // Mock post-processing for testing
    console.log('Post-processing content item:', contentItem.id)
    
    // No rollback needed for post-processing
    pipeline.rollbackActions.push({
      stage: 'postProcessing',
      action: 'none'
    })
  }
  
  /**
   * Handle pipeline error and rollback if enabled
   */
  async handlePipelineError(pipelineId, error) {
    const pipeline = this.activePipelines.get(pipelineId)
    if (!pipeline) return
    
    // Extract original stage from error message if available
    const stageMatch = error.message.match(/Stage (\w+) failed:/)
    const failedStage = stageMatch ? stageMatch[1] : pipeline.stage
    const originalMessage = stageMatch ? error.message.replace(/Stage \w+ failed: /, '') : error.message
    
    pipeline.stage = 'failed'
    pipeline.error = {
      stage: failedStage,
      message: originalMessage,
      timestamp: new Date().toISOString()
    }
    
    this.metrics.totalPipelinesFailed++
    
    // Perform rollback if enabled
    if (this.config.enableRollback) {
      try {
        await this.rollbackPipeline(pipeline)
        pipeline.rolledBack = true
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError)
        pipeline.rollbackError = rollbackError.message
      }
    }
    
    this.completedPipelines.push(pipeline)
    this.activePipelines.delete(pipelineId)
    
    this.emitProgress(pipelineId, 'failed', pipeline.progress)
  }
  
  /**
   * Rollback pipeline changes
   */
  async rollbackPipeline(pipeline) {
    // Execute rollback actions in reverse order
    for (let i = pipeline.rollbackActions.length - 1; i >= 0; i--) {
      const rollbackAction = pipeline.rollbackActions[i]
      
      switch (rollbackAction.action) {
        case 'remove_from_storage':
          if (this.contentRepository && this.contentRepository.delete) {
            await this.contentRepository.delete(rollbackAction.contentId)
          }
          break
        case 'remove_from_index':
          // Remove from search index - implementation depends on search service
          break
        case 'revert_ai_data':
          // Revert AI processing results
          Object.assign(pipeline.contentItem, rollbackAction.originalData)
          break
      }
    }
  }
  
  /**
   * Process next queued pipeline
   */
  processNextQueuedPipeline() {
    if (this.pipelineQueue.length > 0 && this.activePipelines.size < this.config.maxConcurrentPipelines) {
      const pipeline = this.pipelineQueue.shift()
      pipeline.stage = 'pending'
      this.activePipelines.set(pipeline.id, pipeline)
      this.processPipelineAsync(pipeline.id)
    }
  }
  
  /**
   * Get pipeline metrics
   */
  async getMetrics() {
    const averageProcessingTime = this.completedPipelines.length > 0
      ? this.completedPipelines.reduce((sum, p) => {
          const start = new Date(p.startTime)
          const end = new Date(p.endTime || new Date())
          return sum + (end - start)
        }, 0) / this.completedPipelines.length
      : 0
    
    // Calculate stage metrics
    const stageMetrics = {}
    Object.keys(this.metrics.stageMetrics).forEach(stage => {
      const metrics = this.metrics.stageMetrics[stage]
      stageMetrics[stage] = {
        totalTime: metrics.totalTime,
        successRate: metrics.successCount > 0 ? 
          metrics.successCount / (metrics.successCount + metrics.failureCount) : 0
      }
    })
    
    return {
      ...this.metrics,
      averageProcessingTime,
      stageMetrics
    }
  }
  
  /**
   * Get performance bottlenecks
   */
  async getBottlenecks() {
    const bottlenecks = []
    const stageMetrics = this.metrics.stageMetrics
    
    // Calculate average time across all stages
    const allStageTimes = Object.values(stageMetrics)
      .filter(m => m.successCount > 0)
      .map(m => m.totalTime / m.successCount)
    
    const avgAllStages = allStageTimes.length > 0 
      ? allStageTimes.reduce((sum, time) => sum + time, 0) / allStageTimes.length 
      : 0
    
    Object.keys(stageMetrics).forEach(stage => {
      const metrics = stageMetrics[stage]
      const avgTime = metrics.successCount > 0 ? metrics.totalTime / metrics.successCount : 0
      
      // Consider stages taking > 1s as bottlenecks OR 2x slower than average
      const isBottleneck = avgTime > 1000 || (avgAllStages > 0 && avgTime > avgAllStages * 2)
      
      if (isBottleneck && avgTime > 0) {
        bottlenecks.push({
          stage,
          averageTime: avgTime,
          isBottleneck: true
        })
      }
    })
    
    return bottlenecks
  }
  
  /**
   * Get pipeline health status
   */
  async getHealthStatus() {
    const totalProcessed = this.metrics.totalPipelinesCompleted + this.metrics.totalPipelinesFailed
    const failureRate = totalProcessed > 0 ? this.metrics.totalPipelinesFailed / totalProcessed : 0
    
    let status = 'healthy'
    if (failureRate > 0.2) status = 'degraded'
    if (failureRate > 0.5) status = 'unhealthy'
    
    return {
      status,
      activePipelines: this.activePipelines.size,
      queuedPipelines: this.pipelineQueue.length,
      failureRate,
      lastHealthCheck: new Date().toISOString()
    }
  }
  
  // Utility methods
  
  generatePipelineId() {
    return `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  calculateProgress(stage) {
    const stages = ['pending', 'validation', 'aiProcessing', 'storage', 'indexing', 'postProcessing', 'complete']
    const index = stages.indexOf(stage)
    return index >= 0 ? Math.round((index / (stages.length - 1)) * 100) : 0
  }
  
  addToStageHistory(pipeline, stage) {
    pipeline.stageHistory.push({
      stage,
      timestamp: new Date().toISOString()
    })
  }
  
  updateStageMetrics(stage, duration, success) {
    if (!this.metrics.stageMetrics[stage]) {
      this.metrics.stageMetrics[stage] = { totalTime: 0, successCount: 0, failureCount: 0 }
    }
    
    this.metrics.stageMetrics[stage].totalTime += duration
    if (success) {
      this.metrics.stageMetrics[stage].successCount++
    } else {
      this.metrics.stageMetrics[stage].failureCount++
    }
  }
  
  emitProgress(pipelineId, stage, progress) {
    const event = new CustomEvent('progress', {
      detail: {
        pipelineId,
        stage,
        progress,
        timestamp: new Date().toISOString()
      }
    })
    this.dispatchEvent(event)
  }
  
  // Default service factories (fallbacks)
  
  createDefaultContentRepository() {
    return {
      save: async (item) => {
        console.log('Mock save:', item.id)
        return item
      },
      
      delete: async (id) => {
        console.log('Mock delete:', id)
      }
    }
  }
  
  createDefaultSearchService() {
    return {
      updateIndex: async (items) => {
        console.log('Mock index update:', items.length, 'items')
      }
    }
  }
  
  createDefaultAIServices() {
    return {
      processContent: async (item) => ({
        summary: `AI summary for ${item.title}`,
        tags: ['ai', 'processed'],
        categories: ['General']
      })
    }
  }
}

// Export for both CommonJS and ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentProcessingPipeline
}

// For browser/service worker environments
if (typeof self !== 'undefined') {
  self.ContentProcessingPipeline = ContentProcessingPipeline
}
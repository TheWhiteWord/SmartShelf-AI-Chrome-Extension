/**
 * Content Processing Pipeline Tests (T066)
 * 
 * Tests for the complete content capture → AI processing → storage → indexing pipeline
 * with proper workflow orchestration, state management, and monitoring.
 * 
 * Expected Features:
 * - Pipeline state machine (pending → processing → processed → indexed → complete)
 * - Workflow orchestration between stages
 * - Progress tracking and status updates
 * - Pipeline monitoring and metrics
 * - Error recovery and rollback capabilities
 * - Concurrent pipeline execution with limits
 * 
 * Architecture:
 * - ContentProcessingPipeline class in service-worker.js
 * - Integration with existing AI services and storage
 * - Event-driven progress updates for UI
 */

const ContentProcessingPipeline = require('../../../extension/shared/services/content-processing-pipeline.js')

describe('Content Processing Pipeline (T066)', () => {
  let mockStorageService
  let mockContentRepository
  let mockSearchService
  let mockAIServices
  let pipeline

  beforeEach(() => {
    // Mock dependencies
    mockStorageService = {
      get: jest.fn(),
      set: jest.fn(),
      addEventListener: jest.fn()
    }

    mockContentRepository = {
      save: jest.fn(),
      update: jest.fn(),
      getById: jest.fn()
    }

    mockSearchService = {
      updateIndex: jest.fn(),
      batchUpdateIndex: jest.fn()
    }

    mockAIServices = {
      processContent: jest.fn(),
      generateSummary: jest.fn(),
      categorizeContent: jest.fn(),
      extractTags: jest.fn()
    }

    // Mock Chrome APIs
    global.chrome = {
      runtime: {
        sendMessage: jest.fn()
      },
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    }

    // Initialize pipeline (this should fail until implemented)
    try {
      pipeline = new ContentProcessingPipeline(mockStorageService, mockContentRepository, mockSearchService, mockAIServices)
    } catch (error) {
      // Expected to fail initially
    }
  })

  describe('Pipeline Initialization', () => {
    test('should initialize with required dependencies', () => {
      expect(() => {
        new ContentProcessingPipeline(mockStorageService, mockContentRepository, mockSearchService, mockAIServices)
      }).not.toThrow()
    })

    test('should throw error when missing required dependencies', () => {
      expect(() => {
        new ContentProcessingPipeline()
      }).toThrow('Storage service is required')

      expect(() => {
        new ContentProcessingPipeline(mockStorageService)
      }).toThrow('Content repository is required')
    })

    test('should initialize with default configuration', () => {
      const pipeline = new ContentProcessingPipeline(mockStorageService, mockContentRepository, mockSearchService, mockAIServices)
      
      const config = pipeline.getConfiguration()
      expect(config.maxConcurrentPipelines).toBe(3)
      expect(config.stageTimeouts.aiProcessing).toBe(30000)
      expect(config.stageTimeouts.storage).toBe(10000)
      expect(config.stageTimeouts.indexing).toBe(5000)
    })
  })

  describe('Pipeline State Management', () => {
    beforeEach(() => {
      pipeline = new ContentProcessingPipeline(mockStorageService, mockContentRepository, mockSearchService, mockAIServices)
    })

    test('should start pipeline with pending state', async () => {
      const contentItem = {
        id: 'test-item-1',
        title: 'Test Content',
        content: 'Test content for pipeline processing',
        url: 'https://example.com/test'
      }

      const pipelineId = await pipeline.startPipeline(contentItem)
      const status = await pipeline.getPipelineStatus(pipelineId)

      expect(status.stage).toBe('pending')
      expect(status.progress).toBe(0)
      expect(status.startTime).toBeDefined()
      expect(status.contentId).toBe(contentItem.id)
    })

    test('should progress through all pipeline stages', async () => {
      const contentItem = { id: 'test-item-1', title: 'Test', content: 'Content' }
      
      mockAIServices.processContent.mockResolvedValue({
        summary: 'AI summary',
        categories: ['Technology'],
        tags: ['ai', 'test']
      })
      mockContentRepository.save.mockResolvedValue(contentItem)
      mockSearchService.updateIndex.mockResolvedValue(true)

      const pipelineId = await pipeline.startPipeline(contentItem)
      await pipeline.waitForCompletion(pipelineId)

      const finalStatus = await pipeline.getPipelineStatus(pipelineId)
      
      expect(finalStatus.stage).toBe('complete')
      expect(finalStatus.progress).toBe(100)
      expect(finalStatus.completedStages).toEqual([
        'validation',
        'aiProcessing', 
        'storage',
        'indexing',
        'postProcessing'
      ])
    })

    test('should track stage transitions with timestamps', async () => {
      const contentItem = { id: 'test-item-1', title: 'Test', content: 'Content' }
      const pipelineId = await pipeline.startPipeline(contentItem)

      // Simulate stage progression
      await pipeline.advanceToStage(pipelineId, 'aiProcessing')
      await pipeline.advanceToStage(pipelineId, 'storage')
      
      const status = await pipeline.getPipelineStatus(pipelineId)
      
      expect(status.stageHistory).toEqual([
        { stage: 'pending', timestamp: expect.any(String) },
        { stage: 'aiProcessing', timestamp: expect.any(String) },
        { stage: 'storage', timestamp: expect.any(String) }
      ])
    })
  })

  describe('Pipeline Orchestration', () => {
    beforeEach(() => {
      pipeline = new ContentProcessingPipeline(mockStorageService, mockContentRepository, mockSearchService, mockAIServices)
    })

    test('should execute pipeline stages in correct order', async () => {
      const contentItem = { id: 'test-item-1', title: 'Test', content: 'Content' }
      const executionOrder = []

      // Track execution order
      mockAIServices.processContent.mockImplementation(async () => {
        executionOrder.push('aiProcessing')
        return { summary: 'Test', categories: [], tags: [] }
      })

      mockContentRepository.save.mockImplementation(async (item) => {
        executionOrder.push('storage')
        return item
      })

      mockSearchService.updateIndex.mockImplementation(async () => {
        executionOrder.push('indexing')
        return true
      })

      await pipeline.processSingle(contentItem)

      expect(executionOrder).toEqual(['aiProcessing', 'storage', 'indexing'])
    })

    test('should handle concurrent pipeline execution with limits', async () => {
      const contentItems = [
        { id: 'item-1', title: 'Test 1', content: 'Content 1' },
        { id: 'item-2', title: 'Test 2', content: 'Content 2' },
        { id: 'item-3', title: 'Test 3', content: 'Content 3' },
        { id: 'item-4', title: 'Test 4', content: 'Content 4' }
      ]

      const processingPromises = contentItems.map(item => pipeline.startPipeline(item))
      const pipelineIds = await Promise.all(processingPromises)

      const activeCount = await pipeline.getActivePipelineCount()
      expect(activeCount).toBeLessThanOrEqual(3) // maxConcurrentPipelines = 3

      // Some pipelines should be queued
      const queuedPipelines = pipelineIds.filter(async id => {
        const status = await pipeline.getPipelineStatus(id)
        return status.stage === 'queued'
      })

      expect(queuedPipelines.length).toBeGreaterThan(0)
    })

    test('should provide progress updates during processing', async () => {
      const contentItem = { id: 'test-item-1', title: 'Test', content: 'Content' }
      const progressUpdates = []

      // Listen for progress events
      pipeline.on('progress', (update) => {
        progressUpdates.push(update)
      })

      mockAIServices.processContent.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return { summary: 'Test', categories: [], tags: [] }
      })

      await pipeline.processSingle(contentItem)

      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[0]).toMatchObject({
        pipelineId: expect.any(String),
        stage: expect.any(String),
        progress: expect.any(Number),
        timestamp: expect.any(String)
      })
    })
  })

  describe('Pipeline Monitoring', () => {
    beforeEach(() => {
      pipeline = new ContentProcessingPipeline(mockStorageService, mockContentRepository, mockSearchService, mockAIServices)
    })

    test('should track pipeline metrics', async () => {
      const contentItem = { id: 'test-item-1', title: 'Test', content: 'Content' }
      
      await pipeline.processSingle(contentItem)
      
      const metrics = await pipeline.getMetrics()
      
      expect(metrics).toMatchObject({
        totalPipelinesStarted: 1,
        totalPipelinesCompleted: 1,
        totalPipelinesFailed: 0,
        averageProcessingTime: expect.any(Number),
        stageMetrics: {
          aiProcessing: { totalTime: expect.any(Number), successRate: 1 },
          storage: { totalTime: expect.any(Number), successRate: 1 },
          indexing: { totalTime: expect.any(Number), successRate: 1 }
        }
      })
    })

    test('should identify performance bottlenecks', async () => {
      // Simulate slow AI processing
      mockAIServices.processContent.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        return { summary: 'Test', categories: [], tags: [] }
      })

      const contentItem = { id: 'test-item-1', title: 'Test', content: 'Content' }
      await pipeline.processSingle(contentItem)

      const bottlenecks = await pipeline.getBottlenecks()
      
      expect(bottlenecks).toContainEqual({
        stage: 'aiProcessing',
        averageTime: expect.any(Number),
        isBottleneck: true
      })
    })

    test('should provide pipeline health status', async () => {
      const health = await pipeline.getHealthStatus()
      
      expect(health).toMatchObject({
        status: 'healthy',
        activePipelines: expect.any(Number),
        queuedPipelines: expect.any(Number),
        failureRate: expect.any(Number),
        lastHealthCheck: expect.any(String)
      })
    })
  })

  describe('Error Recovery', () => {
    beforeEach(() => {
      pipeline = new ContentProcessingPipeline(mockStorageService, mockContentRepository, mockSearchService, mockAIServices)
    })

    test('should handle AI processing failures gracefully', async () => {
      const contentItem = { id: 'test-item-1', title: 'Test', content: 'Content' }
      
      mockAIServices.processContent.mockRejectedValue(new Error('AI processing failed'))
      
      const pipelineId = await pipeline.startPipeline(contentItem)
      await pipeline.waitForCompletion(pipelineId)
      
      const status = await pipeline.getPipelineStatus(pipelineId)
      
      expect(status.stage).toBe('failed')
      expect(status.error).toMatchObject({
        stage: 'aiProcessing',
        message: 'AI processing failed',
        timestamp: expect.any(String)
      })
    })

    test('should support pipeline rollback on failure', async () => {
      const contentItem = { id: 'test-item-1', title: 'Test', content: 'Content' }
      
      mockAIServices.processContent.mockResolvedValue({ summary: 'Test', categories: [], tags: [] })
      mockContentRepository.save.mockResolvedValue(contentItem)
      mockSearchService.updateIndex.mockRejectedValue(new Error('Index update failed'))
      
      const pipelineId = await pipeline.startPipeline(contentItem)
      await pipeline.waitForCompletion(pipelineId)
      
      // Should rollback storage changes
      expect(mockContentRepository.delete).toHaveBeenCalledWith(contentItem.id)
      
      const status = await pipeline.getPipelineStatus(pipelineId)
      expect(status.rolledBack).toBe(true)
    })

    test('should retry failed stages with exponential backoff', async () => {
      const contentItem = { id: 'test-item-1', title: 'Test', content: 'Content' }
      let attemptCount = 0
      
      mockAIServices.processContent.mockImplementation(async () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Temporary failure')
        }
        return { summary: 'Test', categories: [], tags: [] }
      })
      
      const pipelineId = await pipeline.startPipeline(contentItem)
      await pipeline.waitForCompletion(pipelineId)
      
      const status = await pipeline.getPipelineStatus(pipelineId)
      expect(status.stage).toBe('complete')
      expect(status.retryAttempts).toBe(2)
      expect(attemptCount).toBe(3)
    })
  })

  describe('Batch Processing', () => {
    beforeEach(() => {
      pipeline = new ContentProcessingPipeline(mockStorageService, mockContentRepository, mockSearchService, mockAIServices)
    })

    test('should process multiple items in batch', async () => {
      const contentItems = [
        { id: 'item-1', title: 'Test 1', content: 'Content 1' },
        { id: 'item-2', title: 'Test 2', content: 'Content 2' },
        { id: 'item-3', title: 'Test 3', content: 'Content 3' }
      ]

      const batchId = await pipeline.processBatch(contentItems)
      await pipeline.waitForBatchCompletion(batchId)
      
      const batchStatus = await pipeline.getBatchStatus(batchId)
      
      expect(batchStatus.totalItems).toBe(3)
      expect(batchStatus.completedItems).toBe(3)
      expect(batchStatus.failedItems).toBe(0)
      expect(batchStatus.status).toBe('completed')
    })

    test('should handle partial batch failures', async () => {
      const contentItems = [
        { id: 'item-1', title: 'Test 1', content: 'Content 1' },
        { id: 'item-2', title: 'Test 2', content: 'Content 2' }
      ]

      mockAIServices.processContent.mockImplementation(async (item) => {
        if (item.id === 'item-2') {
          throw new Error('Processing failed for item-2')
        }
        return { summary: 'Test', categories: [], tags: [] }
      })

      const batchId = await pipeline.processBatch(contentItems)
      await pipeline.waitForBatchCompletion(batchId)
      
      const batchStatus = await pipeline.getBatchStatus(batchId)
      
      expect(batchStatus.completedItems).toBe(1)
      expect(batchStatus.failedItems).toBe(1)
      expect(batchStatus.status).toBe('partial')
    })
  })
})
/**
 * Background AI Processing Queue Tests (T067)
 * 
 * Tests for robust AI processing queue with progress tracking, error handling,
 * priority management, and concurrent processing limits.
 * 
 * Expected Features:
 * - Priority-based queue management (high, normal, low)
 * - Concurrent processing with configurable limits
 * - Progress tracking with queue position updates
 * - Queue persistence across service worker restarts
 * - Rate limiting and throttling
 * - Dead letter queue for failed items
 * - Queue analytics and monitoring
 * 
 * Architecture:
 * - AIProcessingQueue class in service-worker.js
 * - Integration with existing AI services and Chrome Storage
 * - Event-driven queue status updates
 */

const AIProcessingQueue = require('../../../extension/shared/services/ai-processing-queue.js')

describe('Background AI Processing Queue (T067)', () => {
  let queue
  let mockStorageService
  let mockAIServices
  let mockChrome

  beforeEach(() => {
    // Mock dependencies
    mockStorageService = {
      get: jest.fn(),
      set: jest.fn(),
      addEventListener: jest.fn()
    }

    mockAIServices = {
      processContent: jest.fn(),
      generateSummary: jest.fn(),
      categorizeContent: jest.fn()
    }

    mockChrome = {
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue()
        }
      },
      runtime: {
        sendMessage: jest.fn()
      }
    }

    global.chrome = mockChrome

    // Initialize queue (this should fail until implemented)
    try {
      queue = new AIProcessingQueue(mockStorageService, mockAIServices)
    } catch (error) {
      // Expected to fail initially
    }
  })

  describe('Queue Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(() => {
        new AIProcessingQueue(mockStorageService, mockAIServices)
      }).not.toThrow()

      const queue = new AIProcessingQueue(mockStorageService, mockAIServices)
      const config = queue.getConfiguration()

      expect(config.maxConcurrentJobs).toBe(3)
      expect(config.maxQueueSize).toBe(1000)
      expect(config.processingTimeout).toBe(300000) // 5 minutes
      expect(config.retryConfig.maxAttempts).toBe(3)
      expect(config.retryConfig.baseDelayMs).toBe(1000)
    })

    test('should restore queue state from storage on initialization', async () => {
      const storedQueue = {
        pending: [
          { id: 'item-1', priority: 'high', addedAt: Date.now() },
          { id: 'item-2', priority: 'normal', addedAt: Date.now() }
        ],
        processing: [
          { id: 'item-3', startedAt: Date.now() }
        ]
      }

      mockStorageService.get.mockResolvedValue({ aiProcessingQueue: storedQueue })

      const queue = new AIProcessingQueue(mockStorageService, mockAIServices)
      await queue.initialize()

      const status = await queue.getQueueStatus()
      expect(status.pending).toBe(2)
      expect(status.processing).toBe(1)
    })

    test('should handle storage initialization errors gracefully', async () => {
      mockStorageService.get.mockRejectedValue(new Error('Storage unavailable'))

      const queue = new AIProcessingQueue(mockStorageService, mockAIServices)
      
      await expect(queue.initialize()).resolves.not.toThrow()
      
      const status = await queue.getQueueStatus()
      expect(status.pending).toBe(0)
      expect(status.processing).toBe(0)
    })
  })

  describe('Queue Management', () => {
    beforeEach(async () => {
      queue = new AIProcessingQueue(mockStorageService, mockAIServices)
      await queue.initialize()
    })

    test('should enqueue items with different priorities', async () => {
      const items = [
        { id: 'low-item', priority: 'low', content: { title: 'Low Priority' } },
        { id: 'high-item', priority: 'high', content: { title: 'High Priority' } },
        { id: 'normal-item', priority: 'normal', content: { title: 'Normal Priority' } }
      ]

      for (const item of items) {
        await queue.enqueue(item.content, item.priority)
      }

      const queuedItems = await queue.getPendingItems()
      
      // Should be ordered by priority: high -> normal -> low
      expect(queuedItems[0].priority).toBe('high')
      expect(queuedItems[1].priority).toBe('normal')
      expect(queuedItems[2].priority).toBe('low')
    })

    test('should respect maximum queue size', async () => {
      queue.setConfiguration({ maxQueueSize: 2 })

      await queue.enqueue({ title: 'Item 1' })
      await queue.enqueue({ title: 'Item 2' })
      
      await expect(queue.enqueue({ title: 'Item 3' }))
        .rejects.toThrow('Queue size limit exceeded')

      const status = await queue.getQueueStatus()
      expect(status.pending).toBe(2)
    })

    test('should provide accurate queue position for items', async () => {
      await queue.enqueue({ id: 'item-1', title: 'First' }, 'normal')
      await queue.enqueue({ id: 'item-2', title: 'Second' }, 'normal')
      const itemId = await queue.enqueue({ id: 'item-3', title: 'Third' }, 'normal')

      const position = await queue.getQueuePosition(itemId)
      expect(position).toBe(3)

      // High priority item should jump to front
      await queue.enqueue({ id: 'item-4', title: 'High Priority' }, 'high')
      const highPriorityPosition = await queue.getQueuePosition('item-4')
      expect(highPriorityPosition).toBe(1)
    })

    test('should remove items from queue', async () => {
      const itemId = await queue.enqueue({ title: 'Test Item' })
      
      let status = await queue.getQueueStatus()
      expect(status.pending).toBe(1)

      await queue.removeFromQueue(itemId)
      
      status = await queue.getQueueStatus()
      expect(status.pending).toBe(0)
    })
  })

  describe('Queue Processing', () => {
    beforeEach(async () => {
      queue = new AIProcessingQueue(mockStorageService, mockAIServices)
      await queue.initialize()
    })

    test('should process items respecting concurrency limits', async () => {
      queue.setConfiguration({ maxConcurrentJobs: 2 })

      const items = [
        { title: 'Item 1' },
        { title: 'Item 2' },
        { title: 'Item 3' },
        { title: 'Item 4' }
      ]

      // Mock AI processing to take some time
      mockAIServices.processContent.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ summary: 'Test' }), 100))
      )

      const promises = items.map(item => queue.enqueue(item))
      await Promise.all(promises)

      await queue.startProcessing()
      
      // Wait a bit for processing to start
      await new Promise(resolve => setTimeout(resolve, 50))

      const status = await queue.getQueueStatus()
      expect(status.processing).toBeLessThanOrEqual(2)
      expect(status.pending + status.processing).toBe(4)
    })

    test('should handle successful item processing', async () => {
      const processedResults = []
      
      mockAIServices.processContent.mockImplementation(async (item) => {
        processedResults.push(item)
        return {
          summary: `Summary for ${item.title}`,
          categories: ['Test'],
          tags: ['processed']
        }
      })

      queue.on('itemProcessed', (result) => {
        expect(result.success).toBe(true)
        expect(result.aiResult).toMatchObject({
          summary: expect.any(String),
          categories: expect.any(Array),
          tags: expect.any(Array)
        })
      })

      const itemId = await queue.enqueue({ title: 'Test Item' })
      await queue.startProcessing()
      await queue.waitForCompletion()

      expect(processedResults).toHaveLength(1)
      expect(processedResults[0].title).toBe('Test Item')
    })

    test('should handle processing failures with retry logic', async () => {
      let attemptCount = 0
      
      mockAIServices.processContent.mockImplementation(async () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Temporary failure')
        }
        return { summary: 'Success after retries' }
      })

      const itemId = await queue.enqueue({ title: 'Failing Item' })
      await queue.startProcessing()
      await queue.waitForCompletion()

      const completedItem = await queue.getProcessingResult(itemId)
      expect(completedItem.success).toBe(true)
      expect(completedItem.retryAttempts).toBe(2)
      expect(attemptCount).toBe(3)
    })

    test('should move permanently failed items to dead letter queue', async () => {
      mockAIServices.processContent.mockRejectedValue(new Error('Permanent failure'))

      const itemId = await queue.enqueue({ title: 'Always Failing Item' })
      await queue.startProcessing()
      await queue.waitForCompletion()

      const deadLetterItems = await queue.getDeadLetterQueue()
      expect(deadLetterItems).toHaveLength(1)
      expect(deadLetterItems[0].id).toBe(itemId)
      expect(deadLetterItems[0].failureReason).toBe('Permanent failure')
    })
  })

  describe('Progress Tracking', () => {
    beforeEach(async () => {
      queue = new AIProcessingQueue(mockStorageService, mockAIServices)
      await queue.initialize()
    })

    test('should emit progress events during processing', async () => {
      const progressEvents = []
      
      queue.on('progress', (event) => {
        progressEvents.push(event)
      })

      mockAIServices.processContent.mockImplementation(async (item) => {
        // Simulate progress updates
        queue.emit('progress', { itemId: item.id, stage: 'analyzing', progress: 50 })
        await new Promise(resolve => setTimeout(resolve, 50))
        queue.emit('progress', { itemId: item.id, stage: 'complete', progress: 100 })
        return { summary: 'Test' }
      })

      await queue.enqueue({ id: 'test-item', title: 'Test' })
      await queue.startProcessing()
      await queue.waitForCompletion()

      expect(progressEvents).toContainEqual({
        itemId: 'test-item',
        stage: 'analyzing',
        progress: 50
      })
    })

    test('should provide estimated completion times', async () => {
      // Add multiple items
      await queue.enqueue({ title: 'Item 1' })
      await queue.enqueue({ title: 'Item 2' })
      await queue.enqueue({ title: 'Item 3' })

      const estimates = await queue.getCompletionEstimates()
      
      expect(estimates.totalItems).toBe(3)
      expect(estimates.estimatedCompletionTime).toBeGreaterThan(Date.now())
      expect(estimates.averageProcessingTime).toBeDefined()
    })

    test('should track processing statistics', async () => {
      mockAIServices.processContent.mockResolvedValue({ summary: 'Test' })

      await queue.enqueue({ title: 'Item 1' })
      await queue.enqueue({ title: 'Item 2' })
      await queue.startProcessing()
      await queue.waitForCompletion()

      const stats = await queue.getStatistics()
      
      expect(stats.totalProcessed).toBe(2)
      expect(stats.totalFailed).toBe(0)
      expect(stats.averageProcessingTime).toBeGreaterThan(0)
      expect(stats.successRate).toBe(1.0)
    })
  })

  describe('Queue Persistence', () => {
    test('should persist queue state to storage', async () => {
      const queue = new AIProcessingQueue(mockStorageService, mockAIServices)
      await queue.initialize()

      await queue.enqueue({ title: 'Persistent Item' })
      await queue.saveQueueState()

      expect(mockStorageService.set).toHaveBeenCalledWith(
        'aiProcessingQueue',
        expect.objectContaining({
          pending: expect.arrayContaining([
            expect.objectContaining({ content: { title: 'Persistent Item' } })
          ])
        })
      )
    })

    test('should handle service worker restarts gracefully', async () => {
      // First queue instance
      const queue1 = new AIProcessingQueue(mockStorageService, mockAIServices)
      await queue1.initialize()
      const itemId = await queue1.enqueue({ title: 'Restart Test' })
      await queue1.saveQueueState()

      // Simulate service worker restart with new queue instance
      const queue2 = new AIProcessingQueue(mockStorageService, mockAIServices)
      
      // Mock restored state
      mockStorageService.get.mockResolvedValue({
        aiProcessingQueue: {
          pending: [{ id: itemId, content: { title: 'Restart Test' }, addedAt: Date.now() }],
          processing: []
        }
      })

      await queue2.initialize()
      const status = await queue2.getQueueStatus()
      
      expect(status.pending).toBe(1)
    })
  })

  describe('Rate Limiting and Throttling', () => {
    beforeEach(async () => {
      queue = new AIProcessingQueue(mockStorageService, mockAIServices)
      await queue.initialize()
    })

    test('should respect rate limiting configuration', async () => {
      queue.setConfiguration({
        rateLimiting: {
          enabled: true,
          requestsPerMinute: 60,
          burstLimit: 10
        }
      })

      const startTime = Date.now()
      
      // Enqueue many items quickly
      const items = Array.from({ length: 15 }, (_, i) => ({ title: `Item ${i}` }))
      for (const item of items) {
        await queue.enqueue(item)
      }

      await queue.startProcessing()
      
      // Should process burst items quickly, then throttle
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const status = await queue.getQueueStatus()
      expect(status.processing + status.completed).toBeLessThan(15)
    })

    test('should implement exponential backoff for retries', async () => {
      const retryTimes = []
      
      mockAIServices.processContent.mockImplementation(async () => {
        retryTimes.push(Date.now())
        throw new Error('Always fails')
      })

      queue.setConfiguration({
        retryConfig: {
          maxAttempts: 3,
          baseDelayMs: 100,
          exponentialBase: 2
        }
      })

      await queue.enqueue({ title: 'Retry Test' })
      await queue.startProcessing()
      await queue.waitForCompletion()

      expect(retryTimes).toHaveLength(3)
      
      // Check exponential backoff timing (allowing some tolerance)
      const delay1 = retryTimes[1] - retryTimes[0]
      const delay2 = retryTimes[2] - retryTimes[1]
      
      expect(delay1).toBeGreaterThanOrEqual(90) // ~100ms
      expect(delay2).toBeGreaterThanOrEqual(190) // ~200ms
    })
  })

  describe('Queue Analytics', () => {
    beforeEach(async () => {
      queue = new AIProcessingQueue(mockStorageService, mockAIServices)
      await queue.initialize()
    })

    test('should provide comprehensive queue metrics', async () => {
      // Process some items to generate metrics
      mockAIServices.processContent.mockResolvedValue({ summary: 'Test' })
      
      await queue.enqueue({ title: 'Item 1' })
      await queue.enqueue({ title: 'Item 2' })
      await queue.startProcessing()
      await queue.waitForCompletion()

      const metrics = await queue.getAnalytics()
      
      expect(metrics).toMatchObject({
        totalEnqueued: 2,
        totalProcessed: 2,
        totalFailed: 0,
        averageWaitTime: expect.any(Number),
        averageProcessingTime: expect.any(Number),
        throughput: expect.any(Number),
        errorRate: 0
      })
    })

    test('should track peak queue sizes and timing', async () => {
      // Add items to create queue buildup
      const items = Array.from({ length: 5 }, (_, i) => ({ title: `Item ${i}` }))
      
      for (const item of items) {
        await queue.enqueue(item)
      }

      const analytics = await queue.getAnalytics()
      
      expect(analytics.peakQueueSize).toBe(5)
      expect(analytics.peakQueueTime).toBeDefined()
    })
  })
})
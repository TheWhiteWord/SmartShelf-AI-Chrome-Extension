/**
 * AI Error Handling Tests (T070)
 * 
 * Tests for comprehensive error handling, retry mechanisms, and error recovery
 * for all AI processing operations in the SmartShelf extension.
 * 
 * Expected Features:
 * - Smart retry mechanisms with exponential backoff
 * - Circuit breaker pattern for failed services
 * - Error categorization and severity assessment
 * - Automatic fallback strategies for AI services
 * - Error analytics and reporting
 * - Service health monitoring
 * - Graceful degradation modes
 * 
 * Architecture:
 * - AIErrorHandler class in service-worker.js
 * - Integration with all AI processing services
 * - Persistent error tracking and analytics
 */

const AIErrorHandler = require('../../../extension/shared/services/ai-error-handler.js')

describe('AI Error Handling and Recovery (T070)', () => {
  let errorHandler
  let mockAIServices
  let mockStorageService
  let mockChrome

  beforeEach(() => {
    // Mock dependencies
    mockAIServices = {
      processContent: jest.fn(),
      summarizeContent: jest.fn(),
      categorizeContent: jest.fn(),
      generateTags: jest.fn()
    }

    mockStorageService = {
      get: jest.fn(),
      set: jest.fn(),
      addEventListener: jest.fn()
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

    // Initialize error handler (this should fail until implemented)
    try {
      errorHandler = new AIErrorHandler(mockAIServices, mockStorageService)
    } catch (error) {
      // Expected to fail initially
    }
  })

  describe('Error Handler Initialization', () => {
    test('should initialize with default error handling configuration', () => {
      expect(() => {
        new AIErrorHandler(mockAIServices, mockStorageService)
      }).not.toThrow()

      const handler = new AIErrorHandler(mockAIServices, mockStorageService)
      const config = handler.getConfiguration()

      expect(config.retryPolicy.maxAttempts).toBe(3)
      expect(config.retryPolicy.baseDelayMs).toBe(1000)
      expect(config.retryPolicy.exponentialBase).toBe(2)
      expect(config.circuitBreaker.failureThreshold).toBe(5)
      expect(config.circuitBreaker.resetTimeoutMs).toBe(60000)
      expect(config.fallbackEnabled).toBe(true)
    })

    test('should load persisted error statistics on initialization', async () => {
      const persistedStats = {
        totalErrors: 150,
        errorsByType: {
          'network_error': 50,
          'ai_api_timeout': 75,
          'rate_limit_exceeded': 25
        },
        circuitBreakerState: 'open',
        lastCircuitBreakerTrip: Date.now() - 30000
      }

      mockStorageService.get.mockResolvedValue({ aiErrorStats: persistedStats })

      const handler = new AIErrorHandler(mockAIServices, mockStorageService)
      await handler.initialize()

      const stats = await handler.getErrorStatistics()
      expect(stats.totalErrors).toBe(150)
      expect(stats.circuitBreakerState).toBe('open')
    })
  })

  describe('Retry Mechanisms', () => {
    beforeEach(async () => {
      errorHandler = new AIErrorHandler(mockAIServices, mockStorageService)
      await errorHandler.initialize()
    })

    test('should retry failed operations with exponential backoff', async () => {
      let attemptCount = 0
      const attemptTimes = []

      mockAIServices.processContent.mockImplementation(async () => {
        attemptTimes.push(Date.now())
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Temporary AI service failure')
        }
        return { summary: 'Success after retries', categories: [], tags: [] }
      })

      const contentItem = { id: 'test-item', title: 'Test', content: 'Content' }
      const result = await errorHandler.executeWithRetry(
        () => mockAIServices.processContent(contentItem)
      )

      expect(result.success).toBe(true)
      expect(result.data.summary).toBe('Success after retries')
      expect(result.attempts).toBe(3)

      // Verify exponential backoff timing
      expect(attemptTimes).toHaveLength(3)
      const delay1 = attemptTimes[1] - attemptTimes[0]
      const delay2 = attemptTimes[2] - attemptTimes[1]
      
      expect(delay1).toBeGreaterThanOrEqual(900) // ~1000ms
      expect(delay2).toBeGreaterThanOrEqual(1900) // ~2000ms
    })

    test('should categorize errors and apply appropriate retry strategies', async () => {
      const errorScenarios = [
        { error: new Error('Network timeout'), retryable: true, category: 'network' },
        { error: new Error('Rate limit exceeded'), retryable: true, category: 'rate_limit' },
        { error: new Error('Invalid API key'), retryable: false, category: 'authentication' },
        { error: new Error('Content too large'), retryable: false, category: 'validation' }
      ]

      for (const scenario of errorScenarios) {
        mockAIServices.processContent.mockRejectedValue(scenario.error)

        const result = await errorHandler.executeWithRetry(
          () => mockAIServices.processContent({ content: 'test' })
        )

        if (scenario.retryable) {
          expect(result.attempts).toBeGreaterThan(1)
        } else {
          expect(result.attempts).toBe(1)
          expect(result.success).toBe(false)
          expect(result.errorCategory).toBe(scenario.category)
        }
      }
    })

    test('should implement jittered backoff to avoid thundering herd', async () => {
      const retryTimes = []
      let callCount = 0

      // Simulate multiple concurrent failures
      const promises = Array.from({ length: 5 }, () => {
        mockAIServices.processContent.mockImplementation(async () => {
          retryTimes.push(Date.now())
          if (++callCount < 10) { // Fail first 9 calls
            throw new Error('Temporary failure')
          }
          return { summary: 'Success' }
        })

        return errorHandler.executeWithRetry(
          () => mockAIServices.processContent({ content: 'test' })
        )
      })

      await Promise.all(promises)

      // Verify that retry times are jittered (not all exactly the same)
      const retryDelays = []
      for (let i = 1; i < retryTimes.length; i++) {
        retryDelays.push(retryTimes[i] - retryTimes[i - 1])
      }

      const uniqueDelays = [...new Set(retryDelays)]
      expect(uniqueDelays.length).toBeGreaterThan(1) // Should have some variation
    })

    test('should respect maximum retry attempts configuration', async () => {
      errorHandler.setConfiguration({
        retryPolicy: { maxAttempts: 5, baseDelayMs: 100, exponentialBase: 2 }
      })

      let attemptCount = 0
      mockAIServices.processContent.mockImplementation(async () => {
        attemptCount++
        throw new Error('Always fails')
      })

      const result = await errorHandler.executeWithRetry(
        () => mockAIServices.processContent({ content: 'test' })
      )

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(5)
      expect(attemptCount).toBe(5)
    })
  })

  describe('Circuit Breaker Pattern', () => {
    beforeEach(async () => {
      errorHandler = new AIErrorHandler(mockAIServices, mockStorageService)
      await errorHandler.initialize()
    })

    test('should trip circuit breaker after threshold failures', async () => {
      mockAIServices.processContent.mockRejectedValue(new Error('Service unavailable'))

      // Configure low threshold for testing
      errorHandler.setConfiguration({
        circuitBreaker: { failureThreshold: 3, resetTimeoutMs: 5000 }
      })

      // Make enough failed calls to trip circuit breaker
      for (let i = 0; i < 3; i++) {
        await errorHandler.executeWithRetry(
          () => mockAIServices.processContent({ content: 'test' })
        )
      }

      const circuitState = await errorHandler.getCircuitBreakerState()
      expect(circuitState.state).toBe('open')
      expect(circuitState.failureCount).toBe(3)
    })

    test('should reject calls immediately when circuit breaker is open', async () => {
      // Manually set circuit breaker to open state
      await errorHandler.setCircuitBreakerState('open')

      const startTime = Date.now()
      const result = await errorHandler.executeWithRetry(
        () => mockAIServices.processContent({ content: 'test' })
      )
      const endTime = Date.now()

      expect(result.success).toBe(false)
      expect(result.circuitBreakerOpen).toBe(true)
      expect(endTime - startTime).toBeLessThan(100) // Should fail fast
    })

    test('should transition to half-open state after timeout', async () => {
      // Set circuit breaker to open with short timeout
      errorHandler.setConfiguration({
        circuitBreaker: { failureThreshold: 3, resetTimeoutMs: 100 }
      })

      await errorHandler.setCircuitBreakerState('open')

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150))

      const circuitState = await errorHandler.getCircuitBreakerState()
      expect(circuitState.state).toBe('half-open')
    })

    test('should close circuit breaker on successful half-open call', async () => {
      await errorHandler.setCircuitBreakerState('half-open')

      mockAIServices.processContent.mockResolvedValue({ summary: 'Success' })

      const result = await errorHandler.executeWithRetry(
        () => mockAIServices.processContent({ content: 'test' })
      )

      expect(result.success).toBe(true)

      const circuitState = await errorHandler.getCircuitBreakerState()
      expect(circuitState.state).toBe('closed')
    })
  })

  describe('Graceful Degradation', () => {
    beforeEach(async () => {
      errorHandler = new AIErrorHandler(mockAIServices, mockStorageService)
      await errorHandler.initialize()
    })

    test('should fall back to local processing when AI APIs fail', async () => {
      mockAIServices.processContent.mockRejectedValue(new Error('AI service unavailable'))

      const contentItem = {
        title: 'JavaScript Tutorial',
        content: 'This is a comprehensive guide to JavaScript programming...',
        url: 'https://example.com/js-tutorial'
      }

      const result = await errorHandler.executeWithFallback(
        () => mockAIServices.processContent(contentItem),
        (item) => errorHandler.fallbackProcessing(item)
      )

      expect(result.success).toBe(true)
      expect(result.usedFallback).toBe(true)
      expect(result.data.summary).toBeDefined()
      expect(result.data.categories).toBeDefined()
      expect(result.data.tags).toBeDefined()
    })

    test('should provide degraded but functional results during AI outages', async () => {
      // Simulate AI service completely down
      mockAIServices.processContent.mockRejectedValue(new Error('Service unavailable'))
      mockAIServices.summarizeContent.mockRejectedValue(new Error('Service unavailable'))
      mockAIServices.categorizeContent.mockRejectedValue(new Error('Service unavailable'))

      const contentItem = {
        title: 'Machine Learning Basics',
        content: 'Machine learning is a subset of artificial intelligence...'
      }

      const result = await errorHandler.processWithDegradation(contentItem)

      expect(result.success).toBe(true)
      expect(result.processingMode).toBe('degraded')
      expect(result.data.summary).toContain('Machine learning') // Basic keyword extraction
      expect(result.data.categories).toContain('Technology') // Simple rule-based categorization
    })

    test('should adapt processing based on error patterns', async () => {
      // Simulate pattern of AI timeouts for complex content
      mockAIServices.processContent.mockImplementation(async (item) => {
        if (item.content.length > 1000) {
          throw new Error('Content too complex, processing timeout')
        }
        return { summary: 'AI processed', categories: ['AI'], tags: ['processed'] }
      })

      const complexContent = {
        title: 'Complex Article',
        content: 'A'.repeat(1500) // Long content that triggers timeout
      }

      const simpleContent = {
        title: 'Simple Article', 
        content: 'Short content'
      }

      // Should adapt to use simplified processing for complex content
      const complexResult = await errorHandler.adaptiveProcessing(complexContent)
      expect(complexResult.processingStrategy).toBe('simplified')

      // Should use full AI processing for simple content
      const simpleResult = await errorHandler.adaptiveProcessing(simpleContent)
      expect(simpleResult.processingStrategy).toBe('full_ai')
    })
  })

  describe('Error Recovery Workflows', () => {
    beforeEach(async () => {
      errorHandler = new AIErrorHandler(mockAIServices, mockStorageService)
      await errorHandler.initialize()
    })

    test('should queue failed items for later retry when services recover', async () => {
      mockAIServices.processContent.mockRejectedValue(new Error('Service temporarily unavailable'))

      const contentItems = [
        { id: 'item-1', title: 'Test 1', content: 'Content 1' },
        { id: 'item-2', title: 'Test 2', content: 'Content 2' },
        { id: 'item-3', title: 'Test 3', content: 'Content 3' }
      ]

      // All should fail and be queued for retry
      for (const item of contentItems) {
        await errorHandler.processWithRecovery(item)
      }

      const failedQueue = await errorHandler.getFailedItemsQueue()
      expect(failedQueue).toHaveLength(3)
      expect(failedQueue.every(item => item.retryScheduled)).toBe(true)
    })

    test('should automatically retry queued items when services recover', async () => {
      // Initially fail, then succeed
      let callCount = 0
      mockAIServices.processContent.mockImplementation(async (item) => {
        callCount++
        if (callCount <= 3) {
          throw new Error('Service down')
        }
        return { summary: `Recovered processing for ${item.title}` }
      })

      const contentItems = [
        { id: 'item-1', title: 'Test 1' },
        { id: 'item-2', title: 'Test 2' },
        { id: 'item-3', title: 'Test 3' }
      ]

      // Queue items during outage
      for (const item of contentItems) {
        await errorHandler.processWithRecovery(item)
      }

      // Simulate service recovery
      await errorHandler.triggerRecoveryProcess()

      const recoveredItems = await errorHandler.getRecoveredItems()
      expect(recoveredItems).toHaveLength(3)
      expect(recoveredItems.every(item => item.success)).toBe(true)
    })

    test('should implement dead letter queue for permanently failed items', async () => {
      mockAIServices.processContent.mockRejectedValue(new Error('Malformed content'))

      errorHandler.setConfiguration({
        deadLetterQueue: {
          enabled: true,
          maxRetryAttempts: 5,
          retentionDays: 7
        }
      })

      const problematicItem = {
        id: 'problematic-item',
        title: 'Malformed Content',
        content: null // This should cause permanent failure
      }

      // Try processing multiple times
      for (let i = 0; i < 6; i++) {
        await errorHandler.processWithRecovery(problematicItem)
      }

      const deadLetterItems = await errorHandler.getDeadLetterQueue()
      expect(deadLetterItems).toHaveLength(1)
      expect(deadLetterItems[0].id).toBe('problematic-item')
      expect(deadLetterItems[0].attemptCount).toBe(6)
    })
  })

  describe('Error Monitoring and Alerting', () => {
    beforeEach(async () => {
      errorHandler = new AIErrorHandler(mockAIServices, mockStorageService)
      await errorHandler.initialize()
    })

    test('should track comprehensive error statistics', async () => {
      const errorTypes = [
        'Network timeout',
        'Rate limit exceeded',
        'AI model unavailable',
        'Content too large',
        'Network timeout' // Duplicate to test counting
      ]

      for (const errorType of errorTypes) {
        mockAIServices.processContent.mockRejectedValue(new Error(errorType))
        await errorHandler.executeWithRetry(() => mockAIServices.processContent({}))
      }

      const stats = await errorHandler.getErrorStatistics()
      
      expect(stats.totalErrors).toBe(5)
      expect(stats.errorsByType['network_timeout']).toBe(2)
      expect(stats.errorsByType['rate_limit_exceeded']).toBe(1)
      expect(stats.errorsByType['ai_model_unavailable']).toBe(1)
      expect(stats.errorsByType['content_too_large']).toBe(1)
    })

    test('should detect error rate spikes and trigger alerts', async () => {
      const alerts = []
      
      errorHandler.on('errorRateSpike', (alert) => {
        alerts.push(alert)
      })

      errorHandler.setConfiguration({
        alerting: {
          errorRateThreshold: 0.5, // 50% error rate
          timeWindowMs: 60000
        }
      })

      // Simulate high error rate
      mockAIServices.processContent.mockRejectedValue(new Error('High error rate'))
      
      for (let i = 0; i < 10; i++) {
        await errorHandler.executeWithRetry(() => mockAIServices.processContent({}))
      }

      expect(alerts).toHaveLength(1)
      expect(alerts[0].errorRate).toBeGreaterThan(0.5)
      expect(alerts[0].timeWindow).toBe(60000)
    })

    test('should provide error trends and predictions', async () => {
      // Simulate error pattern over time
      const errorPattern = [2, 3, 5, 8, 13, 21] // Increasing trend
      
      for (let i = 0; i < errorPattern.length; i++) {
        for (let j = 0; j < errorPattern[i]; j++) {
          mockAIServices.processContent.mockRejectedValue(new Error('Trend test'))
          await errorHandler.executeWithRetry(() => mockAIServices.processContent({}))
        }
        
        // Simulate time passing
        await errorHandler.advanceTimeWindow()
      }

      const trends = await errorHandler.getErrorTrends()
      
      expect(trends.trend).toBe('increasing')
      expect(trends.projectedErrorRate).toBeGreaterThan(trends.currentErrorRate)
      expect(trends.recommendation).toContain('investigate')
    })
  })

  describe('Performance Impact Mitigation', () => {
    beforeEach(async () => {
      errorHandler = new AIErrorHandler(mockAIServices, mockStorageService)
      await errorHandler.initialize()
    })

    test('should implement rate limiting during error conditions', async () => {
      mockAIServices.processContent.mockRejectedValue(new Error('Service overloaded'))

      errorHandler.setConfiguration({
        rateLimiting: {
          enableOnErrors: true,
          backoffMultiplier: 2,
          maxBackoffMs: 30000
        }
      })

      const processingTimes = []
      
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now()
        await errorHandler.executeWithRetry(() => mockAIServices.processContent({}))
        processingTimes.push(Date.now() - startTime)
      }

      // Each subsequent call should take longer due to rate limiting
      expect(processingTimes[1]).toBeGreaterThan(processingTimes[0])
      expect(processingTimes[2]).toBeGreaterThan(processingTimes[1])
    })

    test('should prevent resource exhaustion during error storms', async () => {
      mockAIServices.processContent.mockRejectedValue(new Error('Error storm'))

      errorHandler.setConfiguration({
        resourceProtection: {
          maxConcurrentRetries: 5,
          memoryThresholdMB: 100,
          cpuThresholdPercent: 80
        }
      })

      // Simulate many concurrent failing operations
      const promises = Array.from({ length: 20 }, (_, i) =>
        errorHandler.executeWithRetry(() => mockAIServices.processContent({ id: i }))
      )

      await Promise.all(promises)

      const resourceStats = await errorHandler.getResourceUsage()
      expect(resourceStats.concurrentRetries).toBeLessThanOrEqual(5)
      expect(resourceStats.memoryUsageMB).toBeLessThan(100)
    })

    test('should provide graceful shutdown during persistent errors', async () => {
      mockAIServices.processContent.mockRejectedValue(new Error('Persistent failure'))

      errorHandler.setConfiguration({
        shutdown: {
          enableGracefulShutdown: true,
          persistentErrorThreshold: 100,
          shutdownDelayMs: 5000
        }
      })

      // Simulate many persistent errors
      for (let i = 0; i < 101; i++) {
        await errorHandler.executeWithRetry(() => mockAIServices.processContent({}))
      }

      const shutdownTriggered = await errorHandler.isGracefulShutdownTriggered()
      expect(shutdownTriggered).toBe(true)

      const shutdownStatus = await errorHandler.getShutdownStatus()
      expect(shutdownStatus.reason).toBe('persistent_errors')
      expect(shutdownStatus.errorCount).toBe(101)
    })
  })
})
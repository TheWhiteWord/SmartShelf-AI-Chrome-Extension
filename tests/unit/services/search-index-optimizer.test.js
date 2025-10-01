/**
 * Search Indexing Optimization Tests (T069)
 * 
 * Tests for optimized search indexing for large collections (10k+ items)
 * with performance improvements, batch processing, and incremental updates.
 * 
 * Expected Features:
 * - Batch indexing for improved performance
 * - Incremental index updates (only changed items)
 * - Index cleanup and optimization routines
 * - Performance monitoring for large collections
 * - Index compression and storage optimization
 * - Background index maintenance
 * - Search performance analytics
 * 
 * Architecture:
 * - SearchIndexOptimizer class in service-worker.js
 * - Integration with existing SearchService
 * - Chrome Storage optimization strategies
 */

const SearchIndexOptimizer = require('../../../extension/shared/services/search-index-optimizer.js')

describe('Search Indexing Optimization (T069)', () => {
  let optimizer
  let mockSearchService
  let mockStorageService
  let mockChrome

  beforeEach(() => {
    // Mock dependencies
    mockSearchService = {
      updateIndex: jest.fn(),
      getIndex: jest.fn(),
      searchContent: jest.fn()
    }

    mockStorageService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      getBatch: jest.fn(),
      setBatch: jest.fn()
    }

    mockChrome = {
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(),
          getBytesInUse: jest.fn().mockResolvedValue(0),
          clear: jest.fn().mockResolvedValue()
        }
      }
    }

    global.chrome = mockChrome
    global.performance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn()
    }

    // Initialize optimizer (this should fail until implemented)
    try {
      optimizer = new SearchIndexOptimizer(mockSearchService, mockStorageService)
    } catch (error) {
      // Expected to fail initially
    }
  })

  describe('Optimizer Initialization', () => {
    test('should initialize with performance configuration', () => {
      expect(() => {
        new SearchIndexOptimizer(mockSearchService, mockStorageService)
      }).not.toThrow()

      const optimizer = new SearchIndexOptimizer(mockSearchService, mockStorageService)
      const config = optimizer.getConfiguration()

      expect(config.batchSize).toBe(100)
      expect(config.maxIndexSize).toBe(50 * 1024 * 1024) // 50MB
      expect(config.compressionEnabled).toBe(true)
      expect(config.incrementalUpdates).toBe(true)
      expect(config.maintenanceInterval).toBe(24 * 60 * 60 * 1000) // 24 hours
    })

    test('should detect existing index state and optimize if needed', async () => {
      const existingIndex = {
        version: '1.0',
        itemCount: 15000,
        lastOptimized: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
        fragmentationRatio: 0.4
      }

      mockStorageService.get.mockResolvedValue({ searchIndexMetadata: existingIndex })

      const optimizer = new SearchIndexOptimizer(mockSearchService, mockStorageService)
      await optimizer.initialize()

      const needsOptimization = await optimizer.needsOptimization()
      expect(needsOptimization).toBe(true)
    })
  })

  describe('Batch Indexing Operations', () => {
    beforeEach(async () => {
      optimizer = new SearchIndexOptimizer(mockSearchService, mockStorageService)
      await optimizer.initialize()
    })

    test('should process items in batches for large collections', async () => {
      const largeCollection = Array.from({ length: 1500 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
        content: `This is the content for item ${i}`,
        categories: ['test'],
        tags: [`tag${i % 10}`]
      }))

      const batchCalls = []
      mockSearchService.updateIndex = jest.fn().mockImplementation((items) => {
        batchCalls.push(items.length)
        return Promise.resolve()
      })

      await optimizer.batchUpdateIndex(largeCollection)

      // Should process in batches of 100
      expect(batchCalls.length).toBe(15)
      expect(batchCalls.every(size => size <= 100)).toBe(true)
      expect(batchCalls.reduce((sum, size) => sum + size, 0)).toBe(1500)
    })

    test('should optimize batch size based on performance metrics', async () => {
      const items = Array.from({ length: 500 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
        content: 'Content'
      }))

      let processingTimes = [150, 200, 180, 220, 190] // Simulated processing times
      let callIndex = 0

      mockSearchService.updateIndex = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(resolve, processingTimes[callIndex++ % processingTimes.length])
        })
      })

      await optimizer.batchUpdateIndex(items)

      const optimizedBatchSize = optimizer.getOptimalBatchSize()
      expect(optimizedBatchSize).toBeGreaterThan(0)
      expect(optimizedBatchSize).toBeLessThanOrEqual(200) // Should adjust based on performance
    })

    test('should handle batch processing errors gracefully', async () => {
      const items = Array.from({ length: 250 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
        content: 'Content'
      }))

      let batchCount = 0
      mockSearchService.updateIndex = jest.fn().mockImplementation((batch) => {
        batchCount++
        if (batchCount === 2) {
          throw new Error('Batch processing failed')
        }
        return Promise.resolve()
      })

      const result = await optimizer.batchUpdateIndex(items)

      expect(result.successfulItems).toBe(150) // First batch (100) + third batch (50)
      expect(result.failedItems).toBe(100) // Second batch (100)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('Incremental Index Updates', () => {
    beforeEach(async () => {
      optimizer = new SearchIndexOptimizer(mockSearchService, mockStorageService)
      await optimizer.initialize()
    })

    test('should detect changed items and update only those', async () => {
      const existingItems = [
        { id: 'item-1', title: 'Original Title 1', lastModified: '2025-01-01T00:00:00Z' },
        { id: 'item-2', title: 'Original Title 2', lastModified: '2025-01-01T00:00:00Z' },
        { id: 'item-3', title: 'Original Title 3', lastModified: '2025-01-01T00:00:00Z' }
      ]

      const updatedItems = [
        { id: 'item-1', title: 'Updated Title 1', lastModified: '2025-01-02T00:00:00Z' }, // Changed
        { id: 'item-2', title: 'Original Title 2', lastModified: '2025-01-01T00:00:00Z' }, // Unchanged
        { id: 'item-3', title: 'Original Title 3', lastModified: '2025-01-01T00:00:00Z' }, // Unchanged
        { id: 'item-4', title: 'New Item 4', lastModified: '2025-01-02T00:00:00Z' } // New
      ]

      // Mock existing index state
      mockStorageService.get.mockResolvedValue({
        searchIndexState: {
          itemHashes: {
            'item-1': 'hash1_old',
            'item-2': 'hash2',
            'item-3': 'hash3'
          }
        }
      })

      const changedItems = await optimizer.detectChangedItems(existingItems, updatedItems)

      expect(changedItems).toHaveLength(2) // item-1 (changed) and item-4 (new)
      expect(changedItems.map(item => item.id)).toEqual(['item-1', 'item-4'])
    })

    test('should perform incremental updates efficiently', async () => {
      const allItems = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
        content: 'Content',
        lastModified: i < 990 ? '2025-01-01T00:00:00Z' : '2025-01-02T00:00:00Z' // Only last 10 changed
      }))

      // Mock that most items are unchanged
      mockStorageService.get.mockResolvedValue({
        searchIndexState: {
          itemHashes: Object.fromEntries(
            allItems.slice(0, 990).map(item => [item.id, `hash_${item.id}`])
          )
        }
      })

      const updateCalls = []
      mockSearchService.updateIndex = jest.fn().mockImplementation((items) => {
        updateCalls.push(items.length)
        return Promise.resolve()
      })

      await optimizer.performIncrementalUpdate(allItems)

      // Should only update the 10 changed items + 10 new items
      const totalUpdatedItems = updateCalls.reduce((sum, count) => sum + count, 0)
      expect(totalUpdatedItems).toBe(20)
    })

    test('should handle index corruption and trigger full rebuild', async () => {
      mockStorageService.get.mockRejectedValue(new Error('Index corrupted'))

      const items = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`
      }))

      const rebuildSpy = jest.spyOn(optimizer, 'rebuildIndex')
      rebuildSpy.mockResolvedValue({ success: true })

      await optimizer.performIncrementalUpdate(items)

      expect(rebuildSpy).toHaveBeenCalledWith(items)
    })
  })

  describe('Index Compression and Storage', () => {
    beforeEach(async () => {
      optimizer = new SearchIndexOptimizer(mockSearchService, mockStorageService)
      await optimizer.initialize()
    })

    test('should compress large indices to save storage space', async () => {
      const largeIndex = {
        terms: Object.fromEntries(
          Array.from({ length: 10000 }, (_, i) => [`term${i}`, Array.from({ length: 50 }, (_, j) => `item-${j}`)])
        )
      }

      const originalSize = JSON.stringify(largeIndex).length
      const compressedIndex = await optimizer.compressIndex(largeIndex)

      expect(compressedIndex.compressed).toBe(true)
      expect(compressedIndex.originalSize).toBe(originalSize)
      expect(compressedIndex.compressedSize).toBeLessThan(originalSize * 0.8) // At least 20% compression
    })

    test('should decompress indices transparently during searches', async () => {
      const originalIndex = { terms: { 'test': ['item-1', 'item-2'] } }
      const compressedIndex = await optimizer.compressIndex(originalIndex)

      mockStorageService.get.mockResolvedValue({ searchIndex: compressedIndex })

      const decompressedIndex = await optimizer.getDecompressedIndex()

      expect(decompressedIndex).toEqual(originalIndex)
    })

    test('should monitor storage usage and optimize when limits approached', async () => {
      // Mock approaching storage limit
      mockChrome.storage.local.getBytesInUse.mockResolvedValue(45 * 1024 * 1024) // 45MB of 50MB limit

      const needsStorageOptimization = await optimizer.needsStorageOptimization()
      expect(needsStorageOptimization).toBe(true)

      const optimizationPlan = await optimizer.createStorageOptimizationPlan()
      expect(optimizationPlan.actions).toContain('compress_index')
      expect(optimizationPlan.actions).toContain('remove_old_entries')
    })
  })

  describe('Background Index Maintenance', () => {
    beforeEach(async () => {
      optimizer = new SearchIndexOptimizer(mockSearchService, mockStorageService)
      await optimizer.initialize()
    })

    test('should schedule periodic index maintenance', async () => {
      const maintenanceScheduled = jest.spyOn(optimizer, 'scheduleNextMaintenance')
      
      await optimizer.startBackgroundMaintenance()

      expect(maintenanceScheduled).toHaveBeenCalled()
      
      const nextMaintenanceTime = await optimizer.getNextMaintenanceTime()
      expect(nextMaintenanceTime).toBeGreaterThan(Date.now())
    })

    test('should perform index defragmentation during maintenance', async () => {
      // Mock fragmented index
      const fragmentedIndex = {
        terms: {
          'active_term': ['item-1', 'item-2'],
          'deleted_term': [], // Empty term
          'sparse_term': ['item-100'] // Sparse reference
        },
        deletedItems: ['item-50', 'item-75'] // Items to clean up
      }

      mockStorageService.get.mockResolvedValue({ searchIndex: fragmentedIndex })

      const maintenanceResult = await optimizer.performMaintenance()

      expect(maintenanceResult.defragmented).toBe(true)
      expect(maintenanceResult.removedEmptyTerms).toBe(1)
      expect(maintenanceResult.cleanedDeletedItems).toBe(2)
    })

    test('should optimize index structure based on usage patterns', async () => {
      const usageStats = {
        mostSearchedTerms: ['javascript', 'react', 'nodejs'],
        searchFrequency: {
          'javascript': 150,
          'react': 120,
          'nodejs': 100,
          'rarely_used': 2
        }
      }

      mockStorageService.get.mockResolvedValue({ searchUsageStats: usageStats })

      const optimizedIndex = await optimizer.optimizeForUsagePatterns()

      expect(optimizedIndex.hotTerms).toContain('javascript')
      expect(optimizedIndex.hotTerms).toContain('react')
      expect(optimizedIndex.coldTerms).toContain('rarely_used')
    })
  })

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      optimizer = new SearchIndexOptimizer(mockSearchService, mockStorageService)
      await optimizer.initialize()
    })

    test('should track indexing performance metrics', async () => {
      const items = Array.from({ length: 500 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
        content: 'Test content'
      }))

      await optimizer.batchUpdateIndex(items)

      const metrics = await optimizer.getPerformanceMetrics()

      expect(metrics).toMatchObject({
        totalItemsIndexed: 500,
        averageIndexingTime: expect.any(Number),
        indexingThroughput: expect.any(Number),
        memoryUsage: expect.any(Number),
        storageEfficiency: expect.any(Number)
      })
    })

    test('should identify performance bottlenecks', async () => {
      // Simulate slow indexing operations
      mockSearchService.updateIndex = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 500))
      )

      const items = Array.from({ length: 100 }, (_, i) => ({ id: `item-${i}`, title: `Item ${i}` }))
      await optimizer.batchUpdateIndex(items)

      const bottlenecks = await optimizer.identifyBottlenecks()

      expect(bottlenecks).toContainEqual({
        operation: 'index_update',
        averageTime: expect.any(Number),
        isBottleneck: true,
        recommendation: expect.any(String)
      })
    })

    test('should provide search performance analytics', async () => {
      const searchQueries = [
        { query: 'javascript', results: 50, responseTime: 25 },
        { query: 'react hooks', results: 30, responseTime: 45 },
        { query: 'nodejs express', results: 40, responseTime: 35 }
      ]

      // Simulate search performance data
      for (const search of searchQueries) {
        await optimizer.recordSearchMetric(search.query, search.results, search.responseTime)
      }

      const analytics = await optimizer.getSearchAnalytics()

      expect(analytics.averageResponseTime).toBeLessThan(50)
      expect(analytics.totalSearches).toBe(3)
      expect(analytics.averageResultCount).toBeGreaterThan(35)
    })
  })

  describe('Large Collection Optimization', () => {
    beforeEach(async () => {
      optimizer = new SearchIndexOptimizer(mockSearchService, mockStorageService)
      await optimizer.initialize()
    })

    test('should handle 10k+ items efficiently', async () => {
      const largeCollection = Array.from({ length: 15000 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
        content: `Content for item ${i} with various keywords`,
        categories: [`category-${i % 20}`],
        tags: [`tag-${i % 100}`]
      }))

      const startTime = Date.now()
      await optimizer.optimizeForLargeCollection(largeCollection)
      const processingTime = Date.now() - startTime

      // Should complete within reasonable time (less than 30 seconds)
      expect(processingTime).toBeLessThan(30000)

      const metrics = await optimizer.getCollectionMetrics()
      expect(metrics.itemCount).toBe(15000)
      expect(metrics.indexingComplete).toBe(true)
    })

    test('should partition large indices for better performance', async () => {
      const hugeCollection = Array.from({ length: 25000 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
        content: 'Content'
      }))

      await optimizer.createPartitionedIndex(hugeCollection)

      const partitions = await optimizer.getIndexPartitions()
      
      expect(partitions.length).toBeGreaterThan(1)
      expect(partitions.every(p => p.itemCount <= 10000)).toBe(true)
    })

    test('should implement memory-efficient streaming for massive collections', async () => {
      const massiveCollection = Array.from({ length: 50000 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`
      }))

      const memoryUsageBefore = process.memoryUsage().heapUsed
      
      await optimizer.streamProcessLargeCollection(massiveCollection, {
        streamSize: 1000,
        memoryLimit: 100 * 1024 * 1024 // 100MB
      })

      const memoryUsageAfter = process.memoryUsage().heapUsed
      const memoryIncrease = memoryUsageAfter - memoryUsageBefore

      // Should not exceed memory limit significantly
      expect(memoryIncrease).toBeLessThan(150 * 1024 * 1024) // 150MB allowance
    })
  })
})
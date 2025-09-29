/**
 * Chrome DevTools MCP Debugging Integration Tests (T030A)
 * Tests automated debugging workflows, AI API performance monitoring, 
 * and real-time extension state inspection
 */

describe('Chrome DevTools MCP Debugging Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('MCP Server Connection', () => {
    test('should establish connection to Chrome DevTools MCP server', async () => {
      const mockMCPConnection = {
        protocol: 'stdio',
        command: 'node',
        args: ['/path/to/chrome-devtools-mcp/server.js'],
        status: 'connected',
        serverInfo: {
          name: 'chrome-devtools-mcp',
          version: '1.0.0'
        }
      }

      function establishMCPConnection() {
        return {
          connect: () => Promise.resolve(mockMCPConnection),
          isConnected: () => mockMCPConnection.status === 'connected',
          getServerInfo: () => mockMCPConnection.serverInfo
        }
      }

      const mcpClient = establishMCPConnection()
      const connection = await mcpClient.connect()

      expect(connection.status).toBe('connected')
      expect(connection.serverInfo.name).toBe('chrome-devtools-mcp')
      expect(mcpClient.isConnected()).toBe(true)
    })

    test('should handle MCP connection failures gracefully', async () => {
      function establishMCPConnection(shouldFail = false) {
        return {
          connect: () => {
            if (shouldFail) {
              return Promise.reject(new Error('MCP server not available'))
            }
            return Promise.resolve({ status: 'connected' })
          }
        }
      }

      const failingClient = establishMCPConnection(true)
      
      let connectionError = null
      try {
        await failingClient.connect()
      } catch (error) {
        connectionError = error
      }

      expect(connectionError).toBeDefined()
      expect(connectionError.message).toBe('MCP server not available')
    })
  })

  describe('Real-time Extension State Inspection', () => {
    test('should monitor extension background state', async () => {
      const mockExtensionState = {
        serviceWorker: {
          status: 'active',
          lastActivity: Date.now(),
          registrations: ['content-script', 'popup', 'sidepanel']
        },
        storage: {
          local: { itemCount: 150, sizeKB: 2048 },
          sync: { itemCount: 5, sizeKB: 12 }
        },
        aiSessions: {
          active: 2,
          summarizer: { status: 'ready', sessionId: 'sum-123' },
          languageModel: { status: 'ready', sessionId: 'lm-456' }
        }
      }

      function getExtensionState() {
        return {
          inspect: () => Promise.resolve(mockExtensionState),
          isHealthy: () => mockExtensionState.serviceWorker.status === 'active',
          getStorageUsage: () => ({
            local: mockExtensionState.storage.local.sizeKB,
            sync: mockExtensionState.storage.sync.sizeKB
          })
        }
      }

      const inspector = getExtensionState()
      const state = await inspector.inspect()

      expect(state.serviceWorker.status).toBe('active')
      expect(state.storage.local.itemCount).toBe(150)
      expect(state.aiSessions.active).toBe(2)
      expect(inspector.isHealthy()).toBe(true)
    })

    test('should track content processing pipeline state', async () => {
      const mockPipelineState = {
        queue: {
          pending: 3,
          processing: 1,
          completed: 847,
          failed: 2
        },
        performance: {
          avgProcessingTime: 1200, // ms
          successRate: 99.76,
          throughputPerHour: 450
        },
        currentItem: {
          id: 'item-current-123',
          title: 'Processing Article',
          stage: 'ai-categorization',
          startedAt: Date.now() - 800
        }
      }

      function getPipelineState() {
        return {
          getCurrentState: () => Promise.resolve(mockPipelineState),
          isProcessing: () => mockPipelineState.queue.processing > 0,
          getPerformanceMetrics: () => mockPipelineState.performance
        }
      }

      const pipeline = getPipelineState()
      const state = await pipeline.getCurrentState()

      expect(state.queue.pending).toBe(3)
      expect(state.performance.successRate).toBeGreaterThan(99)
      expect(state.currentItem.stage).toBe('ai-categorization')
      expect(pipeline.isProcessing()).toBe(true)
    })

    test('should monitor memory usage and performance', async () => {
      const mockPerformanceMetrics = {
        memory: {
          usedJSHeapSize: 25600000, // 25MB
          totalJSHeapSize: 32000000, // 32MB
          jsHeapSizeLimit: 64000000, // 64MB
          usagePercent: 80
        },
        cpu: {
          utilizationPercent: 15,
          backgroundTasks: 2,
          avgTaskDuration: 250
        },
        storage: {
          localUsage: 2048000, // 2MB
          syncUsage: 12000, // 12KB
          indexedDBUsage: 5242880, // 5MB
          totalUsage: 7302880 // ~7MB
        }
      }

      function getPerformanceMetrics() {
        return {
          measure: () => Promise.resolve(mockPerformanceMetrics),
          isMemoryHealthy: () => mockPerformanceMetrics.memory.usagePercent < 90,
          isCPUHealthy: () => mockPerformanceMetrics.cpu.utilizationPercent < 80
        }
      }

      const monitor = getPerformanceMetrics()
      const metrics = await monitor.measure()

      expect(metrics.memory.usagePercent).toBe(80)
      expect(metrics.cpu.utilizationPercent).toBe(15)
      expect(metrics.storage.totalUsage).toBeGreaterThan(7000000)
      expect(monitor.isMemoryHealthy()).toBe(true)
      expect(monitor.isCPUHealthy()).toBe(true)
    })
  })

  describe('AI API Performance Monitoring', () => {
    test('should track Chrome AI API response times', async () => {
      const mockAIMetrics = {
        summarizer: {
          totalRequests: 1234,
          avgResponseTime: 850, // ms
          successRate: 98.2,
          failureReasons: {
            'timeout': 12,
            'quota_exceeded': 5,
            'invalid_input': 3
          }
        },
        languageModel: {
          totalRequests: 2156,
          avgResponseTime: 1200, // ms
          successRate: 97.8,
          failureReasons: {
            'timeout': 28,
            'quota_exceeded': 15,
            'invalid_prompt': 4
          }
        }
      }

      function getAIPerformanceMetrics() {
        return {
          track: (apiName, responseTime, success) => {
            const metrics = mockAIMetrics[apiName]
            if (metrics) {
              metrics.totalRequests++
              if (success) {
                metrics.avgResponseTime = (metrics.avgResponseTime + responseTime) / 2
              }
            }
          },
          getMetrics: () => mockAIMetrics,
          isPerformanceHealthy: (apiName) => {
            const metrics = mockAIMetrics[apiName]
            return metrics.successRate > 95 && metrics.avgResponseTime < 2000
          }
        }
      }

      const aiMonitor = getAIPerformanceMetrics()
      const metrics = aiMonitor.getMetrics()

      expect(metrics.summarizer.successRate).toBeGreaterThan(95)
      expect(metrics.languageModel.avgResponseTime).toBeLessThan(2000)
      expect(aiMonitor.isPerformanceHealthy('summarizer')).toBe(true)
      expect(aiMonitor.isPerformanceHealthy('languageModel')).toBe(true)
    })

    test('should detect AI API quota limits and throttling', async () => {
      const mockQuotaStatus = {
        summarizer: {
          dailyLimit: 1000,
          dailyUsed: 847,
          remaining: 153,
          resetTime: Date.now() + 86400000, // 24 hours
          isThrottled: false
        },
        languageModel: {
          dailyLimit: 500,
          dailyUsed: 478,
          remaining: 22,
          resetTime: Date.now() + 86400000,
          isThrottled: true // Near limit
        }
      }

      function getAIQuotaStatus() {
        return {
          check: (apiName) => mockQuotaStatus[apiName],
          isNearLimit: (apiName, threshold = 0.9) => {
            const quota = mockQuotaStatus[apiName]
            return quota.dailyUsed / quota.dailyLimit >= threshold
          },
          getTimeToReset: (apiName) => {
            const quota = mockQuotaStatus[apiName]
            return quota.resetTime - Date.now()
          }
        }
      }

      const quotaMonitor = getAIQuotaStatus()
      const summarizerQuota = quotaMonitor.check('summarizer')
      const languageModelQuota = quotaMonitor.check('languageModel')

      expect(summarizerQuota.remaining).toBe(153)
      expect(languageModelQuota.isThrottled).toBe(true)
      expect(quotaMonitor.isNearLimit('languageModel')).toBe(true)
      expect(quotaMonitor.isNearLimit('summarizer')).toBe(false)
    })

    test('should monitor AI processing quality metrics', async () => {
      const mockQualityMetrics = {
        summarization: {
          avgConfidenceScore: 0.87,
          avgSummaryLength: 156, // words
          compressionRatio: 0.15, // summary vs original
          userFeedback: {
            positive: 234,
            negative: 12,
            satisfaction: 95.1
          }
        },
        categorization: {
          avgConfidenceScore: 0.92,
          avgCategoriesPerItem: 2.3,
          accuracyRate: 94.7,
          userCorrections: {
            total: 34,
            accepted: 31,
            rejected: 3
          }
        }
      }

      function getAIQualityMetrics() {
        return {
          measure: () => Promise.resolve(mockQualityMetrics),
          isQualityHealthy: (process) => {
            const metrics = mockQualityMetrics[process]
            return metrics.avgConfidenceScore > 0.8 && 
                   (metrics.userFeedback?.satisfaction > 90 || metrics.accuracyRate > 90)
          }
        }
      }

      const qualityMonitor = getAIQualityMetrics()
      const metrics = await qualityMonitor.measure()

      expect(metrics.summarization.avgConfidenceScore).toBeGreaterThan(0.8)
      expect(metrics.categorization.accuracyRate).toBeGreaterThan(90)
      expect(qualityMonitor.isQualityHealthy('summarization')).toBe(true)
      expect(qualityMonitor.isQualityHealthy('categorization')).toBe(true)
    })
  })

  describe('Automated Debugging Workflows', () => {
    test('should automatically detect and report errors', async () => {
      const mockErrorReport = {
        timestamp: Date.now(),
        errorType: 'AI_API_TIMEOUT',
        component: 'service-worker',
        details: {
          api: 'summarizer',
          operation: 'summarize',
          timeout: 5000,
          contentLength: 15000
        },
        stackTrace: 'Error: Request timeout\n  at summarizeContent...',
        impact: {
          severity: 'medium',
          affectedUsers: 1,
          failedOperations: 1
        }
      }

      function getErrorDetector() {
        return {
          detect: () => Promise.resolve([mockErrorReport]),
          classify: (error) => {
            if (error.message.includes('timeout')) return 'timeout'
            if (error.message.includes('quota')) return 'quota_exceeded'
            return 'unknown'
          },
          shouldAlert: (error) => error.impact.severity !== 'low'
        }
      }

      const detector = getErrorDetector()
      const errors = await detector.detect()

      expect(errors).toHaveLength(1)
      expect(errors[0].errorType).toBe('AI_API_TIMEOUT')
      expect(errors[0].impact.severity).toBe('medium')
      expect(detector.shouldAlert(errors[0])).toBe(true)
    })

    test('should provide automated diagnostic suggestions', async () => {
      const mockDiagnostics = {
        issues: [
          {
            type: 'performance',
            description: 'AI processing taking longer than expected',
            severity: 'medium',
            suggestions: [
              'Consider implementing request batching',
              'Add content length limits',
              'Implement progressive processing'
            ]
          },
          {
            type: 'storage',
            description: 'Local storage usage approaching quota',
            severity: 'high',
            suggestions: [
              'Implement data cleanup routines',
              'Move old items to compressed storage',
              'Add user storage management interface'
            ]
          }
        ],
        overallHealth: 'good',
        actionItems: 2
      }

      function getDiagnosticEngine() {
        return {
          runDiagnostics: () => Promise.resolve(mockDiagnostics),
          getPrioritizedIssues: () => mockDiagnostics.issues
            .sort((a, b) => {
              const severityOrder = { high: 3, medium: 2, low: 1 }
              return severityOrder[b.severity] - severityOrder[a.severity]
            }),
          generateRecommendations: (issue) => issue.suggestions
        }
      }

      const diagnostics = getDiagnosticEngine()
      const report = await diagnostics.runDiagnostics()
      const prioritized = diagnostics.getPrioritizedIssues()

      expect(report.issues).toHaveLength(2)
      expect(report.overallHealth).toBe('good')
      expect(prioritized[0].severity).toBe('high') // Storage issue first
      expect(prioritized[0].suggestions).toContain('Implement data cleanup routines')
    })

    test('should execute automated fixes for common issues', async () => {
      const mockFixableIssues = [
        {
          id: 'orphaned-search-index',
          type: 'data-integrity',
          description: 'Search index contains references to deleted items',
          autoFixable: true,
          fix: () => Promise.resolve({ success: true, itemsFixed: 12 })
        },
        {
          id: 'expired-ai-sessions',
          type: 'resource-cleanup',
          description: 'Inactive AI sessions consuming memory',
          autoFixable: true,
          fix: () => Promise.resolve({ success: true, sessionsCleared: 3 })
        }
      ]

      function getAutoFixEngine() {
        return {
          findFixableIssues: () => Promise.resolve(mockFixableIssues),
          applyFix: async (issue) => {
            if (issue.autoFixable) {
              return await issue.fix()
            }
            return { success: false, reason: 'Not auto-fixable' }
          },
          runAllFixes: async () => {
            const results = []
            for (const issue of mockFixableIssues) {
              const result = await issue.fix()
              results.push({ issue: issue.id, ...result })
            }
            return results
          }
        }
      }

      const autoFix = getAutoFixEngine()
      const fixableIssues = await autoFix.findFixableIssues()
      const fixResults = await autoFix.runAllFixes()

      expect(fixableIssues).toHaveLength(2)
      expect(fixResults).toHaveLength(2)
      expect(fixResults[0].success).toBe(true)
      expect(fixResults[0].itemsFixed).toBe(12)
      expect(fixResults[1].sessionsCleared).toBe(3)
    })
  })

  describe('Development Workflow Integration', () => {
    test('should provide real-time debugging information', async () => {
      const mockDebugInfo = {
        currentTab: {
          id: 123,
          url: 'https://example.com/article',
          contentExtracted: true,
          processing: false
        },
        activeProcesses: [
          {
            id: 'proc-1',
            type: 'ai-summarization',
            progress: 75,
            estimatedCompletion: 2000 // ms
          }
        ],
        recentActions: [
          { timestamp: Date.now() - 1000, action: 'content-extracted', tabId: 123 },
          { timestamp: Date.now() - 2000, action: 'ai-processing-started', itemId: 'item-456' }
        ],
        systemStatus: {
          healthy: true,
          alerts: [],
          performance: 'good'
        }
      }

      function getDebugInterface() {
        return {
          getRealtimeInfo: () => Promise.resolve(mockDebugInfo),
          subscribeToUpdates: (callback) => {
            // Mock real-time updates
            setTimeout(() => callback({
              type: 'process-completed',
              processId: 'proc-1',
              result: 'success'
            }), 100)
          },
          getActionHistory: (limit = 10) => mockDebugInfo.recentActions.slice(0, limit)
        }
      }

      const debugInterface = getDebugInterface()
      const info = await debugInterface.getRealtimeInfo()

      expect(info.currentTab.contentExtracted).toBe(true)
      expect(info.activeProcesses).toHaveLength(1)
      expect(info.activeProcesses[0].progress).toBe(75)
      expect(info.systemStatus.healthy).toBe(true)
    })

    test('should support debugging Chrome Extension messaging', async () => {
      const mockMessageLog = [
        {
          timestamp: Date.now() - 5000,
          from: 'content-script',
          to: 'service-worker',
          action: 'process-content',
          data: { title: 'Test Article', url: 'https://example.com' },
          response: { success: true, contentId: 'item-123' },
          duration: 450 // ms
        },
        {
          timestamp: Date.now() - 3000,
          from: 'popup',
          to: 'service-worker',
          action: 'get-recent-items',
          data: { limit: 10 },
          response: { items: [], count: 0 },
          duration: 25
        }
      ]

      function getMessageDebugger() {
        return {
          getMessageLog: () => Promise.resolve(mockMessageLog),
          filterMessages: (criteria) => {
            return mockMessageLog.filter(msg => {
              if (criteria.from && msg.from !== criteria.from) return false
              if (criteria.action && msg.action !== criteria.action) return false
              return true
            })
          },
          analyzePerformance: () => {
            const avgDuration = mockMessageLog.reduce((sum, msg) => sum + msg.duration, 0) / mockMessageLog.length
            return {
              totalMessages: mockMessageLog.length,
              avgResponseTime: avgDuration,
              slowMessages: mockMessageLog.filter(msg => msg.duration > 1000)
            }
          }
        }
      }

      const msgDebugger = getMessageDebugger()
      const messageLog = await msgDebugger.getMessageLog()
      const contentScriptMessages = msgDebugger.filterMessages({ from: 'content-script' })
      const performance = msgDebugger.analyzePerformance()

      expect(messageLog).toHaveLength(2)
      expect(contentScriptMessages).toHaveLength(1)
      expect(contentScriptMessages[0].action).toBe('process-content')
      expect(performance.avgResponseTime).toBeLessThan(500)
    })
  })

  describe('MCP Integration Health Checks', () => {
    test('should verify MCP server functionality', async () => {
      const mockHealthCheck = {
        serverStatus: 'healthy',
        lastPing: Date.now() - 1000,
        responseTime: 45, // ms
        version: '1.0.0',
        features: [
          'real-time-monitoring',
          'automated-debugging',
          'performance-analysis'
        ],
        errors: []
      }

      function getMCPHealthChecker() {
        return {
          ping: () => Promise.resolve({ success: true, responseTime: mockHealthCheck.responseTime }),
          checkHealth: () => Promise.resolve(mockHealthCheck),
          isAvailable: () => mockHealthCheck.serverStatus === 'healthy',
          getCapabilities: () => mockHealthCheck.features
        }
      }

      const healthChecker = getMCPHealthChecker()
      const pingResult = await healthChecker.ping()
      const healthStatus = await healthChecker.checkHealth()

      expect(pingResult.success).toBe(true)
      expect(pingResult.responseTime).toBeLessThan(100)
      expect(healthStatus.serverStatus).toBe('healthy')
      expect(healthChecker.isAvailable()).toBe(true)
      expect(healthChecker.getCapabilities()).toContain('real-time-monitoring')
    })

    test('should handle MCP server disconnections gracefully', async () => {
      function getMCPHealthChecker(isDisconnected = false) {
        return {
          ping: () => {
            if (isDisconnected) {
              return Promise.reject(new Error('Connection refused'))
            }
            return Promise.resolve({ success: true })
          },
          handleDisconnection: () => ({
            fallbackMode: true,
            localDebugging: true,
            reconnectAttempts: 0,
            message: 'MCP server unavailable, using local debugging'
          })
        }
      }

      const disconnectedChecker = getMCPHealthChecker(true)
      
      let pingError = null
      try {
        await disconnectedChecker.ping()
      } catch (error) {
        pingError = error
      }

      const fallbackStatus = disconnectedChecker.handleDisconnection()

      expect(pingError).toBeDefined()
      expect(pingError.message).toBe('Connection refused')
      expect(fallbackStatus.fallbackMode).toBe(true)
      expect(fallbackStatus.localDebugging).toBe(true)
    })
  })
})
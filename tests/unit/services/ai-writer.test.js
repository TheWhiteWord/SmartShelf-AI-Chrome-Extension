// Unit tests for AI Writer Service
// Tests Chrome Built-in Writer and Rewriter API integration

const path = require('path')
const AIWriterService = require(path.resolve(__dirname, '../../../extension/shared/services/ai-writer.js'))

describe('AI Writer Service - T046', () => {
  let aiWriterService
  let mockWriterSession
  let mockRewriterSession

  beforeEach(() => {
    // Mock Chrome Built-in AI Writer APIs
    global.self = global.self || {}
    
    global.self.Writer = {
      availability: jest.fn(),
      create: jest.fn()
    }

    global.self.Rewriter = {
      availability: jest.fn(),
      create: jest.fn()
    }

    // Mock writer and rewriter session instances
    mockWriterSession = {
      write: jest.fn(),
      destroy: jest.fn()
    }

    mockRewriterSession = {
      rewrite: jest.fn(),
      destroy: jest.fn()
    }

    aiWriterService = new AIWriterService()
  })

  describe('Service Initialization', () => {
    test('should initialize successfully with both Writer and Rewriter available', async () => {
      global.self.Writer.availability.mockResolvedValue('available')
      global.self.Rewriter.availability.mockResolvedValue('available')
      global.self.Writer.create.mockResolvedValue(mockWriterSession)
      global.self.Rewriter.create.mockResolvedValue(mockRewriterSession)

      const initialized = await aiWriterService.initialize()

      expect(initialized).toBe(true)
      expect(aiWriterService.isInitialized).toBe(true)
      expect(aiWriterService.isReady()).toBe(true)
      expect(global.self.Writer.create).toHaveBeenCalledWith({
        tone: 'informative',
        format: 'markdown',
        length: 'medium'
      })
      expect(global.self.Rewriter.create).toHaveBeenCalledWith({
        tone: 'neutral',
        format: 'markdown',
        length: 'as-is'
      })
    })

    test('should initialize with only Writer available', async () => {
      global.self.Writer.availability.mockResolvedValue('available')
      global.self.Rewriter.availability.mockResolvedValue('unavailable')
      global.self.Writer.create.mockResolvedValue(mockWriterSession)

      const initialized = await aiWriterService.initialize()

      expect(initialized).toBe(true)
      expect(aiWriterService.writerSession).toBe(mockWriterSession)
      expect(aiWriterService.rewriterSession).toBeNull()
      expect(aiWriterService.isReady()).toBe(true)
    })

    test('should initialize with only Rewriter available', async () => {
      global.self.Writer.availability.mockResolvedValue('unavailable')
      global.self.Rewriter.availability.mockResolvedValue('available')
      global.self.Rewriter.create.mockResolvedValue(mockRewriterSession)

      const initialized = await aiWriterService.initialize()

      expect(initialized).toBe(true)
      expect(aiWriterService.writerSession).toBeNull()
      expect(aiWriterService.rewriterSession).toBe(mockRewriterSession)
      expect(aiWriterService.isReady()).toBe(true)
    })

    test('should fail to initialize when both APIs unavailable', async () => {
      global.self.Writer.availability.mockResolvedValue('unavailable')
      global.self.Rewriter.availability.mockResolvedValue('unavailable')

      const initialized = await aiWriterService.initialize()

      expect(initialized).toBe(false)
      expect(aiWriterService.isInitialized).toBe(false)
      expect(aiWriterService.isReady()).toBe(false)
    })

    test('should handle initialization errors gracefully', async () => {
      global.self.Writer.availability.mockRejectedValue(new Error('API Error'))

      const initialized = await aiWriterService.initialize()

      expect(initialized).toBe(false)
      expect(aiWriterService.isInitialized).toBe(false)
    })
  })

  describe('Insights Generation', () => {
    beforeEach(async () => {
      global.self.Writer.availability.mockResolvedValue('available')
      global.self.Writer.create.mockResolvedValue(mockWriterSession)
      await aiWriterService.initialize()
    })

    test('should generate insights for a content item', async () => {
      const contentItem = {
        id: 'test-item-1',
        title: 'Machine Learning Basics',
        type: 'article',
        summary: 'Introduction to ML concepts',
        tags: ['machine-learning', 'ai', 'beginner'],
        categories: ['Technology', 'Education'],
        contentText: 'Machine learning is a subset of artificial intelligence...'
      }

      const mockInsights = `# Key Insights: Machine Learning Basics

## Core Concepts
- Machine learning enables computers to learn from data without explicit programming
- This represents a fundamental shift from traditional rule-based programming
- The field bridges computer science, statistics, and domain expertise

## Significance
This content provides a solid foundation for understanding how AI systems work. The concepts here are essential for anyone looking to understand modern technology applications.

## Practical Applications
- Recommendation systems (Netflix, Spotify)
- Image recognition (medical imaging, autonomous vehicles)
- Natural language processing (chatbots, translation)

## Questions for Further Exploration
- How do different ML algorithms handle bias in training data?
- What are the ethical implications of automated decision-making?
- How can we ensure ML systems remain interpretable and accountable?`

      mockWriterSession.write.mockResolvedValue(mockInsights)

      const result = await aiWriterService.generateInsights(contentItem)

      expect(result).toBe(mockInsights)
      expect(mockWriterSession.write).toHaveBeenCalledWith(
        expect.stringContaining('Generate insightful analysis and commentary about this content')
      )
      expect(mockWriterSession.write).toHaveBeenCalledWith(
        expect.stringContaining(contentItem.title)
      )

      // Check that stats are updated
      const stats = aiWriterService.getStats()
      expect(stats.insightsGenerated).toBe(1)
      expect(stats.processingTimeMs).toBeGreaterThan(0)
    })

    test('should handle insights generation without writer session', async () => {
      aiWriterService.writerSession = null

      const contentItem = { title: 'Test Article' }
      const result = await aiWriterService.generateInsights(contentItem)

      expect(result).toBeNull()
    })

    test('should handle insights generation errors', async () => {
      const contentItem = { title: 'Test Article', type: 'article' }
      mockWriterSession.write.mockRejectedValue(new Error('Writer API error'))

      const result = await aiWriterService.generateInsights(contentItem)

      expect(result).toBeNull()
      expect(aiWriterService.getStats().errorCount).toBe(1)
    })

    test('should queue requests when service is busy', async () => {
      const contentItem1 = { title: 'Article 1', type: 'article' }
      const contentItem2 = { title: 'Article 2', type: 'article' }

      mockWriterSession.write.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('Insights'), 100))
      )

      // Start first request (will set isProcessing = true)
      const promise1 = aiWriterService.generateInsights(contentItem1)
      
      // Immediately start second request (should be queued)
      const promise2 = aiWriterService.generateInsights(contentItem2)

      const [result1, result2] = await Promise.all([promise1, promise2])

      expect(result1).toBe('Insights')
      expect(result2).toBe('Insights')
      expect(mockWriterSession.write).toHaveBeenCalledTimes(2)
    })
  })

  describe('Notes Enhancement', () => {
    beforeEach(async () => {
      global.self.Rewriter.availability.mockResolvedValue('available')
      global.self.Rewriter.create.mockResolvedValue(mockRewriterSession)
      await aiWriterService.initialize()
    })

    test('should enhance user notes', async () => {
      const userNotes = 'these are my rough notes about machine learning they need better structure and clarity'
      const contentItem = {
        title: 'ML Tutorial',
        type: 'article'
      }

      const enhancedNotes = `# Machine Learning Notes

These are my refined notes about machine learning, structured for better clarity and understanding:

## Key Concepts
- Clear organization of main topics
- Better structure throughout
- Enhanced readability and flow`

      mockRewriterSession.rewrite.mockResolvedValue(enhancedNotes)

      const result = await aiWriterService.enhanceNotes(userNotes, contentItem)

      expect(result).toBe(enhancedNotes)
      expect(mockRewriterSession.rewrite).toHaveBeenCalledWith(
        expect.stringContaining(userNotes),
        expect.objectContaining({
          context: expect.stringContaining('personal notes about saved content')
        })
      )

      // Check stats
      const stats = aiWriterService.getStats()
      expect(stats.notesEnhanced).toBe(1)
    })

    test('should return original notes when rewriter unavailable', async () => {
      aiWriterService.rewriterSession = null

      const userNotes = 'Original notes'
      const contentItem = { title: 'Test' }

      const result = await aiWriterService.enhanceNotes(userNotes, contentItem)

      expect(result).toBe(userNotes)
    })

    test('should return original notes on rewriter error', async () => {
      const userNotes = 'Original notes'
      const contentItem = { title: 'Test' }

      mockRewriterSession.rewrite.mockRejectedValue(new Error('Rewriter error'))

      const result = await aiWriterService.enhanceNotes(userNotes, contentItem)

      expect(result).toBe(userNotes)
      expect(aiWriterService.getStats().errorCount).toBe(1)
    })
  })

  describe('Content Analysis Features', () => {
    beforeEach(async () => {
      global.self.Writer.availability.mockResolvedValue('available')
      global.self.Writer.create.mockResolvedValue(mockWriterSession)
      await aiWriterService.initialize()
    })

    test('should generate takeaways from content', async () => {
      const contentItem = {
        title: 'Productivity Tips',
        type: 'article',
        summary: 'How to be more productive',
        contentText: 'Focus on high-impact activities, eliminate distractions...'
      }

      const mockTakeaways = `1. Focus on high-impact activities that drive results
2. Eliminate distractions and maintain deep work sessions
3. Use time-blocking to structure your day effectively
4. Regular breaks improve sustained concentration
5. Prioritize tasks using the Eisenhower Matrix`

      mockWriterSession.write.mockResolvedValue(mockTakeaways)

      const result = await aiWriterService.generateTakeaways(contentItem)

      expect(result).toHaveLength(5)
      expect(result[0]).toBe('Focus on high-impact activities that drive results')
      expect(result[1]).toBe('Eliminate distractions and maintain deep work sessions')
      expect(mockWriterSession.write).toHaveBeenCalledWith(
        expect.stringContaining('3-5 key takeaways')
      )
    })

    test('should generate study questions', async () => {
      const contentItem = {
        title: 'Climate Change Science',
        type: 'article',
        summary: 'Understanding climate science',
        tags: ['climate', 'science', 'environment']
      }

      const mockQuestions = `1. What are the primary greenhouse gases and how do they trap heat?
2. How do climate feedback loops amplify or dampen warming effects?
3. What evidence supports human influence on recent climate change?
4. How do climate models predict future temperature scenarios?
5. What are the most effective mitigation strategies for different sectors?`

      mockWriterSession.write.mockResolvedValue(mockQuestions)

      const result = await aiWriterService.generateStudyQuestions(contentItem)

      expect(result).toHaveLength(5)
      expect(result[0]).toBe('What are the primary greenhouse gases and how do they trap heat?')
      expect(mockWriterSession.write).toHaveBeenCalledWith(
        expect.stringContaining('4-6 thoughtful study questions')
      )
    })

    test('should generate connection analysis', async () => {
      const sourceItem = {
        title: 'Renewable Energy Basics',
        type: 'article',
        summary: 'Introduction to solar and wind power'
      }

      const targetItem = {
        title: 'Battery Technology Advances',
        type: 'article', 
        summary: 'Latest developments in energy storage'
      }

      const connection = {
        connectionType: 'topic-related',
        strength: 0.8,
        description: 'Both articles discuss complementary aspects of clean energy'
      }

      const mockAnalysis = `These two articles represent complementary aspects of the clean energy transition. Renewable energy sources like solar and wind provide clean electricity generation, while advanced battery technology solves the critical challenge of energy storage and grid stability.

The connection is particularly valuable because renewable sources are intermittent - the sun doesn't always shine and wind doesn't always blow. Battery storage technology enables us to capture excess renewable energy during peak production and release it when needed, making renewable energy sources more reliable and practical for widespread adoption.

Together, these pieces of content provide a comprehensive view of how renewable generation and storage work as an integrated system to replace fossil fuels.`

      mockWriterSession.write.mockResolvedValue(mockAnalysis)

      const result = await aiWriterService.generateConnectionAnalysis(sourceItem, targetItem, connection)

      expect(result).toBe(mockAnalysis)
      expect(mockWriterSession.write).toHaveBeenCalledWith(
        expect.stringContaining('Analyze and explain the relationship')
      )
    })

    test('should generate research outline', async () => {
      const contentItems = [
        { title: 'AI Ethics Principles', type: 'article', summary: 'Ethical guidelines for AI' },
        { title: 'Algorithmic Bias Study', type: 'research', summary: 'Research on bias in ML systems' },
        { title: 'AI Governance Framework', type: 'policy', summary: 'Policy approaches to AI regulation' }
      ]

      const topic = 'Responsible AI Development'

      const mockOutline = `# Research Outline: Responsible AI Development

## I. Ethical Foundations
   A. Core principles and values
   B. Stakeholder perspectives
   C. Cultural considerations

## II. Technical Challenges  
   A. Algorithmic bias detection and mitigation
   B. Transparency and explainability
   C. Privacy and security considerations

## III. Governance and Policy
   A. Regulatory frameworks
   B. Industry standards
   C. International cooperation

## IV. Implementation Strategies
   A. Best practices for development teams
   B. Auditing and monitoring systems
   C. Continuous improvement processes

## V. Future Research Directions
   A. Emerging ethical challenges
   B. Technology evolution impacts
   C. Long-term societal implications`

      mockWriterSession.write.mockResolvedValue(mockOutline)

      const result = await aiWriterService.generateResearchOutline(contentItems, topic)

      expect(result).toBe(mockOutline)
      expect(mockWriterSession.write).toHaveBeenCalledWith(
        expect.stringContaining(`topic "${topic}"`)
      )
    })
  })

  describe('Service Management', () => {
    test('should provide accurate service statistics', () => {
      const stats = aiWriterService.getStats()

      expect(stats).toHaveProperty('insightsGenerated')
      expect(stats).toHaveProperty('notesEnhanced')
      expect(stats).toHaveProperty('processingTimeMs')
      expect(stats).toHaveProperty('errorCount')
      expect(stats).toHaveProperty('isInitialized')
      expect(stats).toHaveProperty('hasWriter')
      expect(stats).toHaveProperty('hasRewriter')
      expect(stats).toHaveProperty('queueLength')
      expect(stats).toHaveProperty('isProcessing')
    })

    test('should clear statistics', () => {
      // Simulate some activity
      aiWriterService.processingStats.insightsGenerated = 5
      aiWriterService.processingStats.errorCount = 2

      aiWriterService.clearStats()

      const stats = aiWriterService.getStats()
      expect(stats.insightsGenerated).toBe(0)
      expect(stats.errorCount).toBe(0)
      expect(stats.queueLength).toBe(0)
    })

    test('should cleanup resources properly', async () => {
      // Initialize with both sessions
      global.self.Writer.availability.mockResolvedValue('available')
      global.self.Rewriter.availability.mockResolvedValue('available')
      global.self.Writer.create.mockResolvedValue(mockWriterSession)
      global.self.Rewriter.create.mockResolvedValue(mockRewriterSession)

      await aiWriterService.initialize()

      expect(aiWriterService.isInitialized).toBe(true)

      await aiWriterService.cleanup()

      expect(mockWriterSession.destroy).toHaveBeenCalled()
      expect(mockRewriterSession.destroy).toHaveBeenCalled()
      expect(aiWriterService.writerSession).toBeNull()
      expect(aiWriterService.rewriterSession).toBeNull()
      expect(aiWriterService.isInitialized).toBe(false)
    })

    test('should handle cleanup errors gracefully', async () => {
      global.self.Writer.availability.mockResolvedValue('available')
      global.self.Writer.create.mockResolvedValue(mockWriterSession)
      await aiWriterService.initialize()

      mockWriterSession.destroy.mockRejectedValue(new Error('Cleanup error'))

      // Should not throw
      await expect(aiWriterService.cleanup()).resolves.toBeUndefined()
    })
  })

  describe('Content Preview Generation', () => {
    test('should generate content preview from contentText', () => {
      const contentItem = {
        contentText: 'A'.repeat(1500), // Long content
        summary: 'Short summary',
        isPhysical: false
      }

      const preview = aiWriterService.getContentPreview(contentItem)

      expect(preview.length).toBe(1000) // Should be truncated to 1000 chars
    })

    test('should use summary when contentText unavailable', () => {
      const contentItem = {
        summary: 'This is a summary',
        isPhysical: false
      }

      const preview = aiWriterService.getContentPreview(contentItem)

      expect(preview).toBe('This is a summary')
    })

    test('should add physical item metadata', () => {
      const contentItem = {
        contentText: 'Book content',
        author: 'John Doe',
        publisher: 'Test Publisher',
        isPhysical: true
      }

      const preview = aiWriterService.getContentPreview(contentItem)

      expect(preview).toContain('Book content')
      expect(preview).toContain('Author: John Doe')
      expect(preview).toContain('Publisher: Test Publisher')
    })

    test('should handle missing content gracefully', () => {
      const contentItem = { isPhysical: false }

      const preview = aiWriterService.getContentPreview(contentItem)

      expect(preview).toBe('No content preview available')
    })
  })
})
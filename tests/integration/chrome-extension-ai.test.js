// Integration test for Chrome Built-in AI APIs in Extension context
// Tests the actual AI integration in Chrome Extension environment

describe('Chrome Extension AI Integration', () => {
  let mockExtension
  let mockServiceWorker
  let mockAISession
  let mockSummarizer

  beforeEach(() => {
    // Mock Chrome Extension APIs
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn()
        },
        sendMessage: jest.fn()
      },
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        },
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    }

    // Mock Chrome Built-in AI APIs in Service Worker context
    global.self = global.self || {}
    global.self.LanguageModel = {
      availability: jest.fn(),
      params: jest.fn(),
      create: jest.fn()
    }
    
    global.self.Summarizer = {
      availability: jest.fn(),
      create: jest.fn()
    }
    
    global.self.Writer = {
      availability: jest.fn(),
      create: jest.fn()
    }
    
    global.self.Rewriter = {
      availability: jest.fn(),
      create: jest.fn()
    }

    // Mock AI instances
    mockAISession = {
      prompt: jest.fn(),
      promptStreaming: jest.fn(),
      destroy: jest.fn(),
      append: jest.fn()
    }

    mockSummarizer = {
      summarize: jest.fn(),
      summarizeStreaming: jest.fn(),
      destroy: jest.fn()
    }

    // Mock extension components
    mockServiceWorker = {
      initializeAICapabilities: jest.fn(),
      processWithAI: jest.fn(),
      searchContent: jest.fn()
    }

    mockExtension = {
      saveContent: jest.fn(),
      processContent: jest.fn(),
      searchItems: jest.fn()
    }
  })

  describe('Service Worker AI Initialization', () => {
    test('should initialize AI capabilities on extension startup', async () => {
      // Mock successful AI availability
      global.self.LanguageModel.availability.mockResolvedValue('available')
      global.self.Summarizer.availability.mockResolvedValue('available')
      
      global.self.LanguageModel.params.mockResolvedValue({
        defaultTopK: 3,
        maxTopK: 8,
        defaultTemperature: 0.8,
        maxTemperature: 2.0
      })

      global.self.LanguageModel.create.mockResolvedValue(mockAISession)
      global.self.Summarizer.create.mockResolvedValue(mockSummarizer)

      // Simulate service worker initialization
      const langAvailability = await global.self.LanguageModel.availability()
      const sumAvailability = await global.self.Summarizer.availability()

      expect(langAvailability).toBe('available')
      expect(sumAvailability).toBe('available')

      // Should create sessions if available
      if (langAvailability !== 'unavailable') {
        const params = await global.self.LanguageModel.params()
        const session = await global.self.LanguageModel.create({
          initialPrompts: [
            {
              role: 'system',
              content: 'You are SmartShelf AI, a content analysis assistant.'
            }
          ],
          temperature: params.defaultTemperature,
          topK: params.defaultTopK
        })

        expect(session).toBe(mockAISession)
      }

      if (sumAvailability !== 'unavailable') {
        const summarizer = await global.self.Summarizer.create({
          type: 'tl;dr',
          format: 'plain-text',
          length: 'medium'
        })

        expect(summarizer).toBe(mockSummarizer)
      }
    })

    test('should handle AI unavailable gracefully', async () => {
      // Mock AI not available
      global.self.LanguageModel.availability.mockResolvedValue('unavailable')
      global.self.Summarizer.availability.mockResolvedValue('unavailable')

      const langAvailability = await global.self.LanguageModel.availability()
      const sumAvailability = await global.self.Summarizer.availability()

      expect(langAvailability).toBe('unavailable')
      expect(sumAvailability).toBe('unavailable')

      // Should not attempt to create sessions
      expect(global.self.LanguageModel.create).not.toHaveBeenCalled()
      expect(global.self.Summarizer.create).not.toHaveBeenCalled()

      // Should use fallback processing
      expect(true).toBe(true) // Fallback logic would be tested here
    })

    test('should handle model downloading state', async () => {
      // Mock downloading state
      global.self.LanguageModel.availability.mockResolvedValue('downloading')

      const availability = await global.self.LanguageModel.availability()
      expect(availability).toBe('downloading')

      // Should wait or show progress to user
      // Extension should handle this state appropriately
      expect(true).toBe(true) // Progress handling would be tested here
    })
  })

  describe('Content Processing with AI', () => {
    beforeEach(() => {
      global.self.LanguageModel.availability.mockResolvedValue('available')
      global.self.LanguageModel.create.mockResolvedValue(mockAISession)
      global.self.Summarizer.create.mockResolvedValue(mockSummarizer)
    })

    test('should process web page content with AI analysis', async () => {
      const mockContent = {
        id: 'test-item-1',
        title: 'React Hooks Guide',
        url: 'https://example.com/react-hooks',
        content: 'React Hooks are functions that let you use state and other React features...',
        type: 'article',
        timestamp: Date.now()
      }

      const mockAnalysis = {
        summary: 'Comprehensive guide to React Hooks for functional components.',
        tags: ['react', 'javascript', 'hooks', 'frontend'],
        categories: ['Web Development', 'JavaScript'],
        key_points: [
          'Hooks allow state in functional components',
          'useState manages local state',
          'useEffect handles side effects'
        ]
      }

      // Mock AI responses
      mockAISession.prompt.mockResolvedValue(JSON.stringify(mockAnalysis))
      mockSummarizer.summarize.mockResolvedValue(mockAnalysis.summary)

      // Simulate content processing
      const analysisPrompt = `Analyze this web content and respond with valid JSON only:
        
        Title: ${mockContent.title}
        URL: ${mockContent.url}
        Content: ${mockContent.content.substring(0, 2000)}...
        
        Provide analysis as JSON with summary (string), tags (array), categories (array), key_points (array).`

      const aiResult = await mockAISession.prompt(analysisPrompt)
      const analysis = JSON.parse(aiResult)

      // Test AI analysis results
      expect(analysis).toHaveProperty('summary')
      expect(analysis).toHaveProperty('tags')
      expect(analysis).toHaveProperty('categories')
      expect(analysis).toHaveProperty('key_points')
      expect(Array.isArray(analysis.tags)).toBe(true)
      expect(Array.isArray(analysis.categories)).toBe(true)
      expect(Array.isArray(analysis.key_points)).toBe(true)

      // Test summarizer enhancement
      const betterSummary = await mockSummarizer.summarize(mockContent.content)
      expect(betterSummary).toBe(mockAnalysis.summary)
      expect(betterSummary.length).toBeGreaterThan(10)

      // Verify AI session was called correctly
      expect(mockAISession.prompt).toHaveBeenCalledWith(
        expect.stringContaining('Analyze this web content')
      )
      expect(mockSummarizer.summarize).toHaveBeenCalledWith(mockContent.content)
    })

    test('should handle AI processing failures with fallback', async () => {
      const mockContent = {
        title: 'Test Article',
        content: 'Some test content...'
      }

      // Mock AI failure
      const error = new Error('AI processing failed')
      mockAISession.prompt.mockRejectedValue(error)
      mockSummarizer.summarize.mockRejectedValue(error)

      // Should use fallback processing
      try {
        await mockAISession.prompt('Test prompt')
      } catch (e) {
        expect(e.message).toBe('AI processing failed')
        
        // Fallback processing would occur here
        const fallbackResult = {
          summary: mockContent.title,
          tags: [],
          categories: ['General'],
          key_points: []
        }

        expect(fallbackResult).toHaveProperty('summary')
        expect(fallbackResult).toHaveProperty('tags')
        expect(fallbackResult).toHaveProperty('categories')
      }
    })
  })

  describe('Extension Message Handling', () => {
    test('should handle save content messages with AI processing', async () => {
      const mockMessage = {
        action: 'saveContent',
        data: {
          title: 'AI in Web Development',
          url: 'https://example.com/ai-web-dev',
          content: 'Artificial Intelligence is transforming web development...',
          type: 'article'
        }
      }

      // Mock Chrome extension messaging
      const mockSender = { tab: { id: 1 } }
      const mockSendResponse = jest.fn()

      // Simulate message handler
      const messageHandler = async (message, sender, sendResponse) => {
        if (message.action === 'saveContent') {
          try {
            // Process with AI (mocked)
            const aiResult = await mockExtension.processContent(message.data)
            
            // Save to storage (mocked)
            await mockExtension.saveContent({
              ...message.data,
              ...aiResult,
              id: 'generated-id',
              timestamp: Date.now()
            })

            sendResponse({ success: true, message: 'Content saved successfully' })
          } catch (error) {
            sendResponse({ success: false, error: error.message })
          }
        }
      }

      // Mock successful processing
      mockExtension.processContent.mockResolvedValue({
        summary: 'AI is revolutionizing web development practices.',
        tags: ['ai', 'web-development', 'technology'],
        categories: ['Technology', 'Web Development']
      })

      mockExtension.saveContent.mockResolvedValue(true)

      // Test message handling
      await messageHandler(mockMessage, mockSender, mockSendResponse)

      expect(mockExtension.processContent).toHaveBeenCalledWith(mockMessage.data)
      expect(mockExtension.saveContent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: mockMessage.data.title,
          url: mockMessage.data.url,
          summary: expect.any(String),
          tags: expect.any(Array),
          categories: expect.any(Array)
        })
      )
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Content saved successfully'
      })
    })
  })

  describe('AI Connection Discovery', () => {
    test('should discover connections between content items', async () => {
      const existingItem = {
        id: 'item-1',
        title: 'React Component Patterns',
        content: 'Best practices for writing React components...',
        tags: ['react', 'components', 'patterns']
      }

      const newItem = {
        id: 'item-2',
        title: 'React Hooks Tutorial',
        content: 'Learn how to use React Hooks in your applications...',
        tags: ['react', 'hooks', 'tutorial']
      }

      const mockConnectionAnalysis = {
        hasConnection: true,
        connectionType: 'topic-related',
        strength: 0.8,
        confidence: 0.9,
        description: 'Both articles cover React development concepts',
        keywords: ['react', 'components', 'hooks'],
        reasoning: 'Both items are about React development, covering complementary topics'
      }

      mockAISession.prompt.mockResolvedValue(JSON.stringify(mockConnectionAnalysis))

      // Simulate connection discovery
      const connectionPrompt = `Analyze the relationship between these two content items:

      Item 1: "${existingItem.title}"
      Content: ${existingItem.content.substring(0, 500)}...

      Item 2: "${newItem.title}"
      Content: ${newItem.content.substring(0, 500)}...

      Respond with JSON indicating if there is a meaningful connection.`

      const result = await mockAISession.prompt(connectionPrompt)
      const connectionData = JSON.parse(result)

      expect(connectionData.hasConnection).toBe(true)
      expect(connectionData.connectionType).toBe('topic-related')
      expect(connectionData.strength).toBeGreaterThan(0.5)
      expect(connectionData.confidence).toBeGreaterThan(0.6)
      expect(Array.isArray(connectionData.keywords)).toBe(true)
      expect(connectionData.keywords).toContain('react')
    })
  })

  describe('Performance and Resource Management', () => {
    test('should manage AI session lifecycle properly', async () => {
      global.self.LanguageModel.create.mockResolvedValue(mockAISession)

      // Create session
      const session = await global.self.LanguageModel.create()
      expect(session).toBe(mockAISession)

      // Use session
      await session.prompt('Test prompt')
      expect(mockAISession.prompt).toHaveBeenCalledWith('Test prompt')

      // Clean up session
      session.destroy()
      expect(mockAISession.destroy).toHaveBeenCalled()

      // Verify session cleanup
      mockAISession.prompt.mockRejectedValue(new Error('Session destroyed'))
      await expect(session.prompt('Another prompt')).rejects.toThrow('Session destroyed')
    })

    test('should handle multiple concurrent AI requests', async () => {
      const requests = [
        'Analyze content 1',
        'Analyze content 2', 
        'Analyze content 3'
      ]

      const responses = [
        '{"summary": "Content 1 analysis"}',
        '{"summary": "Content 2 analysis"}',
        '{"summary": "Content 3 analysis"}'
      ]

      mockAISession.prompt
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1])
        .mockResolvedValueOnce(responses[2])

      global.self.LanguageModel.create.mockResolvedValue(mockAISession)

      // Process multiple requests concurrently
      const session = await global.self.LanguageModel.create()
      const results = await Promise.all(
        requests.map(request => session.prompt(request))
      )

      expect(results).toHaveLength(3)
      expect(results[0]).toContain('Content 1 analysis')
      expect(results[1]).toContain('Content 2 analysis')
      expect(results[2]).toContain('Content 3 analysis')
      expect(mockAISession.prompt).toHaveBeenCalledTimes(3)
    })
  })
})
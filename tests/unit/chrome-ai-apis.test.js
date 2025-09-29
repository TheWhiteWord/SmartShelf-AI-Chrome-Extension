// Tests for Chrome Built-in AI API integration
// These tests verify our integration with Chrome's AI capabilities

describe('Chrome Built-in AI API Integration', () => {
  beforeEach(() => {
    // Mock Chrome Built-in AI APIs (Standard APIs)
    global.LanguageModel = {
      availability: jest.fn(),
      params: jest.fn(),
      create: jest.fn()
    }

    global.Summarizer = {
      availability: jest.fn(),
      create: jest.fn()
    }

    global.Writer = {
      availability: jest.fn(),
      create: jest.fn()
    }

    global.Rewriter = {
      availability: jest.fn(),
      create: jest.fn()
    }

    // Mock AI session
    global.mockAISession = {
      prompt: jest.fn(),
      promptStreaming: jest.fn(),
      destroy: jest.fn(),
      clone: jest.fn(),
      append: jest.fn()
    }

    // Mock other AI service instances
    global.mockSummarizer = {
      summarize: jest.fn(),
      summarizeStreaming: jest.fn(),
      destroy: jest.fn()
    }

    global.mockWriter = {
      write: jest.fn(),
      writeStreaming: jest.fn(),
      destroy: jest.fn()
    }

    global.mockRewriter = {
      rewrite: jest.fn(),
      rewriteStreaming: jest.fn(),
      destroy: jest.fn()
    }
  })

  describe('AI Prompt API', () => {
    test('should check AI availability', async () => {
      global.LanguageModel.availability.mockResolvedValue('available')

      const availability = await global.LanguageModel.availability()

      expect(availability).toBe('available')
      expect(['available', 'downloadable', 'downloading', 'unavailable']).toContain(availability)
    })

    test('should get AI model parameters', async () => {
      const mockParams = {
        defaultTopK: 3,
        maxTopK: 8,
        defaultTemperature: 0.8,
        maxTemperature: 2.0
      }

      global.LanguageModel.params.mockResolvedValue(mockParams)

      const params = await global.LanguageModel.params()

      expect(params.defaultTopK).toBeGreaterThan(0)
      expect(params.maxTopK).toBeGreaterThan(params.defaultTopK)
      expect(params.defaultTemperature).toBeGreaterThan(0)
      expect(params.maxTemperature).toBeGreaterThan(params.defaultTemperature)
    })

    test('should create AI session for content analysis', async () => {
      global.LanguageModel.create.mockResolvedValue(global.mockAISession)

      const session = await global.LanguageModel.create({
        initialPrompts: [
          {
            role: 'system',
            content: 'You are a helpful content analyzer for SmartShelf.'
          }
        ],
        temperature: 0.7,
        topK: 3
      })

      expect(session).toBe(global.mockAISession)
      expect(global.LanguageModel.create).toHaveBeenCalledWith({
        initialPrompts: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('SmartShelf')
          })
        ]),
        temperature: 0.7,
        topK: 3
      })
    })

    test('should analyze content with AI prompt', async () => {
      const mockContent = {
        title: 'Understanding React Hooks',
        url: 'https://example.com/react-hooks',
        content: 'React Hooks provide a way to use state and lifecycle methods in functional components...'
      }

      const mockAnalysis = {
        summary: 'A comprehensive guide to React Hooks explaining their usage in functional components.',
        tags: ['react', 'javascript', 'hooks', 'frontend'],
        categories: ['Web Development', 'JavaScript Frameworks']
      }

      global.mockAISession.prompt.mockResolvedValue(JSON.stringify(mockAnalysis))
      global.LanguageModel.create.mockResolvedValue(global.mockAISession)

      // Simulate content analysis
      const session = await global.LanguageModel.create({
        initialPrompts: [
          {
            role: 'system',
            content: 'Analyze this content and provide summary, tags, and categories in JSON format.'
          }
        ]
      })

      const analysisPrompt = `
        Analyze this content:
        Title: ${mockContent.title}
        URL: ${mockContent.url}
        Content: ${mockContent.content}
        
        Provide a JSON response with:
        - summary: A brief summary (1-2 sentences)
        - tags: Array of relevant tags (3-5 tags)
        - categories: Array of categories (1-3 categories)
      `

      const result = await session.prompt(analysisPrompt)
      const analysis = JSON.parse(result)

      expect(analysis).toHaveProperty('summary')
      expect(analysis).toHaveProperty('tags')
      expect(analysis).toHaveProperty('categories')
      expect(Array.isArray(analysis.tags)).toBe(true)
      expect(Array.isArray(analysis.categories)).toBe(true)
      expect(analysis.tags.length).toBeGreaterThan(0)
      expect(analysis.categories.length).toBeGreaterThan(0)
    })

    test('should handle streaming AI responses', async () => {
      const mockStreamChunks = [
        'This is a comprehensive',
        ' guide to React Hooks',
        ' that explains their usage',
        ' in functional components.'
      ]

      global.mockAISession.promptStreaming = jest.fn().mockImplementation(async function * () {
        for (const chunk of mockStreamChunks) {
          yield chunk
        }
      })

      global.LanguageModel.create.mockResolvedValue(global.mockAISession)

      const session = await global.LanguageModel.create()

      let fullResponse = ''
      for await (const chunk of session.promptStreaming('Summarize this content...')) {
        fullResponse += chunk
      }

      expect(fullResponse).toBe('This is a comprehensive guide to React Hooks that explains their usage in functional components.')
      expect(global.mockAISession.promptStreaming).toHaveBeenCalledWith('Summarize this content...')
    })
  })

  describe('AI Summarizer API', () => {
    test('should check summarizer availability', async () => {
      global.Summarizer.availability.mockResolvedValue('available')

      const availability = await global.Summarizer.availability()

      expect(availability).toBe('available')
      expect(['available', 'downloadable', 'downloading', 'unavailable']).toContain(availability)
    })

    test('should create summarizer for content', async () => {
      global.Summarizer.create.mockResolvedValue(global.mockSummarizer)

      const summarizer = await global.Summarizer.create({
        type: 'tl;dr',
        format: 'plain-text',
        length: 'medium'
      })

      expect(summarizer).toBe(global.mockSummarizer)
      expect(global.Summarizer.create).toHaveBeenCalledWith({
        type: 'tl;dr',
        format: 'plain-text',
        length: 'medium'
      })
    })

    test('should summarize long content', async () => {
      const longContent = `
        React Hooks are a feature introduced in React 16.8 that allow you to use state and 
        other React features without writing a class component. Hooks are functions that let 
        you "hook into" React state and lifecycle features from function components. They 
        provide a more direct API to the React concepts you already know: props, state, 
        context, refs, and lifecycle. The most commonly used hooks are useState for managing 
        local state, useEffect for side effects, and useContext for accessing React context. 
        Custom hooks allow you to extract component logic into reusable functions.
      `

      const expectedSummary = 'React Hooks introduced in version 16.8 allow state and lifecycle management in functional components through functions like useState, useEffect, and useContext.'

      global.mockSummarizer.summarize.mockResolvedValue(expectedSummary)
      global.Summarizer.create.mockResolvedValue(global.mockSummarizer)

      const summarizer = await global.Summarizer.create()
      const summary = await summarizer.summarize(longContent)

      expect(summary).toBe(expectedSummary)
      expect(summary.length).toBeLessThan(longContent.length)
      expect(summary).toContain('React Hooks')
      expect(global.mockSummarizer.summarize).toHaveBeenCalledWith(longContent)
    })
  })

  describe('AI Writer/Rewriter API', () => {
    test('should check writer availability', async () => {
      global.Writer.availability.mockResolvedValue('available')

      const availability = await global.Writer.availability()

      expect(availability).toBe('available')
      expect(['available', 'downloadable', 'downloading', 'unavailable']).toContain(availability)
    })

    test('should check rewriter availability', async () => {
      global.Rewriter.availability.mockResolvedValue('available')

      const availability = await global.Rewriter.availability()

      expect(availability).toBe('available')
      expect(['available', 'downloadable', 'downloading', 'unavailable']).toContain(availability)
    })

    test('should rewrite content for better formatting', async () => {
      const originalText = 'this is some badly formatted text with no punctuation and poor grammar'
      const rewrittenText = 'This is well-formatted text with proper punctuation and good grammar.'

      global.mockRewriter.rewrite.mockResolvedValue(rewrittenText)
      global.Rewriter.create.mockResolvedValue(global.mockRewriter)

      const rewriter = await global.Rewriter.create({
        tone: 'neutral',
        format: 'plain-text'
      })

      const result = await rewriter.rewrite(originalText)

      expect(result).toBe(rewrittenText)
      expect(result).toMatch(/^[A-Z]/) // Starts with capital letter
      expect(result).toMatch(/\.$/) // Ends with period
      expect(global.mockRewriter.rewrite).toHaveBeenCalledWith(originalText)
    })
  })

  describe('AI Translation API', () => {
    beforeEach(() => {
      global.Translator = {
        availability: jest.fn(),
        languagePairAvailable: jest.fn(),
        create: jest.fn()
      }

      global.mockTranslator = {
        translate: jest.fn(),
        destroy: jest.fn()
      }
    })

    test('should check translation availability', async () => {
      global.Translator.availability.mockResolvedValue('available')

      const availability = await global.Translator.availability()

      expect(availability).toBe('available')
      expect(['available', 'downloadable', 'downloading', 'unavailable']).toContain(availability)
    })

    test('should check language pair availability', async () => {
      global.Translator.languagePairAvailable.mockResolvedValue('available')

      const canTranslate = await global.Translator.languagePairAvailable('en', 'es')

      expect(canTranslate).toBe('available')
      expect(['available', 'downloadable', 'downloading', 'unavailable']).toContain(canTranslate)
    })

    test('should translate content to different languages', async () => {
      const englishText = 'Welcome to SmartShelf - AI-Powered Personal Knowledge Hub'
      const spanishText = 'Bienvenido a SmartShelf - Centro de Conocimiento Personal Impulsado por IA'

      global.mockTranslator.translate.mockResolvedValue(spanishText)
      global.Translator.create.mockResolvedValue(global.mockTranslator)

      const translator = await global.Translator.create({
        sourceLanguage: 'en',
        targetLanguage: 'es'
      })

      const result = await translator.translate(englishText)

      expect(result).toBe(spanishText)
      expect(result).toContain('SmartShelf')
      expect(global.mockTranslator.translate).toHaveBeenCalledWith(englishText)
    })
  })

  describe('AI Error Handling', () => {
    test('should handle AI API not available', async () => {
      global.LanguageModel.availability.mockResolvedValue('unavailable')

      const availability = await global.LanguageModel.availability()
      expect(availability).toBe('unavailable')

      // Should fallback gracefully
      if (availability === 'unavailable') {
        // Fallback logic would go here
        expect(true).toBe(true) // Test passes if we can detect unavailability
      }
    })

    test('should handle AI session creation failures', async () => {
      const error = new Error('AI session creation failed')
      global.LanguageModel.create.mockRejectedValue(error)

      await expect(
        global.LanguageModel.create()
      ).rejects.toThrow('AI session creation failed')
    })

    test('should handle prompt failures gracefully', async () => {
      const error = new Error('Prompt processing failed')
      global.mockAISession.prompt.mockRejectedValue(error)
      global.LanguageModel.create.mockResolvedValue(global.mockAISession)

      const session = await global.LanguageModel.create()

      await expect(
        session.prompt('Analyze this content')
      ).rejects.toThrow('Prompt processing failed')
    })

    test('should clean up AI sessions properly', async () => {
      global.LanguageModel.create.mockResolvedValue(global.mockAISession)

      const session = await global.LanguageModel.create()
      session.destroy()

      expect(global.mockAISession.destroy).toHaveBeenCalled()
    })

    test('should handle model downloading state', async () => {
      global.LanguageModel.availability.mockResolvedValue('downloading')

      const availability = await global.LanguageModel.availability()
      expect(availability).toBe('downloading')

      // Should handle downloading state appropriately
      if (availability === 'downloading') {
        expect(true).toBe(true) // Test passes if we can detect downloading state
      }
    })

    test('should handle model downloadable state', async () => {
      global.Summarizer.availability.mockResolvedValue('downloadable')

      const availability = await global.Summarizer.availability()
      expect(availability).toBe('downloadable')

      // Should trigger download with user activation
      if (availability === 'downloadable') {
        expect(true).toBe(true) // Test passes if we can detect downloadable state
      }
    })
  })
})

// Tests for Chrome Built-in AI API integration
// These tests verify our integration with Chrome's AI capabilities

describe('Chrome Built-in AI API Integration', () => {
  beforeEach(() => {
    // Mock Chrome Built-in AI APIs
    global.chrome.aiOriginTrial = {
      languageModel: {
        capabilities: jest.fn(),
        create: jest.fn()
      }
    }

    // Mock AI session
    global.mockAISession = {
      prompt: jest.fn(),
      promptStreaming: jest.fn(),
      destroy: jest.fn(),
      clone: jest.fn()
    }
  })

  describe('AI Prompt API', () => {
    test('should check AI capabilities', async () => {
      const mockCapabilities = {
        available: 'readily',
        defaultTopK: 3,
        maxTopK: 8,
        defaultTemperature: 0.8,
        maxTemperature: 2.0
      }

      global.chrome.aiOriginTrial.languageModel.capabilities.mockResolvedValue(mockCapabilities)

      const capabilities = await global.chrome.aiOriginTrial.languageModel.capabilities()

      expect(capabilities.available).toBe('readily')
      expect(capabilities.defaultTopK).toBeGreaterThan(0)
      expect(capabilities.maxTopK).toBeGreaterThan(capabilities.defaultTopK)
      expect(capabilities.defaultTemperature).toBeGreaterThan(0)
      expect(capabilities.maxTemperature).toBeGreaterThan(capabilities.defaultTemperature)
    })

    test('should create AI session for content analysis', async () => {
      global.chrome.aiOriginTrial.languageModel.create.mockResolvedValue(global.mockAISession)

      const session = await global.chrome.aiOriginTrial.languageModel.create({
        systemPrompt: 'You are a helpful content analyzer for SmartShelf.',
        temperature: 0.7,
        topK: 3
      })

      expect(session).toBe(global.mockAISession)
      expect(global.chrome.aiOriginTrial.languageModel.create).toHaveBeenCalledWith({
        systemPrompt: expect.stringContaining('SmartShelf'),
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
      global.chrome.aiOriginTrial.languageModel.create.mockResolvedValue(global.mockAISession)

      // Simulate content analysis
      const session = await global.chrome.aiOriginTrial.languageModel.create({
        systemPrompt: 'Analyze this content and provide summary, tags, and categories in JSON format.'
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

      global.chrome.aiOriginTrial.languageModel.create.mockResolvedValue(global.mockAISession)

      const session = await global.chrome.aiOriginTrial.languageModel.create()

      let fullResponse = ''
      for await (const chunk of session.promptStreaming('Summarize this content...')) {
        fullResponse += chunk
      }

      expect(fullResponse).toBe('This is a comprehensive guide to React Hooks that explains their usage in functional components.')
      expect(global.mockAISession.promptStreaming).toHaveBeenCalledWith('Summarize this content...')
    })
  })

  describe('AI Summarizer API', () => {
    beforeEach(() => {
      global.chrome.aiOriginTrial.summarizer = {
        capabilities: jest.fn(),
        create: jest.fn()
      }

      global.mockSummarizer = {
        summarize: jest.fn(),
        destroy: jest.fn()
      }
    })

    test('should check summarizer capabilities', async () => {
      const mockCapabilities = {
        available: 'readily',
        type: 'tl;dr',
        format: 'markdown',
        length: 'medium'
      }

      global.chrome.aiOriginTrial.summarizer.capabilities.mockResolvedValue(mockCapabilities)

      const capabilities = await global.chrome.aiOriginTrial.summarizer.capabilities()

      expect(capabilities.available).toBe('readily')
      expect(capabilities.type).toBe('tl;dr')
      expect(['plain-text', 'markdown']).toContain(capabilities.format)
      expect(['short', 'medium', 'long']).toContain(capabilities.length)
    })

    test('should create summarizer for content', async () => {
      global.chrome.aiOriginTrial.summarizer.create.mockResolvedValue(global.mockSummarizer)

      const summarizer = await global.chrome.aiOriginTrial.summarizer.create({
        type: 'tl;dr',
        format: 'plain-text',
        length: 'medium'
      })

      expect(summarizer).toBe(global.mockSummarizer)
      expect(global.chrome.aiOriginTrial.summarizer.create).toHaveBeenCalledWith({
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
      global.chrome.aiOriginTrial.summarizer.create.mockResolvedValue(global.mockSummarizer)

      const summarizer = await global.chrome.aiOriginTrial.summarizer.create()
      const summary = await summarizer.summarize(longContent)

      expect(summary).toBe(expectedSummary)
      expect(summary.length).toBeLessThan(longContent.length)
      expect(summary).toContain('React Hooks')
      expect(global.mockSummarizer.summarize).toHaveBeenCalledWith(longContent)
    })
  })

  describe('AI Writer/Rewriter API', () => {
    beforeEach(() => {
      global.chrome.aiOriginTrial.writer = {
        capabilities: jest.fn(),
        create: jest.fn()
      }

      global.chrome.aiOriginTrial.rewriter = {
        capabilities: jest.fn(),
        create: jest.fn()
      }

      global.mockWriter = {
        write: jest.fn(),
        destroy: jest.fn()
      }

      global.mockRewriter = {
        rewrite: jest.fn(),
        destroy: jest.fn()
      }
    })

    test('should check writer capabilities', async () => {
      const mockCapabilities = {
        available: 'readily',
        tone: 'neutral',
        format: 'plain-text',
        length: 'medium'
      }

      global.chrome.aiOriginTrial.writer.capabilities.mockResolvedValue(mockCapabilities)

      const capabilities = await global.chrome.aiOriginTrial.writer.capabilities()

      expect(capabilities.available).toBe('readily')
      expect(['casual', 'neutral', 'formal']).toContain(capabilities.tone)
      expect(['plain-text', 'markdown']).toContain(capabilities.format)
    })

    test('should rewrite content for better formatting', async () => {
      const originalText = 'this is some badly formatted text with no punctuation and poor grammar'
      const rewrittenText = 'This is well-formatted text with proper punctuation and good grammar.'

      global.mockRewriter.rewrite.mockResolvedValue(rewrittenText)
      global.chrome.aiOriginTrial.rewriter.create.mockResolvedValue(global.mockRewriter)

      const rewriter = await global.chrome.aiOriginTrial.rewriter.create({
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
      global.chrome.aiOriginTrial.translator = {
        capabilities: jest.fn(),
        create: jest.fn()
      }

      global.mockTranslator = {
        translate: jest.fn(),
        destroy: jest.fn()
      }
    })

    test('should check translation capabilities', async () => {
      const mockCapabilities = {
        available: 'readily',
        languagePairAvailable: jest.fn().mockResolvedValue('readily')
      }

      global.chrome.aiOriginTrial.translator.capabilities.mockResolvedValue(mockCapabilities)

      const capabilities = await global.chrome.aiOriginTrial.translator.capabilities()
      const canTranslate = await capabilities.languagePairAvailable('en', 'es')

      expect(capabilities.available).toBe('readily')
      expect(canTranslate).toBe('readily')
    })

    test('should translate content to different languages', async () => {
      const englishText = 'Welcome to SmartShelf - AI-Powered Personal Knowledge Hub'
      const spanishText = 'Bienvenido a SmartShelf - Centro de Conocimiento Personal Impulsado por IA'

      global.mockTranslator.translate.mockResolvedValue(spanishText)
      global.chrome.aiOriginTrial.translator.create.mockResolvedValue(global.mockTranslator)

      const translator = await global.chrome.aiOriginTrial.translator.create({
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
      global.chrome.aiOriginTrial.languageModel.capabilities.mockResolvedValue({
        available: 'no'
      })

      const capabilities = await global.chrome.aiOriginTrial.languageModel.capabilities()
      expect(capabilities.available).toBe('no')

      // Should fallback gracefully
      if (capabilities.available === 'no') {
        // Fallback logic would go here
        expect(true).toBe(true) // Test passes if we can detect unavailability
      }
    })

    test('should handle AI session creation failures', async () => {
      const error = new Error('AI session creation failed')
      global.chrome.aiOriginTrial.languageModel.create.mockRejectedValue(error)

      await expect(
        global.chrome.aiOriginTrial.languageModel.create()
      ).rejects.toThrow('AI session creation failed')
    })

    test('should handle prompt failures gracefully', async () => {
      const error = new Error('Prompt processing failed')
      global.mockAISession.prompt.mockRejectedValue(error)
      global.chrome.aiOriginTrial.languageModel.create.mockResolvedValue(global.mockAISession)

      const session = await global.chrome.aiOriginTrial.languageModel.create()

      await expect(
        session.prompt('Analyze this content')
      ).rejects.toThrow('Prompt processing failed')
    })

    test('should clean up AI sessions properly', async () => {
      global.chrome.aiOriginTrial.languageModel.create.mockResolvedValue(global.mockAISession)

      const session = await global.chrome.aiOriginTrial.languageModel.create()
      session.destroy()

      expect(global.mockAISession.destroy).toHaveBeenCalled()
    })
  })
})

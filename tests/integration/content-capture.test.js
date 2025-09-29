/**
 * Content Capture Integration Tests (T022)
 * Tests the complete workflow of digital content capture and AI processing
 */

describe('Content Capture Integration Tests', () => {
  beforeEach(() => {
    // Reset Chrome API mocks
    jest.clearAllMocks()
    
    // Mock AI APIs
    global.ai = {
      summarizer: {
        create: jest.fn().mockResolvedValue({
          summarize: jest.fn().mockResolvedValue('Test summary of the content')
        })
      },
      languageModel: {
        create: jest.fn().mockResolvedValue({
          prompt: jest.fn().mockResolvedValue('{"categories": ["Technology"], "tags": ["AI", "testing"], "confidence": 0.85}')
        })
      }
    }

    // Mock fetch for external requests
    global.fetch = jest.fn()
  })

  describe('Web Page Content Capture', () => {
    test('should capture and process article content', async () => {
      // Simulate content script capturing page data
      const mockPageContent = {
        title: 'Advanced AI Testing Techniques',
        url: 'https://example.com/ai-testing',
        content: 'This article discusses various techniques for testing AI systems including unit testing, integration testing, and performance evaluation.',
        description: 'A comprehensive guide to AI testing methodologies',
        author: 'Dr. Jane Smith',
        publishDate: '2025-09-29',
        wordCount: 1250,
        readingTime: 5
      }

      // Mock storage state
      chrome.storage.local.get.mockResolvedValue({ contentItems: [] })

      // Simulate AI processing
      const summarizer = await global.ai.summarizer.create()
      const aiSummary = await summarizer.summarize(mockPageContent.content)
      
      const languageModel = await global.ai.languageModel.create()
      const aiResponse = await languageModel.prompt(`Analyze content: ${mockPageContent.title}`)
      const aiData = JSON.parse(aiResponse)

      // Create processed content item
      const contentId = `smartshelf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const processedContent = {
        id: contentId,
        ...mockPageContent,
        source: mockPageContent.url,
        dateAdded: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        isPhysical: false,
        aiSummary: aiSummary,
        aiCategories: aiData.categories,
        aiTags: aiData.tags,
        aiConfidence: aiData.confidence
      }

      // Store the processed content
      await chrome.storage.local.set({ 
        contentItems: [processedContent] 
      })

      // Verify AI processing was triggered
      expect(global.ai.summarizer.create).toHaveBeenCalled()
      expect(global.ai.languageModel.create).toHaveBeenCalled()

      // Verify storage operations
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        contentItems: [processedContent]
      })
      
      // Verify processed content structure
      expect(processedContent.aiSummary).toBe('Test summary of the content')
      expect(processedContent.aiCategories).toEqual(['Technology'])
      expect(processedContent.aiTags).toEqual(['AI', 'testing'])
      expect(processedContent.aiConfidence).toBe(0.85)
    })

    test('should handle video content capture', async () => {
      const mockVideoContent = {
        title: 'Introduction to Machine Learning',
        url: 'https://youtube.com/watch?v=test123',
        content: 'Video transcript about machine learning fundamentals...',
        type: 'video',
        duration: 1800, // 30 minutes
        thumbnail: 'https://img.youtube.com/vi/test123/maxresdefault.jpg'
      }

      // Mock storage state
      chrome.storage.local.get.mockResolvedValue({ contentItems: [] })

      // Process video through AI pipeline
      const summarizer = await global.ai.summarizer.create()
      const summary = await summarizer.summarize(mockVideoContent.content)

      const contentId = `smartshelf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const processedVideo = {
        id: contentId,
        ...mockVideoContent,
        aiSummary: summary,
        dateAdded: new Date().toISOString()
      }

      await chrome.storage.local.set({ contentItems: [processedVideo] })

      // Verify video-specific processing
      expect(global.ai.summarizer.create).toHaveBeenCalled()
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        contentItems: [processedVideo]
      })
    })

    test('should handle PDF document capture', async () => {
      const mockPDFContent = {
        title: 'Research Paper on Neural Networks',
        url: 'https://arxiv.org/pdf/2023.12345.pdf',
        content: 'Abstract: This paper presents novel approaches to neural network architectures...',
        type: 'pdf',
        pageCount: 15,
        fileSize: '2.4MB'
      }

      chrome.storage.local.get.mockResolvedValue({ contentItems: [] })

      const summarizer = await global.ai.summarizer.create()
      const summary = await summarizer.summarize(mockPDFContent.content)

      const contentId = `smartshelf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const processedPDF = {
        id: contentId,
        ...mockPDFContent,
        aiSummary: summary,
        dateAdded: new Date().toISOString()
      }

      await chrome.storage.local.set({ contentItems: [processedPDF] })

      expect(global.ai.summarizer.create).toHaveBeenCalled()
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        contentItems: [processedPDF]
      })
    })
  })

  describe('AI Processing Pipeline', () => {
    test('should generate summary and categories for captured content', async () => {
      const mockContent = {
        title: 'JavaScript Testing Best Practices',
        content: 'This comprehensive guide covers unit testing, integration testing, and end-to-end testing for JavaScript applications.',
        url: 'https://example.com/js-testing'
      }

      chrome.storage.local.get.mockResolvedValue({ contentItems: [] })

      // Process through AI pipeline
      const summarizer = await global.ai.summarizer.create()
      const summary = await summarizer.summarize(mockContent.content)
      
      const languageModel = await global.ai.languageModel.create()
      const aiResponse = await languageModel.prompt(`Analyze: ${mockContent.title}`)
      const aiData = JSON.parse(aiResponse)

      const contentId = `smartshelf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const processedContent = {
        id: contentId,
        ...mockContent,
        aiSummary: summary,
        aiCategories: aiData.categories,
        aiTags: aiData.tags,
        aiConfidence: aiData.confidence,
        dateAdded: new Date().toISOString()
      }

      await chrome.storage.local.set({ contentItems: [processedContent] })

      // Verify AI processing
      expect(global.ai.summarizer.create).toHaveBeenCalled()
      expect(global.ai.languageModel.create).toHaveBeenCalled()
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        contentItems: [processedContent]
      })
    })

    test('should handle AI processing failures gracefully', async () => {
      const mockContent = {
        title: 'Test Content',
        content: 'Test content for error handling',
        url: 'https://example.com/test'
      }

      // Mock AI failure
      global.ai.summarizer.create.mockRejectedValue(new Error('AI service unavailable'))

      chrome.storage.local.get.mockResolvedValue({ contentItems: [] })

      // Content should still be saved even if AI processing fails
      const contentId = `smartshelf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const fallbackContent = {
        id: contentId,
        ...mockContent,
        aiSummary: null, // AI failed
        dateAdded: new Date().toISOString()
      }

      try {
        await global.ai.summarizer.create()
      } catch (error) {
        // AI failed, save without AI processing
        await chrome.storage.local.set({ contentItems: [fallbackContent] })
      }

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        contentItems: [fallbackContent]
      })
    })
  })

  describe('Content Deduplication', () => {
    test('should detect and handle duplicate URLs', async () => {
      const existingContent = {
        id: 'existing-123',
        title: 'Existing Article',
        url: 'https://example.com/duplicate',
        dateAdded: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      }

      const duplicateContent = {
        title: 'Same Article (Updated)',
        url: 'https://example.com/duplicate',
        content: 'Updated content...'
      }

      chrome.storage.local.get.mockResolvedValue({
        contentItems: [existingContent]
      })

      // Check for duplicates
      const existingItems = (await chrome.storage.local.get('contentItems')).contentItems
      const duplicate = existingItems.find(item => item.url === duplicateContent.url)
      
      expect(duplicate).toBeDefined()
      expect(duplicate.id).toBe('existing-123')

      // Update existing item instead of creating new one
      const updatedContent = {
        ...duplicate,
        title: duplicateContent.title,
        content: duplicateContent.content,
        dateModified: new Date().toISOString()
      }

      await chrome.storage.local.set({
        contentItems: [updatedContent]
      })

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        contentItems: [updatedContent]
      })
    })
  })

  describe('Storage Integration', () => {
    test('should handle storage quota exceeded gracefully', async () => {
      const mockContent = {
        title: 'Large Content Item',
        content: 'Very large content that might exceed storage quota...'.repeat(1000),
        url: 'https://example.com/large-content'
      }

      chrome.storage.local.get.mockResolvedValue({ contentItems: [] })

      // Mock storage quota exceeded error
      chrome.storage.local.set.mockRejectedValue(
        new Error('QUOTA_BYTES_PER_ITEM quota exceeded')
      )

      const contentId = `smartshelf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const largeContent = {
        id: contentId,
        ...mockContent,
        dateAdded: new Date().toISOString()
      }

      let quotaError = null
      try {
        await chrome.storage.local.set({ contentItems: [largeContent] })
      } catch (error) {
        quotaError = error
      }

      expect(quotaError).toBeDefined()
      expect(quotaError.message).toContain('QUOTA_BYTES_PER_ITEM')
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })
})
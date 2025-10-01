// AI Writer Service - Generates insights and enhances notes using Chrome Built-in AI

/**
 * AI Writer Service
 * Uses Chrome Built-in AI Writer and Rewriter APIs to generate insights and enhance user notes
 */
class AIWriterService {
  constructor() {
    this.writerSession = null
    this.rewriterSession = null
    this.isInitialized = false
    this.processingQueue = []
    this.isProcessing = false
    this.processingStats = {
      insightsGenerated: 0,
      notesEnhanced: 0,
      processingTimeMs: 0,
      errorCount: 0
    }
  }

  /**
   * Initialize AI Writer and Rewriter sessions
   */
  async initialize() {
    try {
      // Initialize Writer API for generating insights
      if ('Writer' in self) {
        const writerAvailability = await Writer.availability()
        console.log('AI Writer availability:', writerAvailability)

        if (writerAvailability !== 'unavailable') {
          this.writerSession = await Writer.create({
            tone: 'informative',
            format: 'markdown',
            length: 'medium'
          })
          console.log('AI Writer session initialized')
        }
      }

      // Initialize Rewriter API for enhancing existing notes
      if ('Rewriter' in self) {
        const rewriterAvailability = await Rewriter.availability()
        console.log('AI Rewriter availability:', rewriterAvailability)

        if (rewriterAvailability !== 'unavailable') {
          this.rewriterSession = await Rewriter.create({
            tone: 'neutral',
            format: 'markdown',
            length: 'as-is'
          })
          console.log('AI Rewriter session initialized')
        }
      }

      this.isInitialized = !!(this.writerSession || this.rewriterSession)

      if (!this.isInitialized) {
        console.warn('Chrome Built-in AI Writer/Rewriter not available')
        return false
      }

      console.log('AI Writer service initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize AI Writer service:', error)
      return false
    }
  }

  /**
   * Generate AI insights about a content item
   * @param {Object} contentItem - The content item to analyze
   * @returns {Promise<string>} Generated insights text
   */
  async generateInsights(contentItem) {
    if (!this.writerSession) {
      console.warn('Writer session not available for insights generation')
      return null
    }

    if (this.isProcessing) {
      console.log('Writer service busy, queueing insights request')
      return new Promise((resolve) => {
        this.processingQueue.push({ type: 'insights', contentItem, resolve })
      })
    }

    this.isProcessing = true
    const startTime = Date.now()

    try {
      console.log(`Generating insights for: ${contentItem.title}`)

      const prompt = this.buildInsightsPrompt(contentItem)
      const insights = await this.writerSession.write(prompt)

      this.processingStats.insightsGenerated++
      this.processingStats.processingTimeMs += Date.now() - startTime

      console.log('Insights generated successfully')
      return insights

    } catch (error) {
      console.error('Failed to generate insights:', error)
      this.processingStats.errorCount++
      return null
    } finally {
      this.isProcessing = false
      await this.processQueue()
    }
  }

  /**
   * Generate key takeaways from content
   * @param {Object} contentItem - The content item to analyze
   * @returns {Promise<Array>} Array of key takeaways
   */
  async generateTakeaways(contentItem) {
    if (!this.writerSession) {
      console.warn('Writer session not available for takeaways generation')
      return []
    }

    try {
      const prompt = `Based on this content, write 3-5 key takeaways that capture the most important insights:

Title: ${contentItem.title}
Type: ${contentItem.type}
Summary: ${contentItem.summary || 'No summary available'}
Content Preview: ${this.getContentPreview(contentItem)}

Format as a numbered list of concise, actionable takeaways.`

      const takeawaysText = await this.writerSession.write(prompt)
      
      // Parse the numbered list into an array
      const takeaways = takeawaysText
        .split('\n')
        .filter(line => line.trim().match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(takeaway => takeaway.length > 0)

      return takeaways
    } catch (error) {
      console.error('Failed to generate takeaways:', error)
      return []
    }
  }

  /**
   * Generate connections analysis between items
   * @param {Object} sourceItem - First content item
   * @param {Object} targetItem - Second content item  
   * @param {Object} connection - Connection object with relationship info
   * @returns {Promise<string>} Analysis of the connection
   */
  async generateConnectionAnalysis(sourceItem, targetItem, connection) {
    if (!this.writerSession) {
      console.warn('Writer session not available for connection analysis')
      return null
    }

    try {
      const prompt = `Analyze and explain the relationship between these two pieces of content:

**First Item:**
Title: ${sourceItem.title}
Type: ${sourceItem.type}
Summary: ${sourceItem.summary || 'No summary available'}

**Second Item:**
Title: ${targetItem.title}
Type: ${targetItem.type}
Summary: ${targetItem.summary || 'No summary available'}

**Connection Type:** ${connection.connectionType}
**Strength:** ${connection.strength}/1.0
**AI Description:** ${connection.description}

Write a clear, insightful explanation of how these items relate to each other and why this connection is valuable for understanding both pieces of content.`

      const analysis = await this.writerSession.write(prompt)
      return analysis
    } catch (error) {
      console.error('Failed to generate connection analysis:', error)
      return null
    }
  }

  /**
   * Enhance existing user notes with AI suggestions
   * @param {string} userNotes - Current user notes
   * @param {Object} contentItem - Related content item for context
   * @returns {Promise<string>} Enhanced notes
   */
  async enhanceNotes(userNotes, contentItem) {
    if (!this.rewriterSession) {
      console.warn('Rewriter session not available for notes enhancement')
      return userNotes
    }

    if (this.isProcessing) {
      console.log('Writer service busy, queueing notes enhancement')
      return new Promise((resolve) => {
        this.processingQueue.push({ type: 'enhance', userNotes, contentItem, resolve })
      })
    }

    this.isProcessing = true
    const startTime = Date.now()

    try {
      console.log(`Enhancing notes for: ${contentItem.title}`)

      // Add context to help the rewriter understand the content
      const contextualNotes = `${userNotes}

[Context: These notes relate to "${contentItem.title}" (${contentItem.type})]`

      const enhancedNotes = await this.rewriterSession.rewrite(contextualNotes, {
        context: 'These are personal notes about saved content. Improve clarity, organization, and completeness while preserving the user\'s voice and key insights.'
      })

      // Remove the context line we added
      const cleanedNotes = enhancedNotes.replace(/\[Context:.*?\]/g, '').trim()

      this.processingStats.notesEnhanced++
      this.processingStats.processingTimeMs += Date.now() - startTime

      console.log('Notes enhanced successfully')
      return cleanedNotes

    } catch (error) {
      console.error('Failed to enhance notes:', error)
      this.processingStats.errorCount++
      return userNotes // Return original notes on error
    } finally {
      this.isProcessing = false
      await this.processQueue()
    }
  }

  /**
   * Generate study questions based on content
   * @param {Object} contentItem - The content item to create questions for
   * @returns {Promise<Array>} Array of study questions
   */
  async generateStudyQuestions(contentItem) {
    if (!this.writerSession) {
      console.warn('Writer session not available for study questions')
      return []
    }

    try {
      const prompt = `Create 4-6 thoughtful study questions based on this content that would help someone understand and remember the key concepts:

Title: ${contentItem.title}
Type: ${contentItem.type}
Summary: ${contentItem.summary || 'No summary available'}
Content Preview: ${this.getContentPreview(contentItem)}
Tags: ${contentItem.tags ? contentItem.tags.join(', ') : 'None'}

Generate questions that encourage critical thinking and practical application. Format as a numbered list.`

      const questionsText = await this.writerSession.write(prompt)
      
      // Parse the numbered list into an array
      const questions = questionsText
        .split('\n')
        .filter(line => line.trim().match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(question => question.length > 0)

      return questions
    } catch (error) {
      console.error('Failed to generate study questions:', error)
      return []
    }
  }

  /**
   * Generate a research outline based on multiple related items
   * @param {Array} contentItems - Array of related content items
   * @param {string} topic - The research topic/theme
   * @returns {Promise<string>} Research outline
   */
  async generateResearchOutline(contentItems, topic) {
    if (!this.writerSession) {
      console.warn('Writer session not available for research outline')
      return null
    }

    try {
      const itemsSummary = contentItems
        .map(item => `- ${item.title} (${item.type}): ${item.summary || 'No summary'}`)
        .join('\n')

      const prompt = `Create a comprehensive research outline for the topic "${topic}" based on these related materials:

${itemsSummary}

Generate a well-structured outline that:
1. Organizes the information logically
2. Identifies key themes and connections
3. Suggests areas for further research
4. Provides a roadmap for deeper study

Format as a hierarchical outline with main sections and subsections.`

      const outline = await this.writerSession.write(prompt)
      return outline
    } catch (error) {
      console.error('Failed to generate research outline:', error)
      return null
    }
  }

  /**
   * Format notes for better readability
   * @param {string} rawNotes - Unformatted notes text
   * @returns {Promise<string>} Formatted notes
   */
  async formatNotes(rawNotes) {
    if (!this.rewriterSession) {
      return rawNotes
    }

    try {
      const formattedNotes = await this.rewriterSession.rewrite(rawNotes, {
        context: 'Format these notes for better readability with proper structure, bullet points, and clear organization while preserving all information.'
      })

      return formattedNotes
    } catch (error) {
      console.error('Failed to format notes:', error)
      return rawNotes
    }
  }

  /**
   * Build insights generation prompt
   * @param {Object} contentItem - Content item to analyze
   * @returns {string} Prompt for insights generation
   */
  buildInsightsPrompt(contentItem) {
    return `Generate insightful analysis and commentary about this content:

**Title:** ${contentItem.title}
**Type:** ${contentItem.type}
**Summary:** ${contentItem.summary || 'No summary available'}
**Tags:** ${contentItem.tags ? contentItem.tags.join(', ') : 'None'}
**Categories:** ${contentItem.categories ? contentItem.categories.join(', ') : 'None'}
**Content Preview:** ${this.getContentPreview(contentItem)}

Write thoughtful insights that would help someone understand:
1. The key concepts and their significance
2. How this relates to broader themes in the field
3. Practical applications or implications
4. Questions this content raises for further exploration

Focus on adding value beyond what's explicitly stated in the content. Write in a clear, engaging style that demonstrates understanding of the subject matter.`
  }

  /**
   * Get content preview for AI processing
   * @param {Object} contentItem - Content item
   * @returns {string} Content preview
   */
  getContentPreview(contentItem) {
    let preview = ''

    if (contentItem.contentText) {
      preview = contentItem.contentText.substring(0, 1000)
    } else if (contentItem.summary) {
      preview = contentItem.summary
    } else {
      preview = 'No content preview available'
    }

    // Add physical item specific info
    if (contentItem.isPhysical) {
      if (contentItem.author) preview += ` | Author: ${contentItem.author}`
      if (contentItem.publisher) preview += ` | Publisher: ${contentItem.publisher}`
    }

    return preview.trim()
  }

  /**
   * Process queued requests
   */
  async processQueue() {
    if (this.processingQueue.length > 0 && !this.isProcessing) {
      const request = this.processingQueue.shift()
      
      try {
        let result
        if (request.type === 'insights') {
          result = await this.generateInsights(request.contentItem)
        } else if (request.type === 'enhance') {
          result = await this.enhanceNotes(request.userNotes, request.contentItem)
        }
        
        request.resolve(result)
      } catch (error) {
        console.error('Error processing queued request:', error)
        request.resolve(null)
      }
    }
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      ...this.processingStats,
      isInitialized: this.isInitialized,
      hasWriter: !!this.writerSession,
      hasRewriter: !!this.rewriterSession,
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing
    }
  }

  /**
   * Clear processing statistics
   */
  clearStats() {
    this.processingStats = {
      insightsGenerated: 0,
      notesEnhanced: 0,
      processingTimeMs: 0,
      errorCount: 0
    }
    this.processingQueue = []
  }

  /**
   * Check if service is ready to process requests
   * @returns {boolean} Whether service is ready
   */
  isReady() {
    return this.isInitialized && !!(this.writerSession || this.rewriterSession)
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    this.isProcessing = false
    this.processingQueue = []

    try {
      if (this.writerSession) {
        await this.writerSession.destroy()
        this.writerSession = null
      }

      if (this.rewriterSession) {
        await this.rewriterSession.destroy()
        this.rewriterSession = null
      }

      this.isInitialized = false
      console.log('AI Writer service cleaned up')
    } catch (error) {
      console.error('Error cleaning up AI Writer service:', error)
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIWriterService
} else if (typeof window !== 'undefined') {
  window.AIWriterService = AIWriterService
}
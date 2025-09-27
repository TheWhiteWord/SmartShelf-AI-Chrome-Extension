// AI Connection Discovery Service - Identifies relationships between content items using Chrome Built-in AI

/**
 * AI Connection Discovery Service
 * Uses Chrome Built-in AI APIs to identify and analyze relationships between content items
 */
class AIConnectionDiscoveryService {
  constructor() {
    this.aiSession = null
    this.isProcessing = false
    this.connectionQueue = []
    this.discoveredConnections = new Map() // Key: connection key, Value: Connection
    this.lastProcessingTime = null
    this.processingStats = {
      totalAnalyzed: 0,
      connectionsFound: 0,
      processingTimeMs: 0
    }
  }

  /**
   * Initialize AI session for connection discovery
   */
  async initialize() {
    try {
      if ('aiOriginTrial' in chrome && chrome.aiOriginTrial && chrome.aiOriginTrial.languageModel) {
        const capabilities = await chrome.aiOriginTrial.languageModel.capabilities()

        if (capabilities.available === 'readily') {
          this.aiSession = await chrome.aiOriginTrial.languageModel.create({
            systemPrompt: `You are an AI assistant that analyzes content relationships. Given two pieces of content, analyze their relationship and respond with valid JSON only:

{
  "hasConnection": boolean,
  "connectionType": "similarity|citation|topic-related|temporal|causal",
  "strength": number (0.0-1.0),
  "confidence": number (0.0-1.0),
  "description": "Brief explanation of the connection",
  "keywords": ["keyword1", "keyword2", ...],
  "reasoning": "Why you identified this connection"
}

Connection types:
- similarity: Content covers similar topics or concepts
- citation: One references or cites the other
- topic-related: Related topics but different perspectives
- temporal: Time-based relationships (before/after, chronological)
- causal: Cause and effect relationships

Only identify meaningful connections with confidence >= 0.6. Be conservative - no connection is better than a false positive.`,
            temperature: 0.3,
            topK: 10
          })

          console.log('AI Connection Discovery service initialized')
          return true
        }
      }

      console.warn('Chrome Built-in AI not available for connection discovery')
      return false
    } catch (error) {
      console.error('Failed to initialize AI Connection Discovery:', error)
      return false
    }
  }

  /**
   * Discover connections for a single new item against existing items
   * @param {Object} newItem - The new content item to analyze
   * @param {Array} existingItems - Array of existing content items
   * @returns {Promise<Array>} Array of discovered connections
   */
  async discoverConnectionsForItem(newItem, existingItems) {
    if (!this.aiSession) {
      console.warn('AI session not available for connection discovery')
      return []
    }

    if (this.isProcessing) {
      console.log('Connection discovery already in progress, queueing request')
      return new Promise((resolve) => {
        this.connectionQueue.push({ newItem, existingItems, resolve })
      })
    }

    this.isProcessing = true
    const startTime = Date.now()
    const connections = []

    try {
      console.log(`Starting connection discovery for item: ${newItem.title}`)

      // Analyze against each existing item
      for (const existingItem of existingItems) {
        // Skip if same item or if connection already exists
        if (existingItem.id === newItem.id) continue

        const connectionKey = this.getConnectionKey(newItem.id, existingItem.id)
        if (this.discoveredConnections.has(connectionKey)) continue

        try {
          const connection = await this.analyzeItemConnection(newItem, existingItem)
          if (connection && connection.isSignificant()) {
            connections.push(connection)
            this.discoveredConnections.set(connectionKey, connection)
          }

          // Add small delay to prevent overwhelming the AI API
          await this.delay(100)
        } catch (error) {
          console.error(`Failed to analyze connection between ${newItem.id} and ${existingItem.id}:`, error)
        }
      }

      this.processingStats.totalAnalyzed += existingItems.length
      this.processingStats.connectionsFound += connections.length
      this.processingStats.processingTimeMs += Date.now() - startTime

      console.log(`Connection discovery completed: ${connections.length} connections found`)

      // Save connections to storage
      if (connections.length > 0) {
        await this.saveConnections(connections)
      }
    } catch (error) {
      console.error('Connection discovery failed:', error)
    } finally {
      this.isProcessing = false
      this.lastProcessingTime = new Date().toISOString()

      // Process queued requests
      if (this.connectionQueue.length > 0) {
        const queued = this.connectionQueue.shift()
        queued.resolve(await this.discoverConnectionsForItem(queued.newItem, queued.existingItems))
      }
    }

    return connections
  }

  /**
   * Analyze connection between two specific items
   * @param {Object} item1 - First content item
   * @param {Object} item2 - Second content item
   * @returns {Promise<Connection|null>} Connection object or null if no connection
   */
  async analyzeItemConnection(item1, item2) {
    try {
      const analysisPrompt = this.buildAnalysisPrompt(item1, item2)
      const aiResponse = await this.aiSession.prompt(analysisPrompt)

      let connectionAnalysis
      try {
        connectionAnalysis = JSON.parse(aiResponse)
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError, aiResponse)
        return null
      }

      // Validate AI response structure
      if (!this.isValidConnectionAnalysis(connectionAnalysis)) {
        console.warn('Invalid AI connection analysis:', connectionAnalysis)
        return null
      }

      // Only create connection if AI found one with sufficient confidence
      if (connectionAnalysis.hasConnection && connectionAnalysis.confidence >= 0.6) {
        const Connection = window.Connection || require('./connection')

        return new Connection({
          sourceItemId: item1.id,
          targetItemId: item2.id,
          connectionType: connectionAnalysis.connectionType,
          strength: connectionAnalysis.strength,
          description: connectionAnalysis.description,
          aiConfidence: connectionAnalysis.confidence,
          keywords: connectionAnalysis.keywords || [],
          metadata: {
            reasoning: connectionAnalysis.reasoning,
            discoveryMethod: 'ai-analysis',
            aiModel: 'chrome-builtin'
          }
        })
      }

      return null
    } catch (error) {
      console.error('Connection analysis failed:', error)
      return null
    }
  }

  /**
   * Build analysis prompt for two items
   * @param {Object} item1 - First item
   * @param {Object} item2 - Second item
   * @returns {string} Analysis prompt
   */
  buildAnalysisPrompt(item1, item2) {
    const item1Text = this.extractAnalysisText(item1)
    const item2Text = this.extractAnalysisText(item2)

    return `Analyze the relationship between these two content items:

ITEM 1:
Title: ${item1.title}
Type: ${item1.type}
Summary: ${item1.summary || 'No summary available'}
Tags: ${item1.tags.join(', ') || 'No tags'}
Categories: ${item1.categories.join(', ') || 'No categories'}
Content Preview: ${item1Text}

ITEM 2:
Title: ${item2.title}
Type: ${item2.type}
Summary: ${item2.summary || 'No summary available'}
Tags: ${item2.tags.join(', ') || 'No tags'}
Categories: ${item2.categories.join(', ') || 'No categories'}
Content Preview: ${item2Text}

Analyze if there is a meaningful relationship between these items and respond with JSON.`
  }

  /**
   * Extract relevant text for analysis
   * @param {Object} item - Content item
   * @returns {string} Relevant text for analysis
   */
  extractAnalysisText(item) {
    let text = ''

    // Add content preview
    if (item.contentText) {
      text += item.contentText.substring(0, 500)
    }

    // Add notes if available
    if (item.notes) {
      text += ` ${item.notes.substring(0, 200)}`
    }

    // For physical items, add author and publisher
    if (item.isPhysical) {
      if (item.author) text += ` Author: ${item.author}`
      if (item.publisher) text += ` Publisher: ${item.publisher}`
    }

    return text.trim() || 'No content available'
  }

  /**
   * Validate AI connection analysis response
   * @param {Object} analysis - AI response to validate
   * @returns {boolean} Whether response is valid
   */
  isValidConnectionAnalysis(analysis) {
    if (!analysis || typeof analysis !== 'object') return false

    // Required fields
    if (typeof analysis.hasConnection !== 'boolean') return false
    if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 1) return false

    // If has connection, validate additional fields
    if (analysis.hasConnection) {
      const validTypes = ['similarity', 'citation', 'topic-related', 'temporal', 'causal']
      if (!validTypes.includes(analysis.connectionType)) return false

      if (typeof analysis.strength !== 'number' || analysis.strength < 0 || analysis.strength > 1) return false
      if (typeof analysis.description !== 'string' || analysis.description.trim().length === 0) return false
    }

    return true
  }

  /**
   * Batch discover connections for multiple items
   * @param {Array} items - Array of content items to analyze
   * @param {number} maxConcurrent - Maximum concurrent analyses
   * @returns {Promise<Array>} Array of all discovered connections
   */
  async batchDiscoverConnections(items, maxConcurrent = 3) {
    if (!this.aiSession) {
      console.warn('AI session not available for batch connection discovery')
      return []
    }

    const allConnections = []
    const processed = new Set()

    console.log(`Starting batch connection discovery for ${items.length} items`)

    // Analyze connections between all item pairs
    for (let i = 0; i < items.length; i++) {
      const currentBatch = []

      for (let j = i + 1; j < items.length && currentBatch.length < maxConcurrent; j++) {
        const connectionKey = this.getConnectionKey(items[i].id, items[j].id)

        if (!processed.has(connectionKey) && !this.discoveredConnections.has(connectionKey)) {
          currentBatch.push({
            item1: items[i],
            item2: items[j],
            key: connectionKey
          })
          processed.add(connectionKey)
        }
      }

      // Process current batch
      const batchPromises = currentBatch.map(({ item1, item2 }) =>
        this.analyzeItemConnection(item1, item2)
      )

      try {
        const batchResults = await Promise.all(batchPromises)
        const validConnections = batchResults.filter(conn => conn && conn.isSignificant())

        allConnections.push(...validConnections)

        // Cache discovered connections
        validConnections.forEach(conn => {
          this.discoveredConnections.set(conn.getConnectionKey(), conn)
        })

        // Add delay between batches to be respectful of AI API
        if (i < items.length - 1) {
          await this.delay(500)
        }
      } catch (error) {
        console.error('Batch processing error:', error)
      }
    }

    console.log(`Batch connection discovery completed: ${allConnections.length} connections found`)

    if (allConnections.length > 0) {
      await this.saveConnections(allConnections)
    }

    return allConnections
  }

  /**
   * Get connections for a specific item
   * @param {string} itemId - Item ID to get connections for
   * @returns {Promise<Array>} Array of connections involving the item
   */
  async getConnectionsForItem(itemId) {
    try {
      const { connections = [] } = await chrome.storage.local.get('connections')
      return connections.filter(conn =>
        conn.sourceItemId === itemId || conn.targetItemId === itemId
      ).map(connData => {
        const Connection = window.Connection || require('./connection')
        return Connection.fromJSON(connData)
      })
    } catch (error) {
      console.error('Failed to get connections for item:', error)
      return []
    }
  }

  /**
   * Save connections to Chrome storage
   * @param {Array} newConnections - Array of Connection objects to save
   */
  async saveConnections(newConnections) {
    try {
      const { connections = [] } = await chrome.storage.local.get('connections')

      // Add new connections, avoiding duplicates
      const existingKeys = new Set(connections.map(conn => {
        const ids = [conn.sourceItemId, conn.targetItemId].sort()
        return `${ids[0]}:${ids[1]}`
      }))

      const newConnectionData = newConnections
        .filter(conn => !existingKeys.has(conn.getConnectionKey()))
        .map(conn => conn.toJSON())

      if (newConnectionData.length > 0) {
        const updatedConnections = [...connections, ...newConnectionData]
        await chrome.storage.local.set({ connections: updatedConnections })
        console.log(`Saved ${newConnectionData.length} new connections to storage`)
      }
    } catch (error) {
      console.error('Failed to save connections:', error)
    }
  }

  /**
   * Generate connection key for two items
   * @param {string} id1 - First item ID
   * @param {string} id2 - Second item ID
   * @returns {string} Connection key
   */
  getConnectionKey(id1, id2) {
    const ids = [id1, id2].sort()
    return `${ids[0]}:${ids[1]}`
  }

  /**
   * Get processing statistics
   * @returns {Object} Processing stats
   */
  getProcessingStats() {
    return {
      ...this.processingStats,
      isProcessing: this.isProcessing,
      lastProcessingTime: this.lastProcessingTime,
      cachedConnections: this.discoveredConnections.size,
      queueLength: this.connectionQueue.length
    }
  }

  /**
   * Clear connection cache and reset stats
   */
  clearCache() {
    this.discoveredConnections.clear()
    this.connectionQueue = []
    this.processingStats = {
      totalAnalyzed: 0,
      connectionsFound: 0,
      processingTimeMs: 0
    }
  }

  /**
   * Utility function for delays
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    this.isProcessing = false
    this.connectionQueue = []

    if (this.aiSession) {
      try {
        await this.aiSession.destroy()
        this.aiSession = null
      } catch (error) {
        console.error('Error cleaning up AI session:', error)
      }
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIConnectionDiscoveryService
} else if (typeof window !== 'undefined') {
  window.AIConnectionDiscoveryService = AIConnectionDiscoveryService
}

// SmartShelf Service Worker
// Handles background AI processing, content management, and Chrome Extension lifecycle

console.log('SmartShelf Service Worker loaded')

// Import AI Connection Discovery Service
// Note: importScripts works in non-module service workers
try {
  importScripts('../shared/services/ai-connection-discovery.js')
  importScripts('../shared/models/connection.js')
  importScripts('../shared/services/export-api-gateway.js')
  importScripts('../shared/services/ai-writer.js')
  importScripts('../shared/services/content-processing-pipeline.js')
  importScripts('../shared/services/ai-processing-queue.js')
  console.log('SmartShelf service scripts loaded successfully')
} catch (error) {
  console.warn('Some service scripts failed to load:', error.message)
  // Continue with basic functionality even if some imports fail
}

// Global AI session management
let aiSession = null
let summarizerSession = null
let connectionDiscoveryService = null
let aiWriterService = null
let exportAPIGateway = null
let contentProcessingPipeline = null
let aiProcessingQueue = null



// Chrome Extension lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  console.log('SmartShelf installed:', details.reason)

  // Initialize default settings and AI capabilities
  initializeExtension()
  initializeAICapabilities()
})

// Initialize extension settings and data
async function initializeExtension() {
  try {
    // Set default settings if first install
    const settings = await chrome.storage.sync.get('smartshelfSettings')

    if (!settings.smartshelfSettings) {
      const defaultSettings = {
        aiProcessingEnabled: true,
        autoTagging: true,
        connectionDiscovery: true,
        processingDelay: 1,
        interfaceTheme: 'auto',
        keyboardShortcuts: true,
        apiGatewayEnabled: false,
        apiPort: 8080,
        backupFrequency: 'weekly'
      }

      await chrome.storage.sync.set({ smartshelfSettings: defaultSettings })
      console.log('Default settings initialized')
    }

    // Initialize local storage
    const localData = await chrome.storage.local.get(['contentItems', 'categories', 'tags'])

    if (!localData.contentItems) {
      await chrome.storage.local.set({
        contentItems: [],
        categories: ['Technology', 'Science', 'Business', 'Personal'],
        tags: [],
        searchIndex: {},
        connections: []
      })
      console.log('Local data structures initialized')
    }

        // Initialize AI Connection Discovery Service
    await initializeConnectionDiscovery()

    // Initialize AI Writer Service
    await initializeAIWriterService()

    // Initialize Export-Only API Gateway
    exportAPIGateway = new ExportOnlyAPIGateway()
    await exportAPIGateway.initialize()
    
    // Initialize Content Processing Pipeline
    await initializeContentProcessingPipeline()
    
    // Initialize AI Processing Queue
    await initializeAIProcessingQueue()
  } catch (error) {
    console.error('Failed to initialize extension:', error)
  }
}

// Initialize Chrome Built-in AI capabilities
async function initializeAICapabilities() {
  try {
    // Check if Chrome Built-in AI APIs are available (new standard APIs)
    if ('LanguageModel' in self) {
      // Check Prompt API availability
      const langModelAvailability = await LanguageModel.availability()
      console.log('AI Prompt availability:', langModelAvailability)

      if (langModelAvailability !== 'unavailable') {
        // Get model parameters
        const params = await LanguageModel.params()
        console.log('AI Prompt parameters:', params)

        // Create Language Model session
        aiSession = await LanguageModel.create({
          initialPrompts: [
            {
              role: 'system', 
              content: `You are SmartShelf AI, a content analysis assistant. Analyze web content and provide structured insights in JSON format with:
              - summary: Brief 1-2 sentence summary
              - tags: Array of 3-5 relevant tags (lowercase, no spaces)
              - categories: Array of 1-3 main categories
              - key_points: Array of 2-4 key insights
              Always respond with valid JSON only.`
            }
          ],
          temperature: Math.min(params.defaultTemperature * 1.2, params.maxTemperature),
          topK: params.defaultTopK
        })
        console.log('AI Prompt session initialized')
      }
    }

    // Check Summarizer API availability
    if ('Summarizer' in self) {
      const summarizerAvailability = await Summarizer.availability()
      console.log('AI Summarizer availability:', summarizerAvailability)

      if (summarizerAvailability !== 'unavailable') {
        summarizerSession = await Summarizer.create({
          type: 'tl;dr',
          format: 'plain-text',
          length: 'medium'
        })
        console.log('AI Summarizer session initialized')
      }
    }

    if (!aiSession && !summarizerSession) {
      console.log('Chrome Built-in AI not available, using fallback processing')
    }

    // Initialize AI Connection Discovery Service
    await initializeConnectionDiscovery()
  } catch (error) {
    console.log('AI initialization failed, using fallback:', error.message)
  }
}

// Initialize AI Connection Discovery Service
async function initializeConnectionDiscovery() {
  try {
    connectionDiscoveryService = new AIConnectionDiscoveryService()
    const initialized = await connectionDiscoveryService.initialize()

    if (initialized) {
      console.log('AI Connection Discovery service initialized successfully')
    } else {
      console.warn('AI Connection Discovery service initialization failed - Chrome Built-in AI may not be available')
    }
  } catch (error) {
    console.error('Failed to initialize Connection Discovery service:', error)
    connectionDiscoveryService = null
  }
}

// Initialize AI Writer Service
async function initializeAIWriterService() {
  try {
    aiWriterService = new AIWriterService()
    const initialized = await aiWriterService.initialize()

    if (initialized) {
      console.log('AI Writer service initialized successfully')
    } else {
      console.warn('AI Writer service initialization failed - Chrome Built-in AI Writer/Rewriter may not be available')
    }
  } catch (error) {
    console.error('Failed to initialize AI Writer service:', error)
    aiWriterService = null
  }
}

// Initialize Content Processing Pipeline
async function initializeContentProcessingPipeline() {
  try {
    // Create mock services for the pipeline (will be replaced with actual services later)
    const storageService = {
      get: (key) => chrome.storage.local.get(key),
      set: (data) => chrome.storage.local.set(data)
    }
    
    const contentRepository = null // Will use default implementation
    const searchService = null // Will use default implementation  
    const aiServices = null // Will use default implementation
    
    contentProcessingPipeline = new ContentProcessingPipeline(
      storageService,
      contentRepository,
      searchService,
      aiServices
    )
    
    console.log('Content Processing Pipeline initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Content Processing Pipeline:', error)
    contentProcessingPipeline = null
  }
}

// Initialize AI Processing Queue
async function initializeAIProcessingQueue() {
  try {
    // Create storage service for the queue
    const storageService = {
      get: (key) => chrome.storage.local.get(key),
      set: (key, data) => chrome.storage.local.set({ [key]: data })
    }
    
    // Create AI services for the queue
    const aiServices = {
      processContent: processContentWithAI
    }
    
    aiProcessingQueue = new AIProcessingQueue(storageService, aiServices)
    await aiProcessingQueue.initialize()
    
    console.log('AI Processing Queue initialized successfully')
    
    // Set up event listeners
    aiProcessingQueue.addEventListener('queueUpdate', (event) => {
      // Notify UI components about queue updates
      chrome.runtime.sendMessage({
        type: 'queue_update',
        data: event.detail
      }).catch(() => {
        // No listeners, which is fine
      })
    })
    
    aiProcessingQueue.addEventListener('itemProcessed', (event) => {
      console.log('Item processed successfully:', event.detail.itemId)
    })
    
    aiProcessingQueue.addEventListener('itemFailed', (event) => {
      console.error('Item processing failed:', event.detail.itemId, event.detail.error)
    })
    
  } catch (error) {
    console.error('Failed to initialize AI Processing Queue:', error)
    aiProcessingQueue = null
  }
}

// Handle extension action (toolbar icon click)
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension action clicked')

  // Open side panel
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId })
  } catch (error) {
    console.error('Failed to open side panel:', error)
  }
})

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Keyboard shortcut triggered:', command)

  switch (command) {
    case 'save-current-page':
      await saveCurrentPage()
      break
    case 'open-search':
      await openSearch()
      break
  }
})

// Save current page functionality
async function saveCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab) {
      console.error('No active tab found')
      return
    }

    // Extract page content via content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContent
    })

    if (results && results[0] && results[0].result) {
      const pageData = results[0].result
      await processAndSaveContent(pageData)

      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'SmartShelf',
        message: `Saved: ${pageData.title}`
      })
    }
  } catch (error) {
    console.error('Failed to save current page:', error)
  }
}

// Content extraction function (runs in page context)
function extractPageContent() {
  return {
    title: document.title,
    url: window.location.href,
    content: document.body.innerText.slice(0, 5000), // First 5000 chars
    meta: {
      description: document.querySelector('meta[name="description"]')?.content || '',
      keywords: document.querySelector('meta[name="keywords"]')?.content || '',
      author: document.querySelector('meta[name="author"]')?.content || '',
      publishedTime: document.querySelector('meta[property="article:published_time"]')?.content || '',
      modifiedTime: document.querySelector('meta[property="article:modified_time"]')?.content || ''
    },
    timestamp: Date.now()
  }
}

// Process and save content with AI enhancement
async function processAndSaveContent(pageData) {
  try {
    // Create content item with comprehensive metadata
    const contentItem = {
      id: `smartshelf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: pageData.title || 'Untitled',
      url: pageData.url,
      content: pageData.content || '',
      type: detectContentType(pageData),
      source: pageData.url,
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      isPhysical: false,
      status: 'pending',
      summary: '',
      tags: [],
      categories: [],
      notes: '',
      aiProcessed: false,
      metadata: {
        description: pageData.meta?.description || '',
        keywords: pageData.meta?.keywords || [],
        author: pageData.meta?.author || '',
        publishDate: pageData.meta?.publishDate || '',
        wordCount: (pageData.content || '').split(/\s+/).length,
        language: pageData.meta?.language || 'en',
        images: pageData.images || []
      },
      connections: [],
      viewCount: 0,
      lastViewed: null
    }

    // Save to storage
    const { contentItems = [] } = await chrome.storage.local.get('contentItems')
    contentItems.push(contentItem)
    await chrome.storage.local.set({ contentItems })
    console.log('Content saved:', contentItem.id)

    // Update search index
    await updateSearchIndex(contentItem)

    // Queue for AI processing
    await queueForAiProcessing(contentItem.id)
  } catch (error) {
    console.error('Failed to process and save content:', error)
  }
}

// Queue item for AI processing
async function queueForAiProcessing(itemId) {
  try {
    // Check if AI processing is enabled
    const { smartshelfSettings } = await chrome.storage.sync.get('smartshelfSettings')

    if (!smartshelfSettings?.aiProcessingEnabled) {
      console.log('AI processing disabled, skipping:', itemId)
      return
    }

    // Add processing delay if configured
    const delay = (smartshelfSettings?.processingDelay || 1) * 1000

    setTimeout(async () => {
      await processWithAI(itemId)
    }, delay)
  } catch (error) {
    console.error('Failed to queue for AI processing:', error)
  }
}

// Process content with Chrome Built-in AI APIs
async function processWithAI(itemId) {
  try {
    console.log('Starting AI processing for:', itemId)

    // Get content item
    const { contentItems = [] } = await chrome.storage.local.get('contentItems')
    const itemIndex = contentItems.findIndex(item => item.id === itemId)

    if (itemIndex === -1) {
      console.error('Content item not found:', itemId)
      return
    }

    const item = contentItems[itemIndex]

    // Update status to processing
    item.status = 'processing'
    await chrome.storage.local.set({ contentItems })

    // Process with Chrome Built-in AI
    const aiResult = await processContentWithAI(item)

    // Update item with AI results
    item.summary = aiResult.summary
    item.tags = aiResult.tags
    item.categories = aiResult.categories
    item.status = 'processed'
    item.aiProcessed = true
    item.dateModified = new Date().toISOString()

    contentItems[itemIndex] = item
    await chrome.storage.local.set({ contentItems })

    console.log('AI processing completed for:', itemId)

    // Trigger AI connection discovery for the newly processed item
    await triggerConnectionDiscovery(item, contentItems)
  } catch (error) {
    console.error('AI processing failed:', error)

    // Update status to error
    const { contentItems = [] } = await chrome.storage.local.get('contentItems')
    const itemIndex = contentItems.findIndex(item => item.id === itemId)

    if (itemIndex !== -1) {
      contentItems[itemIndex].status = 'error'
      await chrome.storage.local.set({ contentItems })
    }
  }
}

// Process content with Chrome Built-in AI
async function processContentWithAI(item) {
  console.log('Processing content with AI:', item.title)

  try {
    // Check settings to see if AI processing is enabled
    const { smartshelfSettings } = await chrome.storage.sync.get('smartshelfSettings')

    if (!smartshelfSettings?.aiProcessingEnabled) {
      console.log('AI processing disabled in settings')
      return getFallbackProcessing(item)
    }

    let aiResult = null

    // Try Chrome Built-in AI first
    if (aiSession) {
      try {
        const analysisPrompt = `Analyze this web content and respond with valid JSON only:
        
        Title: ${item.title}
        URL: ${item.url}
        Content: ${item.content?.substring(0, 2000)}...
        
        Provide analysis as JSON with summary (string), tags (array of strings), categories (array of strings), key_points (array of strings).`

        const aiResponse = await aiSession.prompt(analysisPrompt)
        aiResult = JSON.parse(aiResponse)
        console.log('AI analysis completed')
      } catch (aiError) {
        console.log('AI processing failed, using fallback:', aiError.message)
        aiResult = getFallbackProcessing(item)
      }
    } else {
      // Fallback processing when AI not available
      aiResult = getFallbackProcessing(item)
    }

    // Try summarizer for better summaries if available
    if (summarizerSession && item.content) {
      try {
        const betterSummary = await summarizerSession.summarize(item.content.substring(0, 3000))
        if (betterSummary && betterSummary.length > 10) {
          aiResult.summary = betterSummary
        }
      } catch (sumError) {
        console.log('Summarizer failed, keeping original summary:', sumError.message)
      }
    }

    return aiResult
  } catch (error) {
    console.error('Content processing failed:', error)
    return getFallbackProcessing(item)
  }
}

// Fallback processing when AI is not available
function getFallbackProcessing(item) {
  const words = item.content?.toLowerCase().split(/\s+/) || []
  const title = item.title?.toLowerCase() || ''

  // Simple keyword extraction
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']
  const keywords = words
    .filter(word => word.length > 3 && !commonWords.includes(word))
    .reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1
      return acc
    }, {})

  const topKeywords = Object.entries(keywords)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word)

  // Simple category detection
  const categories = []
  if (title.includes('tech') || title.includes('programming') || title.includes('code')) {
    categories.push('Technology')
  }
  if (title.includes('science') || title.includes('research')) {
    categories.push('Science')
  }
  if (title.includes('business') || title.includes('market')) {
    categories.push('Business')
  }
  if (categories.length === 0) {
    categories.push('General')
  }

  return {
    summary: `Article about ${item.title}. Key topics include ${topKeywords.slice(0, 3).join(', ')}.`,
    tags: topKeywords,
    categories,
    key_points: [
      `Main topic: ${item.title}`,
      `Content type: ${item.type || 'article'}`,
      `Contains ${words.length} words`
    ]
  }
}

// Open search functionality
async function openSearch() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (tab) {
      await chrome.sidePanel.open({ windowId: tab.windowId })

      // Focus search input (will be handled by side panel script)
      chrome.tabs.sendMessage(tab.id, { action: 'focus_search' })
    }
  } catch (error) {
    console.error('Failed to open search:', error)
  }
}

// Detect content type based on URL and content
function detectContentType(pageData) {
  const url = pageData.url?.toLowerCase() || ''
  const title = pageData.title?.toLowerCase() || ''
  const content = pageData.content?.toLowerCase() || ''

  if (url.includes('youtube.com') || url.includes('vimeo.com') || url.includes('.mp4')) {
    return 'video'
  }
  if (url.includes('.pdf') || title.includes('pdf')) {
    return 'document'
  }
  if (url.includes('.jpg') || url.includes('.png') || url.includes('.gif') || url.includes('image')) {
    return 'image'
  }
  if (url.includes('github.com') || content.includes('code') || content.includes('programming')) {
    return 'code'
  }
  if (title.includes('book') || url.includes('book') || content.includes('chapter')) {
    return 'book'
  }
  if (title.includes('article') || url.includes('article') || url.includes('blog')) {
    return 'article'
  }

  return 'webpage'
}

// Update search index for fast searching
async function updateSearchIndex(contentItem) {
  try {
    const { searchIndex = {} } = await chrome.storage.local.get('searchIndex')

    // Create searchable text
    const searchText = `${contentItem.title} ${contentItem.content} ${contentItem.tags.join(' ')} ${contentItem.categories.join(' ')}`.toLowerCase()
    const words = searchText.split(/\s+/).filter(word => word.length > 2)

    // Add to index
    words.forEach(word => {
      if (!searchIndex[word]) {
        searchIndex[word] = []
      }
      if (!searchIndex[word].includes(contentItem.id)) {
        searchIndex[word].push(contentItem.id)
      }
    })

    await chrome.storage.local.set({ searchIndex })
    console.log('Search index updated for:', contentItem.id)
  } catch (error) {
    console.error('Failed to update search index:', error)
  }
}

// Generate unique ID (helper function)
// function generateId() {
//   return Date.now().toString(36) + Math.random().toString(36).substr(2)
// }

// Handle messages from other extension components
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Service Worker received message:', request)

  switch (request.action) {
    case 'save_content':
      processAndSaveContent(request.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true // Keep message channel open for async response

    case 'get_contentItems':
      chrome.storage.local.get('contentItems')
        .then(result => sendResponse({ success: true, data: result.contentItems || [] }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'search_content':
      searchContent(request.query)
        .then(results => sendResponse({ success: true, data: results }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'get_item_connections':
      getItemConnections(request.itemId)
        .then(connections => sendResponse({ success: true, data: connections }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'trigger_batch_connection_discovery':
      performBatchConnectionDiscovery()
        .then(connections => sendResponse({ success: true, data: connections }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'get_connection_discovery_stats':
      const stats = getConnectionDiscoveryStats()
      sendResponse({ success: true, data: stats })
      break

    case 'api_request':
      processAPIRequest(request.endpoint, request.token, request.params)
        .then(response => sendResponse({ success: true, data: response }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'generate_api_token':
      generateAPIToken(request.name, request.permissions, request.expiresAt)
        .then(token => sendResponse({ success: true, data: token }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'revoke_api_token':
      revokeAPIToken(request.tokenId)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'get_api_usage_stats':
      const apiStats = getAPIUsageStats()
      sendResponse({ success: true, data: apiStats })
      break

    case 'generate_insights':
      generateContentInsights(request.contentItem)
        .then(insights => sendResponse({ success: true, data: insights }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'enhance_notes':
      enhanceUserNotes(request.notes, request.contentItem)
        .then(enhancedNotes => sendResponse({ success: true, data: enhancedNotes }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'generate_takeaways':
      generateContentTakeaways(request.contentItem)
        .then(takeaways => sendResponse({ success: true, data: takeaways }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'generate_study_questions':
      generateStudyQuestions(request.contentItem)
        .then(questions => sendResponse({ success: true, data: questions }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'generate_connection_analysis':
      generateConnectionAnalysis(request.sourceItem, request.targetItem, request.connection)
        .then(analysis => sendResponse({ success: true, data: analysis }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'generate_research_outline':
      generateResearchOutline(request.items, request.topic)
        .then(outline => sendResponse({ success: true, data: outline }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'get_writer_service_stats':
      const writerStats = getWriterServiceStats()
      sendResponse({ success: true, data: writerStats })
      break

    // AI Processing Queue operations
    case 'queue_enqueue_item':
      enqueueItemForProcessing(request.contentItem, request.priority)
        .then(itemId => sendResponse({ success: true, data: { itemId } }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'queue_get_status':
      getQueueStatus()
        .then(status => sendResponse({ success: true, data: status }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'queue_get_position':
      getQueuePosition(request.itemId)
        .then(position => sendResponse({ success: true, data: { position } }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'queue_remove_item':
      removeItemFromQueue(request.itemId)
        .then(removed => sendResponse({ success: true, data: { removed } }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'queue_get_statistics':
      getQueueStatistics()
        .then(stats => sendResponse({ success: true, data: stats }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true

    case 'queue_get_analytics':
      getQueueAnalytics()
        .then(analytics => sendResponse({ success: true, data: analytics }))
        .catch(error => sendResponse({ success: false, error: error.message }))
      return true
  }
})

// Search functionality
async function searchContent(query) {
  try {
    const { contentItems = [] } = await chrome.storage.local.get('contentItems')

    if (!query || query.trim().length === 0) {
      return contentItems
    }

    const searchTerm = query.toLowerCase()

    return contentItems.filter(item =>
      item.title.toLowerCase().includes(searchTerm) ||
      item.content.toLowerCase().includes(searchTerm) ||
      item.summary.toLowerCase().includes(searchTerm) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      item.categories.some(cat => cat.toLowerCase().includes(searchTerm))
    )
  } catch (error) {
    console.error('Search failed:', error)
    return []
  }
}

// AI Connection Discovery Functions

/**
 * Trigger connection discovery for a newly processed item
 * @param {Object} newItem - The newly processed content item
 * @param {Array} allItems - All content items including the new one
 */
async function triggerConnectionDiscovery(newItem, allItems) {
  try {
    // Check if connection discovery is enabled in settings
    const { smartshelfSettings } = await chrome.storage.sync.get('smartshelfSettings')

    if (!smartshelfSettings?.connectionDiscovery || !connectionDiscoveryService) {
      console.log('Connection discovery disabled or service unavailable')
      return
    }

    console.log(`Triggering connection discovery for: ${newItem.title}`)

    // Get all other items (excluding the new item itself)
    const existingItems = allItems.filter(item => item.id !== newItem.id && item.status === 'processed')

    if (existingItems.length === 0) {
      console.log('No existing items to analyze connections with')
      return
    }

    // Discover connections in background (don't await to avoid blocking)
    connectionDiscoveryService.discoverConnectionsForItem(newItem, existingItems)
      .then(connections => {
        if (connections.length > 0) {
          console.log(`Found ${connections.length} connections for item: ${newItem.title}`)

          // Notify UI about new connections if needed
          notifyUIAboutNewConnections(newItem.id, connections)
        }
      })
      .catch(error => {
        console.error('Connection discovery failed for item:', newItem.title, error)
      })
  } catch (error) {
    console.error('Failed to trigger connection discovery:', error)
  }
}

/**
 * Perform batch connection discovery for all items
 * This can be called manually or on a schedule
 */
async function performBatchConnectionDiscovery() {
  try {
    if (!connectionDiscoveryService) {
      console.warn('Connection discovery service not available')
      return
    }

    console.log('Starting batch connection discovery...')

    const { contentItems = [] } = await chrome.storage.local.get('contentItems')
    const processedItems = contentItems.filter(item => item.status === 'processed')

    if (processedItems.length < 2) {
      console.log('Need at least 2 processed items for connection discovery')
      return
    }

    const connections = await connectionDiscoveryService.batchDiscoverConnections(processedItems, 3)

    console.log(`Batch connection discovery completed: ${connections.length} total connections found`)

    if (connections.length > 0) {
      // Notify UI about batch discovery completion
      notifyUIAboutBatchDiscovery(connections.length)
    }

    return connections
  } catch (error) {
    console.error('Batch connection discovery failed:', error)
    return []
  }
}

/**
 * Get connections for a specific item
 * @param {string} itemId - Item ID to get connections for
 * @returns {Promise<Array>} Array of connections
 */
async function getItemConnections(itemId) {
  try {
    if (!connectionDiscoveryService) {
      return []
    }

    return await connectionDiscoveryService.getConnectionsForItem(itemId)
  } catch (error) {
    console.error('Failed to get item connections:', error)
    return []
  }
}

/**
 * Get connection discovery statistics
 * @returns {Object} Processing statistics
 */
function getConnectionDiscoveryStats() {
  if (!connectionDiscoveryService) {
    return {
      isAvailable: false,
      message: 'Connection discovery service not available'
    }
  }

  return {
    isAvailable: true,
    ...connectionDiscoveryService.getProcessingStats()
  }
}

/**
 * Notify UI components about new connections
 * @param {string} itemId - Item ID that has new connections
 * @param {Array} connections - Array of new connections
 */
function notifyUIAboutNewConnections(itemId, connections) {
  try {
    // Send message to any listening UI components (sidepanel, popup)
    chrome.runtime.sendMessage({
      type: 'connections_discovered',
      data: {
        itemId,
        connectionCount: connections.length,
        connections: connections.map(conn => conn.toJSON())
      }
    }).catch(() => {
      // No listeners, which is fine
    })
  } catch (error) {
    console.error('Failed to notify UI about connections:', error)
  }
}

/**
 * Notify UI about batch discovery completion
 * @param {number} totalConnections - Total connections found
 */
function notifyUIAboutBatchDiscovery(totalConnections) {
  try {
    chrome.runtime.sendMessage({
      type: 'batch_discovery_complete',
      data: {
        totalConnections,
        timestamp: new Date().toISOString()
      }
    }).catch(() => {
      // No listeners, which is fine
    })
  } catch (error) {
    console.error('Failed to notify UI about batch discovery:', error)
  }
}

// Export-Only API Functions

/**
 * Process API request through the Export-Only API Gateway
 * @param {string} endpoint - API endpoint
 * @param {string} token - API token
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} API response
 */
async function processAPIRequest(endpoint, token, params) {
  try {
    if (!exportAPIGateway) {
      throw new Error('Export API Gateway not available')
    }

    return await exportAPIGateway.processAPIRequest(endpoint, token, params)
  } catch (error) {
    console.error('API request processing failed:', error)
    throw error
  }
}

/**
 * Generate new API token
 * @param {string} name - Token name
 * @param {Array} permissions - Permissions array
 * @param {Date} expiresAt - Expiration date
 * @returns {Promise<Object>} Token information
 */
async function generateAPIToken(name, permissions, expiresAt) {
  try {
    if (!exportAPIGateway) {
      throw new Error('Export API Gateway not available')
    }

    return await exportAPIGateway.generateAPIToken(name, permissions, expiresAt)
  } catch (error) {
    console.error('API token generation failed:', error)
    throw error
  }
}

/**
 * Revoke API token
 * @param {string} tokenId - Token ID to revoke
 * @returns {Promise<boolean>} Success status
 */
async function revokeAPIToken(tokenId) {
  try {
    if (!exportAPIGateway) {
      throw new Error('Export API Gateway not available')
    }

    return await exportAPIGateway.revokeAPIToken(tokenId)
  } catch (error) {
    console.error('API token revocation failed:', error)
    throw error
  }
}

/**
 * Get API usage statistics
 * @returns {Object} Usage statistics
 */
function getAPIUsageStats() {
  if (!exportAPIGateway) {
    return {
      isAvailable: false,
      message: 'Export API Gateway not available'
    }
  }

  return {
    isAvailable: true,
    ...exportAPIGateway.getUsageStats()
  }
}

// AI Writer Service Functions

/**
 * Generate AI insights for a content item
 * @param {Object} contentItem - The content item to analyze
 * @returns {Promise<string>} Generated insights
 */
async function generateContentInsights(contentItem) {
  try {
    if (!aiWriterService || !aiWriterService.isReady()) {
      throw new Error('AI Writer service not available')
    }

    return await aiWriterService.generateInsights(contentItem)
  } catch (error) {
    console.error('Failed to generate insights:', error)
    throw error
  }
}

/**
 * Enhance user notes with AI suggestions
 * @param {string} notes - Current user notes
 * @param {Object} contentItem - Related content item
 * @returns {Promise<string>} Enhanced notes
 */
async function enhanceUserNotes(notes, contentItem) {
  try {
    if (!aiWriterService || !aiWriterService.isReady()) {
      console.warn('AI Writer service not available, returning original notes')
      return notes
    }

    return await aiWriterService.enhanceNotes(notes, contentItem)
  } catch (error) {
    console.error('Failed to enhance notes:', error)
    return notes // Return original notes on error
  }
}

/**
 * Generate key takeaways from content
 * @param {Object} contentItem - The content item to analyze
 * @returns {Promise<Array>} Array of takeaways
 */
async function generateContentTakeaways(contentItem) {
  try {
    if (!aiWriterService || !aiWriterService.isReady()) {
      throw new Error('AI Writer service not available')
    }

    return await aiWriterService.generateTakeaways(contentItem)
  } catch (error) {
    console.error('Failed to generate takeaways:', error)
    throw error
  }
}

/**
 * Generate study questions for content
 * @param {Object} contentItem - The content item to create questions for
 * @returns {Promise<Array>} Array of study questions
 */
async function generateStudyQuestions(contentItem) {
  try {
    if (!aiWriterService || !aiWriterService.isReady()) {
      throw new Error('AI Writer service not available')
    }

    return await aiWriterService.generateStudyQuestions(contentItem)
  } catch (error) {
    console.error('Failed to generate study questions:', error)
    throw error
  }
}

/**
 * Generate connection analysis between two items
 * @param {Object} sourceItem - First content item
 * @param {Object} targetItem - Second content item
 * @param {Object} connection - Connection object
 * @returns {Promise<string>} Connection analysis
 */
async function generateConnectionAnalysis(sourceItem, targetItem, connection) {
  try {
    if (!aiWriterService || !aiWriterService.isReady()) {
      throw new Error('AI Writer service not available')
    }

    return await aiWriterService.generateConnectionAnalysis(sourceItem, targetItem, connection)
  } catch (error) {
    console.error('Failed to generate connection analysis:', error)
    throw error
  }
}

/**
 * Generate research outline from multiple items
 * @param {Array} items - Array of content items
 * @param {string} topic - Research topic
 * @returns {Promise<string>} Research outline
 */
async function generateResearchOutline(items, topic) {
  try {
    if (!aiWriterService || !aiWriterService.isReady()) {
      throw new Error('AI Writer service not available')
    }

    return await aiWriterService.generateResearchOutline(items, topic)
  } catch (error) {
    console.error('Failed to generate research outline:', error)
    throw error
  }
}

/**
 * Get AI Writer service statistics
 * @returns {Object} Service statistics
 */
function getWriterServiceStats() {
  if (!aiWriterService) {
    return {
      isAvailable: false,
      message: 'AI Writer service not available'
    }
  }

  return {
    isAvailable: true,
    ...aiWriterService.getStats()
  }
}

// AI Processing Queue Functions

/**
 * Enqueue item for AI processing
 * @param {Object} contentItem - Content item to process
 * @param {string} priority - Processing priority (high, normal, low)
 * @returns {Promise<string>} Item ID in queue
 */
async function enqueueItemForProcessing(contentItem, priority = 'normal') {
  if (!aiProcessingQueue) {
    throw new Error('AI Processing Queue not available')
  }

  return await aiProcessingQueue.enqueue(contentItem, priority)
}

/**
 * Get queue status
 * @returns {Promise<Object>} Queue status
 */
async function getQueueStatus() {
  if (!aiProcessingQueue) {
    throw new Error('AI Processing Queue not available')
  }

  return await aiProcessingQueue.getQueueStatus()
}

/**
 * Get queue position for item
 * @param {string} itemId - Item ID
 * @returns {Promise<number>} Queue position
 */
async function getQueuePosition(itemId) {
  if (!aiProcessingQueue) {
    throw new Error('AI Processing Queue not available')
  }

  return await aiProcessingQueue.getQueuePosition(itemId)
}

/**
 * Remove item from queue
 * @param {string} itemId - Item ID to remove
 * @returns {Promise<boolean>} Success status
 */
async function removeItemFromQueue(itemId) {
  if (!aiProcessingQueue) {
    throw new Error('AI Processing Queue not available')
  }

  return await aiProcessingQueue.removeFromQueue(itemId)
}

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue statistics
 */
async function getQueueStatistics() {
  if (!aiProcessingQueue) {
    throw new Error('AI Processing Queue not available')
  }

  return await aiProcessingQueue.getStatistics()
}

/**
 * Get queue analytics
 * @returns {Promise<Object>} Queue analytics
 */
async function getQueueAnalytics() {
  if (!aiProcessingQueue) {
    throw new Error('AI Processing Queue not available')
  }

  return await aiProcessingQueue.getAnalytics()
}

// SmartShelf Service Worker
// Handles background AI processing, content management, and Chrome Extension lifecycle

console.log('SmartShelf Service Worker loaded')

// Global AI session management
let aiSession = null
let summarizerSession = null
// let processingQueue = [] // TODO: Implement queue processing
// let isProcessingQueue = false // TODO: Implement queue processing

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
  } catch (error) {
    console.error('Failed to initialize extension:', error)
  }
}

// Initialize Chrome Built-in AI capabilities
async function initializeAICapabilities() {
  try {
    // Check if Chrome Built-in AI is available
    if ('aiOriginTrial' in chrome && chrome.aiOriginTrial) {
      // Check Prompt API availability
      if (chrome.aiOriginTrial.languageModel) {
        const capabilities = await chrome.aiOriginTrial.languageModel.capabilities()
        console.log('AI Prompt capabilities:', capabilities)

        if (capabilities.available === 'readily') {
          aiSession = await chrome.aiOriginTrial.languageModel.create({
            systemPrompt: `You are SmartShelf AI, a content analysis assistant. Analyze web content and provide structured insights in JSON format with:
            - summary: Brief 1-2 sentence summary
            - tags: Array of 3-5 relevant tags (lowercase, no spaces)
            - categories: Array of 1-3 main categories
            - key_points: Array of 2-4 key insights
            Always respond with valid JSON only.`,
            temperature: 0.7,
            topK: 3
          })
          console.log('AI Prompt session initialized')
        }
      }

      // Check Summarizer API availability
      if (chrome.aiOriginTrial.summarizer) {
        const sumCapabilities = await chrome.aiOriginTrial.summarizer.capabilities()
        console.log('AI Summarizer capabilities:', sumCapabilities)

        if (sumCapabilities.available === 'readily') {
          summarizerSession = await chrome.aiOriginTrial.summarizer.create({
            type: 'tl;dr',
            format: 'plain-text',
            length: 'medium'
          })
          console.log('AI Summarizer session initialized')
        }
      }
    } else {
      console.log('Chrome Built-in AI not available, using fallback processing')
    }
  } catch (error) {
    console.log('AI initialization failed, using fallback:', error.message)
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

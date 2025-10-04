// SmartShelf Popup Script
// Handles popup interface interactions and quick content saving

console.log('SmartShelf Popup loaded')

// DOM elements
let pageTitle, pageUrl, saveBtn, viewCollectionBtn, addPhysicalBtn, searchBtn, statusMessage

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup DOM loaded')

  // Get DOM elements
  pageTitle = document.getElementById('page-title')
  pageUrl = document.getElementById('page-url')
  saveBtn = document.getElementById('save-btn')
  viewCollectionBtn = document.getElementById('view-collection-btn')
  addPhysicalBtn = document.getElementById('add-physical-btn')
  searchBtn = document.getElementById('search-btn')
  statusMessage = document.getElementById('status-message')

  // Set up event listeners
  setupEventListeners()

  // Load current page info
  await loadCurrentPageInfo()
})

// Set up event listeners
function setupEventListeners() {
  // Save current page
  saveBtn?.addEventListener('click', async () => {
    await saveCurrentPage()
  })

  // View collection (open side panel)
  viewCollectionBtn?.addEventListener('click', async () => {
    await openSidePanel()
  })

  // Add physical item
  addPhysicalBtn?.addEventListener('click', () => {
    // TODO: Open add physical item dialog
    showStatus('Physical item feature coming soon!', 'info')
  })

  // Search collection
  searchBtn?.addEventListener('click', async () => {
    await openSidePanelWithSearch()
  })
}

// Load current page information
async function loadCurrentPageInfo() {
  try {
    showStatus('Loading page info...', 'loading')

    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab) {
      showStatus('No active tab found', 'error')
      return
    }

    // Update UI with page info
    pageTitle.textContent = tab.title || 'Untitled Page'
    pageUrl.textContent = formatUrl(tab.url)

    // Check if page is already saved
    const isSaved = await checkIfPageSaved(tab.url)

    if (isSaved) {
      saveBtn.innerHTML = '<span class="icon">✅</span>Already Saved'
      saveBtn.classList.add('saved')
      showStatus('Page already in your collection', 'success')
    } else {
      showStatus('Ready to save content', 'ready')
    }
  } catch (error) {
    console.error('Failed to load page info:', error)
    showStatus('Failed to load page info', 'error')
  }
}

// Save current page
async function saveCurrentPage() {
  try {
    showStatus('Saving page...', 'loading')
    saveBtn.disabled = true

    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab) {
      showStatus('No active tab found', 'error')
      return
    }

    // Wait for service worker to be ready
    await ensureServiceWorkerReady()

    // Extract page content via content script
    const response = await extractPageContentWithRetry(tab.id)

    if (!response || !response.success) {
      throw new Error('Failed to extract page content')
    }

    // Send to service worker for processing
    const saveResponse = await sendMessageWithRetry({
      action: 'save_content',
      data: response.data
    })

    if (saveResponse && saveResponse.success) {
      showStatus('✅ Saved! AI analysis starting...', 'success')

      // Update save button
      saveBtn.innerHTML = '<span class="icon">🧠</span>AI Processing'
      saveBtn.classList.add('saved')

      // Show success message on page
      chrome.tabs.sendMessage(tab.id, { action: 'show_save_success' })

      // Show AI processing status
      setTimeout(() => {
        showStatus('🧠 AI analyzing content for tags and insights...', 'info')
      }, 1000)
    } else {
      throw new Error(saveResponse?.error || 'Unknown error')
    }
  } catch (error) {
    console.error('Failed to save page:', error)
    showStatus('❌ Failed to save', 'error')

    // Show error message on page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: 'show_save_error' })
    }
  } finally {
    saveBtn.disabled = false
  }
}

// Open side panel
async function openSidePanel() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (tab) {
      await chrome.sidePanel.open({ windowId: tab.windowId })
      window.close() // Close popup
    }
  } catch (error) {
    console.error('Failed to open side panel:', error)
    showStatus('Failed to open collection view', 'error')
  }
}

// Open side panel with search focused
async function openSidePanelWithSearch() {
  try {
    await openSidePanel()

    // Send message to focus search (will be handled by side panel)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab) {
      chrome.runtime.sendMessage({ action: 'focus_search' })
    }
  } catch (error) {
    console.error('Failed to open search:', error)
    showStatus('Failed to open search', 'error')
  }
}

// Check if page is already saved
async function checkIfPageSaved(url) {
  try {
    const response = await sendMessageWithRetry({
      action: 'get_contentItems'
    })

    if (response && response.success) {
      const items = response.data || []
      return items.some(item => item.url === url)
    }

    return false
  } catch (error) {
    console.error('Failed to check if page is saved:', error)
    return false
  }
}

// Format URL for display
function formatUrl(url) {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.replace('www.', '')
    const path = urlObj.pathname

    if (path === '/' || path === '') {
      return domain
    }

    // Truncate long paths
    if (path.length > 30) {
      return `${domain}${path.slice(0, 30)}...`
    }

    return `${domain}${path}`
  } catch (error) {
    return url.length > 50 ? `${url.slice(0, 50)}...` : url
  }
}

// Show status message
function showStatus(message, type = 'info') {
  if (!statusMessage) return

  statusMessage.textContent = message
  statusMessage.className = `status ${type}`

  // Auto-clear success and info messages
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      if (statusMessage.textContent === message) {
        statusMessage.textContent = 'Ready to save content'
        statusMessage.className = 'status ready'
      }
    }, 3000)
  }
}

// Handle keyboard shortcuts in popup
document.addEventListener('keydown', (event) => {
  // Enter key saves current page
  if (event.key === 'Enter' && !saveBtn.disabled) {
    saveCurrentPage()
  }

  // Escape key closes popup
  if (event.key === 'Escape') {
    window.close()
  }
})

// Utility functions for service worker communication
async function ensureServiceWorkerReady() {
  const maxAttempts = 10
  const delay = 100
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Test if service worker is responding
      const testResponse = await chrome.runtime.sendMessage({ action: 'ping' })
      if (testResponse && testResponse.success) {
        console.log('Service worker is ready and responding')
        return true
      }
    } catch (error) {
      console.warn(`Service worker ping attempt ${attempt} failed:`, error.message)
    }
    
    if (attempt === maxAttempts) {
      console.warn('Service worker may not be ready after', maxAttempts, 'attempts')
      return false
    }
    
    // Exponential backoff with jitter
    const waitTime = delay * Math.pow(1.5, attempt - 1) + Math.random() * 100
    await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 2000)))
  }
}

// Send message with retry logic
async function sendMessageWithRetry(message, maxAttempts = 3) {
  let lastError = null
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await chrome.runtime.sendMessage(message)
      return response
    } catch (error) {
      lastError = error
      console.warn(`Message attempt ${attempt} failed:`, error.message)
      
      if (attempt < maxAttempts) {
        // Wait before retry, with exponential backoff
        const delay = Math.min(200 * Math.pow(2, attempt - 1), 1000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

// Check if a tab can be accessed for script injection
async function canAccessTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!tab || !tab.url) {
      return { canAccess: false, reason: 'Invalid tab' }
    }
    
    // Check for system pages and special URLs
    const restrictedSchemes = ['chrome:', 'chrome-extension:', 'moz-extension:', 'about:', 'edge:', 'opera:']
    const isRestricted = restrictedSchemes.some(scheme => tab.url.startsWith(scheme)) || 
                        tab.url === 'about:blank'
    
    if (isRestricted) {
      return { canAccess: false, reason: 'System page', url: tab.url }
    }
    
    return { canAccess: true, url: tab.url }
  } catch (error) {
    return { canAccess: false, reason: 'Tab access error', error: error.message }
  }
}

// Extract content with retry logic
async function extractPageContentWithRetry(tabId, maxAttempts = 3) {
  let lastError = null
  
  // First check if we can access this tab at all
  const accessCheck = await canAccessTab(tabId)
  if (!accessCheck.canAccess) {
    console.warn('Cannot access tab:', accessCheck.reason, accessCheck.url || '')
    
    // For system pages, immediately fall back to tab info
    if (accessCheck.reason === 'System page') {
      console.log('System page detected, using tab info fallback')
      try {
        const tab = await chrome.tabs.get(tabId)
        const minimalContent = {
          title: tab.title || 'System Page',
          url: tab.url || '',
          content: 'This is a browser system page. Content extraction is not available.',
          timestamp: Date.now(),
          domain: tab.url ? new URL(tab.url).hostname : 'system',
          type: 'system',
          meta: { description: 'Browser system page' },
          readingTime: { words: 0, minutes: 0, text: '0 min read' }
        }
        
        return {
          success: true,
          data: minimalContent
        }
      } catch (error) {
        console.error('Failed to create system page content:', error)
      }
    }
    
    throw new Error(`Cannot access tab: ${accessCheck.reason}`)
  }
  
  console.log('Attempting content extraction from:', accessCheck.url)
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Content extraction attempt ${attempt}/${maxAttempts}`)
      
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'extract_content'
      })
      
      if (response && response.success) {
        console.log('Content extraction successful via content script')
        return response
      } else {
        throw new Error('Content script returned invalid response')
      }
    } catch (error) {
      lastError = error
      console.warn(`Content extraction attempt ${attempt} failed:`, error.message)
      
      // On the last attempt or if it's clearly a connection issue, skip injection and go straight to fallback
      if (attempt === maxAttempts || 
          (error.message.includes('Could not establish connection') && attempt >= 2)) {
        console.log('Skipping injection attempts, going directly to fallback content extraction')
        break
      }
      
      // If content script is not available, try injecting it
      if (error.message.includes('Could not establish connection') && attempt <= 2) {
        console.log(`Attempt ${attempt}: Content script connection failed, trying injection...`)
        
        try {
          // Check if we have the right permissions first
          const tab = await chrome.tabs.get(tabId)
          if (!tab || !tab.url) {
            throw new Error('Invalid tab')
          }
          
          // Skip system pages and special URLs
          const isSystemPage = tab.url.startsWith('chrome://') || 
                              tab.url.startsWith('chrome-extension://') ||
                              tab.url.startsWith('moz-extension://') ||
                              tab.url.startsWith('about:') ||
                              tab.url.startsWith('edge://') ||
                              tab.url.startsWith('opera://') ||
                              tab.url === 'about:blank'
                              
          if (isSystemPage) {
            console.warn('Cannot inject content script into system page:', tab.url)
            throw new Error('Cannot inject content script into system page')
          }
          
          console.log('Injecting content script into:', tab.url)
          
          // First try to inject directly as code to ensure it runs immediately
          await chrome.scripting.executeScript({
            target: { tabId },
            func: function() {
              // Check if content script is already loaded
              if (window.smartShelfInjected) {
                console.log('SmartShelf content script already loaded')
                return 'already_loaded'
              }
              
              // Mark as injected
              window.smartShelfInjected = true
              console.log('SmartShelf content script marker set')
              return 'marker_set'
            }
          })
          
          // Then inject the actual content script file
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content/content-script.js']
          })
          
          console.log('Content script injection completed')
          
          // Wait longer for initialization and add a verification step
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Verify the content script is responding
          try {
            const testResponse = await chrome.tabs.sendMessage(tabId, { action: 'ping' })
            if (testResponse) {
              console.log('Content script ping successful after injection')
            } else {
              console.warn('Content script not responding to ping after injection')
            }
          } catch (pingError) {
            console.warn('Content script ping failed after injection:', pingError.message)
          }
          
          // Try the message again
          continue
        } catch (injectionError) {
          console.warn('Failed to inject content script:', injectionError.message)
          // If injection fails, we'll fall back to executeScript method
        }
      }
      
      if (attempt < maxAttempts) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 300 * attempt))
      }
    }
  }
  
  // If content script fails, try basic content extraction via executeScript
  console.log('Content script failed, attempting direct content extraction fallback')
  
  try {
    // First check if we can access this tab
    const tab = await chrome.tabs.get(tabId)
    if (!tab || !tab.url) {
      throw new Error('Invalid tab for content extraction')
    }
    
    // Handle system pages gracefully
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || 
        tab.url.startsWith('about:') || tab.url.startsWith('moz-extension://')) {
      console.log('System page detected, creating system page content')
      const systemContent = {
        title: tab.title || 'System Page',
        url: tab.url,
        content: `This is a browser system page (${tab.url}). Content extraction is not available for system pages.`,
        timestamp: Date.now(),
        domain: 'system',
        type: 'system',
        meta: { description: 'Browser system page' },
        readingTime: { words: 8, minutes: 1, text: '1 min read' }
      }
      
      return {
        success: true,
        data: systemContent
      }
    }
    
    console.log('Executing direct content extraction for:', tab.url)
    
    // Try direct content extraction
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractBasicPageContent
    })
    
    if (results && results[0] && results[0].result) {
      console.log('Direct content extraction successful')
      return {
        success: true,
        data: results[0].result
      }
    } else {
      throw new Error('Direct extraction returned no data')
    }
  } catch (directError) {
    console.warn('Direct content extraction failed:', directError.message)
    
    // Last resort: create minimal content from tab info
    try {
      const tab = await chrome.tabs.get(tabId)
      const minimalContent = {
        title: tab.title || 'Untitled Page',
        url: tab.url || '',
        content: `Content extraction failed for this page. This may be due to page security restrictions or the page not being fully loaded.`,
        timestamp: Date.now(),
        domain: tab.url ? new URL(tab.url).hostname : 'unknown',
        type: 'webpage',
        meta: { description: 'Content extraction unavailable' },
        readingTime: { words: 15, minutes: 1, text: '1 min read' }
      }
      
      console.log('Using fallback content from tab metadata')
      return {
        success: true,
        data: minimalContent
      }
    } catch (minimalError) {
      console.error('Even minimal content creation failed:', minimalError.message)
      
      // Ultimate fallback - return a basic error content
      return {
        success: true,
        data: {
          title: 'Content Extraction Error',
          url: 'about:error',
          content: 'Unable to extract content from this page.',
          timestamp: Date.now(),
          domain: 'error',
          type: 'error',
          meta: { description: 'Content extraction failed' },
          readingTime: { words: 6, minutes: 1, text: '1 min read' }
        }
      }
    }
  }
  
  throw lastError
}

// Basic content extraction function for fallback
function extractBasicPageContent() {
  return {
    title: document.title || '',
    url: window.location.href,
    content: document.body.innerText.slice(0, 5000) || '',
    timestamp: Date.now(),
    domain: window.location.hostname,
    type: 'article',
    meta: {
      description: document.querySelector('meta[name="description"]')?.content || ''
    },
    readingTime: {
      words: (document.body.innerText || '').split(/\s+/).length,
      minutes: Math.ceil((document.body.innerText || '').split(/\s+/).length / 200),
      text: Math.ceil((document.body.innerText || '').split(/\s+/).length / 200) + ' min read'
    }
  }
}

console.log('SmartShelf Popup script initialized')

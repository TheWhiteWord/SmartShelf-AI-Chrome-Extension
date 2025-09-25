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

    // Extract page content via content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'extract_content'
    })

    if (!response || !response.success) {
      throw new Error('Failed to extract page content')
    }

    // Send to service worker for processing
    const saveResponse = await chrome.runtime.sendMessage({
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
    const response = await chrome.runtime.sendMessage({
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

console.log('SmartShelf Popup script initialized')

// SmartShelf Side Panel Script
// Handles main collection interface, search, and content management

console.log('SmartShelf Side Panel loaded')

// DOM elements
let searchInput, searchBtn, addContentBtn, addPhysicalBtn
let navButtons, contentViews
let contentGrid, recentItems, categoriesGrid, connectionsGraph
let itemCount, processingStatus, settingsBtn, exportBtn

// State
let currentView = 'all'
let contentItems = []
let searchResults = []
// let isLoading = false // TODO: Implement loading states

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Side Panel DOM loaded')

  // Get DOM elements
  initializeDOMElements()

  // Set up event listeners
  setupEventListeners()

  // Load initial data
  await loadContentItems()

  // Render current view
  renderCurrentView()
})

// Initialize DOM elements
function initializeDOMElements() {
  searchInput = document.getElementById('search-input')
  searchBtn = document.getElementById('search-btn')
  addContentBtn = document.getElementById('add-content-btn')
  addPhysicalBtn = document.getElementById('add-physical-btn')

  navButtons = document.querySelectorAll('.nav-btn')
  contentViews = document.querySelectorAll('.content-view')

  contentGrid = document.getElementById('content-grid')
  recentItems = document.getElementById('recent-items')
  categoriesGrid = document.getElementById('categories-grid')
  connectionsGraph = document.getElementById('connections-graph')

  itemCount = document.getElementById('item-count')
  processingStatus = document.getElementById('processing-status')
  settingsBtn = document.getElementById('settings-btn')
  exportBtn = document.getElementById('export-btn')
}

// Set up event listeners
function setupEventListeners() {
  // Search functionality
  searchInput?.addEventListener('input', debounce(handleSearch, 300))
  searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  })
  searchBtn?.addEventListener('click', handleSearch)

  // Navigation
  navButtons.forEach(btn => {
    btn.addEventListener('click', (event) => {
      const view = event.target.dataset.view
      switchView(view)
    })
  })

  // Add content buttons
  addContentBtn?.addEventListener('click', addCurrentPage)
  addPhysicalBtn?.addEventListener('click', showAddPhysicalDialog)

  // Footer buttons
  settingsBtn?.addEventListener('click', openSettings)
  exportBtn?.addEventListener('click', showExportOptions)
}

// Load content items from storage
async function loadContentItems() {
  try {
    setLoading(true)

    const response = await chrome.runtime.sendMessage({
      action: 'get_contentItems'
    })

    if (response && response.success) {
      contentItems = response.data || []
      updateItemCount()
      updateProcessingStatus()
    } else {
      console.error('Failed to load content items:', response?.error)
      contentItems = []
    }
  } catch (error) {
    console.error('Failed to load content items:', error)
    contentItems = []
  } finally {
    setLoading(false)
  }
}

// Handle search
async function handleSearch() {
  const query = searchInput?.value.trim() || ''

  try {
    setLoading(true)

    if (query === '') {
      searchResults = contentItems
    } else {
      const response = await chrome.runtime.sendMessage({
        action: 'search_content',
        query
      })

      if (response && response.success) {
        searchResults = response.data || []
      } else {
        searchResults = []
      }
    }

    renderCurrentView()
  } catch (error) {
    console.error('Search failed:', error)
    searchResults = []
  } finally {
    setLoading(false)
  }
}

// Switch between views
function switchView(viewName) {
  currentView = viewName

  // Update navigation
  navButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName)
  })

  // Update content views
  contentViews.forEach(view => {
    view.classList.toggle('hidden', !view.id.startsWith(viewName))
  })

  renderCurrentView()
}

// Render current view
function renderCurrentView() {
  switch (currentView) {
    case 'all':
      renderAllItems()
      break
    case 'recent':
      renderRecentItems()
      break
    case 'categories':
      renderCategories()
      break
    case 'connections':
      renderConnections()
      break
  }
}

// Render all items
function renderAllItems() {
  if (!contentGrid) return

  const items = searchInput?.value.trim() ? searchResults : contentItems

  if (items.length === 0) {
    contentGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>No items found</h3>
        <p>Start building your knowledge collection by saving content from any webpage.</p>
        <button onclick="addCurrentPage()" class="empty-action-btn">Save Current Page</button>
      </div>
    `
    return
  }

  contentGrid.innerHTML = items.map(item => renderContentItem(item)).join('')
}

// Render content item
function renderContentItem(item) {
  const typeIcon = getTypeIcon(item.type)
  const statusClass = getStatusClass(item.status)
  const timeAgo = formatTimeAgo(item.dateAdded)

  return `
    <div class="content-item ${statusClass}" data-id="${item.id}">
      <div class="item-header">
        <span class="item-type">${typeIcon}</span>
        <span class="item-status">${getStatusIndicator(item.status)}</span>
      </div>
      
      <div class="item-content">
        <h3 class="item-title">${escapeHtml(item.title)}</h3>
        
        ${item.summary ? `<p class="item-summary">${escapeHtml(item.summary)}</p>` : ''}
        
        <div class="item-meta">
          <span class="item-source">${formatSource(item.source)}</span>
          <span class="item-time">${timeAgo}</span>
        </div>
        
        ${item.tags.length > 0
? `
          <div class="item-tags">
            ${item.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        `
: ''}
      </div>
      
      <div class="item-actions">
        <button onclick="viewItem('${item.id}')" class="action-btn">View</button>
        <button onclick="editItem('${item.id}')" class="action-btn">Edit</button>
        <button onclick="deleteItem('${item.id}')" class="action-btn danger">Delete</button>
      </div>
    </div>
  `
}

// Render recent items
function renderRecentItems() {
  if (!recentItems) return

  const recent = contentItems
    .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
    .slice(0, 10)

  if (recent.length === 0) {
    recentItems.innerHTML = '<p class="no-items">No recent items</p>'
    return
  }

  recentItems.innerHTML = recent.map(item => `
    <div class="recent-item" onclick="viewItem('${item.id}')">
      <span class="recent-icon">${getTypeIcon(item.type)}</span>
      <div class="recent-content">
        <div class="recent-title">${escapeHtml(item.title)}</div>
        <div class="recent-time">${formatTimeAgo(item.dateAdded)}</div>
      </div>
    </div>
  `).join('')
}

// Render categories
function renderCategories() {
  if (!categoriesGrid) return

  const categoryMap = new Map()

  contentItems.forEach(item => {
    item.categories.forEach(category => {
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category).push(item)
    })
  })

  if (categoryMap.size === 0) {
    categoriesGrid.innerHTML = '<p class="no-categories">No categories yet</p>'
    return
  }

  categoriesGrid.innerHTML = Array.from(categoryMap.entries())
    .map(([category, items]) => `
      <div class="category-card" onclick="filterByCategory('${category}')">
        <div class="category-header">
          <h3>${escapeHtml(category)}</h3>
          <span class="category-count">${items.length}</span>
        </div>
        <div class="category-preview">
          ${items.slice(0, 3).map(item => `
            <div class="category-item">${escapeHtml(item.title)}</div>
          `).join('')}
        </div>
      </div>
    `).join('')
}

// Render connections (placeholder)
function renderConnections() {
  if (!connectionsGraph) return

  connectionsGraph.innerHTML = `
    <div class="connections-placeholder">
      <div class="connections-icon">🔗</div>
      <h3>AI Connections</h3>
      <p>AI-powered content connections will be displayed here once implemented.</p>
      <p class="feature-note">This feature uses Chrome's Prompt API to discover relationships between your saved content.</p>
    </div>
  `
}

// Add current page
async function addCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab) {
      showNotification('No active tab found', 'error')
      return
    }

    // Check if already saved
    const existingItem = contentItems.find(item => item.url === tab.url)
    if (existingItem) {
      showNotification('Page already saved', 'info')
      return
    }

    showNotification('Saving current page...', 'loading')

    // Trigger save via service worker
    await chrome.runtime.sendMessage({
      action: 'save_current_page'
    })

    // Reload content after short delay
    setTimeout(async () => {
      await loadContentItems()
      renderCurrentView()
      showNotification('Page saved successfully!', 'success')
    }, 1000)
  } catch (error) {
    console.error('Failed to add current page:', error)
    showNotification('Failed to save page', 'error')
  }
}

// Show add physical dialog (placeholder)
function showAddPhysicalDialog() {
  showNotification('Add Physical Item feature coming soon!', 'info')
}

// Open settings
function openSettings() {
  chrome.runtime.openOptionsPage()
}

// Show export options (placeholder)
function showExportOptions() {
  showNotification('Export feature coming soon!', 'info')
}

// Utility functions
function getTypeIcon(type) {
  const icons = {
    article: '📄',
    video: '🎥',
    book: '📚',
    document: '📋',
    research: '🔬',
    news: '📰',
    blog: '✍️',
    social: '💬',
    documentation: '📖'
  }
  return icons[type] || '📄'
}

function getStatusClass(status) {
  return `status-${status}`
}

function getStatusIndicator(status) {
  const indicators = {
    pending: '⏳',
    processing: '🧠',
    processed: '✨',
    error: '❌',
    manual: '✋'
  }
  return indicators[status] || ''
}

function formatSource(source) {
  try {
    const url = new URL(source)
    return url.hostname.replace('www.', '')
  } catch {
    return source
  }
}

function formatTimeAgo(timestamp) {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function updateItemCount() {
  if (itemCount) {
    itemCount.textContent = `${contentItems.length} items`
  }
}

function updateProcessingStatus() {
  if (!processingStatus) return

  const processingCount = contentItems.filter(item =>
    item.status === 'pending' || item.status === 'processing'
  ).length

  if (processingCount > 0) {
    processingStatus.textContent = `Processing ${processingCount} items...`
  } else {
    processingStatus.textContent = ''
  }
}

function setLoading(loading) {
  // isLoading = loading // TODO: Implement loading states
  document.body.classList.toggle('loading', loading)
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div')
  notification.className = `notification ${type}`
  notification.textContent = message

  document.body.appendChild(notification)

  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.remove()
  }, 3000)
}

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Global functions for item actions
window.viewItem = function(itemId) {
  console.log('View item:', itemId)
  showNotification('View item feature coming soon!', 'info')
}

window.editItem = function(itemId) {
  console.log('Edit item:', itemId)
  showNotification('Edit item feature coming soon!', 'info')
}

window.deleteItem = function(itemId) {
  console.log('Delete item:', itemId)
  showNotification('Delete item feature coming soon!', 'info')
}

window.filterByCategory = function(category) {
  searchInput.value = `category:${category}`
  handleSearch()
  switchView('all')
}

console.log('SmartShelf Side Panel script initialized')

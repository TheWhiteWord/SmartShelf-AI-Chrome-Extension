// SmartShelf Side Panel Script
// Handles main collection interface, search, and content management

console.log('SmartShelf Side Panel loaded')

// Load models (they will be available as window.PhysicalItem, window.Collection, etc.)
const modelScripts = [
  '../shared/models/physical-item.js',
  '../shared/models/collection.js',
  '../shared/models/connection.js'
]

// Load models dynamically
modelScripts.forEach(script => {
  const scriptElement = document.createElement('script')
  scriptElement.src = script
  document.head.appendChild(scriptElement)
})

// DOM elements
let searchInput, searchBtn, addContentBtn, addPhysicalBtn
let navButtons, contentViews
let contentGrid, recentItems, categoriesGrid, connectionsGraph, collectionsGrid, physicalItemsGrid
let itemCount, processingStatus, settingsBtn, exportBtn
let physicalItemModal, collectionModal, itemDetailsModal
let createCollectionBtn, addPhysicalItemBtn

// State
let currentView = 'all'
let contentItems = []
let searchResults = []
let collections = []
const physicalItems = []
let connections = []
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
  await loadCollections()
  await loadConnections()

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
  collectionsGrid = document.getElementById('collections-grid')
  physicalItemsGrid = document.getElementById('physical-items-grid')

  itemCount = document.getElementById('item-count')
  processingStatus = document.getElementById('processing-status')
  settingsBtn = document.getElementById('settings-btn')
  exportBtn = document.getElementById('export-btn')

  // Modal elements
  physicalItemModal = document.getElementById('physical-item-modal')
  collectionModal = document.getElementById('collection-modal')
  itemDetailsModal = document.getElementById('item-details-modal')

  // New action buttons
  createCollectionBtn = document.getElementById('create-collection-btn')
  addPhysicalItemBtn = document.getElementById('add-physical-item-btn')
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

  // New action buttons
  createCollectionBtn?.addEventListener('click', showCreateCollectionDialog)
  addPhysicalItemBtn?.addEventListener('click', showAddPhysicalDialog)

  // Modal event listeners
  setupModalEventListeners()

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
    case 'collections':
      renderCollections()
      break
    case 'physical':
      renderPhysicalItems()
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

// Render connections
function renderConnections() {
  if (!connectionsGraph) return

  if (connections.length === 0) {
    connectionsGraph.innerHTML = `
      <div class="connections-placeholder">
        <div class="connections-icon">🔗</div>
        <h3>AI Connections</h3>
        <p>No connections discovered yet. Add more content for AI to analyze relationships.</p>
        <p class="feature-note">This feature uses Chrome's Prompt API to discover relationships between your saved content.</p>
      </div>
    `
    return
  }

  // Group connections by strength
  const strongConnections = connections.filter(c => c.strength >= 0.8)
  const moderateConnections = connections.filter(c => c.strength >= 0.6 && c.strength < 0.8)

  connectionsGraph.innerHTML = `
    <div class="connections-content">
      ${strongConnections.length > 0
? `
        <div class="connection-group">
          <h4>Strong Connections (${strongConnections.length})</h4>
          ${strongConnections.map(renderConnectionItem).join('')}
        </div>
      `
: ''}
      
      ${moderateConnections.length > 0
? `
        <div class="connection-group">
          <h4>Moderate Connections (${moderateConnections.length})</h4>
          ${moderateConnections.map(renderConnectionItem).join('')}
        </div>
      `
: ''}
    </div>
  `
}

function renderConnectionItem(connection) {
  const sourceItem = contentItems.find(item => item.id === connection.sourceItemId)
  const targetItem = contentItems.find(item => item.id === connection.targetItemId)

  if (!sourceItem || !targetItem) return ''

  return `
    <div class="connection-item" data-connection-id="${connection.id}">
      <div class="connection-header">
        <span class="connection-strength">${Math.round(connection.strength * 100)}%</span>
        <span class="connection-type">${connection.getTypeDisplayName?.() || connection.connectionType}</span>
      </div>
      <div class="connection-items">
        <div class="connection-source">
          <span class="item-title">${escapeHtml(sourceItem.title)}</span>
        </div>
        <div class="connection-arrow">→</div>
        <div class="connection-target">
          <span class="item-title">${escapeHtml(targetItem.title)}</span>
        </div>
      </div>
      <div class="connection-description">
        ${escapeHtml(connection.description)}
      </div>
    </div>
  `
}

// Render collections
function renderCollections() {
  if (!collectionsGrid) return

  if (collections.length === 0) {
    collectionsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📁</div>
        <h3>No collections yet</h3>
        <p>Create collections to organize your content into projects and topics.</p>
        <button onclick="showCreateCollectionDialog()" class="empty-action-btn">Create Collection</button>
      </div>
    `
    return
  }

  collectionsGrid.innerHTML = collections.map(collection => {
    const itemCount = collection.itemIds ? collection.itemIds.length : 0
    return `
      <div class="collection-card" data-collection-id="${collection.id}" onclick="viewCollection('${collection.id}')">
        <div class="collection-header">
          <span class="collection-icon">${collection.icon || '📁'}</span>
          <h3 class="collection-name">${escapeHtml(collection.name)}</h3>
        </div>
        <div class="collection-info">
          <div class="collection-description">${escapeHtml(collection.description || 'No description')}</div>
          <div class="collection-stats">
            <span class="item-count">${itemCount} items</span>
            <span class="collection-date">${formatTimeAgo(collection.dateCreated)}</span>
          </div>
        </div>
        <div class="collection-actions">
          <button onclick="editCollection('${collection.id}')" class="action-btn">Edit</button>
          <button onclick="deleteCollection('${collection.id}')" class="action-btn danger">Delete</button>
        </div>
      </div>
    `
  }).join('')
}

// Render physical items
function renderPhysicalItems() {
  if (!physicalItemsGrid) return

  const physicalItemsOnly = contentItems.filter(item => item.isPhysical)

  if (physicalItemsOnly.length === 0) {
    physicalItemsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>No physical items yet</h3>
        <p>Add your books, documents, and other physical materials to your collection.</p>
        <button onclick="showAddPhysicalDialog()" class="empty-action-btn">Add Physical Item</button>
      </div>
    `
    return
  }

  physicalItemsGrid.innerHTML = physicalItemsOnly.map(item => {
    const hasDigitalVersion = item.digitalVersion && item.digitalVersion.url

    return `
      <div class="physical-item-card" data-item-id="${item.id}" onclick="viewItem('${item.id}')">
        <div class="item-header">
          <span class="item-type">📚</span>
          <span class="item-status">${item.condition || 'good'}</span>
          ${hasDigitalVersion ? '<span class="digital-badge">📖 Digital Available</span>' : ''}
        </div>
        
        <div class="item-content">
          <h3 class="item-title">${escapeHtml(item.title)}</h3>
          
          ${item.author ? `<p class="item-author">by ${escapeHtml(item.author)}</p>` : ''}
          
          <div class="item-meta">
            <span class="item-location">📍 ${escapeHtml(item.physicalLocation)}</span>
            <span class="item-time">${formatTimeAgo(item.dateAdded)}</span>
          </div>
          
          ${item.isbn ? `<div class="item-isbn">ISBN: ${item.isbn}</div>` : ''}
          
          <div class="loan-status ${item.loanStatus || 'available'}">
            ${getLoanStatusText(item.loanStatus)}
          </div>
        </div>
        
        <div class="item-actions">
          <button onclick="viewItem('${item.id}')" class="action-btn">View</button>
          <button onclick="editPhysicalItem('${item.id}')" class="action-btn">Edit</button>
          ${hasDigitalVersion ? `<button onclick="openDigitalVersion('${item.id}')" class="action-btn">Open Digital</button>` : ''}
        </div>
      </div>
    `
  }).join('')
}

function getLoanStatusText(loanStatus) {
  const statusMap = {
    available: '✅ Available',
    'loaned-out': '📤 Loaned Out',
    borrowed: '📥 Borrowed'
  }
  return statusMap[loanStatus] || '✅ Available'
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

// Physical item dialog is implemented above in Physical Items Management section

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

// Physical Items Management

function showAddPhysicalDialog() {
  physicalItemModal?.classList.remove('hidden')
}

async function handlePhysicalItemSubmit(event) {
  event.preventDefault()

  try {
    const formData = new FormData(event.target)
    const physicalItemData = {
      title: formData.get('title'),
      author: formData.get('author'),
      isbn: formData.get('isbn'),
      publisher: formData.get('publisher'),
      physicalLocation: formData.get('physicalLocation'),
      condition: formData.get('condition'),
      notes: formData.get('notes'),
      type: 'book' // Default type for physical items
    }

    // Create PhysicalItem instance (ensure models are loaded)
    if (!window.PhysicalItem) {
      showNotification('Error: PhysicalItem model not loaded', 'error')
      return
    }
    
    const physicalItem = new window.PhysicalItem(physicalItemData)

    // Validate
    const validation = physicalItem.validate()
    if (!validation.isValid) {
      showNotification(`Validation error: ${validation.errors.join(', ')}`, 'error')
      return
    }

    // Search for digital version
    showNotification('Searching for digital version...', 'info')
    await physicalItem.searchDigitalVersion()

    // Save to storage
    const { contentItems = [] } = await chrome.storage.local.get('contentItems')
    contentItems.push(physicalItem.toJSON())
    await chrome.storage.local.set({ contentItems })

    // Close modal and refresh view
    physicalItemModal?.classList.add('hidden')
    document.getElementById('physical-item-form').reset()

    await loadContentItems()
    renderCurrentView()

    showNotification('Physical item added successfully!', 'success')

    if (physicalItem.digitalVersion) {
      showNotification(`Digital version found on ${physicalItem.digitalVersion.source}!`, 'info')
    }
  } catch (error) {
    console.error('Failed to add physical item:', error)
    showNotification('Failed to add physical item', 'error')
  }
}

// Collections Management

function showCreateCollectionDialog() {
  collectionModal?.classList.remove('hidden')
}

async function handleCollectionSubmit(event) {
  event.preventDefault()

  try {
    const formData = new FormData(event.target)
    const collectionData = {
      name: formData.get('name'),
      description: formData.get('description'),
      color: formData.get('color'),
      icon: formData.get('icon'),
      isPrivate: formData.get('isPrivate') === 'on'
    }

    // Create Collection instance
    const collection = new window.Collection(collectionData)

    // Validate
    const validation = collection.validate()
    if (!validation.isValid) {
      showNotification(`Validation error: ${validation.errors.join(', ')}`, 'error')
      return
    }

    // Save to storage
    const { collections = [] } = await chrome.storage.local.get('collections')
    collections.push(collection.toJSON())
    await chrome.storage.local.set({ collections })

    // Close modal and refresh view
    collectionModal?.classList.add('hidden')
    document.getElementById('collection-form').reset()

    await loadCollections()
    if (currentView === 'collections') {
      renderCollections()
    }

    showNotification('Collection created successfully!', 'success')
  } catch (error) {
    console.error('Failed to create collection:', error)
    showNotification('Failed to create collection', 'error')
  }
}

// Modal Management

function setupModalEventListeners() {
  // Physical item modal
  document.getElementById('physical-item-form')?.addEventListener('submit', handlePhysicalItemSubmit)
  document.getElementById('cancel-physical')?.addEventListener('click', () => {
    physicalItemModal?.classList.add('hidden')
  })

  // Collection modal
  document.getElementById('collection-form')?.addEventListener('submit', handleCollectionSubmit)
  document.getElementById('cancel-collection')?.addEventListener('click', () => {
    collectionModal?.classList.add('hidden')
  })

  // Close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal')?.classList.add('hidden')
    })
  })

  // Close on outside click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden')
      }
    })
  })
}

// Data Loading Functions

async function loadCollections() {
  try {
    const { collections: storedCollections = [] } = await chrome.storage.local.get('collections')
    collections = storedCollections.map(data => window.Collection?.fromJSON(data) || data)
  } catch (error) {
    console.error('Failed to load collections:', error)
    collections = []
  }
}

async function loadConnections() {
  try {
    const { connections: storedConnections = [] } = await chrome.storage.local.get('connections')
    connections = storedConnections.map(data => window.Connection?.fromJSON(data) || data)
  } catch (error) {
    console.error('Failed to load connections:', error)
    connections = []
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

// Collection management functions
window.viewCollection = function(collectionId) {
  console.log('View collection:', collectionId)
  // Filter items to show only those in the collection
  const collection = collections.find(c => c.id === collectionId)
  if (collection) {
    searchResults = contentItems.filter(item => collection.itemIds.includes(item.id))
    switchView('all')
    showNotification(`Showing collection: ${collection.name}`, 'info')
  }
}

window.editCollection = function(collectionId) {
  console.log('Edit collection:', collectionId)
  showNotification('Edit collection feature coming soon!', 'info')
}

window.deleteCollection = function(collectionId) {
  if (confirm('Are you sure you want to delete this collection?')) {
    // TODO: Implement collection deletion
    console.log('Delete collection:', collectionId)
    showNotification('Delete collection feature coming soon!', 'info')
  }
}

// Physical item management functions
window.editPhysicalItem = function(itemId) {
  console.log('Edit physical item:', itemId)
  showNotification('Edit physical item feature coming soon!', 'info')
}

window.openDigitalVersion = function(itemId) {
  const item = contentItems.find(i => i.id === itemId)
  if (item && item.digitalVersion && item.digitalVersion.url) {
    chrome.tabs.create({ url: item.digitalVersion.url })
  } else {
    showNotification('Digital version not available', 'info')
  }
}

// Make functions globally available
window.showAddPhysicalDialog = showAddPhysicalDialog
window.showCreateCollectionDialog = showCreateCollectionDialog

console.log('SmartShelf Side Panel script initialized')

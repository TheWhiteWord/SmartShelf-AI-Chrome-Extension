// SmartShelf Options Script
// Handles settings and configuration interface

console.log('SmartShelf Options loaded')

// DOM elements will be initialized when needed
let navTabs, settingSections
const apiTokens = []

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Options DOM loaded')

  // Initialize DOM elements
  initializeDOMElements()

  // Set up event listeners
  setupEventListeners()

  // Load current settings
  await loadSettings()

  // Load API management if on API tab
  await loadAPIManagement()
})

function initializeDOMElements() {
  navTabs = document.querySelectorAll('.nav-tab')
  settingSections = document.querySelectorAll('.settings-section')
}

function setupEventListeners() {
  // Tab navigation
  navTabs.forEach(tab => {
    tab.addEventListener('click', (event) => {
      const tabName = event.target.dataset.tab
      switchTab(tabName)
    })
  })

  // Save settings button
  const saveBtn = document.getElementById('save-settings-btn')
  saveBtn?.addEventListener('click', saveSettings)

  // Reset settings button
  const resetBtn = document.getElementById('reset-settings-btn')
  resetBtn?.addEventListener('click', resetSettings)

  // API Gateway controls
  const generateTokenBtn = document.getElementById('generate-token-btn')
  generateTokenBtn?.addEventListener('click', generateAPIToken)

  // Processing delay slider
  const processingDelaySlider = document.getElementById('processing-delay')
  const delayValueSpan = document.getElementById('delay-value')
  processingDelaySlider?.addEventListener('input', (e) => {
    delayValueSpan.textContent = `${e.target.value}s`
  })

  // Export/Import buttons
  const exportJSONBtn = document.getElementById('export-json-btn')
  exportJSONBtn?.addEventListener('click', exportAsJSON)

  const exportCSVBtn = document.getElementById('export-csv-btn')
  exportCSVBtn?.addEventListener('click', exportAsCSV)

  const importDataBtn = document.getElementById('import-data-btn')
  importDataBtn?.addEventListener('click', importData)

  const clearCacheBtn = document.getElementById('clear-cache-btn')
  clearCacheBtn?.addEventListener('click', clearCache)
}

function switchTab(tabName) {
  // Update nav tabs
  navTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName)
  })

  // Update sections
  settingSections.forEach(section => {
    section.classList.toggle('hidden', section.id !== `${tabName}-section`)
  })

  // Load specific data for certain tabs
  if (tabName === 'api') {
    loadAPIManagement()
  } else if (tabName === 'storage') {
    loadStorageStats()
  }
}

async function loadSettings() {
  try {
    const { smartshelfSettings } = await chrome.storage.sync.get('smartshelfSettings')

    if (smartshelfSettings) {
      // Populate form fields with current settings
      populateForm(smartshelfSettings)
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}

function populateForm(settings) {
  // General settings
  const interfaceTheme = document.getElementById('interface-theme')
  if (interfaceTheme) interfaceTheme.value = settings.interfaceTheme ?? 'auto'

  const keyboardShortcuts = document.getElementById('keyboard-shortcuts')
  if (keyboardShortcuts) keyboardShortcuts.checked = settings.keyboardShortcuts ?? true

  // AI Processing settings
  const aiProcessingEnabled = document.getElementById('ai-processing-enabled')
  if (aiProcessingEnabled) aiProcessingEnabled.checked = settings.aiProcessingEnabled ?? true

  const autoTagging = document.getElementById('auto-tagging')
  if (autoTagging) autoTagging.checked = settings.autoTagging ?? true

  const connectionDiscovery = document.getElementById('connection-discovery')
  if (connectionDiscovery) connectionDiscovery.checked = settings.connectionDiscovery ?? true

  const processingDelay = document.getElementById('processing-delay')
  const delayValue = document.getElementById('delay-value')
  if (processingDelay) {
    processingDelay.value = settings.processingDelay ?? 1
    if (delayValue) delayValue.textContent = `${settings.processingDelay ?? 1}s`
  }

  // API Gateway settings
  const apiGatewayEnabled = document.getElementById('api-gateway-enabled')
  if (apiGatewayEnabled) apiGatewayEnabled.checked = settings.apiGatewayEnabled ?? false

  const apiPort = document.getElementById('api-port')
  if (apiPort) apiPort.value = settings.apiPort ?? 8080

  // Backup settings
  const backupFrequency = document.getElementById('backup-frequency')
  if (backupFrequency) backupFrequency.value = settings.backupFrequency ?? 'weekly'

  console.log('Settings populated:', settings)
}

async function saveSettings() {
  try {
    // Collect form data
    const settings = collectFormData()

    // Save to storage
    await chrome.storage.sync.set({ smartshelfSettings: settings })

    console.log('Settings saved:', settings)
    showNotification('Settings saved successfully!', 'success')
  } catch (error) {
    console.error('Failed to save settings:', error)
    showNotification('Failed to save settings', 'error')
  }
}

function collectFormData() {
  const settings = {}

  // General settings
  const interfaceTheme = document.getElementById('interface-theme')
  if (interfaceTheme) settings.interfaceTheme = interfaceTheme.value

  const keyboardShortcuts = document.getElementById('keyboard-shortcuts')
  if (keyboardShortcuts) settings.keyboardShortcuts = keyboardShortcuts.checked

  // AI Processing settings
  const aiProcessingEnabled = document.getElementById('ai-processing-enabled')
  if (aiProcessingEnabled) settings.aiProcessingEnabled = aiProcessingEnabled.checked

  const autoTagging = document.getElementById('auto-tagging')
  if (autoTagging) settings.autoTagging = autoTagging.checked

  const connectionDiscovery = document.getElementById('connection-discovery')
  if (connectionDiscovery) settings.connectionDiscovery = connectionDiscovery.checked

  const processingDelay = document.getElementById('processing-delay')
  if (processingDelay) settings.processingDelay = parseInt(processingDelay.value)

  // API Gateway settings
  const apiGatewayEnabled = document.getElementById('api-gateway-enabled')
  if (apiGatewayEnabled) settings.apiGatewayEnabled = apiGatewayEnabled.checked

  const apiPort = document.getElementById('api-port')
  if (apiPort) settings.apiPort = parseInt(apiPort.value)

  // Backup settings
  const backupFrequency = document.getElementById('backup-frequency')
  if (backupFrequency) settings.backupFrequency = backupFrequency.value

  return settings
}

async function resetSettings() {
  if (!confirm('Reset all settings to defaults? This cannot be undone.')) {
    return
  }

  try {
    // Clear current settings
    await chrome.storage.sync.remove('smartshelfSettings')

    // Reload page to show defaults
    window.location.reload()
  } catch (error) {
    console.error('Failed to reset settings:', error)
    showNotification('Failed to reset settings', 'error')
  }
}

function showNotification(message, type = 'info') {
  // Create and show notification
  const notification = document.createElement('div')
  notification.className = `notification ${type}`
  notification.textContent = message
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#f44336' : '#4caf50'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 1000;
  `

  document.body.appendChild(notification)

  setTimeout(() => notification.remove(), 3000)
}

// API Management Functions

async function loadAPIManagement() {
  try {
    // Get API usage stats
    const response = await chrome.runtime.sendMessage({ action: 'get_api_usage_stats' })

    if (response.success) {
      updateAPIStats(response.data)
    }

    // Load existing API tokens
    await loadAPITokens()
  } catch (error) {
    console.error('Failed to load API management:', error)
  }
}

async function loadAPITokens() {
  try {
    const { apiTokens = [] } = await chrome.storage.local.get('apiTokens')
    renderAPITokens(apiTokens)
  } catch (error) {
    console.error('Failed to load API tokens:', error)
  }
}

function updateAPIStats(stats) {
  // Update API statistics display
  console.log('API Stats:', stats)
}

function renderAPITokens(tokens) {
  const tokenList = document.getElementById('token-list')
  if (!tokenList) return

  if (tokens.length === 0) {
    tokenList.innerHTML = '<p class="no-tokens">No API tokens created yet.</p>'
    return
  }

  tokenList.innerHTML = tokens.map(token => `
    <div class="api-token-item ${token.isActive ? 'active' : 'revoked'}">
      <div class="token-info">
        <div class="token-name">${token.name}</div>
        <div class="token-details">
          <span class="token-created">Created: ${new Date(token.createdAt).toLocaleDateString()}</span>
          <span class="token-requests">Requests: ${token.totalRequests || 0}</span>
          ${token.lastUsed ? `<span class="token-last-used">Last used: ${new Date(token.lastUsed).toLocaleDateString()}</span>` : ''}
        </div>
        <div class="token-permissions">Permissions: ${token.permissions.join(', ')}</div>
      </div>
      <div class="token-actions">
        <button class="copy-token-btn" data-token="${token.token}" title="Copy Token">📋</button>
        ${token.isActive ? `<button class="revoke-token-btn" data-token-id="${token.id}" title="Revoke Token">🗑️</button>` : ''}
      </div>
    </div>
  `).join('')

  // Add event listeners for token actions
  tokenList.querySelectorAll('.copy-token-btn').forEach(btn => {
    btn.addEventListener('click', () => copyTokenToClipboard(btn.dataset.token))
  })

  tokenList.querySelectorAll('.revoke-token-btn').forEach(btn => {
    btn.addEventListener('click', () => revokeAPIToken(btn.dataset.tokenId))
  })
}

async function generateAPIToken() {
  try {
    const name = prompt('Enter a name for this API token:')
    if (!name) return

    const permissions = ['read', 'export'] // Default safe permissions
    const expiresAt = null // No expiration by default

    const response = await chrome.runtime.sendMessage({
      action: 'generate_api_token',
      name,
      permissions,
      expiresAt
    })

    if (response.success) {
      showNotification('API token generated successfully!', 'success')

      // Show the token to user (only time they'll see it)
      const tokenInfo = `
        Token Name: ${response.data.name}
        Token: ${response.data.token}
        
        ⚠️ Copy this token now - you won't see it again!
        
        Use this token in the Authorization header:
        Authorization: Bearer ${response.data.token}
      `

      prompt('New API Token (copy now):', response.data.token)

      // Reload tokens list
      await loadAPITokens()
    } else {
      showNotification(`Failed to generate API token: ${response.error}`, 'error')
    }
  } catch (error) {
    console.error('Failed to generate API token:', error)
    showNotification('Failed to generate API token', 'error')
  }
}

async function revokeAPIToken(tokenId) {
  if (!confirm('Are you sure you want to revoke this API token? This action cannot be undone.')) {
    return
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'revoke_api_token',
      tokenId
    })

    if (response.success) {
      showNotification('API token revoked successfully', 'success')
      await loadAPITokens()
    } else {
      showNotification(`Failed to revoke API token: ${response.error}`, 'error')
    }
  } catch (error) {
    console.error('Failed to revoke API token:', error)
    showNotification('Failed to revoke API token', 'error')
  }
}

function copyTokenToClipboard(token) {
  navigator.clipboard.writeText(token).then(() => {
    showNotification('Token copied to clipboard!', 'success')
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = token
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    showNotification('Token copied to clipboard!', 'success')
  })
}

// Storage Management Functions

async function loadStorageStats() {
  try {
    const { contentItems = [] } = await chrome.storage.local.get('contentItems')

    // Calculate storage usage
    const storageData = await chrome.storage.local.get(null)
    const storageString = JSON.stringify(storageData)
    const storageBytes = new Blob([storageString]).size
    const storageMB = (storageBytes / (1024 * 1024)).toFixed(2)

    // Update display
    const itemsCount = document.getElementById('items-count')
    if (itemsCount) itemsCount.textContent = contentItems.length

    const storageUsed = document.getElementById('storage-used')
    if (storageUsed) storageUsed.textContent = `${storageMB} MB`

    // Chrome extension storage limits
    const storageAvailable = document.getElementById('storage-available')
    if (storageAvailable) {
      const availableMB = Math.max(0, 100 - parseFloat(storageMB)) // Assuming 100MB limit
      storageAvailable.textContent = `${availableMB.toFixed(2)} MB`
    }
  } catch (error) {
    console.error('Failed to load storage stats:', error)
  }
}

async function clearCache() {
  if (!confirm('Clear processing cache? This will not delete your saved content.')) {
    return
  }

  try {
    // Clear cache-related data
    await chrome.storage.local.remove(['searchIndex', 'processingCache'])
    showNotification('Cache cleared successfully', 'success')
    await loadStorageStats()
  } catch (error) {
    console.error('Failed to clear cache:', error)
    showNotification('Failed to clear cache', 'error')
  }
}

// Export/Import Functions

async function exportAsJSON() {
  try {
    const { contentItems = [], collections = [], connections = [] } = await chrome.storage.local.get(['contentItems', 'collections', 'connections'])

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      contentItems,
      collections,
      connections
    }

    downloadFile(
      JSON.stringify(exportData, null, 2),
      `smartshelf-export-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    )

    showNotification('Data exported successfully!', 'success')
  } catch (error) {
    console.error('Failed to export data:', error)
    showNotification('Failed to export data', 'error')
  }
}

async function exportAsCSV() {
  try {
    const { contentItems = [] } = await chrome.storage.local.get('contentItems')

    const csvHeaders = ['Title', 'Type', 'URL', 'Date Added', 'Categories', 'Tags', 'Summary']
    const csvRows = contentItems.map(item => [
      item.title || '',
      item.type || '',
      item.url || '',
      item.dateAdded || '',
      (item.categories || []).join('; '),
      (item.tags || []).join('; '),
      (item.summary || '').replace(/"/g, '""') // Escape quotes
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n')

    downloadFile(
      csvContent,
      `smartshelf-export-${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv'
    )

    showNotification('Data exported as CSV successfully!', 'success')
  } catch (error) {
    console.error('Failed to export CSV:', error)
    showNotification('Failed to export CSV', 'error')
  }
}

function importData() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'

  input.onchange = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      const text = await file.text()
      const importData = JSON.parse(text)

      if (!importData.contentItems) {
        throw new Error('Invalid import file format')
      }

      if (!confirm(`Import ${importData.contentItems.length} items? This will merge with existing data.`)) {
        return
      }

      // Merge with existing data
      const { contentItems = [] } = await chrome.storage.local.get('contentItems')
      const existingIds = new Set(contentItems.map(item => item.id))

      const newItems = importData.contentItems.filter(item => !existingIds.has(item.id))
      const mergedItems = [...contentItems, ...newItems]

      await chrome.storage.local.set({ contentItems: mergedItems })

      showNotification(`Imported ${newItems.length} new items successfully!`, 'success')
      await loadStorageStats()
    } catch (error) {
      console.error('Failed to import data:', error)
      showNotification(`Failed to import data: ${error.message}`, 'error')
    }
  }

  input.click()
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

console.log('SmartShelf Options script initialized')

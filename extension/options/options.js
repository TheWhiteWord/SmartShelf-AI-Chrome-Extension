// SmartShelf Options Script
// Handles settings and configuration interface

console.log('SmartShelf Options loaded');

// DOM elements will be initialized when needed
let settingsForm, navTabs, settingSections;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Options DOM loaded');
  
  // Initialize DOM elements
  initializeDOMElements();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load current settings
  await loadSettings();
});

function initializeDOMElements() {
  navTabs = document.querySelectorAll('.nav-tab');
  settingSections = document.querySelectorAll('.settings-section');
}

function setupEventListeners() {
  // Tab navigation
  navTabs.forEach(tab => {
    tab.addEventListener('click', (event) => {
      const tabName = event.target.dataset.tab;
      switchTab(tabName);
    });
  });
  
  // Save settings button
  const saveBtn = document.getElementById('save-settings-btn');
  saveBtn?.addEventListener('click', saveSettings);
  
  // Reset settings button
  const resetBtn = document.getElementById('reset-settings-btn');
  resetBtn?.addEventListener('click', resetSettings);
}

function switchTab(tabName) {
  // Update nav tabs
  navTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Update sections
  settingSections.forEach(section => {
    section.classList.toggle('hidden', section.id !== `${tabName}-section`);
  });
}

async function loadSettings() {
  try {
    const { smartshelf_settings } = await chrome.storage.sync.get('smartshelf_settings');
    
    if (smartshelf_settings) {
      // Populate form fields with current settings
      populateForm(smartshelf_settings);
    }
    
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

function populateForm(settings) {
  // General settings
  const aiProcessingEnabled = document.getElementById('ai-processing-enabled');
  if (aiProcessingEnabled) aiProcessingEnabled.checked = settings.aiProcessingEnabled ?? true;
  
  const autoTagging = document.getElementById('auto-tagging');
  if (autoTagging) autoTagging.checked = settings.autoTagging ?? true;
  
  // Add more field population as needed
  console.log('Settings populated:', settings);
}

async function saveSettings() {
  try {
    // Collect form data
    const settings = collectFormData();
    
    // Save to storage
    await chrome.storage.sync.set({ smartshelf_settings: settings });
    
    console.log('Settings saved:', settings);
    showNotification('Settings saved successfully!', 'success');
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    showNotification('Failed to save settings', 'error');
  }
}

function collectFormData() {
  const settings = {};
  
  // Collect all form values
  const aiProcessingEnabled = document.getElementById('ai-processing-enabled');
  if (aiProcessingEnabled) settings.aiProcessingEnabled = aiProcessingEnabled.checked;
  
  const autoTagging = document.getElementById('auto-tagging');
  if (autoTagging) settings.autoTagging = autoTagging.checked;
  
  // Add more field collection as needed
  
  return settings;
}

async function resetSettings() {
  if (!confirm('Reset all settings to defaults? This cannot be undone.')) {
    return;
  }
  
  try {
    // Clear current settings
    await chrome.storage.sync.remove('smartshelf_settings');
    
    // Reload page to show defaults
    window.location.reload();
    
  } catch (error) {
    console.error('Failed to reset settings:', error);
    showNotification('Failed to reset settings', 'error');
  }
}

function showNotification(message, type = 'info') {
  // Create and show notification
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#f44336' : '#4caf50'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 1000;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 3000);
}

console.log('SmartShelf Options script initialized');
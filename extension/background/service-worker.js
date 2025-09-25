// SmartShelf Service Worker
// Handles background AI processing, content management, and Chrome Extension lifecycle

console.log('SmartShelf Service Worker loaded');

// Chrome Extension lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  console.log('SmartShelf installed:', details.reason);
  
  // Initialize default settings
  initializeExtension();
});

// Initialize extension settings and data
async function initializeExtension() {
  try {
    // Set default settings if first install
    const settings = await chrome.storage.sync.get('smartshelf_settings');
    
    if (!settings.smartshelf_settings) {
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
      };
      
      await chrome.storage.sync.set({ smartshelf_settings: defaultSettings });
      console.log('Default settings initialized');
    }
    
    // Initialize local storage
    const localData = await chrome.storage.local.get(['content_items', 'categories', 'tags']);
    
    if (!localData.content_items) {
      await chrome.storage.local.set({
        content_items: [],
        categories: ['Technology', 'Science', 'Business', 'Personal'],
        tags: [],
        search_index: {},
        connections: []
      });
      console.log('Local data structures initialized');
    }
    
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
}

// Handle extension action (toolbar icon click)
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension action clicked');
  
  // Open side panel
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.error('Failed to open side panel:', error);
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Keyboard shortcut triggered:', command);
  
  switch (command) {
    case 'save-current-page':
      await saveCurrentPage();
      break;
    case 'open-search':
      await openSearch();
      break;
  }
});

// Save current page functionality
async function saveCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      console.error('No active tab found');
      return;
    }
    
    // Extract page content via content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContent
    });
    
    if (results && results[0] && results[0].result) {
      const pageData = results[0].result;
      await processAndSaveContent(pageData);
      
      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'SmartShelf',
        message: `Saved: ${pageData.title}`
      });
    }
    
  } catch (error) {
    console.error('Failed to save current page:', error);
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
  };
}

// Process and save content with AI enhancement
async function processAndSaveContent(pageData) {
  try {
    // Create content item
    const contentItem = {
      id: generateId(),
      title: pageData.title,
      url: pageData.url,
      content: pageData.content,
      meta: pageData.meta,
      type: 'article', // Default type, will be refined by AI
      source: pageData.url,
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      isPhysical: false,
      status: 'pending', // pending -> processing -> processed
      summary: '',
      tags: [],
      categories: [],
      notes: '',
      aiProcessed: false
    };
    
    // Save immediately
    const { content_items = [] } = await chrome.storage.local.get('content_items');
    content_items.push(contentItem);
    await chrome.storage.local.set({ content_items });
    
    console.log('Content saved:', contentItem.id);
    
    // Queue for AI processing
    await queueForAiProcessing(contentItem.id);
    
  } catch (error) {
    console.error('Failed to process and save content:', error);
  }
}

// Queue item for AI processing
async function queueForAiProcessing(itemId) {
  try {
    // Check if AI processing is enabled
    const { smartshelf_settings } = await chrome.storage.sync.get('smartshelf_settings');
    
    if (!smartshelf_settings?.aiProcessingEnabled) {
      console.log('AI processing disabled, skipping:', itemId);
      return;
    }
    
    // Add processing delay if configured
    const delay = (smartshelf_settings?.processingDelay || 1) * 1000;
    
    setTimeout(async () => {
      await processWithAI(itemId);
    }, delay);
    
  } catch (error) {
    console.error('Failed to queue for AI processing:', error);
  }
}

// Process content with Chrome Built-in AI APIs
async function processWithAI(itemId) {
  try {
    console.log('Starting AI processing for:', itemId);
    
    // Get content item
    const { content_items = [] } = await chrome.storage.local.get('content_items');
    const itemIndex = content_items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      console.error('Content item not found:', itemId);
      return;
    }
    
    const item = content_items[itemIndex];
    
    // Update status to processing
    item.status = 'processing';
    await chrome.storage.local.set({ content_items });
    
    // TODO: Integrate Chrome Built-in AI APIs
    // This will be implemented in later tasks
    
    // For now, simulate AI processing
    await simulateAiProcessing(item);
    
    // Update item with AI results
    item.status = 'processed';
    item.aiProcessed = true;
    item.dateModified = new Date().toISOString();
    
    content_items[itemIndex] = item;
    await chrome.storage.local.set({ content_items });
    
    console.log('AI processing completed for:', itemId);
    
  } catch (error) {
    console.error('AI processing failed:', error);
    
    // Update status to error
    const { content_items = [] } = await chrome.storage.local.get('content_items');
    const itemIndex = content_items.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
      content_items[itemIndex].status = 'error';
      await chrome.storage.local.set({ content_items });
    }
  }
}

// Simulate AI processing (placeholder)
async function simulateAiProcessing(item) {
  // Simulate summary generation
  const sentences = item.content.split('.').filter(s => s.trim().length > 20);
  item.summary = sentences.slice(0, 3).join('.') + '.';
  
  // Simulate tagging
  const commonWords = ['technology', 'ai', 'artificial intelligence', 'machine learning', 'data', 'science', 'business', 'research'];
  item.tags = commonWords.filter(word => 
    item.content.toLowerCase().includes(word) || 
    item.title.toLowerCase().includes(word)
  ).slice(0, 5);
  
  // Simulate categorization
  const categories = ['Technology', 'Science', 'Business', 'Research', 'News'];
  item.categories = [categories[Math.floor(Math.random() * categories.length)]];
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Open search functionality
async function openSearch() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      
      // Focus search input (will be handled by side panel script)
      chrome.tabs.sendMessage(tab.id, { action: 'focus_search' });
    }
    
  } catch (error) {
    console.error('Failed to open search:', error);
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Handle messages from other extension components
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Service Worker received message:', request);
  
  switch (request.action) {
    case 'save_content':
      processAndSaveContent(request.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    case 'get_content_items':
      chrome.storage.local.get('content_items')
        .then(result => sendResponse({ success: true, data: result.content_items || [] }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'search_content':
      searchContent(request.query)
        .then(results => sendResponse({ success: true, data: results }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

// Search functionality
async function searchContent(query) {
  try {
    const { content_items = [] } = await chrome.storage.local.get('content_items');
    
    if (!query || query.trim().length === 0) {
      return content_items;
    }
    
    const searchTerm = query.toLowerCase();
    
    return content_items.filter(item => 
      item.title.toLowerCase().includes(searchTerm) ||
      item.content.toLowerCase().includes(searchTerm) ||
      item.summary.toLowerCase().includes(searchTerm) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      item.categories.some(cat => cat.toLowerCase().includes(searchTerm))
    );
    
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}
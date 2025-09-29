# Chrome DevTools MCP Setup for SmartShelf Extension Development

> **📋 Complete Guide**: This is the single comprehensive guide for Chrome DevTools MCP setup, usage, and troubleshooting. All installation and debugging information is consolidated here.

## ✅ Installation Status: COMPLETE

Chrome DevTools MCP has been successfully installed and configured for your SmartShelf extension development with Node.js v22.12.0 and VS Code integration.

## 🎯 Why Use Chrome DevTools MCP for Extension Development

Chrome DevTools MCP provides powerful debugging capabilities specifically valuable for our SmartShelf Chrome Extension:

- **Real-time extension debugging** with Chrome DevTools integration
- **Chrome Built-in AI API monitoring** and testing  
- **Extension workflow automation** for testing scenarios
- **Performance profiling** of AI processing operations
- **Network debugging** for Internet Archive API calls

## 🚀 Quick Start

### Ready to Use - Just Run:
```bash
./setup-mcp-environment.sh
```

This script automatically:
- Switches to Node.js v22.12.0 (required)
- Tests Chrome DevTools MCP availability
- Provides next steps for VS Code integration

## 🔧 VS Code Setup (Manual Steps)

### Step 1: Open VS Code with Correct Environment
```bash
./setup-mcp-environment.sh  # Handles Node.js version automatically
```

### Step 2: Enable MCP in GitHub Copilot Chat
1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "mcp" or "copilot mcp"
3. Enable GitHub Copilot Chat MCP servers
4. Configuration is already created in `.vscode/settings.json`

### Step 3: Test Connection
In GitHub Copilot Chat, try:
```
@chrome-devtools help
```
or
```
Check Chrome DevTools MCP connection and help me debug my extension
```

## 🔧 Technical Configuration Details

### 1. Install Chrome DevTools MCP

**For VS Code/Cursor/Copilot:**
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--channel=dev",
        "--isolated=false"
      ]
    }
  }
}
```

**Why these settings:**
- `--channel=dev`: Uses Chrome Dev Channel (matches your version 142.0.7420.2)
- `--isolated=false`: Preserves extension data between sessions

### 2. Chrome Dev Channel Configuration

Since you're using Chrome Dev 142.0.7420.2:
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx", 
      "args": [
        "chrome-devtools-mcp@latest",
        "--channel=dev",
        "--executablePath=/path/to/chrome-dev",
        "--isolated=false"
      ]
    }
  }
}
```

### 3. Extension-Specific Configuration

**For extension debugging:**
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest", 
        "--channel=dev",
        "--isolated=false",
        "--logFile=./chrome-devtools-debug.log"
      ]
    }
  }
}
```

## 🚀 Extension Debugging Workflows

### 1. Chrome Built-in AI API Testing

**Test AI API availability:**
```javascript
// Via Chrome DevTools MCP
evaluate_script(`
  // Test in extension context
  console.log('LanguageModel available:', 'LanguageModel' in self);
  console.log('Summarizer available:', 'Summarizer' in self);
  
  // Test availability
  if ('LanguageModel' in self) {
    LanguageModel.availability().then(status => {
      console.log('LanguageModel status:', status);
    });
  }
  
  if ('Summarizer' in self) {
    Summarizer.availability().then(status => {
      console.log('Summarizer status:', status);
    });
  }
`)
```

**Monitor AI processing:**
```javascript
// Track AI session lifecycle
evaluate_script(`
  // Monitor AI session creation
  if ('LanguageModel' in self) {
    LanguageModel.create({
      initialPrompts: [{
        role: 'system',
        content: 'Test prompt for debugging'
      }]
    }).then(session => {
      console.log('AI session created:', session);
      return session.prompt('Test message');
    }).then(result => {
      console.log('AI response:', result);
    }).catch(error => {
      console.error('AI error:', error);
    });
  }
`)
```

### 2. Extension Service Worker Debugging

**Monitor service worker:**
```javascript
// Check service worker state
evaluate_script(`
  // Extension service worker debugging
  chrome.runtime.getBackgroundPage(page => {
    console.log('Service Worker context:', page);
  });
  
  // Check AI initialization
  console.log('AI session status:', window.aiSession ? 'initialized' : 'not initialized');
  console.log('Summarizer status:', window.summarizerSession ? 'initialized' : 'not initialized');
`)
```

**Debug content processing:**
```javascript
// Test content processing workflow
evaluate_script(`
  // Simulate content processing
  const testContent = {
    title: 'Test Article',
    url: 'https://example.com/test',
    content: 'This is test content for debugging the AI processing pipeline.'
  };
  
  // Send to service worker for processing
  chrome.runtime.sendMessage({
    action: 'saveContent',
    data: testContent
  }, response => {
    console.log('Processing result:', response);
  });
`)
```

### 3. Extension Storage Debugging

**Monitor Chrome Storage:**
```javascript
// Check extension storage
evaluate_script(`
  // Check stored data
  chrome.storage.local.get(null, data => {
    console.log('Local storage:', data);
  });
  
  chrome.storage.sync.get(null, data => {
    console.log('Sync storage:', data);
  });
  
  // Check specific items
  chrome.storage.local.get(['contentItems', 'categories'], data => {
    console.log('Content items:', data.contentItems?.length || 0);
    console.log('Categories:', data.categories);
  });
`)
```

### 4. Network Request Monitoring

**Debug Internet Archive API calls:**
```javascript
// Monitor network requests
list_network_requests()

// Filter for Internet Archive requests
get_network_request("archive.org")
```

### 5. Performance Analysis

**Profile AI processing:**
```javascript
// Start performance trace
performance_start_trace()

// Trigger AI processing
evaluate_script(`
  // Process multiple items to test performance
  const testItems = [
    { title: 'Item 1', content: 'Content 1...' },
    { title: 'Item 2', content: 'Content 2...' },
    { title: 'Item 3', content: 'Content 3...' }
  ];
  
  Promise.all(testItems.map(item => 
    chrome.runtime.sendMessage({
      action: 'processWithAI',
      data: item
    })
  )).then(results => {
    console.log('Batch processing results:', results);
  });
`)

// Stop trace and analyze
performance_stop_trace()
performance_analyze_insight()
```

## 🐛 Common Extension Debugging Scenarios

### 1. AI API Not Working

**Debug steps:**
```javascript
// Check Chrome version and flags
evaluate_script(`
  console.log('Chrome version:', navigator.userAgent);
  console.log('AI APIs available:', {
    LanguageModel: 'LanguageModel' in self,
    Summarizer: 'Summarizer' in self,
    Writer: 'Writer' in self,
    Rewriter: 'Rewriter' in self
  });
`)

// Check model download status
navigate_page("chrome://on-device-internals")
take_screenshot()
```

### 2. Extension Not Loading

**Debug extension state:**
```javascript
// Check extension installation
navigate_page("chrome://extensions/")
take_screenshot()

// Check service worker
evaluate_script(`
  chrome.runtime.getManifest && console.log('Manifest:', chrome.runtime.getManifest());
`)
```

### 3. Content Capture Issues

**Test content script:**
```javascript
// Navigate to test page
navigate_page("https://developer.chrome.com/docs/ai/get-started")

// Test content extraction
evaluate_script(`
  // Simulate content capture
  const content = {
    title: document.title,
    url: window.location.href,
    content: document.body.innerText.substring(0, 2000),
    timestamp: Date.now()
  };
  
  console.log('Captured content:', content);
  
  // Test AI processing
  chrome.runtime.sendMessage({
    action: 'saveContent',
    data: content
  }, response => {
    console.log('Save response:', response);
  });
`)
```

## 📊 Automated Testing Workflows

### Extension Load Test
```javascript
// Automated extension testing
navigate_page("chrome://extensions/")
click("Developer mode toggle")
click("Load unpacked")
// Select extension directory
take_screenshot()
```

### AI Processing Test
```javascript
// Automated AI workflow test
navigate_page("https://example.com/article")
evaluate_script(`
  // Trigger content save
  chrome.runtime.sendMessage({
    action: 'saveContent',
    data: {
      title: document.title,
      url: location.href,
      content: document.body.innerText.substring(0, 1000)
    }
  });
`)
wait_for("AI processing complete")
list_console_messages()
```

## 🔍 Monitoring & Logging

**Continuous monitoring:**
```javascript
// Set up console monitoring
setInterval(() => {
  list_console_messages()
  list_network_requests()
}, 5000)
```

**Error tracking:**
```javascript
// Monitor for extension errors
evaluate_script(`
  window.addEventListener('error', error => {
    console.error('Extension error:', error);
  });
  
  window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
  });
`)
```

## 🎯 Benefits for SmartShelf Development

1. **Real-time AI API debugging** - Monitor Chrome Built-in AI calls
2. **Extension workflow testing** - Automate user scenarios
3. **Performance profiling** - Optimize AI processing speed
4. **Network monitoring** - Debug Internet Archive integration
5. **UI state inspection** - Verify extension interface behavior
6. **Error tracking** - Catch and debug extension issues
7. **Automated testing** - Create repeatable test scenarios

## 🐛 Troubleshooting

### Issue: "MCP server not found" or "Command not recognized"
**Solution**: 
1. Restart VS Code completely
2. Run `./setup-mcp-environment.sh` to ensure Node.js v22.12.0
3. Check VS Code settings for MCP configuration

### Issue: Chrome DevTools MCP can't find Chrome
**Solution**: Update `.vscode/settings.json` with your Chrome path:
```json
{
  "mcp.servers": {
    "chrome-devtools": {
      "args": [
        "chrome-devtools-mcp@latest",
        "--channel=dev",
        "--executablePath=/path/to/your/chrome-dev"
      ]
    }
  }
}
```

### Issue: Node.js version problems
**Solution**: Always use Node.js v22.12.0
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use v22.12.0
```

## 🎉 Success Indicators

Chrome DevTools MCP is working when:
- ✅ Copilot Chat recognizes browser automation commands
- ✅ You can navigate pages through chat commands
- ✅ Extension debugging commands execute successfully
- ✅ Performance monitoring and screenshots work

This setup dramatically improves your SmartShelf extension development and debugging capabilities!
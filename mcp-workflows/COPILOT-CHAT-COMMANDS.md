# SmartShelf MCP Testing - VS Code Copilot Chat Integration

## Quick Start Commands

Copy and paste these commands directly into VS Code Copilot Chat to execute real MCP tests:

### 1. Initialize MCP Testing Session

```
@chrome-devtools Start a new debugging session with Chrome Dev and load the SmartShelf extension from ./extension directory
```

### 2. Extension Loading Test (T031)

```
@chrome-devtools Navigate to chrome://extensions/ and enable developer mode, then load the unpacked extension from ./extension and verify all components are loaded without errors
```

### 3. AI API Validation Test (T032)

```
@chrome-devtools Evaluate this script to test Chrome Built-in AI APIs:

(async () => {
  const apis = ['LanguageModel', 'Summarizer', 'Writer', 'Rewriter'];
  const results = {};
  
  for (const api of apis) {
    try {
      const available = api in self;
      if (available && self[api].create) {
        const start = performance.now();
        const session = await self[api].create();
        results[api] = {
          available: true,
          initTime: Math.round(performance.now() - start),
          sessionCreated: !!session
        };
      } else {
        results[api] = { available: false };
      }
    } catch (error) {
      results[api] = { available: false, error: error.message };
    }
  }
  
  console.log('🤖 AI API Test Results:', results);
  return results;
})()
```

### 4. Content Capture Test (T033)

```
@chrome-devtools Navigate to https://developer.chrome.com/docs/ai/get-started then evaluate:

(async () => {
  const start = performance.now();
  const content = {
    title: document.title,
    url: window.location.href,
    textLength: document.body.innerText.length,
    headings: Array.from(document.querySelectorAll('h1,h2,h3')).slice(0, 5).map(h => h.textContent.trim()),
    extractionTime: Math.round(performance.now() - start)
  };
  
  console.log('📄 Content Extraction Test:', content);
  return content;
})()
```

### 5. Extension Component Accessibility Test (T035)

```
@chrome-devtools Check extension component accessibility by evaluating:

(async () => {
  const extensionId = 'YOUR_EXTENSION_ID'; // Replace with actual ID from extensions page
  const components = {
    popup: `chrome-extension://${extensionId}/popup/popup.html`,
    sidepanel: `chrome-extension://${extensionId}/sidepanel/sidepanel.html`,
    options: `chrome-extension://${extensionId}/options/options.html`
  };
  
  const results = {};
  
  for (const [name, url] of Object.entries(components)) {
    try {
      const response = await fetch(url);
      results[name] = {
        accessible: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type')
      };
    } catch (error) {
      results[name] = {
        accessible: false,
        error: error.message
      };
    }
  }
  
  console.log('🎨 Component Accessibility Test:', results);
  return results;
})()
```

### 6. Performance Test (T036)

```
@chrome-devtools Run performance test:

(async () => {
  const performanceMetrics = {
    memoryUsage: performance.memory ? {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
    } : 'Not available',
    
    searchPerformance: await (async () => {
      const queries = ['AI', 'Chrome', 'extension'];
      const results = [];
      
      for (const query of queries) {
        const start = performance.now();
        // Simulate search operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
        results.push({
          query,
          responseTime: Math.round(performance.now() - start)
        });
      }
      
      return results;
    })(),
    
    timestamp: new Date().toISOString()
  };
  
  console.log('⚡ Performance Metrics:', performanceMetrics);
  return performanceMetrics;
})()
```

## Automated Test Execution

To run all tests automatically, use the command line:

```bash
# Run all tests
node mcp-workflows/execute-real-mcp-tests.js

# Run specific test
node mcp-workflows/execute-real-mcp-tests.js --task=T031

# Use custom Chrome path
node mcp-workflows/execute-real-mcp-tests.js --chrome-path=/path/to/chrome-dev
```

## Expected Results

### ✅ Pass Criteria

- **T031**: Extension loads without errors, all components validated
- **T032**: At least 2 AI APIs available and functional (LanguageModel, Summarizer preferred)
- **T033**: Content extraction succeeds with title, text, and metadata
- **T035**: All UI components (popup, sidepanel, options) accessible
- **T036**: Memory usage <100MB, search responses <500ms

### ❌ Fail Indicators

- Extension loading errors or missing components
- AI APIs unavailable or throwing errors
- Content extraction failures
- Component accessibility failures
- Performance thresholds exceeded

## Troubleshooting

### MCP Connection Issues
1. Ensure Chrome Dev is installed and accessible
2. Restart VS Code to refresh MCP server connection
3. Check `.vscode/mcp_servers.json` configuration

### Chrome Extension Issues
1. Verify manifest.json syntax
2. Check Chrome Developer Mode is enabled
3. Look for console errors in Chrome DevTools

### AI API Issues
1. Confirm Chrome Dev version supports Built-in AI
2. Check `chrome://flags/` for AI feature flags
3. Verify model downloads at `chrome://on-device-internals/`
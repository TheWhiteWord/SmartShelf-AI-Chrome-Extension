# SmartShelf Chrome Extension - MCP Testing Guide

**Status**: ✅ Working with Flatpak Chrome Dev

## Quick Start

### 1. Automated Extension Loading & Testing

```bash
# Load SmartShelf extension in Chrome Dev and run tests
node mcp-workflows/run-flatpak-tests.js
```

### 2. VS Code Copilot Chat Integration

After running the automated test, use these commands in VS Code Copilot Chat:

```javascript
// Navigate to extensions page
@chrome-devtools Navigate to chrome://extensions/

// Check extension status
@chrome-devtools evaluate_script(`
  // Find SmartShelf extension
  const extensions = document.querySelectorAll('extensions-item');
  const smartShelf = Array.from(extensions).find(item => 
    item.shadowRoot?.querySelector('#name')?.textContent?.includes('SmartShelf')
  );
  
  if (smartShelf) {
    console.log('✅ SmartShelf Extension Found:', {
      id: smartShelf.getAttribute('id'),
      name: smartShelf.shadowRoot.querySelector('#name').textContent,
      enabled: smartShelf.shadowRoot.querySelector('#enable-toggle')?.checked
    });
  } else {
    console.log('❌ SmartShelf extension not found');
  }
`)
```

### 2. Chrome AI API Testing

```javascript
// Check AI API availability and performance
@chrome-devtools evaluate_script(`
  async function testAIAPIs() {
    const apis = {
      LanguageModel: 'LanguageModel' in self,
      Summarizer: 'Summarizer' in self,
      Writer: 'Writer' in self,
      Rewriter: 'Rewriter' in self
    };
    
    console.log('🤖 AI APIs Available:', apis);
    
    // Test Summarizer performance if available
    if (apis.Summarizer) {
      try {
        const start = performance.now();
        const session = await Summarizer.create();
        const result = await session.summarize('Chrome Built-in AI APIs provide powerful on-device processing for web applications.');
        const duration = performance.now() - start;
        
        console.log('📄 Summarizer Test:', {
          result: result,
          duration: Math.round(duration) + 'ms',
          withinThreshold: duration < 5000
        });
      } catch (error) {
        console.error('❌ Summarizer error:', error);
      }
    }
    
    return apis;
  }
  
  testAIAPIs();
`)
```

### 3. Content Capture Testing

```javascript
// Test content extraction on current page
@chrome-devtools navigate_page('https://developer.chrome.com/docs/ai/')
@chrome-devtools evaluate_script(`
  setTimeout(() => {
    const content = {
      title: document.title,
      url: window.location.href,
      text: document.body.innerText.slice(0, 500),
      headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent.trim()),
      wordCount: document.body.innerText.split(/\s+/).length
    };
    
    console.log('📄 Extracted Content:', content);
    return content;
  }, 2000)
`)
```

### 4. Extension Component Testing

```javascript
// Test extension popup and sidepanel accessibility (replace EXTENSION_ID)
@chrome-devtools evaluate_script(`
  const extensionId = 'YOUR_EXTENSION_ID_HERE';
  
  Promise.all([
    fetch(\`chrome-extension://\${extensionId}/popup/popup.html\`),
    fetch(\`chrome-extension://\${extensionId}/sidepanel/sidepanel.html\`),
    fetch(\`chrome-extension://\${extensionId}/options/options.html\`)
  ]).then(responses => {
    console.log('🔍 Extension Components:', {
      popup: responses[0].ok,
      sidepanel: responses[1].ok,
      options: responses[2].ok
    });
  }).catch(error => {
    console.error('❌ Component test error:', error);
  });
`)
```

### 5. Performance Validation

```javascript
// Test search performance simulation
@chrome-devtools evaluate_script(`
  async function testSearchPerformance() {
    const queries = ['AI', 'Chrome', 'extension'];
    const results = [];
    
    for (const query of queries) {
      const start = performance.now();
      
      // Simulate search (replace with actual extension search)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
      
      const duration = performance.now() - start;
      results.push({
        query,
        duration: Math.round(duration),
        withinThreshold: duration < 500
      });
    }
    
    console.log('⚡ Search Performance:', results);
    return results;
  }
  
  testSearchPerformance();
`)
```

### 6. Storage Testing

```javascript
// Test Chrome Storage operations
@chrome-devtools evaluate_script(`
  async function testStorage() {
    const testData = { testKey: 'testValue', timestamp: Date.now() };
    
    try {
      // Write test
      await new Promise((resolve, reject) => {
        chrome.storage.local.set(testData, () => {
          chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve();
        });
      });
      
      // Read test
      const result = await new Promise((resolve, reject) => {
        chrome.storage.local.get(['testKey'], (data) => {
          chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(data);
        });
      });
      
      // Cleanup
      chrome.storage.local.remove(['testKey']);
      
      console.log('💾 Storage Test:', {
        writeSuccess: true,
        readSuccess: result.testKey === testData.testKey,
        data: result
      });
      
    } catch (error) {
      console.error('❌ Storage error:', error);
    }
  }
  
  testStorage();
`)
```

### 7. Visual Validation

```javascript
// Capture screenshots and check console
@chrome-devtools take_screenshot()
@chrome-devtools list_console_messages()
@chrome-devtools performance_start_trace()
// Run your tests here, then:
@chrome-devtools performance_stop_trace()
```

## Quick Test Sequence

1. **Load Extension**: Use commands from section 1
2. **Test AI APIs**: Run section 2 commands  
3. **Test Content**: Navigate to test page and run section 3
4. **Test Components**: Replace extension ID and run section 4
5. **Test Performance**: Run sections 5 and 6
6. **Capture Results**: Use section 7 commands

## Expected Results

✅ **Pass Criteria**:
- Extension loads without errors
- AI APIs available and respond < 5s
- Content extraction works correctly
- All components accessible
- Search performance < 500ms
- Storage operations successful

❌ **Fail Indicators**:
- Extension not found or errors during loading
- AI APIs unavailable or timeout
- Component fetch failures
- Performance thresholds exceeded
- Storage operation failures

## Usage

1. **Automated Testing**: Run `node mcp-workflows/run-flatpak-tests.js`
2. **Manual Testing**: Copy command blocks into VS Code GitHub Copilot Chat
3. **Replace Extension ID**: Use actual extension ID from automated test output
4. **Verify Results**: Check console output for detailed validation

## Current Status

✅ **T031 Extension Loading**: Completed and tested with Flatpak Chrome Dev  
🔄 **T032-T036**: Ready for implementation using established MCP infrastructure

This setup provides real Chrome extension testing with MCP automation!

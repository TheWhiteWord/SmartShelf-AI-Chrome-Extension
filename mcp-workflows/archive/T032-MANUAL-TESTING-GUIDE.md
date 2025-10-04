# T032: Chrome Built-in AI API Validation - Manual Testing Guide

## Overview
Since automated DevTools connection can be challenging, this guide provides manual testing commands for VS Code Copilot Chat to validate Chrome Built-in AI APIs.

## Prerequisites
1. Chrome Dev running with SmartShelf extension loaded
2. VS Code with Copilot Chat and MCP integration enabled
3. Extension visible at `chrome://extensions/`

## Manual T032 Execution

### Step 1: Start Chrome with AI Features

Run the working extension loader:
```bash
node mcp-workflows/run-flatpak-tests.js
```

### Step 2: Enable AI Features in Chrome

Navigate to `chrome://flags/` and enable:
- `#enable-ai-chrome-apis`
- `#prompt-api-for-gemini-nano`
- `#summarization-api-for-gemini-nano`
- `#writer-api-for-gemini-nano`
- `#rewriter-api-for-gemini-nano`

### Step 3: VS Code Copilot Chat AI API Tests

Copy and paste these commands into VS Code Copilot Chat:

#### Test 1: LanguageModel (Prompt API)
```javascript
@chrome-devtools Navigate to a new tab and evaluate this script:

(async () => {
  try {
    console.log('🤖 Testing LanguageModel API...');
    
    // Check availability
    const available = 'ai' in self && 'languageModel' in self.ai;
    console.log('LanguageModel available:', available);
    
    if (!available) {
      return { api: 'LanguageModel', available: false, error: 'API not available' };
    }
    
    // Test capabilities and session creation
    const initStart = performance.now();
    const capabilities = await self.ai.languageModel.capabilities();
    console.log('LanguageModel capabilities:', capabilities);
    
    const session = await self.ai.languageModel.create();
    const initTime = performance.now() - initStart;
    
    // Test prompt
    const promptStart = performance.now();
    const response = await session.prompt('What is Chrome Built-in AI?');
    const responseTime = performance.now() - promptStart;
    
    session.destroy();
    
    const result = {
      api: 'LanguageModel',
      available: true,
      initTime: Math.round(initTime),
      responseTime: Math.round(responseTime),
      capabilities: capabilities,
      response: response.slice(0, 200) + '...',
      success: true
    };
    
    console.log('✅ LanguageModel test result:', result);
    return result;
    
  } catch (error) {
    const result = {
      api: 'LanguageModel',
      available: false,
      error: error.message,
      success: false
    };
    console.log('❌ LanguageModel test failed:', result);
    return result;
  }
})()
```

#### Test 2: Summarizer API
```javascript
@chrome-devtools Evaluate this Summarizer API test:

(async () => {
  try {
    console.log('📄 Testing Summarizer API...');
    
    const available = 'ai' in self && 'summarizer' in self.ai;
    console.log('Summarizer available:', available);
    
    if (!available) {
      return { api: 'Summarizer', available: false, error: 'API not available' };
    }
    
    const initStart = performance.now();
    const capabilities = await self.ai.summarizer.capabilities();
    console.log('Summarizer capabilities:', capabilities);
    
    const session = await self.ai.summarizer.create();
    const initTime = performance.now() - initStart;
    
    const testContent = 'Chrome Built-in AI APIs provide powerful on-device processing for web applications and extensions. These APIs include the Language Model for general text processing, Summarizer for content condensation, Writer for text generation, and Rewriter for text transformation. This local processing approach ensures user privacy while providing fast, responsive AI features that work offline.';
    
    const summaryStart = performance.now();
    const summary = await session.summarize(testContent);
    const responseTime = performance.now() - summaryStart;
    
    session.destroy();
    
    const result = {
      api: 'Summarizer',
      available: true,
      initTime: Math.round(initTime),
      responseTime: Math.round(responseTime),
      capabilities: capabilities,
      originalLength: testContent.length,
      summaryLength: summary.length,
      summary: summary,
      success: true
    };
    
    console.log('✅ Summarizer test result:', result);
    return result;
    
  } catch (error) {
    const result = {
      api: 'Summarizer',
      available: false,
      error: error.message,
      success: false
    };
    console.log('❌ Summarizer test failed:', result);
    return result;
  }
})()
```

#### Test 3: Writer API
```javascript
@chrome-devtools Evaluate this Writer API test:

(async () => {
  try {
    console.log('✍️ Testing Writer API...');
    
    const available = 'ai' in self && 'writer' in self.ai;
    console.log('Writer available:', available);
    
    if (!available) {
      return { api: 'Writer', available: false, error: 'API not available' };
    }
    
    const initStart = performance.now();
    const capabilities = await self.ai.writer.capabilities();
    console.log('Writer capabilities:', capabilities);
    
    const session = await self.ai.writer.create();
    const initTime = performance.now() - initStart;
    
    const prompt = 'Write a brief explanation of Chrome extension development with AI';
    const writeStart = performance.now();
    const content = await session.write(prompt);
    const responseTime = performance.now() - writeStart;
    
    session.destroy();
    
    const result = {
      api: 'Writer',
      available: true,
      initTime: Math.round(initTime),
      responseTime: Math.round(responseTime),
      capabilities: capabilities,
      prompt: prompt,
      contentLength: content.length,
      content: content.slice(0, 200) + '...',
      success: true
    };
    
    console.log('✅ Writer test result:', result);
    return result;
    
  } catch (error) {
    const result = {
      api: 'Writer',
      available: false,
      error: error.message,
      success: false
    };
    console.log('❌ Writer test failed:', result);
    return result;
  }
})()
```

#### Test 4: Rewriter API
```javascript
@chrome-devtools Evaluate this Rewriter API test:

(async () => {
  try {
    console.log('🔄 Testing Rewriter API...');
    
    const available = 'ai' in self && 'rewriter' in self.ai;
    console.log('Rewriter available:', available);
    
    if (!available) {
      return { api: 'Rewriter', available: false, error: 'API not available' };
    }
    
    const initStart = performance.now();
    const capabilities = await self.ai.rewriter.capabilities();
    console.log('Rewriter capabilities:', capabilities);
    
    const session = await self.ai.rewriter.create();
    const initTime = performance.now() - initStart;
    
    const originalText = 'Chrome extensions are browser programs that extend functionality and provide additional features to users.';
    const rewriteStart = performance.now();
    const rewritten = await session.rewrite(originalText, { tone: 'more-formal' });
    const responseTime = performance.now() - rewriteStart;
    
    session.destroy();
    
    const result = {
      api: 'Rewriter',
      available: true,
      initTime: Math.round(initTime),
      responseTime: Math.round(responseTime),
      capabilities: capabilities,
      originalText: originalText,
      rewrittenText: rewritten,
      success: true
    };
    
    console.log('✅ Rewriter test result:', result);
    return result;
    
  } catch (error) {
    const result = {
      api: 'Rewriter',
      available: false,
      error: error.message,
      success: false
    };
    console.log('❌ Rewriter test failed:', result);
    return result;
  }
})()
```

### Step 4: Validate Performance Requirements

After running all API tests, evaluate the results:

```javascript
@chrome-devtools Evaluate this performance validation:

(() => {
  // Collect results from previous tests (you'll need to note these manually)
  const testResults = {
    LanguageModel: { success: true, initTime: 1500, responseTime: 2000 }, // Update with actual results
    Summarizer: { success: true, initTime: 1800, responseTime: 1500 },    // Update with actual results
    Writer: { success: true, initTime: 2000, responseTime: 2500 },        // Update with actual results
    Rewriter: { success: false, error: 'API not available' }              // Update with actual results
  };
  
  const availableAPIs = Object.values(testResults).filter(result => result.success);
  const totalAPIs = Object.keys(testResults).length;
  const successRate = (availableAPIs.length / totalAPIs) * 100;
  
  const avgInitTime = availableAPIs.reduce((sum, api) => sum + (api.initTime || 0), 0) / availableAPIs.length;
  const avgResponseTime = availableAPIs.reduce((sum, api) => sum + (api.responseTime || 0), 0) / availableAPIs.length;
  const maxInitTime = Math.max(...availableAPIs.map(api => api.initTime || 0));
  const maxResponseTime = Math.max(...availableAPIs.map(api => api.responseTime || 0));
  
  const performanceReport = {
    summary: {
      totalAPIs: totalAPIs,
      availableAPIs: availableAPIs.length,
      successRate: Math.round(successRate),
      avgInitTime: Math.round(avgInitTime),
      avgResponseTime: Math.round(avgResponseTime),
      maxInitTime: maxInitTime,
      maxResponseTime: maxResponseTime
    },
    constitutionalCompliance: {
      aiFirst: availableAPIs.length >= 2,
      privacyLocal: true,
      extensionNative: true,
      testChromeAPIs: availableAPIs.length > 0,
      performanceUnder5s: maxInitTime <= 5000 && maxResponseTime <= 5000,
      hackathonReady: successRate >= 50
    },
    details: testResults
  };
  
  console.log('📊 T032 Performance Report:', performanceReport);
  
  const overallSuccess = performanceReport.constitutionalCompliance.aiFirst && 
                        performanceReport.constitutionalCompliance.performanceUnder5s;
  
  console.log(overallSuccess ? '✅ T032 PASSED' : '❌ T032 NEEDS ATTENTION');
  
  return performanceReport;
})()
```

## Expected Results

### ✅ Pass Criteria:
- At least 2 AI APIs available and functional
- All response times under 5 seconds (constitutional requirement)
- Success rate ≥ 50% for demo readiness
- Local processing verified (no external API calls)

### ⚠️ Partial Pass:
- 1 API working (minimum functionality)
- Response times under 8 seconds
- Success rate ≥ 25%

### ❌ Fail Indicators:
- No AI APIs available
- Response times over 10 seconds
- All APIs returning errors

## Troubleshooting

### If No APIs Available:
1. Check Chrome version (need Dev/Canary with AI features)
2. Enable AI flags at `chrome://flags/`
3. Verify model downloads at `chrome://on-device-internals/`
4. Restart Chrome after enabling flags

### If APIs Timeout:
1. Check system resources (AI models need memory)
2. Close other Chrome tabs to free resources
3. Try shorter test content
4. Check Chrome process manager for AI-related processes

### If Setup Issues:
1. Verify extension loaded correctly: `chrome://extensions/`
2. Check MCP configuration: `.vscode/mcp_servers.json`
3. Restart VS Code to refresh MCP connection
4. Try manual Chrome launch: `flatpak run com.google.ChromeDev --enable-ai-chrome-apis`

## Success Confirmation

After completing all tests, you should have:
1. ✅ Results for each AI API (available/unavailable)
2. ✅ Performance metrics (init times, response times)
3. ✅ Constitutional compliance verification
4. ✅ Overall T032 status (PASSED/FAILED)

This completes T032 manual validation, providing evidence for Chrome Built-in AI API integration readiness.
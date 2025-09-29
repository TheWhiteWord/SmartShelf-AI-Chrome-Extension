# Chrome Built-in AI Setup Guide for SmartShelf Extension

## Prerequisites

1. **Chrome Version**: Ensure you have Chrome 138+ installed
   ```bash
   google-chrome --version
   ```

2. **System Requirements**:
   - **OS**: Windows 10/11, macOS 13+, Linux, or ChromeOS
   - **Storage**: At least 22 GB free space 
   - **GPU**: More than 4 GB VRAM
   - **Network**: Unlimited/unmetered connection

## Step 1: Enable Chrome Built-in AI APIs

### For Development/Testing:

1. **Enable Gemini Nano flag**:
   - Go to `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`
   - Set to **Enabled**
   - **Restart Chrome**

2. **Verify model availability**:
   - Go to `chrome://on-device-internals`
   - Check model status and download progress

3. **Test API availability** in DevTools Console:
   ```javascript
   // Should return "available", "downloadable", or "downloading"
   await LanguageModel.availability()
   await Summarizer.availability()
   ```

## Step 2: Test Your Setup

1. **Open the test file**: 
   ```bash
   cd /media/theww/AI/Code/AI/Google_Chrome_Built_In
   google-chrome tests/manual/test-chrome-ai.html
   ```

2. **Run all tests** and verify:
   - ✅ LanguageModel availability: "available"
   - ✅ Summarizer availability: "available"  
   - ✅ Functional AI prompt test works
   - ✅ Summarization test works

## Step 3: Load Your Extension

1. **Open Chrome Extension Manager**:
   - Go to `chrome://extensions/`
   - Enable **Developer Mode**

2. **Load your extension**:
   - Click **"Load unpacked"**
   - Select the `extension/` directory

3. **Test Extension AI Features**:
   - Click extension icon → should work without errors
   - Try saving a web page → should process with AI
   - Open side panel → check for AI-generated summaries

## Step 4: Debugging Common Issues

### Issue: "LanguageModel is not defined"
**Solution**: 
- Check Chrome version (need 138+)
- Verify flag is enabled: `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`
- Restart Chrome after enabling

### Issue: "availability() returns 'unavailable'"
**Solution**:
- Check system requirements (RAM, storage, GPU)
- Ensure unmetered internet connection
- Wait for model download (check `chrome://on-device-internals`)

### Issue: "create() fails with user activation required"
**Solution**: 
- API calls must happen after user interaction (click, keypress)
- In extension context, this is usually satisfied by user clicking extension

### Issue: Extension service worker errors
**Solution**:
- Check browser console for errors  
- Verify all imported scripts exist
- Test API availability in extension context:
  ```javascript
  // In service worker
  console.log('LanguageModel available:', 'LanguageModel' in self)
  console.log('Summarizer available:', 'Summarizer' in self)
  ```

## Step 5: Extension-Specific Considerations

### Service Worker Context
Chrome Extensions run in a service worker context where:
- Use `self` instead of `window` 
- APIs available as: `LanguageModel`, `Summarizer`, etc.
- No DOM access (handled by popup/content scripts)

### Content Scripts Context  
If using AI in content scripts:
- APIs available as `window.LanguageModel`, `window.Summarizer`
- Can access page DOM for content extraction
- Must handle cross-origin restrictions

### Popup/Options Pages Context
In popup HTML pages:
- APIs work like regular web pages
- Use `window.LanguageModel`, `window.Summarizer` 
- Handle async operations with user feedback

## Step 6: Verify Your Updated Code

The main changes made to your codebase:

1. **Service Worker** (`extension/background/service-worker.js`):
   - ✅ Updated from `chrome.aiOriginTrial` → `LanguageModel`/`Summarizer`  
   - ✅ Fixed session creation with new API format
   - ✅ Added proper error handling

2. **AI Connection Discovery** (`extension/shared/services/ai-connection-discovery.js`):
   - ✅ Updated initialization to use standard APIs
   - ✅ Fixed parameters and session creation

3. **Test File** (`test-chrome-ai.html`):
   - ✅ Created comprehensive test suite
   - ✅ Tests all API availability and functionality

## Expected Results

After setup, your extension should:

1. **Initialize successfully** with AI capabilities
2. **Process web pages** with AI summarization and categorization  
3. **Discover connections** between content using AI analysis
4. **Work offline** once models are downloaded
5. **Handle fallbacks** gracefully when AI unavailable

## Debug Commands

Use these in Chrome DevTools Console for troubleshooting:

```javascript
// Check API availability
await LanguageModel.availability()
await Summarizer.availability()

// Test basic functionality  
const session = await LanguageModel.create()
const result = await session.prompt("Hello, AI!")
console.log(result)
session.destroy()

// Check model parameters
await LanguageModel.params()

// Monitor download progress
const summarizer = await Summarizer.create({
  monitor(m) {
    m.addEventListener('downloadprogress', (e) => {
      console.log(`Downloaded ${e.loaded * 100}%`)
    })
  }
})
```

## Production Deployment

For hackathon submission/production:

1. **Origin Trials**: Register extension for origin trials if needed
2. **Graceful Degradation**: Ensure extension works without AI (fallback mode)
3. **User Communication**: Inform users about AI model download requirements  
4. **Privacy Policy**: Document local AI processing for user transparency

---

**Status**: ✅ Your extension is now updated to use the standard Chrome Built-in AI APIs!

Test everything with the provided test file and debug any remaining issues using the troubleshooting steps above.
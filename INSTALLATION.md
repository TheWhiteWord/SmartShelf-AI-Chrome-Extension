# SmartShelf Chrome Extension - Installation & Testing Guide

## 📦 **Installation Instructions**

### Prerequisites

- Google Chrome (version 120+) with Chrome Built-in AI Origin Trial enabled
- Node.js (version 16+) for development

### 🔧 **Loading the Extension**

1. **Open Chrome Extension Management**

   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right

3. **Load Unpacked Extension**
   - Click "Load unpacked"
   - Select the `extension/` folder from this repository
   - The SmartShelf extension should now appear in your extensions list
      - **Note**: Extension loads without icons initially (temporary for testing)

4. **Add Icons (Optional but Recommended)**
   - Open `icon-generator.html` in your browser to create icons
   - Or see `extension/icons/README.md` for manual icon creation
   - Update `manifest.json` to re-enable icons after creation

5. **Verify Installation**
   - Look for the SmartShelf extension in your extensions list
   - Pin the extension for easy access

### 🎯 **Testing the Chrome Built-in AI Integration**

#### **Option 1: Enable Chrome Built-in AI Origin Trial (Recommended)**

1. Visit: <https://developer.chrome.com/docs/ai/built-in>
2. Follow the origin trial signup process
3. Add the origin trial token to your Chrome flags

#### **Option 2: Chrome Canary with AI Flags (For Development)**

1. Install Chrome Canary
2. Enable these flags in `chrome://flags/`:
   - `#optimization-guide-on-device-model`
   - `#prompt-api-for-gemini-nano`
   - `#summarization-api-for-gemini-nano`

### 🧪 **Testing Features**

#### **1. Content Saving**

- Navigate to any webpage (e.g., Wikipedia article, blog post)
- Click the SmartShelf extension icon
- Click "Save Current Page"
- Verify the content appears in your collection (side panel)

#### **2. AI Processing**

- After saving content, observe AI processing indicators:
  - 🧠 "AI analyzing content..." in popup
  - Processing status in side panel
  - AI-generated tags, categories, and summaries

#### **3. Search & Organization**

- Open the side panel (click extension icon → "View Collection")
- Search for saved content
- Filter by categories and tags
- Observe AI-enhanced organization

#### **4. Keyboard Shortcuts**

- `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac): Save current page
- Access more shortcuts in extension options

### 🔍 **Debugging**

#### **Check Extension Console**

1. Go to `chrome://extensions/`
2. Find SmartShelf extension
3. Click "background page" or "service worker" to open DevTools
4. Check console for AI initialization messages:

   ```
   SmartShelf Service Worker loaded
   AI Prompt capabilities: {...}
   AI Prompt session initialized
   ```

#### **Verify AI API Availability**

In the extension console, run:

```javascript
// Check if Chrome Built-in AI is available
console.log('AI Available:', 'aiOriginTrial' in chrome)

// Check specific API availability
if (chrome.aiOriginTrial) {
  chrome.aiOriginTrial.languageModel.capabilities()
    .then(caps => console.log('AI Capabilities:', caps))
}
```

#### **Expected AI Capabilities Response**

```javascript
{
  available: "readily", // or "after-download", "no"
  defaultTopK: 3,
  maxTopK: 8,
  defaultTemperature: 0.8,
  maxTemperature: 2.0
}
```

### 📊 **Test Data**

#### **Sample Content for Testing**

1. **Technology Articles**: Save articles from tech blogs to test AI categorization
2. **Academic Papers**: Test AI summarization on longer content
3. **News Articles**: Verify tagging and content analysis
4. **Code Repositories**: Test detection of programming content

#### **Expected AI Behaviors**

- **Summarization**: 1-2 sentence summaries of main content
- **Tagging**: 3-5 relevant tags based on content analysis
- **Categorization**: 1-3 main categories (Technology, Science, Business, etc.)
- **Processing Time**: 1-3 seconds per item depending on content length

### 🚨 **Troubleshooting**

#### **AI Not Working**

- **Fallback Mode**: Extension works without AI (basic keyword extraction)
- **Check Console**: Look for "AI initialization failed, using fallback" messages
- **Origin Trial**: Ensure Chrome Built-in AI is properly enabled

#### **Extension Not Loading**

- **Manifest V3**: Ensure you're using Chrome 88+
- **File Permissions**: Check that extension folder is accessible
- **Clear Data**: Try clearing extension data and reloading

#### **Performance Issues**

- **Storage Limits**: Chrome local storage has limits (~10MB)
- **AI Processing**: Large content may take longer to process
- **Network**: Some AI features may require network connectivity

### 🏆 **Hackathon Submission Verification**

#### **Required Features Checklist**

- ✅ Chrome Built-in AI integration (Prompt API)
- ✅ AI-powered content analysis and categorization
- ✅ Intelligent search and organization
- ✅ Privacy-local processing (no external servers)
- ✅ Chrome Extension Manifest V3 compliance
- ✅ Comprehensive test coverage (50+ tests)

#### **Demo Script**

1. **Install & Setup** (1 min): Load extension, verify AI availability
2. **Content Saving** (2 min): Save diverse content types
3. **AI Processing** (2 min): Show real-time AI analysis
4. **Smart Search** (1 min): Demonstrate AI-enhanced search
5. **Privacy Features** (1 min): Show local processing, no data upload

### 📝 **Development Commands**

```bash
# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Build for production (if needed)
npm run build
```

---

**Ready for Google Chrome Built-in AI Challenge 2025! 🚀**

*SmartShelf showcases the power of Chrome's Built-in AI APIs for creating intelligent, privacy-first web experiences.*

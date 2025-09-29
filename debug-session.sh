#!/bin/bash

# SmartShelf Extension Debug Session Script
# Automates Chrome DevTools MCP setup for extension debugging

echo "🚀 Starting SmartShelf Extension Debug Session..."

# 1. Check Chrome Dev Channel
echo "📋 Checking Chrome version..."
google-chrome-unstable --version 2>/dev/null || google-chrome-beta --version 2>/dev/null || google-chrome --version

# 2. Enable Chrome AI flags (if not already enabled)
echo "🔧 Chrome AI Flags Setup:"
echo "Please ensure these flags are enabled in chrome://flags/"
echo "  - prompt-api-for-gemini-nano-multimodal-input: Enabled"
echo "  - summarizer-api: Enabled"  
echo "  - writer-api: Enabled"
echo "  - rewriter-api: Enabled"
echo ""

# 3. Load extension
echo "📦 Extension Loading:"
echo "1. Go to chrome://extensions/"
echo "2. Enable Developer Mode"
echo "3. Click 'Load unpacked'"
echo "4. Select: $(pwd)/extension/"
echo ""

# 4. Chrome DevTools MCP configuration for VS Code/Cursor
echo "⚙️  Chrome DevTools MCP Configuration:"
echo "Add this to your MCP client settings:"
echo ""
cat << 'EOF'
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--channel=dev",
        "--isolated=false",
        "--logFile=./chrome-extension-debug.log"
      ]
    }
  }
}
EOF
echo ""

# 5. Test scenarios
echo "🧪 Ready for testing! Try these scenarios:"
echo ""
echo "=== AI API Availability Test ==="
echo "navigate_page('chrome://extensions/')"
echo "evaluate_script(\`"
echo "  console.log('AI APIs Status:', {"
echo "    LanguageModel: 'LanguageModel' in self,"
echo "    Summarizer: 'Summarizer' in self,"
echo "    Writer: 'Writer' in self,"
echo "    Rewriter: 'Rewriter' in self"
echo "  });"
echo "\`);"
echo ""

echo "=== Extension Service Worker Test ==="
echo "evaluate_script(\`"
echo "  // Test SmartShelf service worker"
echo "  chrome.runtime.sendMessage({"
echo "    action: 'saveContent',"
echo "    data: {"
echo "      title: 'Debug Test Article',"
echo "      url: 'https://example.com/test',"
echo "      content: 'This is test content for debugging AI processing.'"
echo "    }"
echo "  }, response => {"
echo "    console.log('SmartShelf processing result:', response);"
echo "  });"
echo "\`);"
echo ""

echo "=== Content Capture Test ==="
echo "navigate_page('https://developer.chrome.com/docs/ai/get-started')"
echo "evaluate_script(\`"
echo "  // Test content extraction"
echo "  const content = {"
echo "    title: document.title,"
echo "    url: location.href,"
echo "    content: document.body.innerText.substring(0, 2000),"
echo "    type: 'article'"
echo "  };"
echo "  "
echo "  console.log('Extracted content:', content);"
echo "  "
echo "  // Send to SmartShelf for AI processing"
echo "  chrome.runtime.sendMessage({"
echo "    action: 'saveContent',"
echo "    data: content"
echo "  }, response => {"
echo "    console.log('SmartShelf save result:', response);"
echo "  });"
echo "\`);"
echo ""

echo "=== Performance Monitoring ==="
echo "performance_start_trace()"
echo "# Run your test scenarios here"
echo "performance_stop_trace()"
echo "performance_analyze_insight()"
echo ""

echo "=== Storage Inspection ==="
echo "evaluate_script(\`"
echo "  chrome.storage.local.get(null, data => {"
echo "    console.log('SmartShelf local storage:', data);"
echo "  });"
echo "  "
echo "  chrome.storage.sync.get(null, data => {"
echo "    console.log('SmartShelf sync storage:', data);"
echo "  });"
echo "\`);"
echo ""

echo "=== Console Monitoring ==="
echo "list_console_messages()"
echo ""

echo "=== Network Monitoring ==="
echo "list_network_requests()"
echo "# Filter for Internet Archive calls:"
echo "get_network_request('archive.org')"
echo ""

echo "✅ Debug session ready!"
echo "📝 Logs will be saved to: chrome-extension-debug.log"
echo "🔍 Use list_console_messages() to monitor extension activity"
echo "📊 Use performance_start_trace() before testing AI workflows"
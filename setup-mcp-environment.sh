#!/bin/bash

# SmartShelf Chrome DevTools MCP Environment Setup
# Ensures correct Node.js version and launches VS Code with MCP support

echo "🚀 Setting up SmartShelf Chrome Extension Development Environment..."

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Switch to Node.js 22.12.0
echo "📦 Switching to Node.js 22.12.0..."
nvm use v22.12.0

# Verify Node.js version
NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

if [[ "$NODE_VERSION" != "v22.12.0" ]]; then
    echo "❌ Wrong Node.js version. Installing v22.12.0..."
    nvm install 22.12.0
    nvm use 22.12.0
fi

# Test Chrome DevTools MCP
echo "🔧 Testing Chrome DevTools MCP..."
if npx chrome-devtools-mcp@latest --version > /dev/null 2>&1; then
    echo "✅ Chrome DevTools MCP is available"
else
    echo "❌ Chrome DevTools MCP test failed"
    exit 1
fi

# Check if VS Code is available
if command -v code > /dev/null 2>&1; then
    echo "🎯 Launching VS Code with MCP configuration..."
    code .
else
    echo "⚠️  VS Code not found in PATH. Please open VS Code manually."
fi

echo ""
echo "🎉 Environment ready!"
echo ""
echo "📋 Next steps:"
echo "1. Restart VS Code if it was already open"
echo "2. Open GitHub Copilot Chat"
echo "3. Test: 'Check if Chrome DevTools MCP is connected'"
echo "4. Load your extension: chrome://extensions/"
echo ""
echo "🐛 Debug commands available:"
echo "- navigate_page(url)"
echo "- evaluate_script(code)"
echo "- list_console_messages()"
echo "- take_screenshot()"
echo "- performance_start_trace()"
echo ""
echo "📖 See CHROME-DEVTOOLS-MCP-SETUP.md for full documentation"
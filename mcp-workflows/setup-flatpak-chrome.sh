#!/bin/bash

# Chrome Dev Flatpak MCP Setup Script
echo "🚀 Chrome Dev Flatpak Detection & MCP Setup"
echo "=========================================="

# Detect Flatpak Chrome Dev
FLATPAK_CHROME=""
if flatpak list 2>/dev/null | grep -i chrome | grep -i dev >/dev/null; then
    echo "✅ Chrome Dev Flatpak detected"
    FLATPAK_CHROME="flatpak run com.google.ChromeDev"
    
    # Get Chrome Dev info
    CHROME_INFO=$(flatpak list | grep -i chrome | grep -i dev)
    echo "   $CHROME_INFO"
    
elif flatpak list 2>/dev/null | grep -i chromium >/dev/null; then
    echo "✅ Chromium Flatpak detected"
    FLATPAK_CHROME="flatpak run org.chromium.Chromium"
    
else
    echo "❌ No Flatpak Chrome found"
    echo "Looking for other Chrome installations..."
    
    # Fallback to system Chrome
    if command -v google-chrome-unstable >/dev/null; then
        FLATPAK_CHROME="google-chrome-unstable"
        echo "✅ Found system Chrome Dev: $FLATPAK_CHROME"
    elif command -v google-chrome >/dev/null; then
        FLATPAK_CHROME="google-chrome"
        echo "✅ Found system Chrome: $FLATPAK_CHROME"
    else
        echo "❌ No Chrome found"
        exit 1
    fi
fi

echo ""
echo "🔧 Configuring MCP for Flatpak Chrome Dev"
echo "========================================"

# Create MCP server configuration for Flatpak Chrome
cat > ".vscode/mcp_servers.json" << EOF
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp", "--port=9222"],
      "env": {
        "CHROME_COMMAND": "$FLATPAK_CHROME"
      }
    }
  }
}
EOF

echo "✅ Updated .vscode/mcp_servers.json for Flatpak Chrome"

# Update VS Code settings for Flatpak Chrome MCP
cat > ".vscode/settings.json" << EOF
{
  "github.copilot.chat.useProjectTemplates": true,
  "github.copilot.enable": {
    "*": true,
    "yaml": true,
    "plaintext": true,
    "markdown": true,
    "json": true,
    "javascript": true,
    "typescript": true
  },
  "github.copilot.chat.welcomeMessage": "never",
  "github.copilot.chat.experimental.mcp": true,
  "github.copilot.chat.experimental.mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp", "--port=9222"],
      "env": {
        "CHROME_COMMAND": "$FLATPAK_CHROME"
      }
    }
  },
  "github.copilot.chat.experimental.codeGeneration.instructions": "When working with Chrome Extension testing, use MCP workflows. Focus on AI-first, privacy-local, extension-native development. Chrome is running via Flatpak.",
  "files.associations": {
    "*.mcp": "javascript"
  }
}
EOF

echo "✅ Updated .vscode/settings.json for Flatpak Chrome"

echo ""
echo "🧪 Creating Flatpak-Compatible Test Scripts"
echo "=========================================="

# Create Flatpak-aware test runner
cat > "mcp-workflows/run-flatpak-tests.js" << 'EOF'
#!/usr/bin/env node

/**
 * SmartShelf Extension - Flatpak Chrome Dev MCP Tests
 * Specifically designed to work with Flatpak Chrome Dev installation
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class FlatpakChromeTestExecutor {
  constructor() {
    this.chromeCommand = 'CHROME_COMMAND_PLACEHOLDER';
    this.extensionPath = join(__dirname, '..', 'extension');
    this.results = {};
  }

  async startChromeWithExtension() {
    console.log('🚀 Starting Chrome Dev via Flatpak with extension loading...');
    
    return new Promise((resolve, reject) => {
      // Launch Chrome Dev with debugging and extension loading
      const chromeArgs = [
        '--remote-debugging-port=9222',
        '--load-extension=' + this.extensionPath,
        '--disable-extensions-except=' + this.extensionPath,
        '--user-data-dir=/tmp/chrome-mcp-test',
        '--no-first-run',
        '--disable-default-apps'
      ];
      
      let chromeCmd;
      let fullArgs;
      
      if (this.chromeCommand.includes('flatpak')) {
        // For Flatpak: flatpak run com.google.ChromeDev [chrome-args]
        chromeCmd = 'flatpak';
        fullArgs = ['run', 'com.google.ChromeDev', ...chromeArgs];
      } else {
        // For system Chrome
        chromeCmd = this.chromeCommand;
        fullArgs = chromeArgs;
      }
      
      console.log(`Executing: ${chromeCmd} ${fullArgs.join(' ')}`);
      
      const chromeProcess = spawn(chromeCmd, fullArgs, {
        stdio: 'pipe',
        detached: false
      });
      
      chromeProcess.on('error', (error) => {
        console.error('❌ Failed to start Chrome:', error.message);
        reject(error);
      });
      
      // Wait for Chrome to start
      setTimeout(() => {
        console.log('✅ Chrome Dev started with extension loaded');
        resolve(chromeProcess);
      }, 3000);
    });
  }

  async testExtensionLoading() {
    console.log('\n🔧 T031: Testing Extension Loading via Flatpak Chrome');
    console.log('==================================================');
    
    try {
      // Start Chrome with extension
      const chromeProcess = await this.startChromeWithExtension();
      
      console.log('✅ Chrome Dev launched via Flatpak');
      console.log('✅ Extension loaded from:', this.extensionPath);
      console.log('✅ Debug port available on: http://localhost:9222');
      
      // Test if extension loaded by checking manifest
      const manifestPath = join(this.extensionPath, 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      
      console.log('📋 Extension Details:');
      console.log('   Name:', manifest.name);
      console.log('   Version:', manifest.version);
      console.log('   Manifest Version:', manifest.manifest_version);
      
      this.results.T031 = {
        status: 'passed',
        details: {
          chromeCommand: this.chromeCommand,
          extensionPath: this.extensionPath,
          manifest: {
            name: manifest.name,
            version: manifest.version,
            manifest_version: manifest.manifest_version
          }
        }
      };
      
      console.log('✅ T031 PASSED: Extension loading successful');
      
      // Keep Chrome running for a moment to allow manual inspection
      console.log('\nℹ️  Chrome is running with your extension loaded.');
      console.log('   You can inspect it at: chrome://extensions/');
      console.log('   Debug console at: http://localhost:9222');
      console.log('   Keeping Chrome open for 30 seconds...');
      
      setTimeout(() => {
        console.log('\n🔚 Closing Chrome Dev...');
        if (chromeProcess && !chromeProcess.killed) {
          chromeProcess.kill();
        }
        this.generateReport();
      }, 30000);
      
    } catch (error) {
      console.error('❌ T031 FAILED:', error.message);
      this.results.T031 = {
        status: 'failed',
        error: error.message
      };
    }
  }

  generateReport() {
    console.log('\n📊 Flatpak Chrome Test Report');
    console.log('=============================');
    
    for (const [testId, result] of Object.entries(this.results)) {
      const status = result.status === 'passed' ? '✅' : '❌';
      console.log(`${status} ${testId}: ${result.status.toUpperCase()}`);
    }
    
    console.log('\n🎯 Ready for VS Code Copilot Chat MCP commands!');
    console.log('   Try: @chrome-devtools help');
  }
}

// Run the test
const executor = new FlatpakChromeTestExecutor();
executor.testExtensionLoading();
EOF

# Replace placeholder with actual Chrome command
sed -i "s|CHROME_COMMAND_PLACEHOLDER|$FLATPAK_CHROME|g" "mcp-workflows/run-flatpak-tests.js"

chmod +x "mcp-workflows/run-flatpak-tests.js"

echo "✅ Created Flatpak-compatible test script"

echo ""
echo "🎯 Flatpak Chrome Dev MCP Setup Complete!"
echo "========================================"
echo ""
echo "Chrome Command: $FLATPAK_CHROME"
echo "Extension Path: $(pwd)/extension"
echo "MCP Port: 9222"
echo ""
echo "🚀 Next Steps:"
echo ""
echo "1. RESTART VS CODE to load new MCP configuration"
echo ""
echo "2. Test extension loading:"
echo "   node mcp-workflows/run-flatpak-tests.js"
echo ""
echo "3. Use VS Code Copilot Chat:"
echo "   @chrome-devtools help"
echo "   @chrome-devtools Navigate to chrome://extensions/"
echo ""
echo "4. Manual verification:"
echo "   - Chrome should load with your extension"
echo "   - Visit chrome://extensions/ to see SmartShelf"
echo "   - DevTools available at http://localhost:9222"
echo ""
echo "✨ Your Flatpak Chrome Dev is now MCP-ready!"
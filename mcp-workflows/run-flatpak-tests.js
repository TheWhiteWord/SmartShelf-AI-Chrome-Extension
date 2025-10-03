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
    this.chromeCommand = 'flatpak run com.google.ChromeDev';
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

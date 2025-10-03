#!/usr/bin/env node

/**
 * SmartShelf Extension - Service Worker Validation Test
 * 
 * Tests that the service worker can load without the importScripts error
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ServiceWorkerValidator {
  constructor() {
    this.extensionPath = join(__dirname, '..', 'extension');
  }

  async validateServiceWorker() {
    console.log('🔧 Validating SmartShelf Service Worker Configuration');
    console.log('==================================================');
    
    try {
      // Check manifest.json
      const manifestPath = join(this.extensionPath, 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      
      console.log('📋 Manifest Analysis:');
      console.log(`   Manifest Version: ${manifest.manifest_version}`);
      console.log(`   Background Service Worker: ${manifest.background?.service_worker}`);
      console.log(`   Service Worker Type: ${manifest.background?.type || 'non-module (default)'}`);
      
      // Check service worker file
      const serviceWorkerPath = join(this.extensionPath, manifest.background?.service_worker || '');
      if (!existsSync(serviceWorkerPath)) {
        throw new Error('Service worker file not found');
      }
      
      const serviceWorkerContent = readFileSync(serviceWorkerPath, 'utf8');
      
      // Analyze importScripts usage
      const importScriptsLines = serviceWorkerContent.split('\n')
        .map((line, index) => ({ line: line.trim(), number: index + 1 }))
        .filter(item => item.line.includes('importScripts('));
      
      console.log(`\\n🔍 Service Worker Analysis:`);
      console.log(`   File: ${manifest.background?.service_worker}`);
      console.log(`   Size: ${Math.round(serviceWorkerContent.length / 1024)}KB`);
      console.log(`   ImportScripts calls: ${importScriptsLines.length}`);
      
      if (importScriptsLines.length > 0) {
        console.log('\\n📄 ImportScripts Usage:');
        importScriptsLines.forEach(item => {
          console.log(`   Line ${item.number}: ${item.line}`);
        });
      }
      
      // Check for Chrome Built-in AI APIs
      const aiAPIs = ['LanguageModel', 'Summarizer', 'Writer', 'Rewriter'];
      const foundAPIs = aiAPIs.filter(api => serviceWorkerContent.includes(api));
      
      console.log(`\\n🤖 Chrome Built-in AI API Integration:`);
      foundAPIs.forEach(api => {
        console.log(`   ✅ ${api}: Found in service worker`);
      });
      
      if (foundAPIs.length === 0) {
        console.log('   ❌ No Chrome Built-in AI APIs found');
      }
      
      // Validate configuration compatibility
      console.log(`\\n🎯 Configuration Validation:`);
      
      const hasImportScripts = importScriptsLines.length > 0;
      const isModuleType = manifest.background?.type === 'module';
      
      if (hasImportScripts && isModuleType) {
        console.log('   ❌ ERROR: ImportScripts used with module type service worker');
        console.log('      Solution: Remove "type": "module" from manifest.json background section');
        return false;
      } else if (hasImportScripts && !isModuleType) {
        console.log('   ✅ ImportScripts compatible with non-module service worker');
      } else if (!hasImportScripts && isModuleType) {
        console.log('   ✅ Module service worker without importScripts');
      } else {
        console.log('   ✅ Non-module service worker without importScripts');
      }
      
      // Check imported files exist
      console.log(`\\n📁 Imported Files Validation:`);
      let allImportsExist = true;
      
      importScriptsLines.forEach(item => {
        const match = item.line.match(/importScripts\\(['"](.*?)['"]\\)/);
        if (match) {
          const importPath = match[1];
          const fullPath = join(this.extensionPath, 'background', importPath);
          const exists = existsSync(fullPath);
          
          console.log(`   ${exists ? '✅' : '❌'} ${importPath}`);
          if (!exists) allImportsExist = false;
        }
      });
      
      console.log(`\\n🏆 Service Worker Status:`);
      console.log(`   Configuration: ${hasImportScripts && !isModuleType || !hasImportScripts ? '✅ Valid' : '❌ Invalid'}`);
      console.log(`   AI Integration: ${foundAPIs.length > 0 ? '✅ Present' : '❌ Missing'} (${foundAPIs.length}/4 APIs)`);
      console.log(`   File Dependencies: ${allImportsExist ? '✅ All found' : '❌ Missing files'}`);
      
      const overallValid = (hasImportScripts && !isModuleType || !hasImportScripts) && foundAPIs.length > 0 && allImportsExist;
      console.log(`   Overall Status: ${overallValid ? '✅ READY' : '❌ NEEDS FIXES'}`);
      
      return overallValid;
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }
}

// Execute validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ServiceWorkerValidator();
  
  validator.validateServiceWorker()
    .then((isValid) => {
      console.log(`\\n${isValid ? '🎉' : '💥'} Service Worker Validation ${isValid ? 'PASSED' : 'FAILED'}`);
      process.exit(isValid ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Validation error:', error);
      process.exit(1);
    });
}

export { ServiceWorkerValidator };
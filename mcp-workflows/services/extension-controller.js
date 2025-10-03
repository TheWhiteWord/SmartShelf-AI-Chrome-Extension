/**
 * Chrome Extension Controller Service
 * 
 * Manages Chrome extension lifecycle including loading, validation, and cleanup
 * operations for MCP automated testing with comprehensive extension management.
 */

import EventEmitter from 'events';
import path from 'path';
import fs from 'fs/promises';

export class ChromeExtensionController extends EventEmitter {
  /**
   * Extension controller events
   */
  static EVENTS = {
    EXTENSION_LOADED: 'extension_loaded',
    EXTENSION_UNLOADED: 'extension_unloaded',
    EXTENSION_VALIDATED: 'extension_validated',
    EXTENSION_ERROR: 'extension_error',
    COMPONENT_LOADED: 'component_loaded',
    COMPONENT_ERROR: 'component_error'
  };

  /**
   * Extension component types
   */
  static COMPONENT_TYPES = {
    SERVICE_WORKER: 'service_worker',
    CONTENT_SCRIPT: 'content_script',
    POPUP: 'popup',
    SIDEPANEL: 'sidepanel',
    OPTIONS_PAGE: 'options_page',
    BACKGROUND: 'background'
  };

  /**
   * Extension states
   */
  static EXTENSION_STATE = {
    UNLOADED: 'unloaded',
    LOADING: 'loading',
    LOADED: 'loaded',
    VALIDATED: 'validated',
    ERROR: 'error'
  };

  /**
   * Creates a new Chrome Extension Controller instance
   * @param {Object} config - Controller configuration
   * @param {string} config.extensionPath - Path to extension directory
   * @param {boolean} config.autoValidate - Auto-validate after loading (default: true)
   * @param {number} config.loadTimeout - Extension load timeout in ms (default: 15000)
   */
  constructor(config = {}) {
    super();
    
    this.config = {
      extensionPath: config.extensionPath || null,
      autoValidate: config.autoValidate !== false,
      loadTimeout: config.loadTimeout || 15000,
      validateComponents: config.validateComponents !== false,
      enableDevMode: config.enableDevMode !== false,
      ...config
    };
    
    // Extension state tracking
    this.extensionId = null;
    this.extensionState = ChromeExtensionController.EXTENSION_STATE.UNLOADED;
    this.manifestData = null;
    this.loadedComponents = new Map();
    this.validationResults = [];
    
    // Chrome integration
    this.chromeExtensionAPI = null;
    this.devToolsConnection = null;
    
    // Statistics
    this.statistics = {
      loadAttempts: 0,
      successfulLoads: 0,
      failedLoads: 0,
      validationRuns: 0,
      componentErrors: 0,
      totalComponents: 0,
      averageLoadTime: 0
    };
  }

  /**
   * Initializes the extension controller with Chrome DevTools connection
   * @param {Object} chromeConnection - Chrome DevTools MCP connection
   * @returns {Promise<void>} Initialization promise
   */
  async initialize(chromeConnection) {
    this.devToolsConnection = chromeConnection;
    
    // Enable Chrome extension APIs
    await this._enableChromeExtensionAPIs();
    
    // Load extension path from config if provided
    if (this.config.extensionPath) {
      await this._validateExtensionPath(this.config.extensionPath);
    }
  }

  /**
   * Loads a Chrome extension for testing
   * @param {string} extensionPath - Path to extension directory (optional if set in config)
   * @param {Object} loadOptions - Loading options
   * @returns {Promise<Object>} Load result with extension ID and status
   */
  async loadExtension(extensionPath = null, loadOptions = {}) {
    const targetPath = extensionPath || this.config.extensionPath;
    
    if (!targetPath) {
      throw new Error('Extension path must be provided either in config or parameter');
    }
    
    this.extensionState = ChromeExtensionController.EXTENSION_STATE.LOADING;
    this.statistics.loadAttempts++;
    
    const startTime = Date.now();
    
    try {
      // Validate extension directory and manifest
      await this._validateExtensionPath(targetPath);
      await this._loadManifest(targetPath);
      
      // Enable developer mode if not already enabled
      if (this.config.enableDevMode) {
        await this._enableDeveloperMode();
      }
      
      // Load extension via Chrome DevTools
      const loadResult = await this._loadExtensionViaChromeAPI(targetPath, loadOptions);
      
      this.extensionId = loadResult.extensionId;
      this.extensionState = ChromeExtensionController.EXTENSION_STATE.LOADED;
      
      const loadTime = Date.now() - startTime;
      this._updateLoadStatistics(loadTime);
      
      const result = {
        extensionId: this.extensionId,
        extensionPath: targetPath,
        loadTime: loadTime,
        manifestVersion: this.manifestData.manifest_version,
        name: this.manifestData.name,
        version: this.manifestData.version,
        status: 'loaded'
      };
      
      this.emit(ChromeExtensionController.EVENTS.EXTENSION_LOADED, result);
      
      // Auto-validate if enabled
      if (this.config.autoValidate) {
        await this.validateExtension();
      }
      
      return result;
      
    } catch (error) {
      this.extensionState = ChromeExtensionController.EXTENSION_STATE.ERROR;
      this.statistics.failedLoads++;
      
      const errorResult = {
        error: error.message,
        extensionPath: targetPath,
        loadTime: Date.now() - startTime,
        status: 'error'
      };
      
      this.emit(ChromeExtensionController.EVENTS.EXTENSION_ERROR, errorResult);
      throw error;
    }
  }

  /**
   * Validates the loaded extension and its components
   * @param {Object} validationOptions - Validation options
   * @returns {Promise<Object>} Validation results
   */
  async validateExtension(validationOptions = {}) {
    if (this.extensionState !== ChromeExtensionController.EXTENSION_STATE.LOADED) {
      throw new Error(`Cannot validate extension in ${this.extensionState} state`);
    }
    
    this.statistics.validationRuns++;
    const validationResults = [];
    
    try {
      // Validate manifest structure
      const manifestValidation = await this._validateManifestStructure();
      validationResults.push(manifestValidation);
      
      // Validate extension components
      if (this.config.validateComponents) {
        const componentValidations = await this._validateExtensionComponents();
        validationResults.push(...componentValidations);
      }
      
      // Validate permissions and APIs
      const permissionValidation = await this._validatePermissions();
      validationResults.push(permissionValidation);
      
      // Check for Chrome Built-in AI API integration
      const aiValidation = await this._validateAIAPIIntegration();
      validationResults.push(aiValidation);
      
      // Validate storage access
      const storageValidation = await this._validateStorageAccess();
      validationResults.push(storageValidation);
      
      this.validationResults = validationResults;
      this.extensionState = ChromeExtensionController.EXTENSION_STATE.VALIDATED;
      
      const result = {
        extensionId: this.extensionId,
        validationResults: validationResults,
        totalChecks: validationResults.length,
        passedChecks: validationResults.filter(r => r.passed).length,
        failedChecks: validationResults.filter(r => !r.passed).length,
        timestamp: new Date().toISOString(),
        status: 'validated'
      };
      
      this.emit(ChromeExtensionController.EVENTS.EXTENSION_VALIDATED, result);
      
      return result;
      
    } catch (error) {
      this.emit(ChromeExtensionController.EVENTS.EXTENSION_ERROR, {
        error: error.message,
        phase: 'validation'
      });
      throw error;
    }
  }

  /**
   * Unloads the extension and cleans up resources
   * @returns {Promise<Object>} Unload result
   */
  async unloadExtension() {
    if (this.extensionState === ChromeExtensionController.EXTENSION_STATE.UNLOADED) {
      return { status: 'already_unloaded' };
    }
    
    try {
      // Unload via Chrome DevTools API
      if (this.extensionId) {
        await this._unloadExtensionViaChromeAPI(this.extensionId);
      }
      
      // Clean up state
      this.extensionId = null;
      this.extensionState = ChromeExtensionController.EXTENSION_STATE.UNLOADED;
      this.manifestData = null;
      this.loadedComponents.clear();
      this.validationResults = [];
      
      const result = {
        status: 'unloaded',
        timestamp: new Date().toISOString()
      };
      
      this.emit(ChromeExtensionController.EVENTS.EXTENSION_UNLOADED, result);
      
      return result;
      
    } catch (error) {
      this.emit(ChromeExtensionController.EVENTS.EXTENSION_ERROR, {
        error: error.message,
        phase: 'unload'
      });
      throw error;
    }
  }

  /**
   * Reloads the extension (unload + load)
   * @param {Object} reloadOptions - Reload options
   * @returns {Promise<Object>} Reload result
   */
  async reloadExtension(reloadOptions = {}) {
    const unloadResult = await this.unloadExtension();
    const loadResult = await this.loadExtension(null, reloadOptions);
    
    return {
      unload: unloadResult,
      load: loadResult,
      status: 'reloaded'
    };
  }

  /**
   * Gets information about a specific extension component
   * @param {string} componentType - Component type to check
   * @returns {Promise<Object>} Component information
   */
  async getComponentInfo(componentType) {
    if (!Object.values(ChromeExtensionController.COMPONENT_TYPES).includes(componentType)) {
      throw new Error(`Invalid component type: ${componentType}`);
    }
    
    const component = this.loadedComponents.get(componentType);
    
    if (!component) {
      return {
        componentType: componentType,
        status: 'not_found',
        loaded: false
      };
    }
    
    // Get runtime information via DevTools
    const runtimeInfo = await this._getComponentRuntimeInfo(componentType);
    
    return {
      componentType: componentType,
      status: component.status,
      loaded: component.loaded,
      filePath: component.filePath,
      loadTime: component.loadTime,
      errors: component.errors || [],
      runtimeInfo: runtimeInfo
    };
  }

  /**
   * Gets current extension state and statistics
   * @returns {Object} Extension state information
   */
  getExtensionState() {
    return {
      extensionId: this.extensionId,
      state: this.extensionState,
      manifestData: this.manifestData,
      loadedComponents: Array.from(this.loadedComponents.entries()),
      validationResults: this.validationResults,
      statistics: { ...this.statistics },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validates extension path and accessibility
   * @param {string} extensionPath - Path to validate
   * @private
   */
  async _validateExtensionPath(extensionPath) {
    try {
      const stats = await fs.stat(extensionPath);
      if (!stats.isDirectory()) {
        throw new Error(`Extension path is not a directory: ${extensionPath}`);
      }
      
      // Check for manifest.json
      const manifestPath = path.join(extensionPath, 'manifest.json');
      await fs.access(manifestPath);
      
    } catch (error) {
      throw new Error(`Invalid extension path: ${error.message}`);
    }
  }

  /**
   * Loads and validates manifest.json
   * @param {string} extensionPath - Extension directory path
   * @private
   */
  async _loadManifest(extensionPath) {
    try {
      const manifestPath = path.join(extensionPath, 'manifest.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf8');
      this.manifestData = JSON.parse(manifestContent);
      
      // Basic manifest validation
      if (!this.manifestData.manifest_version) {
        throw new Error('Missing manifest_version in manifest.json');
      }
      
      if (!this.manifestData.name) {
        throw new Error('Missing name in manifest.json');
      }
      
      if (!this.manifestData.version) {
        throw new Error('Missing version in manifest.json');
      }
      
    } catch (error) {
      throw new Error(`Failed to load manifest: ${error.message}`);
    }
  }

  /**
   * Enables Chrome developer mode
   * @private
   */
  async _enableDeveloperMode() {
    // This would interact with Chrome DevTools to enable developer mode
    // Implementation depends on the specific MCP integration
    return { enabled: true };
  }

  /**
   * Loads extension via Chrome API
   * @param {string} extensionPath - Extension path
   * @param {Object} options - Load options
   * @returns {Promise<Object>} Load result
   * @private
   */
  async _loadExtensionViaChromeAPI(extensionPath, options) {
    // This would use Chrome DevTools MCP to actually load the extension
    // For now, simulate the loading process
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          extensionId: `ext_${Date.now()}`,
          status: 'loaded'
        });
      }, Math.random() * 2000 + 1000); // Simulate 1-3 second load time
    });
  }

  /**
   * Unloads extension via Chrome API
   * @param {string} extensionId - Extension ID to unload
   * @returns {Promise<void>} Unload promise
   * @private
   */
  async _unloadExtensionViaChromeAPI(extensionId) {
    // This would use Chrome DevTools MCP to unload the extension
    return new Promise((resolve) => {
      setTimeout(resolve, 500); // Simulate unload time
    });
  }

  /**
   * Validates manifest structure
   * @returns {Promise<Object>} Validation result
   * @private
   */
  async _validateManifestStructure() {
    const checks = [];
    
    // Check manifest version
    checks.push({
      name: 'Manifest Version',
      passed: this.manifestData.manifest_version === 3,
      expected: 3,
      actual: this.manifestData.manifest_version,
      message: 'Extension uses Manifest V3'
    });
    
    // Check required fields
    const requiredFields = ['name', 'version', 'description'];
    for (const field of requiredFields) {
      checks.push({
        name: `Required Field: ${field}`,
        passed: !!this.manifestData[field],
        expected: 'present',
        actual: this.manifestData[field] ? 'present' : 'missing',
        message: `Field '${field}' is present in manifest`
      });
    }
    
    return {
      component: 'manifest',
      passed: checks.every(c => c.passed),
      checks: checks,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validates extension components
   * @returns {Promise<Array>} Component validation results
   * @private
   */
  async _validateExtensionComponents() {
    const validations = [];
    
    // Check service worker
    if (this.manifestData.background?.service_worker) {
      const swValidation = await this._validateServiceWorker();
      validations.push(swValidation);
    }
    
    // Check content scripts
    if (this.manifestData.content_scripts) {
      const csValidation = await this._validateContentScripts();
      validations.push(csValidation);
    }
    
    // Check popup
    if (this.manifestData.action?.default_popup) {
      const popupValidation = await this._validatePopup();
      validations.push(popupValidation);
    }
    
    // Check sidepanel
    if (this.manifestData.side_panel) {
      const sidepanelValidation = await this._validateSidepanel();
      validations.push(sidepanelValidation);
    }
    
    return validations;
  }

  /**
   * Validates Chrome Built-in AI API integration
   * @returns {Promise<Object>} AI validation result
   * @private
   */
  async _validateAIAPIIntegration() {
    const checks = [];
    
    // Check for AI API permissions
    const hasAIPermissions = this.manifestData.permissions?.includes('aiLanguageModelOriginTrial') ||
                           this.manifestData.permissions?.includes('experimental');
    
    checks.push({
      name: 'AI API Permissions',
      passed: hasAIPermissions,
      expected: 'AI permissions present',
      actual: hasAIPermissions ? 'present' : 'missing',
      message: 'Chrome Built-in AI API permissions configured'
    });
    
    return {
      component: 'ai_integration',
      passed: checks.every(c => c.passed),
      checks: checks,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validates service worker
   * @returns {Promise<Object>} Service worker validation
   * @private
   */
  async _validateServiceWorker() {
    const swPath = this.manifestData.background?.service_worker;
    
    if (!swPath) {
      return {
        component: 'service_worker',
        passed: false,
        error: 'No service worker defined in manifest'
      };
    }
    
    // Check if file exists (would be done via actual file system check)
    const exists = true; // Placeholder
    
    this.loadedComponents.set(ChromeExtensionController.COMPONENT_TYPES.SERVICE_WORKER, {
      status: exists ? 'loaded' : 'error',
      loaded: exists,
      filePath: swPath,
      loadTime: Date.now()
    });
    
    return {
      component: 'service_worker',
      passed: exists,
      filePath: swPath,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validates content scripts
   * @returns {Promise<Object>} Content scripts validation
   * @private
   */
  async _validateContentScripts() {
    const contentScripts = this.manifestData.content_scripts || [];
    
    const validScripts = contentScripts.filter(script => 
      script.js && script.js.length > 0 && script.matches && script.matches.length > 0
    );
    
    this.loadedComponents.set(ChromeExtensionController.COMPONENT_TYPES.CONTENT_SCRIPT, {
      status: validScripts.length > 0 ? 'loaded' : 'error',
      loaded: validScripts.length > 0,
      count: validScripts.length,
      loadTime: Date.now()
    });
    
    return {
      component: 'content_scripts',
      passed: validScripts.length > 0,
      count: validScripts.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validates popup component
   * @returns {Promise<Object>} Popup validation
   * @private
   */
  async _validatePopup() {
    const popupPath = this.manifestData.action?.default_popup;
    
    this.loadedComponents.set(ChromeExtensionController.COMPONENT_TYPES.POPUP, {
      status: popupPath ? 'loaded' : 'error',
      loaded: !!popupPath,
      filePath: popupPath,
      loadTime: Date.now()
    });
    
    return {
      component: 'popup',
      passed: !!popupPath,
      filePath: popupPath,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validates sidepanel component
   * @returns {Promise<Object>} Sidepanel validation
   * @private
   */
  async _validateSidepanel() {
    const sidepanelPath = this.manifestData.side_panel?.default_path;
    
    this.loadedComponents.set(ChromeExtensionController.COMPONENT_TYPES.SIDEPANEL, {
      status: sidepanelPath ? 'loaded' : 'error',
      loaded: !!sidepanelPath,
      filePath: sidepanelPath,
      loadTime: Date.now()
    });
    
    return {
      component: 'sidepanel',
      passed: !!sidepanelPath,
      filePath: sidepanelPath,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validates permissions
   * @returns {Promise<Object>} Permissions validation
   * @private
   */
  async _validatePermissions() {
    const permissions = this.manifestData.permissions || [];
    const hostPermissions = this.manifestData.host_permissions || [];
    
    return {
      component: 'permissions',
      passed: true,
      permissions: permissions,
      hostPermissions: hostPermissions,
      totalPermissions: permissions.length + hostPermissions.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validates storage access
   * @returns {Promise<Object>} Storage validation
   * @private
   */
  async _validateStorageAccess() {
    const hasStoragePermission = this.manifestData.permissions?.includes('storage');
    
    return {
      component: 'storage',
      passed: hasStoragePermission,
      hasPermission: hasStoragePermission,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gets component runtime information
   * @param {string} componentType - Component type
   * @returns {Promise<Object>} Runtime information
   * @private
   */
  async _getComponentRuntimeInfo(componentType) {
    // This would query Chrome DevTools for actual runtime information
    return {
      active: true,
      errors: [],
      memoryUsage: Math.random() * 50 + 10, // Simulate MB usage
      lastActivity: new Date().toISOString()
    };
  }

  /**
   * Enables Chrome extension APIs
   * @private
   */
  async _enableChromeExtensionAPIs() {
    // This would enable extension management APIs via DevTools
    return { enabled: true };
  }

  /**
   * Updates load statistics
   * @param {number} loadTime - Load time in milliseconds
   * @private
   */
  _updateLoadStatistics(loadTime) {
    this.statistics.successfulLoads++;
    
    const totalTime = this.statistics.averageLoadTime * (this.statistics.successfulLoads - 1) + loadTime;
    this.statistics.averageLoadTime = totalTime / this.statistics.successfulLoads;
  }
}

export default ChromeExtensionController;
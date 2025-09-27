/**
 * @fileoverview UserSettings Model - Extension Configuration Management
 * 
 * Provides comprehensive user preferences and extension configuration management
 * with validation, Chrome Storage integration, and settings migration support.
 * 
 * Features:
 * - User preferences and extension configuration
 * - AI service settings and model preferences  
 * - Privacy and security controls
 * - UI customization options
 * - Chrome Storage integration (sync/local)
 * - Default configuration management
 * - Settings validation and constraints
 * - Import/export functionality
 * - Event-driven change notifications
 * - Version migration support
 */

// Generate UUID for settings IDs
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * UserSettings Model Class
 * 
 * Represents user preferences and extension configuration with validation,
 * Chrome Storage integration, and comprehensive settings management.
 */
class UserSettings {
  // Default AI settings
  static DEFAULT_AI_SETTINGS = {
    summarizer: {
      enabled: true,
      model: 'chrome-built-in',
      maxLength: 200,
      format: 'bullet-points'
    },
    categorizer: {
      enabled: true,
      model: 'chrome-built-in',
      autoApply: true,
      customCategories: []
    },
    autoProcessing: true,
    confidenceThreshold: 0.7,
    enableConnectionDiscovery: true,
    batchProcessingSize: 10
  };

  // Default privacy settings
  static DEFAULT_PRIVACY_SETTINGS = {
    enableExternalAPI: false,
    shareAnonymousUsage: false,
    enableConnectionDiscovery: true,
    allowDataExport: true,
    encryptSensitiveData: true,
    autoDeleteOldData: false,
    dataRetentionDays: 365
  };

  // Default UI preferences
  static DEFAULT_UI_PREFERENCES = {
    theme: 'system', // light, dark, system
    density: 'comfortable', // compact, comfortable, spacious
    showAdvancedOptions: false,
    enableAnimations: true,
    sidePanel: {
      defaultView: 'grid',
      itemsPerPage: 20,
      sortBy: 'modifiedAt',
      sortOrder: 'desc'
    },
    notifications: {
      enabled: true,
      showProcessingStatus: true,
      showErrors: true
    }
  };

  // Default general settings
  static DEFAULT_GENERAL_SETTINGS = {
    language: 'en',
    autoSave: true,
    backupFrequency: 'daily',
    maxStorageSize: 100, // MB
    enableKeyboardShortcuts: true,
    debugMode: false
  };

  // Storage type constants
  static STORAGE_TYPES = {
    LOCAL: 'local',
    SYNC: 'sync'
  };

  // Settings categories
  static CATEGORIES = {
    AI: 'ai',
    PRIVACY: 'privacy',
    UI: 'ui',
    GENERAL: 'general'
  };

  // Current version for migration
  static CURRENT_VERSION = '1.0.0';

  // Theme options
  static THEME_OPTIONS = ['light', 'dark', 'system'];

  // Density options
  static DENSITY_OPTIONS = ['compact', 'comfortable', 'spacious'];

  /**
   * Create a new UserSettings instance
   * @param {Object} [options] - Settings configuration
   */
  constructor(options = {}) {
    // Check for explicitly null values before processing
    if (options.aiSettings === null) {
      throw new Error('Invalid AI settings');
    }

    // Initialize properties
    this.id = options.id || generateUUID();
    this.userId = options.userId || null;
    this.version = options.version || UserSettings.CURRENT_VERSION;
    this.createdAt = options.createdAt ? new Date(options.createdAt) : new Date();
    this.modifiedAt = options.modifiedAt ? new Date(options.modifiedAt) : new Date();

    // Merge settings with defaults
    this.aiSettings = this._mergeWithDefaults(options.aiSettings, UserSettings.DEFAULT_AI_SETTINGS);
    this.privacySettings = this._mergeWithDefaults(options.privacySettings, UserSettings.DEFAULT_PRIVACY_SETTINGS);
    this.uiPreferences = this._mergeWithDefaults(options.uiPreferences, UserSettings.DEFAULT_UI_PREFERENCES);
    this.generalSettings = this._mergeWithDefaults(options.generalSettings, UserSettings.DEFAULT_GENERAL_SETTINGS);

    // Validate settings on construction
    this._validateOnConstruction();

    // Event listeners for changes
    this._changeListeners = [];
    this._categoryListeners = new Map();
    this._lastSavedState = null;
    this._unsavedChanges = false;
  }

  /**
   * Merge custom settings with defaults (deep merge)
   * @param {Object} custom - Custom settings
   * @param {Object} defaults - Default settings
   * @returns {Object} Merged settings
   * @private
   */
  _mergeWithDefaults(custom, defaults) {
    if (!custom) return JSON.parse(JSON.stringify(defaults));
    
    const merged = JSON.parse(JSON.stringify(defaults));
    return this._deepMerge(merged, custom);
  }

  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   * @private
   */
  _deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this._deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  /**
   * Validate settings during construction
   * @private
   */
  _validateOnConstruction() {
    if (this.aiSettings === null) {
      throw new Error('Invalid AI settings');
    }
    
    if (this.aiSettings && !this.validateAISettings(this.aiSettings)) {
      if (this.aiSettings.confidenceThreshold > 1.0 || this.aiSettings.confidenceThreshold < 0.0) {
        throw new Error('Invalid confidence threshold. Must be between 0.0 and 1.0');
      }
      throw new Error('Invalid AI settings');
    }

    if (this.uiPreferences && !this.validateUIPreferences(this.uiPreferences)) {
      if (this.uiPreferences.theme && !UserSettings.THEME_OPTIONS.includes(this.uiPreferences.theme)) {
        throw new Error('Invalid theme. Must be one of: light, dark, system');
      }
      throw new Error('Invalid UI preferences');
    }

    if (this.privacySettings && !this.validatePrivacySettings(this.privacySettings)) {
      throw new Error('Invalid privacy settings');
    }
  }

  /**
   * Validate all settings
   * @returns {boolean} True if valid
   */
  validate() {
    try {
      return this.validateAISettings(this.aiSettings) &&
             this.validatePrivacySettings(this.privacySettings) &&
             this.validateUIPreferences(this.uiPreferences) &&
             this.validateGeneralSettings(this.generalSettings);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate AI settings
   * @param {Object} aiSettings - AI settings to validate
   * @returns {boolean} True if valid
   */
  validateAISettings(aiSettings) {
    if (!aiSettings || typeof aiSettings !== 'object') return false;
    
    if (aiSettings.confidenceThreshold !== undefined) {
      if (typeof aiSettings.confidenceThreshold !== 'number' ||
          aiSettings.confidenceThreshold < 0.0 ||
          aiSettings.confidenceThreshold > 1.0) {
        return false;
      }
    }
    
    if (aiSettings.autoProcessing !== undefined) {
      if (typeof aiSettings.autoProcessing !== 'boolean') return false;
    }
    
    return true;
  }

  /**
   * Validate privacy settings
   * @param {Object} privacySettings - Privacy settings to validate
   * @returns {boolean} True if valid
   */
  validatePrivacySettings(privacySettings) {
    if (!privacySettings || typeof privacySettings !== 'object') return false;
    
    const booleanFields = ['enableExternalAPI', 'shareAnonymousUsage', 'enableConnectionDiscovery'];
    
    for (const field of booleanFields) {
      if (privacySettings[field] !== undefined && typeof privacySettings[field] !== 'boolean') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate UI preferences
   * @param {Object} uiPreferences - UI preferences to validate
   * @returns {boolean} True if valid
   */
  validateUIPreferences(uiPreferences) {
    if (!uiPreferences || typeof uiPreferences !== 'object') return false;
    
    if (uiPreferences.theme && !UserSettings.THEME_OPTIONS.includes(uiPreferences.theme)) {
      return false;
    }
    
    if (uiPreferences.density && !UserSettings.DENSITY_OPTIONS.includes(uiPreferences.density)) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate general settings
   * @param {Object} generalSettings - General settings to validate
   * @returns {boolean} True if valid
   */
  validateGeneralSettings(generalSettings) {
    if (!generalSettings || typeof generalSettings !== 'object') return false;
    return true; // Basic validation for now
  }

  /**
   * Update individual AI setting
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  updateAISetting(key, value) {
    // Validate specific setting
    if (key === 'confidenceThreshold') {
      if (typeof value !== 'number' || value < 0.0 || value > 1.0) {
        throw new Error('Invalid confidence threshold value');
      }
    }

    const oldValue = this.aiSettings[key];
    this.aiSettings[key] = value;
    this.updateModifiedDate();
    this._markAsUnsaved();
    this._notifyListeners(UserSettings.CATEGORIES.AI, key, oldValue, value);
  }

  /**
   * Update individual privacy setting
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  updatePrivacySetting(key, value) {
    const oldValue = this.privacySettings[key];
    this.privacySettings[key] = value;
    this.updateModifiedDate();
    this._markAsUnsaved();
    this._notifyListeners(UserSettings.CATEGORIES.PRIVACY, key, oldValue, value);
  }

  /**
   * Update individual UI preference
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  updateUIPreference(key, value) {
    const oldValue = this.uiPreferences[key];
    this.uiPreferences[key] = value;
    this.updateModifiedDate();
    this._markAsUnsaved();
    this._notifyListeners(UserSettings.CATEGORIES.UI, key, oldValue, value);
  }

  /**
   * Bulk update multiple settings
   * @param {Object} updates - Settings updates
   */
  updateSettings(updates) {
    if (updates.aiSettings) {
      Object.assign(this.aiSettings, updates.aiSettings);
    }
    if (updates.privacySettings) {
      Object.assign(this.privacySettings, updates.privacySettings);
    }
    if (updates.uiPreferences) {
      Object.assign(this.uiPreferences, updates.uiPreferences);
    }
    if (updates.generalSettings) {
      Object.assign(this.generalSettings, updates.generalSettings);
    }
    
    this.updateModifiedDate();
    this._markAsUnsaved();
  }

  /**
   * Reset all settings to defaults
   */
  resetToDefaults() {
    this.aiSettings = JSON.parse(JSON.stringify(UserSettings.DEFAULT_AI_SETTINGS));
    this.privacySettings = JSON.parse(JSON.stringify(UserSettings.DEFAULT_PRIVACY_SETTINGS));
    this.uiPreferences = JSON.parse(JSON.stringify(UserSettings.DEFAULT_UI_PREFERENCES));
    this.generalSettings = JSON.parse(JSON.stringify(UserSettings.DEFAULT_GENERAL_SETTINGS));
    this.updateModifiedDate();
    this._markAsUnsaved();
  }

  /**
   * Reset specific category to defaults
   * @param {string} category - Settings category
   */
  resetCategory(category) {
    switch (category) {
      case UserSettings.CATEGORIES.AI:
        this.aiSettings = JSON.parse(JSON.stringify(UserSettings.DEFAULT_AI_SETTINGS));
        break;
      case UserSettings.CATEGORIES.PRIVACY:
        this.privacySettings = JSON.parse(JSON.stringify(UserSettings.DEFAULT_PRIVACY_SETTINGS));
        break;
      case UserSettings.CATEGORIES.UI:
        this.uiPreferences = JSON.parse(JSON.stringify(UserSettings.DEFAULT_UI_PREFERENCES));
        break;
      case UserSettings.CATEGORIES.GENERAL:
        this.generalSettings = JSON.parse(JSON.stringify(UserSettings.DEFAULT_GENERAL_SETTINGS));
        break;
    }
    this.updateModifiedDate();
    this._markAsUnsaved();
  }

  /**
   * Save settings to Chrome storage
   * @returns {Promise<void>}
   */
  async save() {
    const storageData = { userSettings: this.toStorageFormat() };
    const storageType = this._isLargeSettings() ? 'local' : 'sync';
    
    try {
      await chrome.storage[storageType].set(storageData);
      this._lastSavedState = JSON.stringify(this.toStorageFormat());
      this._unsavedChanges = false;
    } catch (error) {
      throw new Error(`Failed to save settings: ${error.message}`);
    }
  }

  /**
   * Load settings from Chrome storage
   * @returns {Promise<UserSettings>} Settings instance
   */
  static async load() {
    try {
      // Try sync storage first, then local
      let result = await chrome.storage.sync.get('userSettings');
      if (!result.userSettings) {
        result = await chrome.storage.local.get('userSettings');
      }
      
      if (result.userSettings) {
        return UserSettings.fromStorageFormat(result.userSettings);
      } else {
        return new UserSettings();
      }
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error);
      return new UserSettings();
    }
  }

  /**
   * Clear settings from storage
   * @returns {Promise<void>}
   */
  async clear() {
    await Promise.all([
      chrome.storage.sync.remove('userSettings'),
      chrome.storage.local.remove('userSettings')
    ]);
  }

  /**
   * Check if settings are large (need local storage)
   * @returns {boolean} True if large
   * @private
   */
  _isLargeSettings() {
    const json = JSON.stringify(this.toStorageFormat());
    return json.length > 8000; // Chrome sync storage quota consideration
  }

  /**
   * Convert to Chrome Storage format
   * @returns {Object} Storage-compatible object
   */
  toStorageFormat() {
    return {
      id: this.id,
      userId: this.userId,
      aiSettings: this.aiSettings,
      privacySettings: this.privacySettings,
      uiPreferences: this.uiPreferences,
      generalSettings: this.generalSettings,
      version: this.version,
      createdAt: this.createdAt.toISOString(),
      modifiedAt: this.modifiedAt.toISOString()
    };
  }

  /**
   * Create settings from storage data
   * @param {Object} data - Storage data
   * @returns {UserSettings} New settings instance
   */
  static fromStorageFormat(data) {
    return new UserSettings({
      id: data.id,
      userId: data.userId,
      aiSettings: data.aiSettings,
      privacySettings: data.privacySettings,
      uiPreferences: data.uiPreferences,
      generalSettings: data.generalSettings,
      version: data.version,
      createdAt: data.createdAt,
      modifiedAt: data.modifiedAt
    });
  }

  /**
   * Convert to JSON representation
   * @returns {Object} JSON object
   */
  toJSON() {
    return this.toStorageFormat();
  }

  /**
   * Create settings from JSON data
   * @param {Object} json - JSON data
   * @returns {UserSettings} New settings instance
   */
  static fromJSON(json) {
    return new UserSettings(json);
  }

  /**
   * Export settings for backup/sharing
   * @returns {Object} Exportable configuration
   */
  exportSettings() {
    const settings = this.toStorageFormat();
    
    // Remove sensitive data
    delete settings.userId;
    delete settings.id;
    
    return {
      metadata: {
        exportDate: new Date().toISOString(),
        version: this.version,
        source: 'SmartShelf AI Chrome Extension'
      },
      settings: settings
    };
  }

  /**
   * Import settings from exported data
   * @param {Object} importData - Imported settings data
   */
  importSettings(importData) {
    if (!importData || !importData.settings) {
      throw new Error('Invalid import data format');
    }

    const settings = importData.settings;
    
    // Validate imported settings
    const tempSettings = new UserSettings(settings);
    if (!tempSettings.validate()) {
      throw new Error('Invalid settings data');
    }

    // Apply imported settings
    this.updateSettings(settings);
  }

  /**
   * Get exportable categories
   * @returns {string[]} Available categories
   */
  getExportableCategories() {
    return Object.values(UserSettings.CATEGORIES);
  }

  /**
   * Export specific category
   * @param {string} category - Category to export
   * @returns {Object} Exported category data
   */
  exportCategory(category) {
    const categoryMap = {
      [UserSettings.CATEGORIES.AI]: this.aiSettings,
      [UserSettings.CATEGORIES.PRIVACY]: this.privacySettings,
      [UserSettings.CATEGORIES.UI]: this.uiPreferences,
      [UserSettings.CATEGORIES.GENERAL]: this.generalSettings
    };

    return {
      category: category,
      settings: categoryMap[category],
      exportDate: new Date().toISOString()
    };
  }

  /**
   * Migrate settings from older version
   * @param {Object} oldSettings - Old settings data
   * @param {string} fromVersion - Version to migrate from
   * @returns {UserSettings} Migrated settings
   */
  static migrateFromVersion(oldSettings, fromVersion) {
    if (!fromVersion || fromVersion === UserSettings.CURRENT_VERSION || !UserSettings.getSupportedVersions().includes(fromVersion)) {
      throw new Error('Unsupported version for migration');
    }

    // Migration logic for different versions
    let migratedSettings = { ...oldSettings };

    if (fromVersion === '0.9.0') {
      // Migrate from 0.9.0 to 1.0.0
      if (migratedSettings.aiConfig) {
        migratedSettings.aiSettings = {
          ...UserSettings.DEFAULT_AI_SETTINGS,
          autoProcessing: migratedSettings.aiConfig.processing || true
        };
        delete migratedSettings.aiConfig;
      }
    }

    migratedSettings.version = UserSettings.CURRENT_VERSION;
    return new UserSettings(migratedSettings);
  }

  /**
   * Check if settings need migration
   * @param {Object} settings - Settings to check
   * @returns {boolean} True if migration needed
   */
  static needsMigration(settings) {
    if (!settings || !settings.version) return true;
    return settings.version !== UserSettings.CURRENT_VERSION;
  }

  /**
   * Get supported migration versions
   * @returns {string[]} Supported versions
   */
  static getSupportedVersions() {
    return ['0.9.0', '1.0.0'];
  }

  /**
   * Register change listener
   * @param {Function} listener - Change listener function
   */
  onChange(listener) {
    this._changeListeners.push(listener);
  }

  /**
   * Remove change listener
   * @param {Function} listener - Listener to remove
   */
  removeListener(listener) {
    const index = this._changeListeners.indexOf(listener);
    if (index > -1) {
      this._changeListeners.splice(index, 1);
    }
  }

  /**
   * Register category-specific listener
   * @param {string} category - Settings category
   * @param {Function} listener - Change listener
   */
  onCategoryChange(category, listener) {
    if (!this._categoryListeners.has(category)) {
      this._categoryListeners.set(category, []);
    }
    this._categoryListeners.get(category).push(listener);
  }

  /**
   * Notify change listeners
   * @param {string} category - Changed category
   * @param {string} setting - Changed setting
   * @param {*} oldValue - Previous value
   * @param {*} newValue - New value
   * @private
   */
  _notifyListeners(category, setting, oldValue, newValue) {
    const changeEvent = { category, setting, oldValue, newValue };
    
    // Notify general listeners
    this._changeListeners.forEach(listener => listener(changeEvent));
    
    // Notify category-specific listeners
    if (this._categoryListeners.has(category)) {
      this._categoryListeners.get(category).forEach(listener => listener(changeEvent));
    }
  }

  /**
   * Update modification timestamp
   */
  updateModifiedDate() {
    this.modifiedAt = new Date();
  }

  /**
   * Create a deep copy of settings
   * @returns {UserSettings} Cloned settings
   */
  clone() {
    return new UserSettings(JSON.parse(JSON.stringify(this.toStorageFormat())));
  }

  /**
   * Compare with another settings object
   * @param {UserSettings} otherSettings - Settings to compare with
   * @returns {Array} Array of differences
   */
  getDifferences(otherSettings) {
    const differences = [];
    
    // Compare AI settings
    this._compareCategorySettings(this.aiSettings, otherSettings.aiSettings, 
                                 UserSettings.CATEGORIES.AI, differences);
    
    // Add other category comparisons...
    return differences;
  }

  /**
   * Compare category settings
   * @param {Object} current - Current settings
   * @param {Object} other - Other settings
   * @param {string} category - Category name
   * @param {Array} differences - Differences array
   * @private
   */
  _compareCategorySettings(current, other, category, differences) {
    for (const key in current) {
      if (current[key] !== other[key]) {
        differences.push({
          category: category,
          setting: key,
          currentValue: current[key],
          otherValue: other[key]
        });
      }
    }
  }

  /**
   * Check if there are unsaved changes
   * @returns {boolean} True if unsaved changes exist
   */
  hasUnsavedChanges() {
    return this._unsavedChanges;
  }

  /**
   * Mark settings as saved
   */
  markAsSaved() {
    this._unsavedChanges = false;
    this._lastSavedState = JSON.stringify(this.toStorageFormat());
  }

  /**
   * Mark settings as having unsaved changes
   * @private
   */
  _markAsUnsaved() {
    this._unsavedChanges = true;
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserSettings;
} else if (typeof window !== 'undefined') {
  window.UserSettings = UserSettings;
}
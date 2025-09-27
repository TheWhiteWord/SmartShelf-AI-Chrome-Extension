/**
 * @fileoverview TDD Tests for UserSettings Model
 * 
 * CRITICAL: These tests MUST FAIL initially (TDD methodology)
 * Implementation will be created after tests are written and confirmed failing
 * 
 * UserSettings Model Requirements:
 * - User preferences and extension configuration
 * - AI service settings and model preferences  
 * - Privacy and security controls
 * - UI customization options
 * - Chrome Storage integration
 * - Default configuration management
 * - Settings validation and constraints
 * - Import/export functionality
 */

// Mock Chrome Extension APIs
const mockChrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  }
};
global.chrome = mockChrome;

// Mock UserSettings model - will be replaced with actual implementation
const UserSettings = require('../../../extension/shared/models/user-settings');

describe('UserSettings Model - TDD Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Static Properties and Defaults', () => {
    test('should define default AI settings', () => {
      expect(UserSettings.DEFAULT_AI_SETTINGS).toBeDefined();
      expect(UserSettings.DEFAULT_AI_SETTINGS.summarizer).toBeDefined();
      expect(UserSettings.DEFAULT_AI_SETTINGS.categorizer).toBeDefined();
      expect(UserSettings.DEFAULT_AI_SETTINGS.autoProcessing).toBe(true);
      expect(UserSettings.DEFAULT_AI_SETTINGS.confidenceThreshold).toBe(0.7);
    });

    test('should define default privacy settings', () => {
      expect(UserSettings.DEFAULT_PRIVACY_SETTINGS).toBeDefined();
      expect(UserSettings.DEFAULT_PRIVACY_SETTINGS.enableExternalAPI).toBe(false);
      expect(UserSettings.DEFAULT_PRIVACY_SETTINGS.shareAnonymousUsage).toBe(false);
      expect(UserSettings.DEFAULT_PRIVACY_SETTINGS.enableConnectionDiscovery).toBe(true);
    });

    test('should define default UI preferences', () => {
      expect(UserSettings.DEFAULT_UI_PREFERENCES).toBeDefined();
      expect(UserSettings.DEFAULT_UI_PREFERENCES.theme).toBe('system');
      expect(UserSettings.DEFAULT_UI_PREFERENCES.density).toBe('comfortable');
      expect(UserSettings.DEFAULT_UI_PREFERENCES.showAdvancedOptions).toBe(false);
    });

    test('should define storage type constants', () => {
      expect(UserSettings.STORAGE_TYPES).toBeDefined();
      expect(UserSettings.STORAGE_TYPES.LOCAL).toBe('local');
      expect(UserSettings.STORAGE_TYPES.SYNC).toBe('sync');
    });

    test('should define settings categories', () => {
      expect(UserSettings.CATEGORIES).toBeDefined();
      expect(UserSettings.CATEGORIES.AI).toBe('ai');
      expect(UserSettings.CATEGORIES.PRIVACY).toBe('privacy');
      expect(UserSettings.CATEGORIES.UI).toBe('ui');
      expect(UserSettings.CATEGORIES.GENERAL).toBe('general');
    });
  });

  describe('Constructor', () => {
    test('should create settings with default values', () => {
      const settings = new UserSettings();

      expect(settings.id).toBeDefined();
      expect(settings.userId).toBeNull();
      expect(settings.aiSettings).toEqual(UserSettings.DEFAULT_AI_SETTINGS);
      expect(settings.privacySettings).toEqual(UserSettings.DEFAULT_PRIVACY_SETTINGS);
      expect(settings.uiPreferences).toEqual(UserSettings.DEFAULT_UI_PREFERENCES);
      expect(settings.createdAt).toBeInstanceOf(Date);
      expect(settings.modifiedAt).toBeInstanceOf(Date);
      expect(settings.version).toBe('1.0.0');
    });

    test('should create settings with custom values', () => {
      const customSettings = {
        userId: 'user123',
        aiSettings: {
          autoProcessing: false,
          confidenceThreshold: 0.8
        },
        privacySettings: {
          enableExternalAPI: true
        },
        uiPreferences: {
          theme: 'dark'
        }
      };

      const settings = new UserSettings(customSettings);

      expect(settings.userId).toBe('user123');
      expect(settings.aiSettings.autoProcessing).toBe(false);
      expect(settings.aiSettings.confidenceThreshold).toBe(0.8);
      expect(settings.privacySettings.enableExternalAPI).toBe(true);
      expect(settings.uiPreferences.theme).toBe('dark');
    });

    test('should validate AI settings on construction', () => {
      expect(() => {
        new UserSettings({
          aiSettings: {
            confidenceThreshold: 1.5 // Invalid - should be 0.0-1.0
          }
        });
      }).toThrow('Invalid confidence threshold. Must be between 0.0 and 1.0');
    });

    test('should validate UI preferences on construction', () => {
      expect(() => {
        new UserSettings({
          uiPreferences: {
            theme: 'invalid-theme'
          }
        });
      }).toThrow('Invalid theme. Must be one of: light, dark, system');
    });

    test('should generate UUID for id', () => {
      const settings = new UserSettings();
      expect(settings.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should merge custom settings with defaults', () => {
      const settings = new UserSettings({
        aiSettings: {
          confidenceThreshold: 0.9
        }
      });

      // Should have custom value
      expect(settings.aiSettings.confidenceThreshold).toBe(0.9);
      // Should retain defaults for other values
      expect(settings.aiSettings.autoProcessing).toBe(true);
      expect(settings.aiSettings.summarizer).toEqual(UserSettings.DEFAULT_AI_SETTINGS.summarizer);
    });
  });

  describe('Validation Methods', () => {
    test('validate() should return true for valid settings', () => {
      const settings = new UserSettings({
        aiSettings: {
          confidenceThreshold: 0.8,
          autoProcessing: true
        },
        uiPreferences: {
          theme: 'dark',
          density: 'compact'
        }
      });

      expect(settings.validate()).toBe(true);
    });

    test('validate() should return false for invalid settings', () => {
      const settings = new UserSettings();
      settings.aiSettings.confidenceThreshold = 2.0; // Invalid

      expect(settings.validate()).toBe(false);
    });

    test('validateAISettings() should validate AI configuration', () => {
      const settings = new UserSettings();

      expect(settings.validateAISettings({
        confidenceThreshold: 0.7,
        autoProcessing: true,
        summarizer: { enabled: true }
      })).toBe(true);

      expect(settings.validateAISettings({
        confidenceThreshold: 1.5 // Invalid
      })).toBe(false);

      expect(settings.validateAISettings({
        autoProcessing: 'invalid' // Should be boolean
      })).toBe(false);
    });

    test('validatePrivacySettings() should validate privacy configuration', () => {
      const settings = new UserSettings();

      expect(settings.validatePrivacySettings({
        enableExternalAPI: false,
        shareAnonymousUsage: true
      })).toBe(true);

      expect(settings.validatePrivacySettings({
        enableExternalAPI: 'invalid' // Should be boolean
      })).toBe(false);
    });

    test('validateUIPreferences() should validate UI configuration', () => {
      const settings = new UserSettings();

      expect(settings.validateUIPreferences({
        theme: 'dark',
        density: 'comfortable',
        showAdvancedOptions: false
      })).toBe(true);

      expect(settings.validateUIPreferences({
        theme: 'invalid-theme'
      })).toBe(false);

      expect(settings.validateUIPreferences({
        density: 'invalid-density'
      })).toBe(false);
    });
  });

  describe('Settings Management', () => {
    test('updateAISetting() should update individual AI setting', () => {
      const settings = new UserSettings();
      const originalModified = settings.modifiedAt;
      
      // Small delay to ensure timestamp difference
      setTimeout(() => {
        settings.updateAISetting('confidenceThreshold', 0.9);
        
        expect(settings.aiSettings.confidenceThreshold).toBe(0.9);
        expect(settings.modifiedAt.getTime()).toBeGreaterThan(originalModified.getTime());
      }, 10);
    });

    test('updateAISetting() should validate setting value', () => {
      const settings = new UserSettings();
      
      expect(() => {
        settings.updateAISetting('confidenceThreshold', 1.5);
      }).toThrow('Invalid confidence threshold value');
    });

    test('updatePrivacySetting() should update individual privacy setting', () => {
      const settings = new UserSettings();
      
      settings.updatePrivacySetting('enableExternalAPI', true);
      
      expect(settings.privacySettings.enableExternalAPI).toBe(true);
    });

    test('updateUIPreference() should update individual UI preference', () => {
      const settings = new UserSettings();
      
      settings.updateUIPreference('theme', 'dark');
      
      expect(settings.uiPreferences.theme).toBe('dark');
    });

    test('updateSettings() should bulk update multiple settings', () => {
      const settings = new UserSettings();
      
      settings.updateSettings({
        aiSettings: {
          autoProcessing: false
        },
        uiPreferences: {
          theme: 'light'
        }
      });
      
      expect(settings.aiSettings.autoProcessing).toBe(false);
      expect(settings.uiPreferences.theme).toBe('light');
    });

    test('resetToDefaults() should restore default settings', () => {
      const settings = new UserSettings({
        aiSettings: { autoProcessing: false },
        uiPreferences: { theme: 'dark' }
      });
      
      settings.resetToDefaults();
      
      expect(settings.aiSettings).toEqual(UserSettings.DEFAULT_AI_SETTINGS);
      expect(settings.uiPreferences).toEqual(UserSettings.DEFAULT_UI_PREFERENCES);
    });

    test('resetCategory() should reset specific category to defaults', () => {
      const settings = new UserSettings({
        aiSettings: { autoProcessing: false },
        uiPreferences: { theme: 'dark' }
      });
      
      settings.resetCategory(UserSettings.CATEGORIES.AI);
      
      expect(settings.aiSettings).toEqual(UserSettings.DEFAULT_AI_SETTINGS);
      expect(settings.uiPreferences.theme).toBe('dark'); // Should remain unchanged
    });
  });

  describe('Chrome Storage Integration', () => {
    test('save() should save settings to Chrome storage', async () => {
      const settings = new UserSettings({ userId: 'user123' });
      
      mockChrome.storage.sync.set.mockResolvedValue();
      
      await settings.save();
      
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        userSettings: settings.toStorageFormat()
      });
    });

    test('save() should use local storage for large settings', async () => {
      const settings = new UserSettings();
      settings._isLargeSettings = jest.fn().mockReturnValue(true);
      
      mockChrome.storage.local.set.mockResolvedValue();
      
      await settings.save();
      
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('load() should load settings from Chrome storage', async () => {
      const storageData = {
        userSettings: {
          id: 'test-id',
          userId: 'user123',
          aiSettings: { autoProcessing: false },
          version: '1.0.0'
        }
      };
      
      mockChrome.storage.sync.get.mockResolvedValue(storageData);
      
      const settings = await UserSettings.load();
      
      expect(settings).toBeInstanceOf(UserSettings);
      expect(settings.userId).toBe('user123');
      expect(settings.aiSettings.autoProcessing).toBe(false);
    });

    test('load() should return default settings if none found', async () => {
      mockChrome.storage.sync.get.mockResolvedValue({});
      
      const settings = await UserSettings.load();
      
      expect(settings).toBeInstanceOf(UserSettings);
      expect(settings.aiSettings).toEqual(UserSettings.DEFAULT_AI_SETTINGS);
    });

    test('clear() should remove settings from storage', async () => {
      const settings = new UserSettings();
      
      mockChrome.storage.sync.remove.mockResolvedValue();
      mockChrome.storage.local.remove.mockResolvedValue();
      
      await settings.clear();
      
      expect(mockChrome.storage.sync.remove).toHaveBeenCalledWith('userSettings');
      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith('userSettings');
    });
  });

  describe('Serialization Methods', () => {
    test('toStorageFormat() should return storage-compatible object', () => {
      const settings = new UserSettings({
        userId: 'user123',
        aiSettings: { autoProcessing: false }
      });

      const storageFormat = settings.toStorageFormat();

      expect(storageFormat).toEqual({
        id: settings.id,
        userId: 'user123',
        aiSettings: settings.aiSettings,
        privacySettings: settings.privacySettings,
        uiPreferences: settings.uiPreferences,
        generalSettings: settings.generalSettings,
        version: '1.0.0',
        createdAt: settings.createdAt.toISOString(),
        modifiedAt: settings.modifiedAt.toISOString()
      });
    });

    test('fromStorageFormat() should create settings from storage data', () => {
      const storageData = {
        id: 'test-id',
        userId: 'user123',
        aiSettings: { autoProcessing: false },
        privacySettings: { enableExternalAPI: true },
        version: '1.0.0',
        createdAt: '2025-01-01T00:00:00.000Z',
        modifiedAt: '2025-01-01T01:00:00.000Z'
      };

      const settings = UserSettings.fromStorageFormat(storageData);

      expect(settings.id).toBe('test-id');
      expect(settings.userId).toBe('user123');
      expect(settings.aiSettings.autoProcessing).toBe(false);
      expect(settings.privacySettings.enableExternalAPI).toBe(true);
      expect(settings.createdAt).toBeInstanceOf(Date);
      expect(settings.modifiedAt).toBeInstanceOf(Date);
    });

    test('toJSON() should return JSON representation', () => {
      const settings = new UserSettings({ userId: 'user123' });

      const json = settings.toJSON();

      expect(json.userId).toBe('user123');
      expect(json.aiSettings).toBeDefined();
      expect(json.privacySettings).toBeDefined();
      expect(json.version).toBe('1.0.0');
    });

    test('fromJSON() should create settings from JSON', () => {
      const jsonData = {
        id: 'test-id',
        userId: 'user123',
        aiSettings: { autoProcessing: false },
        version: '1.0.0'
      };

      const settings = UserSettings.fromJSON(jsonData);

      expect(settings.userId).toBe('user123');
      expect(settings.aiSettings.autoProcessing).toBe(false);
    });
  });

  describe('Import/Export Functionality', () => {
    test('exportSettings() should return exportable configuration', () => {
      const settings = new UserSettings({
        userId: 'user123',
        aiSettings: { autoProcessing: false },
        uiPreferences: { theme: 'dark' }
      });

      const exported = settings.exportSettings();

      expect(exported.metadata).toBeDefined();
      expect(exported.metadata.exportDate).toBeDefined();
      expect(exported.metadata.version).toBe('1.0.0');
      expect(exported.settings.aiSettings).toEqual(settings.aiSettings);
      expect(exported.settings.uiPreferences).toEqual(settings.uiPreferences);
      // Should not include sensitive data like userId
      expect(exported.settings.userId).toBeUndefined();
    });

    test('importSettings() should import configuration', () => {
      const settings = new UserSettings();
      
      const importData = {
        metadata: { version: '1.0.0' },
        settings: {
          aiSettings: { autoProcessing: false },
          uiPreferences: { theme: 'dark' }
        }
      };

      settings.importSettings(importData);

      expect(settings.aiSettings.autoProcessing).toBe(false);
      expect(settings.uiPreferences.theme).toBe('dark');
    });

    test('importSettings() should validate imported data', () => {
      const settings = new UserSettings();
      
      const invalidImport = {
        settings: {
          aiSettings: { confidenceThreshold: 2.0 } // Invalid
        }
      };

      expect(() => {
        settings.importSettings(invalidImport);
      }).toThrow(); // Accept any validation error
    });

    test('getExportableCategories() should return available export categories', () => {
      const settings = new UserSettings();
      
      const categories = settings.getExportableCategories();
      
      expect(categories).toContain(UserSettings.CATEGORIES.AI);
      expect(categories).toContain(UserSettings.CATEGORIES.UI);
      expect(categories).toContain(UserSettings.CATEGORIES.PRIVACY);
      expect(categories).not.toContain('sensitive'); // Should not include sensitive categories
    });

    test('exportCategory() should export specific category', () => {
      const settings = new UserSettings({
        aiSettings: { autoProcessing: false },
        uiPreferences: { theme: 'dark' }
      });

      const exported = settings.exportCategory(UserSettings.CATEGORIES.AI);

      expect(exported.category).toBe(UserSettings.CATEGORIES.AI);
      expect(exported.settings).toEqual(settings.aiSettings);
    });
  });

  describe('Settings Migration', () => {
    test('migrateFromVersion() should migrate settings between versions', () => {
      const oldSettings = {
        version: '0.9.0',
        aiConfig: { // Old property name
          processing: true
        }
      };

      const settings = UserSettings.migrateFromVersion(oldSettings, '0.9.0');

      expect(settings.version).toBe('1.0.0');
      expect(settings.aiSettings.autoProcessing).toBe(true); // Migrated property
    });

    test('needsMigration() should detect if migration is needed', () => {
      expect(UserSettings.needsMigration({ version: '0.9.0' })).toBe(true);
      expect(UserSettings.needsMigration({ version: '1.0.0' })).toBe(false);
      expect(UserSettings.needsMigration({})).toBe(true); // No version = needs migration
    });

    test('getSupportedVersions() should return supported migration versions', () => {
      const versions = UserSettings.getSupportedVersions();
      
      expect(Array.isArray(versions)).toBe(true);
      expect(versions).toContain('1.0.0');
      expect(versions.length).toBeGreaterThan(0);
    });
  });

  describe('Event Handling', () => {
    test('onChange() should register change listener', () => {
      const settings = new UserSettings();
      const listener = jest.fn();
      
      settings.onChange(listener);
      settings.updateAISetting('autoProcessing', false);
      
      expect(listener).toHaveBeenCalledWith({
        category: UserSettings.CATEGORIES.AI,
        setting: 'autoProcessing',
        oldValue: true,
        newValue: false
      });
    });

    test('removeListener() should unregister listener', () => {
      const settings = new UserSettings();
      const listener = jest.fn();
      
      settings.onChange(listener);
      settings.removeListener(listener);
      settings.updateAISetting('autoProcessing', false);
      
      expect(listener).not.toHaveBeenCalled();
    });

    test('onCategoryChange() should register category-specific listener', () => {
      const settings = new UserSettings();
      const listener = jest.fn();
      
      settings.onCategoryChange(UserSettings.CATEGORIES.AI, listener);
      settings.updateAISetting('autoProcessing', false);
      settings.updateUIPreference('theme', 'dark');
      
      expect(listener).toHaveBeenCalledTimes(1); // Only AI change
    });
  });

  describe('Utility Methods', () => {
    test('updateModifiedDate() should update modification timestamp', () => {
      const settings = new UserSettings();
      const originalModified = settings.modifiedAt;

      setTimeout(() => {
        settings.updateModifiedDate();
        expect(settings.modifiedAt.getTime()).toBeGreaterThan(originalModified.getTime());
      }, 10);
    });

    test('clone() should create a deep copy', () => {
      const settings = new UserSettings({
        userId: 'user123',
        aiSettings: { autoProcessing: false }
      });

      const cloned = settings.clone();

      expect(cloned).not.toBe(settings);
      expect(cloned.userId).toBe('user123');
      expect(cloned.aiSettings.autoProcessing).toBe(false);
      
      // Verify deep copy
      cloned.aiSettings.autoProcessing = true;
      expect(settings.aiSettings.autoProcessing).toBe(false);
    });

    test('getDifferences() should compare with another settings object', () => {
      const settings1 = new UserSettings({ aiSettings: { autoProcessing: true } });
      const settings2 = new UserSettings({ aiSettings: { autoProcessing: false } });

      const differences = settings1.getDifferences(settings2);

      expect(differences.length).toBeGreaterThan(0);
      const autoProcessingDiff = differences.find(d => d.setting === 'autoProcessing');
      expect(autoProcessingDiff).toEqual({
        category: UserSettings.CATEGORIES.AI,
        setting: 'autoProcessing',
        currentValue: true,
        otherValue: false
      });
    });

    test('hasUnsavedChanges() should detect unsaved modifications', () => {
      const settings = new UserSettings();
      
      expect(settings.hasUnsavedChanges()).toBe(false);
      
      settings.updateAISetting('autoProcessing', false);
      expect(settings.hasUnsavedChanges()).toBe(true);
      
      settings.markAsSaved();
      expect(settings.hasUnsavedChanges()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid constructor data gracefully', () => {
      expect(() => {
        new UserSettings({ aiSettings: null });
      }).toThrow('Invalid AI settings');
    });

    test('should handle storage errors during save', async () => {
      const settings = new UserSettings();
      
      mockChrome.storage.sync.set.mockRejectedValue(new Error('Storage error'));
      
      await expect(settings.save()).rejects.toThrow('Storage error');
    });

    test('should handle malformed import data', () => {
      const settings = new UserSettings();
      
      expect(() => {
        settings.importSettings({ invalid: 'data' });
      }).toThrow('Invalid import data format');
    });

    test('should handle version compatibility issues', () => {
      expect(() => {
        UserSettings.migrateFromVersion({ version: '2.0.0' }, '2.0.0');
      }).toThrow('Unsupported version for migration');
    });
  });
});
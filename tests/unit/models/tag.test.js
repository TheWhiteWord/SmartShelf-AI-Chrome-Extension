/**
 * @fileoverview TDD Tests for Tag Model
 * 
 * CRITICAL: These tests MUST FAIL initially (TDD methodology)
 * Implementation will be created after tests are written and confirmed failing
 * 
 * Tag Model Requirements:
 * - AI-generated tags with confidence scores
 * - Manual tags with user attribution
 * - Tag validation and normalization
 * - Usage statistics and popularity tracking
 * - Color coding and categorization
 * - Chrome Storage integration
 * - Search indexing and filtering
 * - Business logic for tag management
 */

// Mock Chrome Extension APIs
const mockChrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  }
};
global.chrome = mockChrome;

// Mock Tag model - will be replaced with actual implementation
const Tag = require('../../../extension/shared/models/tag');

describe('Tag Model - TDD Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Static Properties', () => {
    test('should define tag types constants', () => {
      expect(Tag.TYPES).toBeDefined();
      expect(Tag.TYPES.AI_GENERATED).toBe('ai_generated');
      expect(Tag.TYPES.MANUAL).toBe('manual');
      expect(Tag.TYPES.SYSTEM).toBe('system');
    });

    test('should define confidence thresholds', () => {
      expect(Tag.MIN_CONFIDENCE).toBe(0.0);
      expect(Tag.MAX_CONFIDENCE).toBe(1.0);
      expect(Tag.HIGH_CONFIDENCE_THRESHOLD).toBe(0.8);
      expect(Tag.MEDIUM_CONFIDENCE_THRESHOLD).toBe(0.5);
    });

    test('should define validation limits', () => {
      expect(Tag.MAX_TAG_LENGTH).toBe(50);
      expect(Tag.MIN_TAG_LENGTH).toBe(2);
      expect(Tag.MAX_TAGS_PER_ITEM).toBe(20);
    });

    test('should define default colors for tag types', () => {
      expect(Tag.DEFAULT_COLORS).toBeDefined();
      expect(Tag.DEFAULT_COLORS[Tag.TYPES.AI_GENERATED]).toBe('#3498db');
      expect(Tag.DEFAULT_COLORS[Tag.TYPES.MANUAL]).toBe('#2ecc71');
      expect(Tag.DEFAULT_COLORS[Tag.TYPES.SYSTEM]).toBe('#95a5a6');
    });
  });

  describe('Constructor', () => {
    test('should create AI-generated tag with confidence score', () => {
      const tag = new Tag({
        name: 'machine-learning',
        type: Tag.TYPES.AI_GENERATED,
        confidence: 0.85,
        source: 'Chrome AI Categorizer'
      });

      expect(tag.id).toBeDefined();
      expect(tag.name).toBe('machine-learning');
      expect(tag.type).toBe(Tag.TYPES.AI_GENERATED);
      expect(tag.confidence).toBe(0.85);
      expect(tag.source).toBe('Chrome AI Categorizer');
      expect(tag.usageCount).toBe(0);
      expect(tag.createdAt).toBeInstanceOf(Date);
      expect(tag.modifiedAt).toBeInstanceOf(Date);
    });

    test('should create manual tag without confidence', () => {
      const tag = new Tag({
        name: 'favorite',
        type: Tag.TYPES.MANUAL,
        userId: 'user123'
      });

      expect(tag.name).toBe('favorite');
      expect(tag.type).toBe(Tag.TYPES.MANUAL);
      expect(tag.confidence).toBe(1.0); // Manual tags get full confidence
      expect(tag.userId).toBe('user123');
    });

    test('should create system tag', () => {
      const tag = new Tag({
        name: 'archived',
        type: Tag.TYPES.SYSTEM
      });

      expect(tag.name).toBe('archived');
      expect(tag.type).toBe(Tag.TYPES.SYSTEM);
      expect(tag.confidence).toBe(1.0); // System tags get full confidence
    });

    test('should validate required name property', () => {
      expect(() => {
        new Tag({});
      }).toThrow('Tag name is required');

      expect(() => {
        new Tag({ name: '' });
      }).toThrow('Tag name cannot be empty');
    });

    test('should validate tag name length', () => {
      expect(() => {
        new Tag({ name: 'a' }); // Too short
      }).toThrow('Tag name must be between 2 and 50 characters');

      expect(() => {
        new Tag({ name: 'a'.repeat(51) }); // Too long
      }).toThrow('Tag name must be between 2 and 50 characters');
    });

    test('should validate confidence score range', () => {
      expect(() => {
        new Tag({ 
          name: 'test', 
          confidence: 1.5 
        });
      }).toThrow('Confidence must be between 0.0 and 1.0');

      expect(() => {
        new Tag({ 
          name: 'test', 
          confidence: -0.1 
        });
      }).toThrow('Confidence must be between 0.0 and 1.0');
    });

    test('should normalize tag names', () => {
      const tag = new Tag({
        name: '  Machine Learning  ',
        type: Tag.TYPES.MANUAL
      });

      expect(tag.name).toBe('machine-learning'); // Normalized to lowercase with hyphens
    });

    test('should generate UUID for id', () => {
      const tag = new Tag({ name: 'test-tag' });
      expect(tag.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('Validation Methods', () => {
    test('validate() should return true for valid tag', () => {
      const tag = new Tag({
        name: 'javascript',
        type: Tag.TYPES.AI_GENERATED,
        confidence: 0.9
      });

      expect(tag.validate()).toBe(true);
    });

    test('validate() should return false for invalid tag', () => {
      const tag = new Tag({ name: 'test' });
      tag.name = ''; // Make invalid

      expect(tag.validate()).toBe(false);
    });

    test('validateName() should validate tag name rules', () => {
      const tag = new Tag({ name: 'test' });

      expect(tag.validateName('valid-tag')).toBe(true);
      expect(tag.validateName('another_valid_tag')).toBe(true);
      expect(tag.validateName('')).toBe(false);
      expect(tag.validateName('a')).toBe(false); // Too short
      expect(tag.validateName('a'.repeat(51))).toBe(false); // Too long
      expect(tag.validateName('invalid tag!')).toBe(false); // Invalid characters
    });

    test('validateType() should validate tag type', () => {
      const tag = new Tag({ name: 'test' });

      expect(tag.validateType(Tag.TYPES.AI_GENERATED)).toBe(true);
      expect(tag.validateType(Tag.TYPES.MANUAL)).toBe(true);
      expect(tag.validateType(Tag.TYPES.SYSTEM)).toBe(true);
      expect(tag.validateType('invalid')).toBe(false);
    });

    test('validateConfidence() should validate confidence range', () => {
      const tag = new Tag({ name: 'test' });

      expect(tag.validateConfidence(0.0)).toBe(true);
      expect(tag.validateConfidence(0.5)).toBe(true);
      expect(tag.validateConfidence(1.0)).toBe(true);
      expect(tag.validateConfidence(-0.1)).toBe(false);
      expect(tag.validateConfidence(1.1)).toBe(false);
    });
  });

  describe('Tag Normalization', () => {
    test('normalizeName() should convert to lowercase kebab-case', () => {
      expect(Tag.normalizeName('Machine Learning')).toBe('machine-learning');
      expect(Tag.normalizeName('  AI & Robotics  ')).toBe('ai-robotics');
      expect(Tag.normalizeName('JavaScript')).toBe('javascript');
      expect(Tag.normalizeName('Node.js')).toBe('nodejs');
    });

    test('normalizeName() should remove invalid characters', () => {
      expect(Tag.normalizeName('test@tag!')).toBe('testtag');
      expect(Tag.normalizeName('c++')).toBe('c');
      expect(Tag.normalizeName('tag#1')).toBe('tag1');
    });

    test('normalizeName() should handle edge cases', () => {
      expect(Tag.normalizeName('')).toBe('');
      expect(Tag.normalizeName('   ')).toBe('');
      expect(Tag.normalizeName('123')).toBe('123');
    });
  });

  describe('Confidence Assessment', () => {
    test('getConfidenceLevel() should return confidence categories', () => {
      const highConfidenceTag = new Tag({ 
        name: 'test', 
        confidence: 0.9 
      });
      const mediumConfidenceTag = new Tag({ 
        name: 'test', 
        confidence: 0.6 
      });
      const lowConfidenceTag = new Tag({ 
        name: 'test', 
        confidence: 0.3 
      });

      expect(highConfidenceTag.getConfidenceLevel()).toBe('high');
      expect(mediumConfidenceTag.getConfidenceLevel()).toBe('medium');
      expect(lowConfidenceTag.getConfidenceLevel()).toBe('low');
    });

    test('isHighConfidence() should check high confidence threshold', () => {
      const highTag = new Tag({ name: 'test', confidence: 0.85 });
      const lowTag = new Tag({ name: 'test', confidence: 0.7 });

      expect(highTag.isHighConfidence()).toBe(true);
      expect(lowTag.isHighConfidence()).toBe(false);
    });

    test('adjustConfidence() should update confidence with validation', () => {
      const tag = new Tag({ name: 'test', confidence: 0.5 });

      tag.adjustConfidence(0.8);
      expect(tag.confidence).toBe(0.8);

      expect(() => {
        tag.adjustConfidence(1.5);
      }).toThrow('Confidence must be between 0.0 and 1.0');
    });
  });

  describe('Usage Tracking', () => {
    test('incrementUsage() should increase usage count', () => {
      const tag = new Tag({ name: 'popular-tag' });

      tag.incrementUsage();
      expect(tag.usageCount).toBe(1);

      tag.incrementUsage(5);
      expect(tag.usageCount).toBe(6);
    });

    test('decrementUsage() should decrease usage count', () => {
      const tag = new Tag({ name: 'test-tag' });
      tag.usageCount = 10;

      tag.decrementUsage();
      expect(tag.usageCount).toBe(9);

      tag.decrementUsage(3);
      expect(tag.usageCount).toBe(6);

      // Should not go below 0
      tag.decrementUsage(10);
      expect(tag.usageCount).toBe(0);
    });

    test('getPopularityScore() should calculate popularity based on usage', () => {
      const tag = new Tag({ name: 'test' });
      tag.usageCount = 100;

      // Mock global usage statistics
      tag.totalGlobalUsage = 1000;
      
      const popularity = tag.getPopularityScore();
      expect(popularity).toBe(0.1); // 100/1000
    });

    test('isPopular() should determine if tag is popular', () => {
      const popularTag = new Tag({ name: 'popular' });
      popularTag.usageCount = 50;

      const unpopularTag = new Tag({ name: 'rare' });
      unpopularTag.usageCount = 1;

      expect(popularTag.isPopular()).toBe(true);
      expect(unpopularTag.isPopular()).toBe(false);
    });
  });

  describe('Color and Visual Properties', () => {
    test('getColor() should return type-specific color', () => {
      const aiTag = new Tag({ name: 'ai-tag', type: Tag.TYPES.AI_GENERATED });
      const manualTag = new Tag({ name: 'manual-tag', type: Tag.TYPES.MANUAL });
      const systemTag = new Tag({ name: 'system-tag', type: Tag.TYPES.SYSTEM });

      expect(aiTag.getColor()).toBe('#3498db');
      expect(manualTag.getColor()).toBe('#2ecc71');
      expect(systemTag.getColor()).toBe('#95a5a6');
    });

    test('setCustomColor() should allow custom color override', () => {
      const tag = new Tag({ name: 'custom-tag' });
      
      tag.setCustomColor('#e74c3c');
      expect(tag.getColor()).toBe('#e74c3c');
    });

    test('getDisplayName() should format name for display', () => {
      const tag = new Tag({ name: 'machine-learning' });
      
      expect(tag.getDisplayName()).toBe('Machine Learning');
    });

    test('getTypeIcon() should return icon for tag type', () => {
      const aiTag = new Tag({ name: 'ai', type: Tag.TYPES.AI_GENERATED });
      const manualTag = new Tag({ name: 'manual', type: Tag.TYPES.MANUAL });
      const systemTag = new Tag({ name: 'system', type: Tag.TYPES.SYSTEM });

      expect(aiTag.getTypeIcon()).toBe('🤖');
      expect(manualTag.getTypeIcon()).toBe('👤');
      expect(systemTag.getTypeIcon()).toBe('⚙️');
    });
  });

  describe('Chrome Storage Integration', () => {
    test('toStorageFormat() should return storage-compatible object', () => {
      const tag = new Tag({
        name: 'javascript',
        type: Tag.TYPES.AI_GENERATED,
        confidence: 0.9,
        source: 'Chrome AI'
      });

      const storageFormat = tag.toStorageFormat();

      expect(storageFormat).toEqual({
        id: tag.id,
        name: 'javascript',
        type: Tag.TYPES.AI_GENERATED,
        confidence: 0.9,
        source: 'Chrome AI',
        usageCount: 0,
        customColor: null,
        userId: null,
        relatedTags: [],
        createdAt: tag.createdAt.toISOString(),
        modifiedAt: tag.modifiedAt.toISOString()
      });
    });

    test('fromStorageFormat() should create tag from storage data', () => {
      const storageData = {
        id: 'test-id',
        name: 'python',
        type: Tag.TYPES.MANUAL,
        confidence: 1.0,
        usageCount: 5,
        customColor: '#e74c3c',
        userId: 'user123',
        createdAt: '2025-01-01T00:00:00.000Z',
        modifiedAt: '2025-01-01T01:00:00.000Z'
      };

      const tag = Tag.fromStorageFormat(storageData);

      expect(tag.id).toBe('test-id');
      expect(tag.name).toBe('python');
      expect(tag.type).toBe(Tag.TYPES.MANUAL);
      expect(tag.confidence).toBe(1.0);
      expect(tag.usageCount).toBe(5);
      expect(tag.customColor).toBe('#e74c3c');
      expect(tag.userId).toBe('user123');
      expect(tag.createdAt).toBeInstanceOf(Date);
      expect(tag.modifiedAt).toBeInstanceOf(Date);
    });
  });

  describe('Serialization Methods', () => {
    test('toJSON() should return JSON representation', () => {
      const tag = new Tag({
        name: 'react',
        type: Tag.TYPES.AI_GENERATED,
        confidence: 0.85
      });

      const json = tag.toJSON();

      expect(json.name).toBe('react');
      expect(json.type).toBe(Tag.TYPES.AI_GENERATED);
      expect(json.confidence).toBe(0.85);
      expect(json.id).toBe(tag.id);
    });

    test('fromJSON() should create tag from JSON', () => {
      const jsonData = {
        id: 'test-id',
        name: 'vue',
        type: Tag.TYPES.MANUAL,
        confidence: 1.0,
        usageCount: 3,
        createdAt: '2025-01-01T00:00:00.000Z',
        modifiedAt: '2025-01-01T00:00:00.000Z'
      };

      const tag = Tag.fromJSON(jsonData);

      expect(tag.name).toBe('vue');
      expect(tag.type).toBe(Tag.TYPES.MANUAL);
      expect(tag.confidence).toBe(1.0);
      expect(tag.usageCount).toBe(3);
    });
  });

  describe('Search and Filtering', () => {
    test('toSearchIndex() should return search indexable data', () => {
      const tag = new Tag({
        name: 'artificial-intelligence',
        type: Tag.TYPES.AI_GENERATED,
        confidence: 0.9
      });

      const searchIndex = tag.toSearchIndex();

      expect(searchIndex.id).toBe(tag.id);
      expect(searchIndex.name).toBe('artificial-intelligence');
      expect(searchIndex.displayName).toBe('Artificial Intelligence');
      expect(searchIndex.searchTerms).toContain('artificial');
      expect(searchIndex.searchTerms).toContain('intelligence');
      expect(searchIndex.type).toBe('tag');
      expect(searchIndex.confidence).toBe(0.9);
      expect(searchIndex.usageCount).toBe(0);
    });

    test('matchesSearchQuery() should match search terms', () => {
      const tag = new Tag({ name: 'machine-learning' });

      expect(tag.matchesSearchQuery('machine')).toBe(true);
      expect(tag.matchesSearchQuery('learning')).toBe(true);
      expect(tag.matchesSearchQuery('ml')).toBe(false);
      expect(tag.matchesSearchQuery('unrelated')).toBe(false);
    });

    test('getSimilarTags() should find similar tag names', () => {
      const tag = new Tag({ name: 'javascript' });
      
      const similarTags = tag.getSimilarTags(['java', 'typescript', 'python', 'rust']);
      
      expect(similarTags).toContain('java');
      expect(similarTags).toContain('typescript');
      expect(similarTags).not.toContain('python');
      expect(similarTags).not.toContain('rust');
    });
  });

  describe('Tag Relationships', () => {
    test('addRelatedTag() should create tag relationships', () => {
      const jsTag = new Tag({ name: 'javascript' });
      const reactTag = new Tag({ name: 'react' });
      
      jsTag.addRelatedTag(reactTag.id, 0.8);
      
      expect(jsTag.relatedTags).toHaveLength(1);
      expect(jsTag.relatedTags[0].tagId).toBe(reactTag.id);
      expect(jsTag.relatedTags[0].strength).toBe(0.8);
    });

    test('removeRelatedTag() should remove tag relationships', () => {
      const tag = new Tag({ name: 'test' });
      const relatedTag = new Tag({ name: 'related' });
      
      tag.addRelatedTag(relatedTag.id, 0.7);
      tag.removeRelatedTag(relatedTag.id);
      
      expect(tag.relatedTags).toHaveLength(0);
    });

    test('getRelatedTagStrength() should return relationship strength', () => {
      const tag = new Tag({ name: 'python' });
      const djangoTag = new Tag({ name: 'django' });
      
      tag.addRelatedTag(djangoTag.id, 0.9);
      
      expect(tag.getRelatedTagStrength(djangoTag.id)).toBe(0.9);
      expect(tag.getRelatedTagStrength('nonexistent')).toBe(0.0);
    });
  });

  describe('Update and Modification', () => {
    test('updateModifiedDate() should update modification timestamp', () => {
      const tag = new Tag({ name: 'test' });
      const originalModified = tag.modifiedAt;

      setTimeout(() => {
        tag.updateModifiedDate();
        expect(tag.modifiedAt.getTime()).toBeGreaterThan(originalModified.getTime());
      }, 10);
    });

    test('update() should update tag properties', () => {
      const tag = new Tag({
        name: 'original',
        confidence: 0.5
      });

      tag.update({
        name: 'updated',
        confidence: 0.8,
        customColor: '#e74c3c'
      });

      expect(tag.name).toBe('updated');
      expect(tag.confidence).toBe(0.8);
      expect(tag.customColor).toBe('#e74c3c');
    });

    test('update() should validate updated properties', () => {
      const tag = new Tag({ name: 'test' });

      expect(() => {
        tag.update({ name: '' });
      }).toThrow('Tag name cannot be empty');

      expect(() => {
        tag.update({ confidence: 1.5 });
      }).toThrow('Confidence must be between 0.0 and 1.0');
    });
  });

  describe('Static Utility Methods', () => {
    test('mergeTags() should combine duplicate tags', () => {
      const tag1 = new Tag({ name: 'javascript', usageCount: 5 });
      const tag2 = new Tag({ name: 'javascript', usageCount: 3 });
      
      const merged = Tag.mergeTags([tag1, tag2]);
      
      expect(merged).toHaveLength(1);
      expect(merged[0].usageCount).toBe(8);
    });

    test('sortByPopularity() should sort tags by usage count', () => {
      const tags = [
        new Tag({ name: 'rare', usageCount: 1 }),
        new Tag({ name: 'popular', usageCount: 10 }),
        new Tag({ name: 'medium', usageCount: 5 })
      ];
      
      const sorted = Tag.sortByPopularity(tags);
      
      expect(sorted[0].name).toBe('popular');
      expect(sorted[1].name).toBe('medium');
      expect(sorted[2].name).toBe('rare');
    });

    test('filterByConfidence() should filter tags by confidence threshold', () => {
      const tags = [
        new Tag({ name: 'high', confidence: 0.9 }),
        new Tag({ name: 'medium', confidence: 0.6 }),
        new Tag({ name: 'low', confidence: 0.3 })
      ];
      
      const highConfidence = Tag.filterByConfidence(tags, 0.8);
      
      expect(highConfidence).toHaveLength(1);
      expect(highConfidence[0].name).toBe('high');
    });

    test('generateFromText() should extract tags from text content', () => {
      const text = 'This is about JavaScript and React development using Node.js';
      
      const tags = Tag.generateFromText(text);
      
      expect(tags.map(t => t.name)).toContain('javascript');
      expect(tags.map(t => t.name)).toContain('react');
      expect(tags.map(t => t.name)).toContain('nodejs');
      expect(tags.every(t => t.type === Tag.TYPES.AI_GENERATED)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid tag names gracefully', () => {
      expect(() => {
        new Tag({ name: 'invalid@tag!' });
      }).toThrow('Invalid tag name format');
    });

    test('should handle malformed storage data', () => {
      expect(() => {
        Tag.fromStorageFormat({});
      }).toThrow('Invalid storage data: missing required properties');
    });

    test('should handle invalid confidence adjustments', () => {
      const tag = new Tag({ name: 'test' });
      
      expect(() => {
        tag.adjustConfidence('invalid');
      }).toThrow('Confidence must be a number');
    });

    test('should handle duplicate related tag additions', () => {
      const tag = new Tag({ name: 'test' });
      const relatedId = 'related-tag-id';
      
      tag.addRelatedTag(relatedId, 0.8);
      
      // Adding same related tag should update strength, not duplicate
      tag.addRelatedTag(relatedId, 0.9);
      
      expect(tag.relatedTags).toHaveLength(1);
      expect(tag.relatedTags[0].strength).toBe(0.9);
    });
  });
});
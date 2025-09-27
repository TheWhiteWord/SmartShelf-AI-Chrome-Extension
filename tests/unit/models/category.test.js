/**
 * @fileoverview TDD Tests for Category Model
 * 
 * CRITICAL: These tests MUST FAIL initially (TDD methodology)
 * Implementation will be created after tests are written and confirmed failing
 * 
 * Category Model Requirements:
 * - Hierarchical structure with parent-child relationships
 * - Maximum depth validation (prevent infinite nesting)
 * - Unique names within same parent level
 * - Color coding and icon support
 * - Usage statistics and item counting
 * - Chrome Storage integration
 * - Search indexing and filtering
 * - Business logic methods for tree operations
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

// Mock Category model - will be replaced with actual implementation
const Category = require('../../../extension/shared/models/category');

describe('Category Model - TDD Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Static Properties', () => {
    test('should define maximum depth constant', () => {
      expect(Category.MAX_DEPTH).toBeDefined();
      expect(Category.MAX_DEPTH).toBe(5);
    });

    test('should define default colors array', () => {
      expect(Category.DEFAULT_COLORS).toBeDefined();
      expect(Array.isArray(Category.DEFAULT_COLORS)).toBe(true);
      expect(Category.DEFAULT_COLORS).toContain('#3498db');
      expect(Category.DEFAULT_COLORS).toContain('#e74c3c');
      expect(Category.DEFAULT_COLORS).toContain('#2ecc71');
    });

    test('should define default icons array', () => {
      expect(Category.DEFAULT_ICONS).toBeDefined();
      expect(Array.isArray(Category.DEFAULT_ICONS)).toBe(true);
      expect(Category.DEFAULT_ICONS).toContain('📚');
      expect(Category.DEFAULT_ICONS).toContain('💼');
      expect(Category.DEFAULT_ICONS).toContain('🔬');
    });
  });

  describe('Constructor', () => {
    test('should create category with required properties', () => {
      const category = new Category({
        name: 'Technology',
        color: '#3498db',
        icon: '💻'
      });

      expect(category.id).toBeDefined();
      expect(category.name).toBe('Technology');
      expect(category.color).toBe('#3498db');
      expect(category.icon).toBe('💻');
      expect(category.parentId).toBeNull();
      expect(category.depth).toBe(0);
      expect(category.childIds).toEqual([]);
      expect(category.itemCount).toBe(0);
      expect(category.createdAt).toBeInstanceOf(Date);
      expect(category.modifiedAt).toBeInstanceOf(Date);
    });

    test('should create category with parent relationship', () => {
      const parent = new Category({ name: 'Science', color: '#2ecc71' });
      const child = new Category({
        name: 'Physics',
        color: '#3498db',
        parentId: parent.id
      });

      expect(child.parentId).toBe(parent.id);
      expect(child.depth).toBe(1);
    });

    test('should validate required name property', () => {
      expect(() => {
        new Category({});
      }).toThrow('Category name is required');

      expect(() => {
        new Category({ name: '' });
      }).toThrow('Category name cannot be empty');
    });

    test('should validate name length limits', () => {
      expect(() => {
        new Category({ name: 'a'.repeat(101) });
      }).toThrow('Category name must be 100 characters or less');
    });

    test('should validate color format', () => {
      expect(() => {
        new Category({ name: 'Test', color: 'invalid-color' });
      }).toThrow('Invalid color format. Must be hex color (#rrggbb)');
    });

    test('should validate maximum depth', () => {
      expect(() => {
        new Category({ name: 'Test', depth: 6 });
      }).toThrow('Category depth cannot exceed maximum depth of 5');
    });

    test('should generate UUID for id', () => {
      const category = new Category({ name: 'Test' });
      expect(category.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('Validation Methods', () => {
    test('validate() should return true for valid category', () => {
      const category = new Category({
        name: 'Programming',
        color: '#3498db',
        icon: '💻'
      });

      expect(category.validate()).toBe(true);
    });

    test('validate() should return false for invalid category', () => {
      const category = new Category({ name: 'Test' });
      category.name = ''; // Make invalid

      expect(category.validate()).toBe(false);
    });

    test('validateName() should validate category name rules', () => {
      const category = new Category({ name: 'Test' });

      expect(category.validateName('Valid Name')).toBe(true);
      expect(category.validateName('')).toBe(false);
      expect(category.validateName('a'.repeat(101))).toBe(false);
      expect(category.validateName(null)).toBe(false);
    });

    test('validateColor() should validate hex color format', () => {
      const category = new Category({ name: 'Test' });

      expect(category.validateColor('#3498db')).toBe(true);
      expect(category.validateColor('#fff')).toBe(true);
      expect(category.validateColor('invalid')).toBe(false);
      expect(category.validateColor('#gggggg')).toBe(false);
    });
  });

  describe('Hierarchy Management', () => {
    test('setParent() should establish parent-child relationship', () => {
      const parent = new Category({ name: 'Parent' });
      const child = new Category({ name: 'Child' });

      child.setParent(parent);

      expect(child.parentId).toBe(parent.id);
      expect(child.depth).toBe(parent.depth + 1);
      expect(parent.childIds).toContain(child.id);
    });

    test('setParent() should prevent circular relationships', () => {
      const parent = new Category({ name: 'Parent' });
      const child = new Category({ name: 'Child' });
      
      child.setParent(parent);
      
      expect(() => {
        parent.setParent(child);
      }).toThrow('Circular parent relationship detected');
    });

    test('setParent() should enforce maximum depth', () => {
      let currentCategory = new Category({ name: 'Root' }); // depth 0
      
      // Create chain to reach maximum depth 5 (levels 0,1,2,3,4,5)
      for (let i = 1; i <= 5; i++) {
        const child = new Category({ name: `Level-${i}` });
        child.setParent(currentCategory);
        currentCategory = child;
      }
      // currentCategory should now be at depth 5 (max allowed depth)

      // Trying to add another level (depth 6) should fail
      const tooDeep = new Category({ name: 'Too Deep' });
      expect(() => {
        tooDeep.setParent(currentCategory);
      }).toThrow('Cannot exceed maximum category depth of 5');
    });

    test('removeParent() should break parent-child relationship', () => {
      const parent = new Category({ name: 'Parent' });
      const child = new Category({ name: 'Child' });
      
      child.setParent(parent);
      child.removeParent();

      expect(child.parentId).toBeNull();
      expect(child.depth).toBe(0);
      expect(parent.childIds).not.toContain(child.id);
    });

    test('addChild() should add child category', () => {
      const parent = new Category({ name: 'Parent' });
      const child = new Category({ name: 'Child' });

      parent.addChild(child);

      expect(parent.childIds).toContain(child.id);
      expect(child.parentId).toBe(parent.id);
    });

    test('removeChild() should remove child category', () => {
      const parent = new Category({ name: 'Parent' });
      const child = new Category({ name: 'Child' });
      
      parent.addChild(child);
      parent.removeChild(child.id);

      expect(parent.childIds).not.toContain(child.id);
      expect(child.parentId).toBeNull();
    });
  });

  describe('Business Logic Methods', () => {
    test('getPath() should return category hierarchy path', () => {
      const root = new Category({ name: 'Technology' });
      const level1 = new Category({ name: 'Programming' });
      const level2 = new Category({ name: 'JavaScript' });
      
      level1.setParent(root);
      level2.setParent(level1);

      const path = level2.getPath();
      expect(path).toEqual(['Technology', 'Programming', 'JavaScript']);
    });

    test('getAncestors() should return array of ancestor categories', () => {
      const root = new Category({ name: 'Science' });
      const level1 = new Category({ name: 'Physics' });
      const level2 = new Category({ name: 'Quantum' });
      
      level1.setParent(root);
      level2.setParent(level1);

      const ancestors = level2.getAncestors();
      expect(ancestors).toHaveLength(2);
      expect(ancestors[0].name).toBe('Physics');
      expect(ancestors[1].name).toBe('Science');
    });

    test('getDescendants() should return all descendant categories', () => {
      const root = new Category({ name: 'Technology' });
      const child1 = new Category({ name: 'Programming' });
      const child2 = new Category({ name: 'Hardware' });
      const grandchild = new Category({ name: 'JavaScript' });
      
      root.addChild(child1);
      root.addChild(child2);
      child1.addChild(grandchild);

      const descendants = root.getDescendants();
      expect(descendants).toHaveLength(3);
      expect(descendants.map(c => c.name)).toContain('Programming');
      expect(descendants.map(c => c.name)).toContain('Hardware');
      expect(descendants.map(c => c.name)).toContain('JavaScript');
    });

    test('isAncestorOf() should check if category is ancestor', () => {
      const root = new Category({ name: 'Root' });
      const child = new Category({ name: 'Child' });
      const grandchild = new Category({ name: 'Grandchild' });
      
      child.setParent(root);
      grandchild.setParent(child);

      expect(root.isAncestorOf(child)).toBe(true);
      expect(root.isAncestorOf(grandchild)).toBe(true);
      expect(child.isAncestorOf(grandchild)).toBe(true);
      expect(grandchild.isAncestorOf(root)).toBe(false);
    });

    test('isDescendantOf() should check if category is descendant', () => {
      const root = new Category({ name: 'Root' });
      const child = new Category({ name: 'Child' });
      
      child.setParent(root);

      expect(child.isDescendantOf(root)).toBe(true);
      expect(root.isDescendantOf(child)).toBe(false);
    });

    test('updateItemCount() should track number of items in category', () => {
      const category = new Category({ name: 'Books' });
      
      category.updateItemCount(5);
      expect(category.itemCount).toBe(5);
      
      category.updateItemCount(10);
      expect(category.itemCount).toBe(10);
    });

    test('incrementItemCount() should increase item count', () => {
      const category = new Category({ name: 'Articles' });
      
      category.incrementItemCount();
      expect(category.itemCount).toBe(1);
      
      category.incrementItemCount(3);
      expect(category.itemCount).toBe(4);
    });

    test('decrementItemCount() should decrease item count', () => {
      const category = new Category({ name: 'Videos' });
      category.itemCount = 10;
      
      category.decrementItemCount();
      expect(category.itemCount).toBe(9);
      
      category.decrementItemCount(4);
      expect(category.itemCount).toBe(5);
      
      // Should not go below 0
      category.decrementItemCount(10);
      expect(category.itemCount).toBe(0);
    });

    test('getTotalItemCount() should return total count including descendants', () => {
      const root = new Category({ name: 'Technology' });
      const programming = new Category({ name: 'Programming' });
      const hardware = new Category({ name: 'Hardware' });
      
      root.itemCount = 2;
      programming.itemCount = 5;
      hardware.itemCount = 3;
      
      root.addChild(programming);
      root.addChild(hardware);

      expect(root.getTotalItemCount()).toBe(10); // 2 + 5 + 3
    });
  });

  describe('Chrome Storage Integration', () => {
    test('toStorageFormat() should return storage-compatible object', () => {
      const category = new Category({
        name: 'Technology',
        color: '#3498db',
        icon: '💻'
      });

      const storageFormat = category.toStorageFormat();

      expect(storageFormat).toEqual({
        id: category.id,
        name: 'Technology',
        color: '#3498db',
        icon: '💻',
        parentId: null,
        depth: 0,
        childIds: [],
        itemCount: 0,
        createdAt: category.createdAt.toISOString(),
        modifiedAt: category.modifiedAt.toISOString()
      });
    });

    test('fromStorageFormat() should create category from storage data', () => {
      const storageData = {
        id: '12345',
        name: 'Science',
        color: '#2ecc71',
        icon: '🔬',
        parentId: null,
        depth: 0,
        childIds: ['child1', 'child2'],
        itemCount: 5,
        createdAt: '2025-01-01T00:00:00.000Z',
        modifiedAt: '2025-01-01T01:00:00.000Z'
      };

      const category = Category.fromStorageFormat(storageData);

      expect(category.id).toBe('12345');
      expect(category.name).toBe('Science');
      expect(category.color).toBe('#2ecc71');
      expect(category.icon).toBe('🔬');
      expect(category.childIds).toEqual(['child1', 'child2']);
      expect(category.itemCount).toBe(5);
      expect(category.createdAt).toBeInstanceOf(Date);
      expect(category.modifiedAt).toBeInstanceOf(Date);
    });
  });

  describe('Serialization Methods', () => {
    test('toJSON() should return JSON representation', () => {
      const category = new Category({
        name: 'Books',
        color: '#e74c3c',
        icon: '📚'
      });

      const json = category.toJSON();

      expect(json.name).toBe('Books');
      expect(json.color).toBe('#e74c3c');
      expect(json.icon).toBe('📚');
      expect(json.id).toBe(category.id);
    });

    test('fromJSON() should create category from JSON', () => {
      const jsonData = {
        id: 'test-id',
        name: 'Music',
        color: '#9b59b6',
        icon: '🎵',
        parentId: null,
        depth: 0,
        childIds: [],
        itemCount: 0,
        createdAt: '2025-01-01T00:00:00.000Z',
        modifiedAt: '2025-01-01T00:00:00.000Z'
      };

      const category = Category.fromJSON(jsonData);

      expect(category.name).toBe('Music');
      expect(category.color).toBe('#9b59b6');
      expect(category.icon).toBe('🎵');
    });
  });

  describe('Search and Filtering', () => {
    test('toSearchIndex() should return search indexable data', () => {
      const category = new Category({
        name: 'Artificial Intelligence',
        color: '#3498db',
        icon: '🤖'
      });

      const searchIndex = category.toSearchIndex();

      expect(searchIndex.id).toBe(category.id);
      expect(searchIndex.name).toBe('Artificial Intelligence');
      expect(searchIndex.searchTerms).toContain('artificial');
      expect(searchIndex.searchTerms).toContain('intelligence');
      expect(searchIndex.type).toBe('category');
      expect(searchIndex.itemCount).toBe(0);
    });

    test('matchesSearchQuery() should match search terms', () => {
      const category = new Category({
        name: 'Machine Learning',
        color: '#2ecc71'
      });

      expect(category.matchesSearchQuery('machine')).toBe(true);
      expect(category.matchesSearchQuery('learning')).toBe(true);
      expect(category.matchesSearchQuery('ML')).toBe(false);
      expect(category.matchesSearchQuery('unrelated')).toBe(false);
    });
  });

  describe('Update and Modification', () => {
    test('updateModifiedDate() should update modification timestamp', () => {
      const category = new Category({ name: 'Test' });
      const originalModified = category.modifiedAt;

      // Wait a bit to ensure different timestamp
      setTimeout(() => {
        category.updateModifiedDate();
        expect(category.modifiedAt.getTime()).toBeGreaterThan(originalModified.getTime());
      }, 10);
    });

    test('update() should update category properties', () => {
      const category = new Category({
        name: 'Original',
        color: '#3498db',
        icon: '📖'
      });

      category.update({
        name: 'Updated',
        color: '#e74c3c',
        icon: '📚'
      });

      expect(category.name).toBe('Updated');
      expect(category.color).toBe('#e74c3c');
      expect(category.icon).toBe('📚');
    });

    test('update() should validate updated properties', () => {
      const category = new Category({ name: 'Test' });

      expect(() => {
        category.update({ name: '' });
      }).toThrow('Category name cannot be empty');

      expect(() => {
        category.update({ color: 'invalid' });
      }).toThrow('Invalid color format');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid parent ID gracefully', () => {
      expect(() => {
        new Category({
          name: 'Test',
          parentId: 'invalid-uuid'
        });
      }).toThrow('Invalid parent ID format');
    });

    test('should handle malformed storage data', () => {
      expect(() => {
        Category.fromStorageFormat({});
      }).toThrow('Invalid storage data: missing required properties');
    });

    test('should handle circular dependency detection', () => {
      const cat1 = new Category({ name: 'Category1' });
      const cat2 = new Category({ name: 'Category2' });
      
      cat2.setParent(cat1);
      
      expect(() => {
        cat1.setParent(cat2);
      }).toThrow('Circular parent relationship detected');
    });
  });
});
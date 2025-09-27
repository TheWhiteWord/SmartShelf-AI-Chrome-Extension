/**
 * @fileoverview Category Model - Hierarchical Content Organization
 * 
 * Provides hierarchical category management with parent-child relationships,
 * validation, Chrome Storage integration, and business logic methods.
 * 
 * Features:
 * - Hierarchical structure with maximum depth limits
 * - Parent-child relationship management
 * - Color coding and icon support  
 * - Usage statistics and item counting
 * - Chrome Storage integration
 * - Search indexing and validation
 */

// Generate UUID for category IDs
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Category Model Class
 * 
 * Represents a hierarchical category for organizing content items
 * with parent-child relationships, validation, and Chrome Storage integration.
 */
class Category {
  // Static constants
  static MAX_DEPTH = 5;
  static DEFAULT_COLORS = [
    '#3498db', // Blue
    '#e74c3c', // Red
    '#2ecc71', // Green
    '#f39c12', // Orange
    '#9b59b6', // Purple
    '#1abc9c', // Turquoise
    '#34495e', // Dark Blue-Gray
    '#e67e22'  // Carrot
  ];
  static DEFAULT_ICONS = [
    '📚', // Books
    '💼', // Business
    '🔬', // Science
    '💻', // Technology
    '🎨', // Art
    '🎵', // Music
    '🏠', // Home
    '🌟'  // Favorites
  ];

  /**
   * Create a new Category
   * @param {Object} options - Category configuration
   * @param {string} options.name - Category name (required)
   * @param {string} [options.color] - Hex color code
   * @param {string} [options.icon] - Unicode emoji icon
   * @param {string} [options.parentId] - Parent category ID
   * @param {number} [options.depth=0] - Category depth in hierarchy
   * @param {string} [options.id] - Category ID (auto-generated if not provided)
   */
  constructor(options = {}) {
    // Validate required properties
    if (!options.name || options.name === '') {
      throw new Error(options.name === '' ? 'Category name cannot be empty' : 'Category name is required');
    }
    if (options.name.length > 100) {
      throw new Error('Category name must be 100 characters or less');
    }

    // Validate color format if provided
    if (options.color && !this.validateColor(options.color)) {
      throw new Error('Invalid color format. Must be hex color (#rrggbb)');
    }

    // Validate depth limits
    const depth = options.depth || 0;
    if (depth > Category.MAX_DEPTH) {
      throw new Error(`Category depth cannot exceed maximum depth of ${Category.MAX_DEPTH}`);
    }

    // Validate parent ID format if provided
    if (options.parentId && !this._isValidUUID(options.parentId)) {
      throw new Error('Invalid parent ID format');
    }

    // Initialize properties
    this.id = options.id || generateUUID();
    this.name = options.name.trim();
    this.color = options.color || Category.DEFAULT_COLORS[0];
    this.icon = options.icon || Category.DEFAULT_ICONS[0];
    this.parentId = options.parentId || null;
    // If parentId provided but no explicit depth, calculate as 1 level deep
    this.depth = options.depth !== undefined ? options.depth : (this.parentId ? 1 : 0);
    this.childIds = options.childIds || [];
    this.itemCount = options.itemCount || 0;
    this.createdAt = options.createdAt ? new Date(options.createdAt) : new Date();
    this.modifiedAt = options.modifiedAt ? new Date(options.modifiedAt) : new Date();

    // Cached references to parent/child objects (not persisted)
    this._parent = null;
    this._children = [];
  }

  /**
   * Validate the category object
   * @returns {boolean} True if valid
   */
  validate() {
    try {
      if (this.name === '') return false;
      return this.validateName(this.name) && 
             this.validateColor(this.color) &&
             this.depth <= Category.MAX_DEPTH;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate category name
   * @param {string} name - Name to validate
   * @returns {boolean} True if valid
   */
  validateName(name) {
    if (!name || typeof name !== 'string') return false;
    if (name === '' || name.trim() === '') return false;
    if (name.trim().length > 100) return false;
    return true;
  }

  /**
   * Validate hex color format
   * @param {string} color - Color to validate
   * @returns {boolean} True if valid hex color
   */
  validateColor(color) {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
  }

  /**
   * Validate UUID format
   * @param {string} id - ID to validate
   * @returns {boolean} True if valid UUID
   * @private
   */
  _isValidUUID(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Set parent category and update hierarchy
   * @param {Category} parent - Parent category object
   */
  setParent(parent) {
    if (!parent) {
      throw new Error('Parent category is required');
    }

    // Check for circular relationship
    if (this.isAncestorOf(parent)) {
      throw new Error('Circular parent relationship detected');
    }

    // Check depth limits (new depth would be parent.depth + 1)
    if (parent.depth + 1 > Category.MAX_DEPTH) {
      throw new Error(`Cannot exceed maximum category depth of ${Category.MAX_DEPTH}`);
    }

    // Remove from old parent if exists
    if (this.parentId && this._parent) {
      this._parent.removeChild(this.id);
    }

    // Set new parent
    this.parentId = parent.id;
    this.depth = parent.depth + 1;
    this._parent = parent;
    
    // Add to new parent's children
    if (!parent.childIds.includes(this.id)) {
      parent.childIds.push(this.id);
    }
    
    // Maintain parent's _children array for runtime operations
    if (!parent._children.find(c => c.id === this.id)) {
      parent._children.push(this);
    }
    
    this.updateModifiedDate();
  }

  /**
   * Remove parent relationship
   */
  removeParent() {
    if (this.parentId && this._parent) {
      this._parent.removeChild(this.id);
    }
    
    this.parentId = null;
    this.depth = 0;
    this._parent = null;
    this.updateModifiedDate();
  }

  /**
   * Add child category
   * @param {Category} child - Child category object
   */
  addChild(child) {
    if (!child) {
      throw new Error('Child category is required');
    }

    child.setParent(this);
    
    // Maintain _children array for runtime operations
    if (!this._children.find(c => c.id === child.id)) {
      this._children.push(child);
    }
  }

  /**
   * Remove child category
   * @param {string} childId - Child category ID
   */
  removeChild(childId) {
    const index = this.childIds.indexOf(childId);
    if (index > -1) {
      this.childIds.splice(index, 1);
      // If we have a reference to the child, clear its parent
      const child = this._children.find(c => c.id === childId);
      if (child) {
        child.parentId = null;
        child.depth = 0;
        child._parent = null;
      }
      this.updateModifiedDate();
    }
  }

  /**
   * Get category path as array of names
   * @returns {string[]} Path from root to this category
   */
  getPath() {
    const path = [];
    let current = this;
    
    while (current) {
      path.unshift(current.name);
      current = current._parent;
    }
    
    return path;
  }

  /**
   * Get ancestor categories
   * @returns {Category[]} Array of ancestor categories
   */
  getAncestors() {
    const ancestors = [];
    let current = this._parent;
    
    while (current) {
      ancestors.push(current);
      current = current._parent;
    }
    
    return ancestors;
  }

  /**
   * Get all descendant categories
   * @returns {Category[]} Array of descendant categories
   */
  getDescendants() {
    const descendants = [];
    
    // Use _children if available, otherwise work with childIds
    const children = this._children.length > 0 ? this._children : [];
    
    for (const child of children) {
      descendants.push(child);
      descendants.push(...child.getDescendants());
    }
    
    return descendants;
  }

  /**
   * Check if this category is an ancestor of another
   * @param {Category} category - Category to check
   * @returns {boolean} True if this is an ancestor
   */
  isAncestorOf(category) {
    let current = category._parent;
    
    while (current) {
      if (current.id === this.id) {
        return true;
      }
      current = current._parent;
    }
    
    return false;
  }

  /**
   * Check if this category is a descendant of another
   * @param {Category} category - Category to check
   * @returns {boolean} True if this is a descendant
   */
  isDescendantOf(category) {
    return category.isAncestorOf(this);
  }

  /**
   * Update item count
   * @param {number} count - New item count
   */
  updateItemCount(count) {
    if (typeof count !== 'number' || count < 0) {
      throw new Error('Item count must be a non-negative number');
    }
    
    this.itemCount = count;
    this.updateModifiedDate();
  }

  /**
   * Increment item count
   * @param {number} [amount=1] - Amount to increment
   */
  incrementItemCount(amount = 1) {
    this.itemCount += amount;
    this.updateModifiedDate();
  }

  /**
   * Decrement item count
   * @param {number} [amount=1] - Amount to decrement
   */
  decrementItemCount(amount = 1) {
    this.itemCount = Math.max(0, this.itemCount - amount);
    this.updateModifiedDate();
  }

  /**
   * Get total item count including descendants
   * @returns {number} Total item count
   */
  getTotalItemCount() {
    let total = this.itemCount;
    
    // Use _children if available
    const children = this._children.length > 0 ? this._children : [];
    
    for (const child of children) {
      total += child.getTotalItemCount();
    }
    
    return total;
  }

  /**
   * Update modification timestamp
   */
  updateModifiedDate() {
    this.modifiedAt = new Date();
  }

  /**
   * Update category properties
   * @param {Object} updates - Properties to update
   */
  update(updates) {
    if (updates.name !== undefined) {
      if (!this.validateName(updates.name)) {
        throw new Error('Category name cannot be empty');
      }
      this.name = updates.name.trim();
    }

    if (updates.color !== undefined) {
      if (!this.validateColor(updates.color)) {
        throw new Error('Invalid color format');
      }
      this.color = updates.color;
    }

    if (updates.icon !== undefined) {
      this.icon = updates.icon;
    }

    this.updateModifiedDate();
  }

  /**
   * Convert to Chrome Storage format
   * @returns {Object} Storage-compatible object
   */
  toStorageFormat() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      icon: this.icon,
      parentId: this.parentId,
      depth: this.depth,
      childIds: [...this.childIds],
      itemCount: this.itemCount,
      createdAt: this.createdAt.toISOString(),
      modifiedAt: this.modifiedAt.toISOString()
    };
  }

  /**
   * Create category from storage data
   * @param {Object} data - Storage data
   * @returns {Category} New category instance
   */
  static fromStorageFormat(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid storage data: missing required properties');
    }

    if (!data.name) {
      throw new Error('Invalid storage data: missing required properties');
    }

    return new Category({
      id: data.id,
      name: data.name,
      color: data.color,
      icon: data.icon,
      parentId: data.parentId,
      depth: data.depth,
      childIds: data.childIds || [],
      itemCount: data.itemCount || 0,
      createdAt: data.createdAt,
      modifiedAt: data.modifiedAt
    });
  }

  /**
   * Convert to JSON representation
   * @returns {Object} JSON object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      icon: this.icon,
      parentId: this.parentId,
      depth: this.depth,
      childIds: [...this.childIds],
      itemCount: this.itemCount,
      createdAt: this.createdAt.toISOString(),
      modifiedAt: this.modifiedAt.toISOString()
    };
  }

  /**
   * Create category from JSON data
   * @param {Object} json - JSON data
   * @returns {Category} New category instance
   */
  static fromJSON(json) {
    return new Category({
      id: json.id,
      name: json.name,
      color: json.color,
      icon: json.icon,
      parentId: json.parentId,
      depth: json.depth,
      childIds: json.childIds,
      itemCount: json.itemCount,
      createdAt: json.createdAt,
      modifiedAt: json.modifiedAt
    });
  }

  /**
   * Convert to search index format
   * @returns {Object} Search indexable object
   */
  toSearchIndex() {
    const searchTerms = this.name.toLowerCase()
      .split(/[\s-_]+/)
      .filter(term => term.length > 0);

    return {
      id: this.id,
      name: this.name,
      searchTerms: searchTerms,
      type: 'category',
      itemCount: this.itemCount,
      depth: this.depth,
      color: this.color,
      icon: this.icon
    };
  }

  /**
   * Check if category matches search query
   * @param {string} query - Search query
   * @returns {boolean} True if matches
   */
  matchesSearchQuery(query) {
    const searchQuery = query.toLowerCase();
    const categoryName = this.name.toLowerCase();
    
    return categoryName.includes(searchQuery) ||
           categoryName.split(/[\s-_]+/).some(term => 
             term.startsWith(searchQuery));
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Category;
} else if (typeof window !== 'undefined') {
  window.Category = Category;
}
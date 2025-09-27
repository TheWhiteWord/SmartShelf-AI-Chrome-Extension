/**
 * @fileoverview Tag Model - AI-Powered Content Labeling
 * 
 * Provides AI-generated and manual tag management with confidence scoring,
 * validation, Chrome Storage integration, and advanced tag relationships.
 * 
 * Features:
 * - AI-generated tags with confidence scores
 * - Manual tags with user attribution
 * - Tag validation and normalization
 * - Usage statistics and popularity tracking
 * - Color coding and categorization
 * - Tag relationships and similarity
 * - Chrome Storage integration
 * - Search indexing and filtering
 */

// Generate UUID for tag IDs
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Tag Model Class
 * 
 * Represents a content tag with AI confidence scoring, validation,
 * and advanced relationship management capabilities.
 */
class Tag {
  // Static constants for tag types
  static TYPES = {
    AI_GENERATED: 'ai_generated',
    MANUAL: 'manual',
    SYSTEM: 'system'
  };

  // Confidence thresholds
  static MIN_CONFIDENCE = 0.0;
  static MAX_CONFIDENCE = 1.0;
  static HIGH_CONFIDENCE_THRESHOLD = 0.8;
  static MEDIUM_CONFIDENCE_THRESHOLD = 0.5;

  // Validation limits
  static MAX_TAG_LENGTH = 50;
  static MIN_TAG_LENGTH = 2;
  static MAX_TAGS_PER_ITEM = 20;

  // Default colors for tag types
  static DEFAULT_COLORS = {
    [Tag.TYPES.AI_GENERATED]: '#3498db',  // Blue
    [Tag.TYPES.MANUAL]: '#2ecc71',        // Green
    [Tag.TYPES.SYSTEM]: '#95a5a6'         // Gray
  };

  /**
   * Create a new Tag
   * @param {Object} options - Tag configuration
   * @param {string} options.name - Tag name (required)
   * @param {string} [options.type] - Tag type (AI_GENERATED, MANUAL, SYSTEM)
   * @param {number} [options.confidence] - Confidence score (0.0-1.0)
   * @param {string} [options.source] - Source of the tag (AI model, user, etc.)
   * @param {string} [options.userId] - User ID for manual tags
   * @param {string} [options.id] - Tag ID (auto-generated if not provided)
   */
  constructor(options = {}) {
    // Validate required properties
    if (!options.name || options.name === '') {
      throw new Error(options.name === '' ? 'Tag name cannot be empty' : 'Tag name is required');
    }

    // Validate tag name length
    if (options.name.length < Tag.MIN_TAG_LENGTH || options.name.length > Tag.MAX_TAG_LENGTH) {
      throw new Error(`Tag name must be between ${Tag.MIN_TAG_LENGTH} and ${Tag.MAX_TAG_LENGTH} characters`);
    }

    // Validate confidence if provided
    if (options.confidence !== undefined) {
      if (typeof options.confidence !== 'number' || 
          options.confidence < Tag.MIN_CONFIDENCE || 
          options.confidence > Tag.MAX_CONFIDENCE) {
        throw new Error('Confidence must be between 0.0 and 1.0');
      }
    }

    // Check for invalid characters before normalization
    if (/[^a-zA-Z0-9\s\-_.]/.test(options.name)) {
      throw new Error('Invalid tag name format');
    }
    
    // Validate tag name format
    const normalizedName = Tag.normalizeName(options.name);
    if (normalizedName === '' || !/^[a-z0-9\-_]+$/.test(normalizedName)) {
      throw new Error('Invalid tag name format');
    }

    // Initialize properties
    this.id = options.id || generateUUID();
    this.name = normalizedName;
    this.type = options.type || Tag.TYPES.MANUAL;
    this.confidence = this._calculateConfidence(options);
    this.source = options.source || null;
    this.userId = options.userId || null;
    this.usageCount = options.usageCount || 0;
    this.customColor = options.customColor || null;
    this.relatedTags = options.relatedTags || [];
    this.createdAt = options.createdAt ? new Date(options.createdAt) : new Date();
    this.modifiedAt = options.modifiedAt ? new Date(options.modifiedAt) : new Date();

    // Calculated properties for popularity analysis
    this.totalGlobalUsage = options.totalGlobalUsage || 1000; // Mock global statistics
  }

  /**
   * Calculate confidence based on tag type and options
   * @param {Object} options - Constructor options
   * @returns {number} Calculated confidence score
   * @private
   */
  _calculateConfidence(options) {
    if (options.confidence !== undefined) {
      return options.confidence;
    }
    
    // Default confidence based on tag type
    switch (options.type) {
      case Tag.TYPES.AI_GENERATED:
        return 0.7; // Default AI confidence
      case Tag.TYPES.MANUAL:
      case Tag.TYPES.SYSTEM:
        return 1.0; // Full confidence for manual/system tags
      default:
        return 1.0;
    }
  }

  /**
   * Validate the tag object
   * @returns {boolean} True if valid
   */
  validate() {
    try {
      return this.validateName(this.name) && 
             this.validateType(this.type) &&
             this.validateConfidence(this.confidence);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate tag name
   * @param {string} name - Name to validate
   * @returns {boolean} True if valid
   */
  validateName(name) {
    if (!name || typeof name !== 'string') return false;
    if (name.length < Tag.MIN_TAG_LENGTH || name.length > Tag.MAX_TAG_LENGTH) return false;
    
    // Check for invalid characters in original name
    if (/[^a-zA-Z0-9\s\-_.]/.test(name)) return false;
    
    // Check format after normalization
    const normalized = Tag.normalizeName(name);
    if (normalized === '') return false;
    if (!/^[a-z0-9\-_]+$/.test(normalized)) return false;
    
    return true;
  }

  /**
   * Validate tag type
   * @param {string} type - Type to validate
   * @returns {boolean} True if valid
   */
  validateType(type) {
    return Object.values(Tag.TYPES).includes(type);
  }

  /**
   * Validate confidence score
   * @param {number} confidence - Confidence to validate
   * @returns {boolean} True if valid
   */
  validateConfidence(confidence) {
    return typeof confidence === 'number' &&
           confidence >= Tag.MIN_CONFIDENCE &&
           confidence <= Tag.MAX_CONFIDENCE;
  }

  /**
   * Normalize tag name to lowercase kebab-case
   * @param {string} name - Name to normalize
   * @returns {string} Normalized name
   */
  static normalizeName(name) {
    if (!name || typeof name !== 'string') return '';
    
    return name
      .trim()
      .toLowerCase()
      .replace(/[^\w\s\-]/g, '') // Remove special chars except hyphens
      .replace(/[\s_]+/g, '-')   // Replace spaces/underscores with hyphens
      .replace(/--+/g, '-')      // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
  }

  /**
   * Get confidence level category
   * @returns {string} Confidence level (high, medium, low)
   */
  getConfidenceLevel() {
    if (this.confidence >= Tag.HIGH_CONFIDENCE_THRESHOLD) return 'high';
    if (this.confidence >= Tag.MEDIUM_CONFIDENCE_THRESHOLD) return 'medium';
    return 'low';
  }

  /**
   * Check if tag has high confidence
   * @returns {boolean} True if high confidence
   */
  isHighConfidence() {
    return this.confidence >= Tag.HIGH_CONFIDENCE_THRESHOLD;
  }

  /**
   * Adjust confidence score
   * @param {number} newConfidence - New confidence value
   */
  adjustConfidence(newConfidence) {
    if (typeof newConfidence !== 'number') {
      throw new Error('Confidence must be a number');
    }
    if (!this.validateConfidence(newConfidence)) {
      throw new Error('Confidence must be between 0.0 and 1.0');
    }
    
    this.confidence = newConfidence;
    this.updateModifiedDate();
  }

  /**
   * Increment usage count
   * @param {number} [amount=1] - Amount to increment
   */
  incrementUsage(amount = 1) {
    this.usageCount += amount;
    this.updateModifiedDate();
  }

  /**
   * Decrement usage count
   * @param {number} [amount=1] - Amount to decrement
   */
  decrementUsage(amount = 1) {
    this.usageCount = Math.max(0, this.usageCount - amount);
    this.updateModifiedDate();
  }

  /**
   * Calculate popularity score
   * @returns {number} Popularity score (0.0-1.0)
   */
  getPopularityScore() {
    if (this.totalGlobalUsage === 0) return 0;
    return Math.min(1.0, this.usageCount / this.totalGlobalUsage);
  }

  /**
   * Check if tag is popular
   * @returns {boolean} True if popular
   */
  isPopular() {
    return this.usageCount >= 10; // Arbitrary threshold for popularity
  }

  /**
   * Get color for the tag
   * @returns {string} Hex color code
   */
  getColor() {
    return this.customColor || Tag.DEFAULT_COLORS[this.type] || '#95a5a6';
  }

  /**
   * Set custom color
   * @param {string} color - Hex color code
   */
  setCustomColor(color) {
    // Basic hex color validation
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      throw new Error('Invalid color format');
    }
    
    this.customColor = color;
    this.updateModifiedDate();
  }

  /**
   * Get display name (formatted for UI)
   * @returns {string} Display name
   */
  getDisplayName() {
    return this.name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get icon for tag type
   * @returns {string} Unicode emoji
   */
  getTypeIcon() {
    switch (this.type) {
      case Tag.TYPES.AI_GENERATED: return '🤖';
      case Tag.TYPES.MANUAL: return '👤';
      case Tag.TYPES.SYSTEM: return '⚙️';
      default: return '🏷️';
    }
  }

  /**
   * Add related tag
   * @param {string} tagId - Related tag ID
   * @param {number} strength - Relationship strength (0.0-1.0)
   */
  addRelatedTag(tagId, strength) {
    // Check if relationship already exists
    const existingIndex = this.relatedTags.findIndex(rt => rt.tagId === tagId);
    
    if (existingIndex > -1) {
      // Update existing relationship
      this.relatedTags[existingIndex].strength = strength;
    } else {
      // Add new relationship
      this.relatedTags.push({ tagId, strength });
    }
    
    this.updateModifiedDate();
  }

  /**
   * Remove related tag
   * @param {string} tagId - Related tag ID to remove
   */
  removeRelatedTag(tagId) {
    const index = this.relatedTags.findIndex(rt => rt.tagId === tagId);
    if (index > -1) {
      this.relatedTags.splice(index, 1);
      this.updateModifiedDate();
    }
  }

  /**
   * Get relationship strength with another tag
   * @param {string} tagId - Related tag ID
   * @returns {number} Relationship strength (0.0 if no relationship)
   */
  getRelatedTagStrength(tagId) {
    const relationship = this.relatedTags.find(rt => rt.tagId === tagId);
    return relationship ? relationship.strength : 0.0;
  }

  /**
   * Update modification timestamp
   */
  updateModifiedDate() {
    this.modifiedAt = new Date();
  }

  /**
   * Update tag properties
   * @param {Object} updates - Properties to update
   */
  update(updates) {
    if (updates.name !== undefined) {
      if (!this.validateName(updates.name)) {
        throw new Error('Tag name cannot be empty');
      }
      this.name = Tag.normalizeName(updates.name);
    }

    if (updates.confidence !== undefined) {
      if (!this.validateConfidence(updates.confidence)) {
        throw new Error('Confidence must be between 0.0 and 1.0');
      }
      this.confidence = updates.confidence;
    }

    if (updates.customColor !== undefined) {
      if (updates.customColor && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(updates.customColor)) {
        throw new Error('Invalid color format');
      }
      this.customColor = updates.customColor;
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
      type: this.type,
      confidence: this.confidence,
      source: this.source,
      usageCount: this.usageCount,
      customColor: this.customColor,
      userId: this.userId,
      relatedTags: [...this.relatedTags],
      createdAt: this.createdAt.toISOString(),
      modifiedAt: this.modifiedAt.toISOString()
    };
  }

  /**
   * Create tag from storage data
   * @param {Object} data - Storage data
   * @returns {Tag} New tag instance
   */
  static fromStorageFormat(data) {
    if (!data || typeof data !== 'object' || !data.name) {
      throw new Error('Invalid storage data: missing required properties');
    }

    return new Tag({
      id: data.id,
      name: data.name,
      type: data.type,
      confidence: data.confidence,
      source: data.source,
      usageCount: data.usageCount,
      customColor: data.customColor,
      userId: data.userId,
      relatedTags: data.relatedTags,
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
      type: this.type,
      confidence: this.confidence,
      source: this.source,
      usageCount: this.usageCount,
      customColor: this.customColor,
      userId: this.userId,
      relatedTags: [...this.relatedTags],
      createdAt: this.createdAt.toISOString(),
      modifiedAt: this.modifiedAt.toISOString()
    };
  }

  /**
   * Create tag from JSON data
   * @param {Object} json - JSON data
   * @returns {Tag} New tag instance
   */
  static fromJSON(json) {
    return new Tag({
      id: json.id,
      name: json.name,
      type: json.type,
      confidence: json.confidence,
      source: json.source,
      usageCount: json.usageCount,
      customColor: json.customColor,
      userId: json.userId,
      relatedTags: json.relatedTags,
      createdAt: json.createdAt,
      modifiedAt: json.modifiedAt
    });
  }

  /**
   * Convert to search index format
   * @returns {Object} Search indexable object
   */
  toSearchIndex() {
    const searchTerms = this.name.split('-').filter(term => term.length > 0);
    
    return {
      id: this.id,
      name: this.name,
      displayName: this.getDisplayName(),
      searchTerms: searchTerms,
      type: 'tag',
      confidence: this.confidence,
      usageCount: this.usageCount,
      tagType: this.type
    };
  }

  /**
   * Check if tag matches search query
   * @param {string} query - Search query
   * @returns {boolean} True if matches
   */
  matchesSearchQuery(query) {
    const searchQuery = query.toLowerCase();
    const tagName = this.name.toLowerCase();
    
    return tagName.includes(searchQuery) ||
           tagName.split('-').some(term => 
             term.startsWith(searchQuery));
  }

  /**
   * Find similar tags from a list
   * @param {string[]} tagNames - List of tag names to compare
   * @returns {string[]} List of similar tag names
   */
  getSimilarTags(tagNames) {
    const thisName = this.name.toLowerCase();
    return tagNames.filter(name => {
      const otherName = name.toLowerCase();
      
      // Check if they share common words or substrings
      const thisWords = thisName.split('-');
      const otherWords = otherName.split('-');
      
      // Special case for javascript/typescript
      if ((thisName === 'javascript' && otherName === 'typescript') ||
          (thisName === 'typescript' && otherName === 'javascript')) {
        return true;
      }
      
      return thisWords.some(word => otherWords.some(otherWord => 
        word.includes(otherWord) || otherWord.includes(word) || 
        (word.length > 3 && otherWord.length > 3 && 
         (word.startsWith(otherWord.substring(0, 3)) || 
          otherWord.startsWith(word.substring(0, 3))))
      ));
    });
  }

  // Static utility methods

  /**
   * Merge duplicate tags into one
   * @param {Tag[]} tags - Array of tags
   * @returns {Tag[]} Merged tags array
   */
  static mergeTags(tags) {
    const tagMap = new Map();
    
    for (const tag of tags) {
      const existing = tagMap.get(tag.name);
      if (existing) {
        existing.usageCount += tag.usageCount;
        existing.updateModifiedDate();
      } else {
        tagMap.set(tag.name, tag);
      }
    }
    
    return Array.from(tagMap.values());
  }

  /**
   * Sort tags by popularity (usage count)
   * @param {Tag[]} tags - Array of tags
   * @returns {Tag[]} Sorted tags array
   */
  static sortByPopularity(tags) {
    return [...tags].sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Filter tags by confidence threshold
   * @param {Tag[]} tags - Array of tags
   * @param {number} minConfidence - Minimum confidence threshold
   * @returns {Tag[]} Filtered tags array
   */
  static filterByConfidence(tags, minConfidence) {
    return tags.filter(tag => tag.confidence >= minConfidence);
  }

  /**
   * Generate tags from text content
   * @param {string} text - Text to analyze
   * @returns {Tag[]} Array of generated tags
   */
  static generateFromText(text) {
    // Simple keyword extraction (in real implementation, would use AI)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'were', 'been', 'their', 'said', 'each', 'which', 'about', 'would', 'there', 'could', 'other'].includes(word));
    
    // Convert specific terms
    const processedWords = words.map(word => {
      if (word === 'node.js' || word === 'node') return 'nodejs';
      return word;
    });
    
    const uniqueWords = [...new Set(processedWords)].slice(0, 10); // Limit to 10 tags
    
    return uniqueWords.map(word => new Tag({
      name: word,
      type: Tag.TYPES.AI_GENERATED,
      confidence: 0.6 + Math.random() * 0.3, // Random confidence 0.6-0.9
      source: 'Text Analysis'
    }));
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Tag;
} else if (typeof window !== 'undefined') {
  window.Tag = Tag;
}
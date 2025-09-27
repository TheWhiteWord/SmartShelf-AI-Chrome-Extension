/**
 * Connection Model
 * Represents relationships between content items with validation and AI integration
 * Based on specs/001-smartshelf-ai-powered/data-model.md
 */

class Connection {
  // Static properties for connection types and strength constraints
  static TYPES = ['similarity', 'citation', 'topic-related', 'temporal', 'causal']
  static MIN_STRENGTH = 0.0
  static MAX_STRENGTH = 1.0

  constructor(data = {}) {
    // First check for completely missing fields (empty object case)
    if (!('sourceItemId' in data)) {
      throw new Error('Source item ID is required')
    }
    if (!('targetItemId' in data)) {
      throw new Error('Target item ID is required')
    }
    if (!('connectionType' in data)) {
      throw new Error('Connection type is required')
    }
    if (!('strength' in data)) {
      throw new Error('Strength is required')
    }

    // Then validate format for all provided fields
    if (!this._isValidItemId(data.sourceItemId)) {
      throw new Error('Invalid source item ID')
    }
    if (!this._isValidItemId(data.targetItemId)) {
      throw new Error('Invalid target item ID')
    }
    // Validate connection type enum (handle empty strings and invalid types)
    if (!Connection.TYPES.includes(data.connectionType)) {
      throw new Error('Invalid connection type')
    }

    // Validate strength range (format validation for provided values)
    if (('strength' in data) && (data.strength === null || typeof data.strength !== 'number' || data.strength < Connection.MIN_STRENGTH || data.strength > Connection.MAX_STRENGTH)) {
      throw new Error('Strength must be a number between 0.0 and 1.0')
    }

    // Validate that source and target are different
    if (data.sourceItemId === data.targetItemId) {
      throw new Error('Source and target items must be different')
    }

    // Generate unique ID or use provided ID
    this.id = data.id || this._generateUUID()

    // Set required fields
    this.sourceItemId = data.sourceItemId
    this.targetItemId = data.targetItemId
    this.connectionType = data.connectionType
    this.strength = data.strength

    // Set optional fields with defaults
    this.description = data.description || ''
    this.isUserVerified = data.isUserVerified || false
    this.userNotes = data.userNotes || ''
    
    // Set timestamps
    this.dateDiscovered = data.dateDiscovered ? new Date(data.dateDiscovered) : new Date()

    // AI analysis data
    this.aiAnalysis = data.aiAnalysis || null
  }

  /**
   * Validate item ID format
   * @param {string} id - Item ID to validate
   * @returns {boolean} True if valid
   */
  _isValidItemId(id) {
    // Treat null, undefined, and non-strings as invalid
    return id !== null && id !== undefined && typeof id === 'string' && id.trim() !== '' && !id.includes(' ')
  }

  /**
   * Generate a UUID v4
   * @returns {string} UUID v4 string
   */
  _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Verify connection with user input
   * @param {boolean} verified - Whether user verified the connection
   * @param {string} notes - User notes about verification
   */
  verifyConnection(verified, notes = '') {
    this.isUserVerified = verified
    if (notes) {
      this.userNotes = notes
    }
  }

  /**
   * Update connection strength
   * @param {number} newStrength - New strength value
   * @param {string} reason - Reason for update
   */
  updateStrength(newStrength, reason = '') {
    if (newStrength < Connection.MIN_STRENGTH || newStrength > Connection.MAX_STRENGTH) {
      throw new Error('Strength must be between 0.0 and 1.0')
    }
    
    this.strength = newStrength
    if (reason) {
      this.userNotes = this.userNotes ? `${this.userNotes}; ${reason}` : reason
    }
  }

  /**
   * Create reciprocal connection (swap source and target)
   * @returns {Connection} New connection with swapped endpoints
   */
  getReciprocalConnection() {
    return new Connection({
      sourceItemId: this.targetItemId,
      targetItemId: this.sourceItemId,
      connectionType: this.connectionType,
      strength: this.strength,
      description: this.description,
      isUserVerified: this.isUserVerified,
      userNotes: this.userNotes,
      dateDiscovered: this.dateDiscovered,
      aiAnalysis: this.aiAnalysis
    })
  }

  /**
   * Get the opposite item ID given one endpoint
   * @param {string} itemId - One of the connection endpoints
   * @returns {string|null} The other endpoint or null if not found
   */
  getOppositeItemId(itemId) {
    if (itemId === this.sourceItemId) {
      return this.targetItemId
    } else if (itemId === this.targetItemId) {
      return this.sourceItemId
    }
    return null
  }

  /**
   * Check if connection is strong based on threshold
   * @param {number} threshold - Strength threshold (default 0.8)
   * @returns {boolean} True if connection strength is above threshold
   */
  isStrongConnection(threshold = 0.8) {
    return this.strength >= threshold
  }

  /**
   * Calculate connection confidence including user verification boost
   * @returns {number} Confidence score between 0.0 and 1.0
   */
  getConfidence() {
    let confidence = this.strength
    
    // Boost confidence for user-verified connections
    if (this.isUserVerified) {
      confidence = Math.min(1.0, confidence * 1.1)
    }
    
    return confidence
  }

  /**
   * Check if connection type is bidirectional
   * @returns {boolean} True if connection works in both directions
   */
  isBidirectional() {
    // Similarity and topic-related connections are bidirectional
    return ['similarity', 'topic-related', 'temporal'].includes(this.connectionType)
  }

  /**
   * Get aged strength accounting for time decay
   * @returns {number} Strength adjusted for age
   */
  getAgedStrength() {
    const now = new Date()
    const ageInDays = (now - this.dateDiscovered) / (1000 * 60 * 60 * 24)
    
    // Apply decay factor (connections get weaker over time unless verified)
    const decayFactor = this.isUserVerified ? 0.95 : 0.9
    const decayRate = Math.pow(decayFactor, ageInDays / 30) // Decay per month
    
    return Math.max(0, this.strength * decayRate)
  }

  /**
   * Calculate composite score for ranking connections
   * @param {Object} weights - Scoring weights
   * @returns {number} Composite score
   */
  calculateScore(weights = {}) {
    const defaultWeights = {
      strengthWeight: 0.7,
      verificationWeight: 0.2,
      typeWeight: 0.1
    }
    
    const w = { ...defaultWeights, ...weights }
    
    let score = this.strength * w.strengthWeight
    
    // Verification bonus
    if (this.isUserVerified) {
      score += 0.2 * w.verificationWeight
    }
    
    // Type importance (citations and causals are more valuable)
    const typeBonus = ['citation', 'causal'].includes(this.connectionType) ? 0.1 : 0
    score += typeBonus * w.typeWeight
    
    return Math.min(1.0, score)
  }

  /**
   * Merge with another connection of the same endpoints
   * @param {Connection} other - Other connection to merge with
   * @returns {Connection} Merged connection
   */
  mergeWith(other) {
    if (this.sourceItemId !== other.sourceItemId || this.targetItemId !== other.targetItemId) {
      throw new Error('Can only merge connections with same endpoints')
    }
    
    // Use higher strength and combine descriptions
    const mergedStrength = Math.min(1.0, Math.max(this.strength, other.strength) * 1.05)
    const mergedDescription = [this.description, other.description]
      .filter(desc => desc.trim() !== '')
      .join('; ')
    
    return new Connection({
      sourceItemId: this.sourceItemId,
      targetItemId: this.targetItemId,
      connectionType: this.connectionType,
      strength: mergedStrength,
      description: mergedDescription,
      isUserVerified: this.isUserVerified || other.isUserVerified,
      userNotes: this.userNotes || other.userNotes,
      dateDiscovered: this.dateDiscovered < other.dateDiscovered ? this.dateDiscovered : other.dateDiscovered
    })
  }

  /**
   * Set AI analysis data
   * @param {Object} analysis - AI analysis results
   */
  setAIAnalysis(analysis) {
    this.aiAnalysis = analysis
  }

  /**
   * Get AI analysis data
   * @returns {Object} AI analysis results
   */
  getAIAnalysis() {
    return this.aiAnalysis
  }

  /**
   * Convert to JSON format
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      sourceItemId: this.sourceItemId,
      targetItemId: this.targetItemId,
      connectionType: this.connectionType,
      strength: this.strength,
      description: this.description,
      isUserVerified: this.isUserVerified,
      userNotes: this.userNotes,
      dateDiscovered: this.dateDiscovered.toISOString(),
      aiAnalysis: this.aiAnalysis
    }
  }

  /**
   * Create Connection from JSON data
   * @param {Object} jsonData - JSON representation
   * @returns {Connection} Connection instance
   */
  static fromJSON(jsonData) {
    return new Connection({
      ...jsonData,
      dateDiscovered: jsonData.dateDiscovered
    })
  }

  /**
   * Convert to Chrome Storage format
   * @returns {Object} Storage-compatible format
   */
  toStorageFormat() {
    return {
      id: this.id,
      sourceItemId: this.sourceItemId,
      targetItemId: this.targetItemId,
      connectionType: this.connectionType,
      strength: this.strength,
      description: this.description,
      isUserVerified: this.isUserVerified,
      userNotes: this.userNotes,
      dateDiscovered: this.dateDiscovered.toISOString(),
      aiAnalysis: this.aiAnalysis
    }
  }

  /**
   * Convert to graph database format
   * @returns {Object} Graph format
   */
  toGraphFormat() {
    return {
      source: this.sourceItemId,
      target: this.targetItemId,
      weight: this.strength,
      type: this.connectionType,
      properties: {
        id: this.id,
        description: this.description,
        isUserVerified: this.isUserVerified,
        userNotes: this.userNotes,
        dateDiscovered: this.dateDiscovered.toISOString(),
        aiAnalysis: this.aiAnalysis
      }
    }
  }
}

// Export for CommonJS (Node.js/Jest) and ES modules
if (typeof module !== 'undefined' && module.exports) {
  // Node.js/Jest environment
  module.exports = { Connection }
} else {
  // Browser environment
  window.Connection = Connection
}

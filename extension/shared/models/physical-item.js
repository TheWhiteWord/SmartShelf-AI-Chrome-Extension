/**
 * PhysicalItem Model
 * Extends ContentItem with physical-specific metadata for books, documents, and materials
 * Based on specs/001-smartshelf-ai-powered/data-model.md
 */

// Import ContentItem for inheritance - Browser/Node.js compatible
let ContentItem
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  // Node.js environment
  ({ ContentItem } = require('./content-item.js'))
} else {
  // Browser environment - ContentItem should be globally available
  ContentItem = window.ContentItem || globalThis.ContentItem
  
  // If not available, try to load it
  if (!ContentItem) {
    console.error('ContentItem not found. Make sure content-item.js is loaded before physical-item.js')
  }
}

// Prevent duplicate class definition in browser environment
if (typeof window !== 'undefined' && window.PhysicalItem) {
  console.log('PhysicalItem already defined, skipping redefinition')
} else {

class PhysicalItem extends ContentItem {
  // Static properties for loan statuses and conditions
  static LOAN_STATUSES = ['available', 'loaned-out', 'borrowed']
  static CONDITIONS = ['excellent', 'good', 'fair', 'poor']
  constructor(data = {}) {
    // Set physical item defaults and call parent constructor
    const physicalData = {
      ...data,
      isPhysical: true, // Always true for PhysicalItem
      type: data.type || 'book' // Default type for physical items
    }
    
    super(physicalData)

    // Validate physical-specific fields
    this._validatePhysicalFields(data)

    // Physical-specific fields
    this.isbn = data.isbn || null
    this.author = data.author || null
    this.publisher = data.publisher || null
    this.physicalLocation = data.physicalLocation || null
    this.digitalVersion = data.digitalVersion || null
    this.acquisitionDate = data.acquisitionDate ? (data.acquisitionDate instanceof Date ? data.acquisitionDate : new Date(data.acquisitionDate)) : null
    this.condition = data.condition || 'good'
    this.loanStatus = data.loanStatus || 'available'
    this.loanedTo = data.loanedTo || null
    this.loanDate = data.loanDate ? new Date(data.loanDate) : null
    this.expectedReturn = data.expectedReturn ? new Date(data.expectedReturn) : null
    
    // Initialize metadata if not inherited from parent
    if (!this.metadata) {
      this.metadata = {}
    }
  }

  /**
   * Validate physical-specific fields
   * @param {Object} data - Data to validate
   */
  _validatePhysicalFields(data) {
    // Validate ISBN format if provided
    if (data.isbn && !this.validateISBN(data.isbn)) {
      throw new Error('Invalid ISBN format')
    }

    // Validate condition - check for invalid conditions explicitly  
    if (data.condition !== undefined && data.condition !== null && !PhysicalItem.CONDITIONS.includes(data.condition)) {
      throw new Error('Invalid condition')
    }

    // Validate loan status - check for invalid loan statuses explicitly
    if (data.loanStatus !== undefined && data.loanStatus !== null && !PhysicalItem.LOAN_STATUSES.includes(data.loanStatus)) {
      throw new Error('Invalid loan status')
    }

    // Validate digital version URL format if provided
    if (data.digitalVersion && !this._isValidUrl(data.digitalVersion)) {
      throw new Error('Invalid digital version URL')
    }
  }

  /**
   * Check if URL is valid format (only http/https allowed for digital versions)
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  _isValidUrl(url) {
    try {
      const urlObj = new URL(url)
      // Only allow http/https protocols for digital versions
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  /**
   * Validate ISBN format (lenient - format only, not checksum)
   * @param {string} isbn - ISBN to validate
   * @returns {boolean} True if valid
   */
  validateISBN(isbn = this.isbn) {
    if (!isbn) return true // Empty ISBN is valid (optional field)

    // Remove hyphens and spaces
    const cleanISBN = isbn.replace(/[-\s]/g, '')

    // Check ISBN-10 format (10 digits, last can be X)
    if (cleanISBN.length === 10) {
      return /^\d{9}[\dX]$/.test(cleanISBN)
    }

    // Check ISBN-13 format (13 digits)
    if (cleanISBN.length === 13) {
      return /^\d{13}$/.test(cleanISBN)
    }

    return false
  }

  /**
   * Validate ISBN-10 format and checksum
   * @param {string} isbn - Clean ISBN-10 string
   * @returns {boolean} Whether ISBN-10 is valid
   */
  _validateISBN10(isbn) {
    if (!/^\d{9}[\dX]$/.test(isbn)) return false

    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(isbn[i]) * (10 - i)
    }

    const checkDigit = isbn[9] === 'X' ? 10 : parseInt(isbn[9])
    return (sum + checkDigit) % 11 === 0
  }

  /**
   * Validate ISBN-13 format and checksum
   * @param {string} isbn - Clean ISBN-13 string
   * @returns {boolean} Whether ISBN-13 is valid
   */
  _validateISBN13(isbn) {
    if (!/^\d{13}$/.test(isbn)) return false

    let sum = 0
    for (let i = 0; i < 12; i++) {
      sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3)
    }

    const checkDigit = parseInt(isbn[12])
    return (10 - (sum % 10)) % 10 === checkDigit
  }

  /**
   * Search for digital version using Internet Archive API
   * @returns {Promise<Object|null>} Digital version info or null
   */
  async searchDigitalVersion() {
    try {
      // Search by ISBN first if available
      let query = ''
      if (this.isbn) {
        query = `isbn:${this.isbn}`
      } else if (this.title && this.author) {
        query = `title:"${this.title}" AND creator:"${this.author}"`
      } else if (this.title) {
        query = `title:"${this.title}"`
      } else {
        return null
      }

      const response = await fetch(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&output=json&rows=5`)
      
      if (!response.ok) {
        throw new Error('Internet Archive API error')
      }

      const data = await response.json()
      
      if (data.docs && data.docs.length > 0) {
        const doc = data.docs[0]
        return {
          identifier: doc.identifier,
          title: doc.title,
          creator: doc.creator || [],
          year: doc.year || [],
          url: `https://archive.org/details/${doc.identifier}`
        }
      }

      return null
    } catch (error) {
      console.error('Error searching digital version:', error)
      return null
    }
  }

  /**
   * Update loan status with validation
   * @param {string} newStatus - New loan status
   * @param {Object} loanInfo - Optional loan information
   */
  updateLoanStatus(newStatus, loanInfo = {}) {
    if (!PhysicalItem.LOAN_STATUSES.includes(newStatus)) {
      throw new Error('Invalid loan status')
    }

    this.loanStatus = newStatus
    this.updateModifiedDate()

    // Ensure metadata exists
    if (!this.metadata) {
      this.metadata = {}
    }

    // Handle loan information
    if (newStatus !== 'available') {
      // Set loanInfo property directly (expected by tests)
      this.loanInfo = {
        borrower: loanInfo.borrower || loanInfo.loanedTo || null,
        dueDate: loanInfo.dueDate ? new Date(loanInfo.dueDate) : (loanInfo.expectedReturn ? new Date(loanInfo.expectedReturn) : null),
        loanDate: loanInfo.loanDate ? new Date(loanInfo.loanDate) : new Date(),
        notes: loanInfo.notes || ''
      }
      
      // Also store in metadata for persistence
      this.metadata.loanInfo = this.loanInfo
    } else {
      // Clear loan info when returned
      this.loanInfo = null
      delete this.metadata.loanInfo
    }
  }

  /**
   * Update physical condition
   * @param {string} newCondition - New condition
   * @param {string} notes - Optional condition notes
   */
  updateCondition(newCondition, notes = '') {
    if (!PhysicalItem.CONDITIONS.includes(newCondition)) {
      throw new Error('Invalid condition')
    }

    this.condition = newCondition
    this.updateModifiedDate()

    // Ensure metadata exists
    if (!this.metadata) {
      this.metadata = {}
    }

    // Set conditionNotes as direct property (expected by tests)
    this.conditionNotes = notes || null
    
    // Also store in metadata for persistence
    if (notes) {
      this.metadata.conditionNotes = notes
    } else {
      delete this.metadata.conditionNotes
    }
  }

  /**
   * Update physical location
   * @param {string} newLocation - New physical location
   */
  updatePhysicalLocation(newLocation) {
    this.physicalLocation = newLocation
    this.updateModifiedDate()
  }

  /**
   * Convert to JSON-serializable object for storage
   * @returns {Object} Serializable representation
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      type: this.type,
      source: this.source,
      contentText: this.contentText,
      summary: this.summary,
      tags: this.tags,
      categories: this.categories,
      dateAdded: this.dateAdded,
      dateModified: this.dateModified,
      isPhysical: this.isPhysical,
      notes: this.notes,
      status: this.status,

      // Physical-specific fields
      isbn: this.isbn,
      author: this.author,
      publisher: this.publisher,
      physicalLocation: this.physicalLocation,
      digitalVersion: this.digitalVersion,
      acquisitionDate: this.acquisitionDate,
      condition: this.condition,
      loanStatus: this.loanStatus,

      metadata: this.metadata,
      connections: this.connections,
      viewCount: this.viewCount,
      lastViewed: this.lastViewed
    }
  }

  /**
   * Create PhysicalItem from stored JSON data
   * @param {Object} jsonData - Stored JSON representation
   * @returns {PhysicalItem} New PhysicalItem instance
   */
  static fromJSON(jsonData) {
    return new PhysicalItem(jsonData)
  }



  /**
   * Search Internet Archive by ISBN
   * @param {string} isbn - Book ISBN
   * @returns {Promise<Object|null>} Digital version info
   */
  async searchByISBN(isbn) {
    try {
      const searchUrl = `https://archive.org/advancedsearch.php?q=identifier:${isbn}&fl=identifier,title,creator,date&rows=1&page=1&output=json`
      const response = await fetch(searchUrl)
      const data = await response.json()

      if (data.response && data.response.docs && data.response.docs.length > 0) {
        const item = data.response.docs[0]
        return {
          identifier: item.identifier,
          url: `https://archive.org/details/${item.identifier}`,
          title: item.title,
          creator: item.creator,
          date: item.date,
          source: 'Internet Archive',
          searchMethod: 'ISBN'
        }
      }

      return null
    } catch (error) {
      console.error('ISBN search failed:', error)
      return null
    }
  }

  /**
   * Search Internet Archive by title and author
   * @param {string} title - Book title
   * @param {string} author - Book author
   * @returns {Promise<Object|null>} Digital version info
   */
  async searchByTitleAuthor(title, author) {
    try {
      const query = `title:"${title}" AND creator:"${author}"`
      const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl=identifier,title,creator,date&rows=1&page=1&output=json`
      const response = await fetch(searchUrl)
      const data = await response.json()

      if (data.response && data.response.docs && data.response.docs.length > 0) {
        const item = data.response.docs[0]
        return {
          identifier: item.identifier,
          url: `https://archive.org/details/${item.identifier}`,
          title: item.title,
          creator: item.creator,
          date: item.date,
          source: 'Internet Archive',
          searchMethod: 'Title-Author'
        }
      }

      return null
    } catch (error) {
      console.error('Title-Author search failed:', error)
      return null
    }
  }





  /**
   * Generate searchable text for indexing
   * @returns {string} Combined searchable text
   */
  getSearchableText() {
    const searchFields = [
      this.title,
      this.author,
      this.publisher,
      this.notes,
      this.tags.join(' '),
      this.categories.join(' '),
      this.contentText,
      this.summary,
      this.physicalLocation,
      this.isbn,
      this.metadata.genre?.join(' ') || ''
    ]

    return searchFields.filter(field => field && field.trim().length > 0).join(' ')
  }

  /**
   * Get display title with author
   * @returns {string} Formatted display title
   */
  getDisplayTitle() {
    if (this.author) {
      return `${this.title} by ${this.author}`
    }
    return this.title
  }

  /**
   * Check if item is currently available (not loaned out)
   * @returns {boolean} Whether item is available
   */
  isAvailable() {
    return this.loanStatus === 'available'
  }

  /**
   * Get formatted acquisition info
   * @returns {Object} Formatted acquisition information
   */
  getAcquisitionInfo() {
    const date = new Date(this.acquisitionDate)
    return {
      date: this.acquisitionDate,
      formatted: date.toLocaleDateString(),
      yearsOwned: Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365))
    }
  }

  /**
   * Calculate loan duration in days
   * @returns {number|null} Days loaned or null if not loaned
   */
  getLoanDuration() {
    if (!this.loanDate || this.loanStatus === 'available') {
      return null
    }
    
    const now = new Date()
    const loanStart = new Date(this.loanDate)
    return Math.floor((now - loanStart) / (1000 * 60 * 60 * 24))
  }

  /**
   * Check if loan is overdue
   * @returns {boolean} True if overdue
   */
  isOverdue() {
    if (!this.expectedReturn || this.loanStatus === 'available') {
      return false
    }
    
    return new Date() > new Date(this.expectedReturn)
  }

  /**
   * Get days until due or overdue
   * @returns {number|null} Days (negative if overdue) or null if no due date
   */
  getDaysUntilDue() {
    if (!this.expectedReturn || this.loanStatus === 'available') {
      return null
    }
    
    const now = new Date()
    const dueDate = new Date(this.expectedReturn)
    return Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
  }

  /**
   * Override toJSON to include physical-specific fields
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      ...super.toJSON(),
      isbn: this.isbn,
      author: this.author,
      publisher: this.publisher,
      physicalLocation: this.physicalLocation,
      digitalVersion: this.digitalVersion,
      acquisitionDate: this.acquisitionDate ? this.acquisitionDate.toISOString() : null,
      condition: this.condition,
      loanStatus: this.loanStatus,
      loanedTo: this.loanedTo,
      loanDate: this.loanDate ? this.loanDate.toISOString() : null,
      expectedReturn: this.expectedReturn ? this.expectedReturn.toISOString() : null
    }
  }

  /**
   * Create PhysicalItem from JSON data
   * @param {Object} jsonData - JSON representation
   * @returns {PhysicalItem} PhysicalItem instance
   */
  static fromJSON(jsonData) {
    return new PhysicalItem(jsonData)
  }

  /**
   * Search by ISBN (helper method)
   * @private
   */
  async _searchByISBN(isbn) {
    // Implementation would call Internet Archive API
    // Simplified for testing
    return null
  }

  /**
   * Search by title and author (helper method)
   * @private
   */
  async _searchByTitleAuthor(title, author) {
    // Implementation would call Internet Archive API
    // Simplified for testing
    return null
  }

  /**
   * Check if item is available for loan (alias for isAvailable)
   * @returns {boolean} True if available for loan
   */
  isAvailableForLoan() {
    return this.isAvailable()
  }

  /**
   * Link a digital version to this physical item
   * @param {Object} digitalInfo - Optional digital version information. If not provided, will search automatically.
   */
  async linkDigitalVersion(digitalInfo) {
    if (!digitalInfo) {
      // Automatically search for digital version
      digitalInfo = await this.searchDigitalVersion()
    }
    
    if (digitalInfo && digitalInfo.url) {
      this.digitalVersion = digitalInfo.url
    } else if (digitalInfo) {
      this.digitalVersion = digitalInfo
    }
    
    this.updateModifiedDate()
  }

  /**
   * Query Internet Archive API for related items
   * @returns {Promise<Array>} Array of archive results
   */
  async queryInternetArchive() {
    try {
      // Search by ISBN first if available
      let query = ''
      if (this.isbn) {
        query = `isbn:${this.isbn}`
      } else if (this.title && this.author) {
        query = `title:"${this.title}" AND creator:"${this.author}"`
      } else if (this.title) {
        query = `title:"${this.title}"`
      } else {
        return []
      }

      const response = await fetch(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&output=json&rows=5`)
      
      if (!response.ok) {
        throw new Error('Internet Archive API error')
      }

      const data = await response.json()
      
      if (data.docs && data.docs.length > 0) {
        return data.docs.map(doc => ({
          identifier: doc.identifier,
          title: doc.title,
          creator: doc.creator || [],
          year: doc.year || [],
          isbn: doc.isbn || [],
          url: `https://archive.org/details/${doc.identifier}`
        }))
      }

      return []
    } catch (error) {
      console.error('Error querying Internet Archive:', error)
      return []
    }
  }

  /**
   * Update item information from barcode scan
   * @param {Object} barcodeData - Data from barcode scan
   */
  updateFromBarcode(barcodeData) {
    if (barcodeData.isbn) {
      this.isbn = barcodeData.isbn
    }
    if (barcodeData.title) {
      this.title = barcodeData.title
    }
    if (barcodeData.author) {
      this.author = barcodeData.author
    }
    if (barcodeData.publisher) {
      this.publisher = barcodeData.publisher
    }
    this.updateModifiedDate()
  }

  /**
   * Get loan duration in days
   * @returns {number|null} Number of days loaned, or null if not loaned
   */
  getLoanDuration() {
    if (!this.loanInfo || !this.loanInfo.loanDate) {
      return null
    }
    
    const loanDate = new Date(this.loanInfo.loanDate)
    const now = new Date()
    const diffTime = Math.abs(now - loanDate)
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) // Convert to days
  }

  /**
   * Check if loan is overdue
   * @returns {boolean} Whether loan is overdue
   */
  isOverdue() {
    if (!this.loanInfo || !this.loanInfo.dueDate || this.loanStatus === 'available') {
      return false
    }
    
    const dueDate = new Date(this.loanInfo.dueDate)
    const now = new Date()
    return now > dueDate
  }

  /**
   * Get location change history
   * @returns {Array} Array of location changes
   */
  getLocationHistory() {
    if (!this.metadata || !this.metadata.locationHistory) {
      return []
    }
    // Convert to expected format: {location, timestamp}
    return this.metadata.locationHistory.map(entry => ({
      location: entry.to,
      timestamp: new Date(entry.date)
    }))
  }

  /**
   * Override updatePhysicalLocation to track history
   * @param {string} newLocation - New physical location
   */
  updatePhysicalLocation(newLocation) {
    const oldLocation = this.physicalLocation
    this.physicalLocation = newLocation
    this.updateModifiedDate()
    
    // Track location history
    if (!this.metadata.locationHistory) {
      this.metadata.locationHistory = []
    }
    this.metadata.locationHistory.push({
      from: oldLocation,
      to: newLocation,
      date: new Date().toISOString()
    })
  }
}

// Export for CommonJS (Node.js/Jest) and ES modules
if (typeof module !== 'undefined' && module.exports) {
  // Node.js/Jest environment
  module.exports = { PhysicalItem }
} else {
  // Browser environment
  window.PhysicalItem = PhysicalItem
}

} // End of guard clause

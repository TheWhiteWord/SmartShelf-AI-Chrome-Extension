/**
 * Entity Model Test: PhysicalItem
 * 
 * CRITICAL: This test MUST FAIL until proper implementation exists.
 * Tests the PhysicalItem model based on data-model.md specifications
 */

describe('PhysicalItem Model - T014', () => {
  let PhysicalItem
  let ContentItem

  beforeEach(() => {
    try {
      const { PhysicalItem: PhysicalItemClass } = require('../../../extension/shared/models/physical-item.js')
      PhysicalItem = PhysicalItemClass
      
      const { ContentItem: ContentItemClass } = require('../../../extension/shared/models/content-item.js')
      ContentItem = ContentItemClass
    } catch (error) {
      PhysicalItem = null
      ContentItem = null
    }
  })

  describe('PhysicalItem Class Definition', () => {
    test('should exist as a class extending ContentItem', () => {
      expect(PhysicalItem).toBeDefined()
      expect(typeof PhysicalItem).toBe('function')
      expect(PhysicalItem.prototype).toBeInstanceOf(ContentItem)
    })

    test('should have physical item specific static properties', () => {
      expect(PhysicalItem.LOAN_STATUSES).toBeDefined()
      expect(PhysicalItem.LOAN_STATUSES).toEqual(['available', 'loaned-out', 'borrowed'])
      
      expect(PhysicalItem.CONDITIONS).toBeDefined()
      expect(PhysicalItem.CONDITIONS).toEqual(['excellent', 'good', 'fair', 'poor'])
    })
  })

  describe('PhysicalItem Constructor', () => {
    test('should create PhysicalItem with required fields', () => {
      const data = {
        title: 'JavaScript: The Good Parts',
        type: 'book',
        source: 'O\'Reilly Media',
        author: 'Douglas Crockford',
        isbn: '978-0-596-51774-8'
      }

      const item = new PhysicalItem(data)

      // Should inherit ContentItem properties
      expect(item.id).toBeDefined()
      expect(item.title).toBe(data.title)
      expect(item.type).toBe(data.type)
      expect(item.source).toBe(data.source)
      expect(item.isPhysical).toBe(true) // Should auto-set to true

      // Should have physical-specific properties
      expect(item.author).toBe(data.author)
      expect(item.isbn).toBe(data.isbn)
      expect(item.loanStatus).toBe('available') // Default value
    })

    test('should set default values for physical item fields', () => {
      const item = new PhysicalItem({
        title: 'Test Book',
        type: 'book',
        source: 'Test Publisher'
      })

      expect(item.isbn).toBeNull()
      expect(item.author).toBeNull()
      expect(item.publisher).toBeNull()
      expect(item.physicalLocation).toBeNull()
      expect(item.digitalVersion).toBeNull()
      expect(item.acquisitionDate).toBeNull()
      expect(item.condition).toBe('good') // Default condition
      expect(item.loanStatus).toBe('available') // Default loan status
    })

    test('should accept and set provided physical item fields', () => {
      const data = {
        title: 'Complete Physical Item',
        type: 'book',
        source: 'Publisher Name',
        isbn: '978-1-234567-89-0',
        author: 'John Author',
        publisher: 'Publisher Name',
        physicalLocation: 'Bookshelf A, Row 3',
        digitalVersion: 'https://archive.org/details/book-title',
        acquisitionDate: new Date('2025-01-15'),
        condition: 'excellent',
        loanStatus: 'available'
      }

      const item = new PhysicalItem(data)

      expect(item.isbn).toBe(data.isbn)
      expect(item.author).toBe(data.author)
      expect(item.publisher).toBe(data.publisher)
      expect(item.physicalLocation).toBe(data.physicalLocation)
      expect(item.digitalVersion).toBe(data.digitalVersion)
      expect(item.acquisitionDate).toBe(data.acquisitionDate)
      expect(item.condition).toBe(data.condition)
      expect(item.loanStatus).toBe(data.loanStatus)
    })
  })

  describe('PhysicalItem Validation', () => {
    test('should validate ISBN format when provided', () => {
      const validISBNs = [
        '978-0-596-51774-8',
        '978-1-234567-89-0',
        '0-596-51774-0',
        '1234567890'
      ]

      const invalidISBNs = [
        '978-invalid-isbn',
        '123-456-789',
        'not-an-isbn',
        '978-0-596-51774-X' // Invalid check digit
      ]

      validISBNs.forEach(isbn => {
        const item = new PhysicalItem({
          title: 'ISBN Test',
          type: 'book',
          source: 'test',
          isbn: isbn
        })
        expect(item.isbn).toBe(isbn)
      })

      invalidISBNs.forEach(isbn => {
        expect(() => new PhysicalItem({
          title: 'ISBN Test',
          type: 'book',
          source: 'test',
          isbn: isbn
        })).toThrow('Invalid ISBN format')
      })
    })

    test('should validate condition enum', () => {
      const validConditions = ['excellent', 'good', 'fair', 'poor']
      const invalidConditions = ['perfect', 'bad', 'terrible', '']

      validConditions.forEach(condition => {
        const item = new PhysicalItem({
          title: 'Condition Test',
          type: 'book',
          source: 'test',
          condition: condition
        })
        expect(item.condition).toBe(condition)
      })

      invalidConditions.forEach(condition => {
        expect(() => new PhysicalItem({
          title: 'Condition Test',
          type: 'book',
          source: 'test',
          condition: condition
        })).toThrow('Invalid condition')
      })
    })

    test('should validate loan status enum', () => {
      const validStatuses = ['available', 'loaned-out', 'borrowed']
      const invalidStatuses = ['lost', 'stolen', 'damaged', '']

      validStatuses.forEach(status => {
        const item = new PhysicalItem({
          title: 'Loan Status Test',
          type: 'book',
          source: 'test',
          loanStatus: status
        })
        expect(item.loanStatus).toBe(status)
      })

      invalidStatuses.forEach(status => {
        expect(() => new PhysicalItem({
          title: 'Loan Status Test',
          type: 'book',
          source: 'test',
          loanStatus: status
        })).toThrow('Invalid loan status')
      })
    })

    test('should validate digital version URL format', () => {
      const validUrls = [
        'https://archive.org/details/book-title',
        'http://example.com/digital-book',
        'https://library.example.com/ebook/123'
      ]

      const invalidUrls = [
        'not-a-url',
        'ftp://invalid-protocol.com',
        'javascript:alert("xss")'
      ]

      validUrls.forEach(url => {
        const item = new PhysicalItem({
          title: 'URL Test',
          type: 'book',
          source: 'test',
          digitalVersion: url
        })
        expect(item.digitalVersion).toBe(url)
      })

      invalidUrls.forEach(url => {
        expect(() => new PhysicalItem({
          title: 'URL Test',
          type: 'book',
          source: 'test',
          digitalVersion: url
        })).toThrow('Invalid digital version URL')
      })
    })
  })

  describe('PhysicalItem Methods', () => {
    let testItem

    beforeEach(() => {
      testItem = new PhysicalItem({
        title: 'Method Test Book',
        type: 'book',
        source: 'Test Publisher',
        isbn: '978-0-596-51774-8',
        author: 'Test Author',
        condition: 'good',
        loanStatus: 'available',
        physicalLocation: 'Shelf A1'
      })
    })

    test('should implement validateISBN() method', () => {
      expect(typeof testItem.validateISBN).toBe('function')
      
      expect(testItem.validateISBN('978-0-596-51774-8')).toBe(true)
      expect(testItem.validateISBN('invalid-isbn')).toBe(false)
      expect(testItem.validateISBN('')).toBe(true) // Empty is allowed
      expect(testItem.validateISBN(null)).toBe(true) // Null is allowed
    })

    test('should implement searchDigitalVersion() method', async () => {
      expect(typeof testItem.searchDigitalVersion).toBe('function')
      
      // Mock Internet Archive API response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          docs: [
            {
              identifier: 'book-identifier',
              title: 'Method Test Book',
              creator: ['Test Author'],
              year: ['2025']
            }
          ]
        })
      })

      const digitalVersion = await testItem.searchDigitalVersion()
      
      expect(digitalVersion).toMatchObject({
        identifier: expect.any(String),
        title: expect.any(String),
        url: expect.stringContaining('archive.org')
      })
    })

    test('should implement updateLoanStatus() method', () => {
      expect(typeof testItem.updateLoanStatus).toBe('function')
      
      testItem.updateLoanStatus('loaned-out', {
        borrower: 'John Doe',
        dueDate: new Date('2025-10-27')
      })

      expect(testItem.loanStatus).toBe('loaned-out')
      expect(testItem.loanInfo).toMatchObject({
        borrower: 'John Doe',
        dueDate: expect.any(Date)
      })
    })

    test('should implement updateCondition() method', () => {
      expect(typeof testItem.updateCondition).toBe('function')
      
      testItem.updateCondition('fair', 'Some wear on cover')
      
      expect(testItem.condition).toBe('fair')
      expect(testItem.conditionNotes).toBe('Some wear on cover')
      expect(testItem.dateModified.getTime()).toBeGreaterThan(testItem.dateAdded.getTime())
    })

    test('should implement updatePhysicalLocation() method', () => {
      expect(typeof testItem.updatePhysicalLocation).toBe('function')
      
      testItem.updatePhysicalLocation('Shelf B2')
      
      expect(testItem.physicalLocation).toBe('Shelf B2')
      expect(testItem.dateModified.getTime()).toBeGreaterThan(testItem.dateAdded.getTime())
    })

    test('should override toJSON() method with physical fields', () => {
      const json = testItem.toJSON()
      
      expect(json).toMatchObject({
        // ContentItem fields
        id: testItem.id,
        title: testItem.title,
        type: testItem.type,
        source: testItem.source,
        isPhysical: true,
        
        // PhysicalItem specific fields
        isbn: testItem.isbn,
        author: testItem.author,
        publisher: testItem.publisher,
        physicalLocation: testItem.physicalLocation,
        digitalVersion: testItem.digitalVersion,
        condition: testItem.condition,
        loanStatus: testItem.loanStatus
      })

      if (testItem.acquisitionDate) {
        expect(json.acquisitionDate).toBe(testItem.acquisitionDate.toISOString())
      }
    })

    test('should support fromJSON() static method for physical items', () => {
      expect(typeof PhysicalItem.fromJSON).toBe('function')
      
      const jsonData = {
        id: 'physical-test-123',
        title: 'JSON Physical Book',
        type: 'book',
        source: 'JSON Publisher',
        isPhysical: true,
        isbn: '978-1-234567-89-0',
        author: 'JSON Author',
        condition: 'excellent',
        loanStatus: 'available',
        acquisitionDate: '2025-01-15T00:00:00.000Z',
        dateAdded: '2025-09-27T10:00:00.000Z',
        dateModified: '2025-09-27T11:00:00.000Z'
      }

      const item = PhysicalItem.fromJSON(jsonData)
      
      expect(item).toBeInstanceOf(PhysicalItem)
      expect(item.isbn).toBe(jsonData.isbn)
      expect(item.author).toBe(jsonData.author)
      expect(item.condition).toBe(jsonData.condition)
      expect(item.acquisitionDate).toBeInstanceOf(Date)
    })
  })

  describe('PhysicalItem Business Logic', () => {
    test('should determine if item is available for loan', () => {
      const availableItem = new PhysicalItem({
        title: 'Available Book',
        type: 'book',
        source: 'test',
        loanStatus: 'available'
      })

      const loanedItem = new PhysicalItem({
        title: 'Loaned Book',
        type: 'book',
        source: 'test',
        loanStatus: 'loaned-out'
      })

      expect(typeof availableItem.isAvailableForLoan).toBe('function')
      
      expect(availableItem.isAvailableForLoan()).toBe(true)
      expect(loanedItem.isAvailableForLoan()).toBe(false)
    })

    test('should calculate loan duration', () => {
      const item = new PhysicalItem({
        title: 'Loan Duration Test',
        type: 'book',
        source: 'test'
      })

      item.updateLoanStatus('loaned-out', {
        borrower: 'Test Borrower',
        loanDate: new Date('2025-09-20'),
        dueDate: new Date('2025-10-20')
      })

      expect(typeof item.getLoanDuration).toBe('function')
      
      const duration = item.getLoanDuration()
      expect(duration).toBeGreaterThan(0)
      expect(typeof duration).toBe('number')
    })

    test('should determine if loan is overdue', () => {
      const item = new PhysicalItem({
        title: 'Overdue Test',
        type: 'book',
        source: 'test'
      })

      // Set up overdue loan
      item.updateLoanStatus('loaned-out', {
        borrower: 'Test Borrower',
        dueDate: new Date('2025-09-01') // Past date
      })

      expect(typeof item.isOverdue).toBe('function')
      expect(item.isOverdue()).toBe(true)

      // Set up current loan
      item.updateLoanStatus('loaned-out', {
        borrower: 'Test Borrower',
        dueDate: new Date('2025-12-31') // Future date
      })

      expect(item.isOverdue()).toBe(false)
    })

    test('should support digital version integration', async () => {
      const item = new PhysicalItem({
        title: 'Digital Integration Test',
        type: 'book',
        source: 'test',
        isbn: '978-0-596-51774-8'
      })

      expect(typeof item.linkDigitalVersion).toBe('function')
      
      // Mock successful digital version discovery
      jest.spyOn(item, 'searchDigitalVersion').mockResolvedValue({
        identifier: 'test-book-123',
        title: 'Digital Integration Test',
        url: 'https://archive.org/details/test-book-123'
      })

      await item.linkDigitalVersion()
      
      expect(item.digitalVersion).toBe('https://archive.org/details/test-book-123')
    })
  })

  describe('PhysicalItem Integration', () => {
    test('should integrate with Internet Archive API', async () => {
      const item = new PhysicalItem({
        title: 'Internet Archive Test',
        type: 'book',
        source: 'test',
        isbn: '978-0-596-51774-8',
        author: 'Test Author'
      })

      expect(typeof item.queryInternetArchive).toBe('function')
      
      // Mock Internet Archive API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          docs: [
            {
              identifier: 'internet-archive-test',
              title: 'Internet Archive Test',
              creator: ['Test Author'],
              isbn: ['978-0-596-51774-8']
            }
          ]
        })
      })

      const results = await item.queryInternetArchive()
      
      expect(Array.isArray(results)).toBe(true)
      expect(results[0]).toMatchObject({
        identifier: expect.any(String),
        title: expect.any(String),
        creator: expect.arrayContaining([expect.any(String)])
      })
    })

    test('should support barcode scanning integration', () => {
      const item = new PhysicalItem({
        title: 'Barcode Test',
        type: 'book',
        source: 'test'
      })

      expect(typeof item.updateFromBarcode).toBe('function')
      
      const barcodeData = {
        isbn: '978-1-234567-89-0',
        title: 'Scanned Book Title',
        author: 'Scanned Author'
      }

      item.updateFromBarcode(barcodeData)
      
      expect(item.isbn).toBe(barcodeData.isbn)
      expect(item.title).toBe(barcodeData.title)
      expect(item.author).toBe(barcodeData.author)
    })

    test('should support location tracking', () => {
      const item = new PhysicalItem({
        title: 'Location Test',
        type: 'book',
        source: 'test',
        physicalLocation: 'Shelf A1'
      })

      expect(typeof item.getLocationHistory).toBe('function')
      
      item.updatePhysicalLocation('Shelf B2')
      item.updatePhysicalLocation('Shelf C3')
      
      const history = item.getLocationHistory()
      
      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBeGreaterThan(0)
      expect(history[0]).toMatchObject({
        location: expect.any(String),
        timestamp: expect.any(Date)
      })
    })
  })

  // This test will fail until PhysicalItem model is implemented
  test('PhysicalItem model should be implemented', () => {
    expect(PhysicalItem).toBeDefined()
    expect(PhysicalItem).not.toBeNull()
    if (ContentItem) {
      expect(PhysicalItem.prototype).toBeInstanceOf(ContentItem)
    }
  })
})
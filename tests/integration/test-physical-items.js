// Integration tests for Physical Item functionality
// Tests the complete workflow of physical item management including Internet Archive integration

const PhysicalItem = require('../../extension/shared/models/physical-item')

describe('Physical Item Integration', () => {
  let mockFetch

  beforeAll(() => {
    // Mock global setup
    global.fetch = jest.fn()
    global.chrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        },
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    }
  })

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    mockFetch = global.fetch
  })

  describe('Physical Item Creation and Management', () => {
    test('should create physical item with complete metadata', () => {
      const physicalItemData = {
        title: 'The Design of Everyday Things',
        author: 'Don Norman',
        publisher: 'Basic Books',
        isbn: '978-0465050659',
        physicalLocation: 'Home Office, Shelf 2',
        condition: 'good',
        loanStatus: 'available',
        acquisitionDate: '2023-01-15T00:00:00.000Z',
        metadata: {
          pageCount: 368,
          language: 'en',
          edition: 'Revised Edition',
          year: 2013,
          genre: ['Design', 'Psychology', 'Technology']
        }
      }

      const item = new PhysicalItem(physicalItemData)

      // Verify all physical item properties
      expect(item.title).toBe('The Design of Everyday Things')
      expect(item.author).toBe('Don Norman')
      expect(item.publisher).toBe('Basic Books')
      expect(item.isbn).toBe('978-0465050659')
      expect(item.physicalLocation).toBe('Home Office, Shelf 2')
      expect(item.condition).toBe('good')
      expect(item.loanStatus).toBe('available')
      expect(item.isPhysical).toBe(true)
      expect(item.status).toBe('manual')
      expect(item.type).toBe('book')

      // Verify metadata
      expect(item.metadata.pageCount).toBe(368)
      expect(item.metadata.language).toBe('en')
      expect(item.metadata.edition).toBe('Revised Edition')
      expect(item.metadata.year).toBe(2013)
      expect(item.metadata.genre).toEqual(['Design', 'Psychology', 'Technology'])

      // Verify ID generation
      expect(item.id).toMatch(/^physical_\d+_[a-z0-9]+$/)

      // Verify validation passes
      const validation = item.validate()
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    test('should validate required fields and formats', () => {
      // Test with missing title
      const invalidItem1 = new PhysicalItem({
        author: 'Test Author',
        physicalLocation: ''
      })

      const validation1 = invalidItem1.validate()
      expect(validation1.isValid).toBe(false)
      expect(validation1.errors).toContain('Title is required')
      expect(validation1.errors).toContain('Physical location is required for physical items')

      // Test with invalid ISBN
      const invalidItem2 = new PhysicalItem({
        title: 'Test Book',
        physicalLocation: 'Shelf 1',
        isbn: 'invalid-isbn'
      })

      const validation2 = invalidItem2.validate()
      expect(validation2.isValid).toBe(false)
      expect(validation2.errors).toContain('Invalid ISBN format')

      // Test with invalid loan status
      const invalidItem3 = new PhysicalItem({
        title: 'Test Book',
        physicalLocation: 'Shelf 1',
        loanStatus: 'invalid-status'
      })

      const validation3 = invalidItem3.validate()
      expect(validation3.isValid).toBe(false)
      expect(validation3.errors).toContain('Invalid loan status')
    })

    test('should validate ISBN-10 and ISBN-13 formats correctly', () => {
      const item = new PhysicalItem()

      // Valid ISBN-10
      expect(item.isValidISBN('0-306-40615-2')).toBe(true)
      expect(item.isValidISBN('0306406152')).toBe(true)

      // Valid ISBN-13
      expect(item.isValidISBN('978-0-306-40615-7')).toBe(true)
      expect(item.isValidISBN('9780306406157')).toBe(true)

      // Invalid ISBNs
      expect(item.isValidISBN('123456789')).toBe(false)
      expect(item.isValidISBN('978-0-306-40615-8')).toBe(false) // Wrong checksum
      expect(item.isValidISBN('invalid')).toBe(false)

      // Empty ISBN should be valid (optional field)
      expect(item.isValidISBN('')).toBe(true)
    })
  })

  describe('Internet Archive Integration', () => {
    test('should search for digital version by ISBN successfully', async () => {
      const mockInternetArchiveResponse = {
        response: {
          docs: [{
            identifier: 'designeverydaything00norm',
            title: 'The Design of Everyday Things',
            creator: 'Norman, Donald A',
            date: '2013'
          }]
        }
      }

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockInternetArchiveResponse)
      })

      const item = new PhysicalItem({
        title: 'The Design of Everyday Things',
        author: 'Don Norman',
        isbn: '978-0465050659',
        physicalLocation: 'Shelf 1'
      })

      const digitalVersion = await item.searchByISBN('978-0465050659')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('archive.org/advancedsearch.php')
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('identifier:978-0465050659')
      )

      expect(digitalVersion).toEqual({
        identifier: 'designeverydaything00norm',
        url: 'https://archive.org/details/designeverydaything00norm',
        title: 'The Design of Everyday Things',
        creator: 'Norman, Donald A',
        date: '2013',
        source: 'Internet Archive',
        searchMethod: 'ISBN'
      })
    })

    test('should search for digital version by title and author', async () => {
      const mockInternetArchiveResponse = {
        response: {
          docs: [{
            identifier: 'atomichabits00clea',
            title: 'Atomic Habits',
            creator: 'Clear, James',
            date: '2018'
          }]
        }
      }

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockInternetArchiveResponse)
      })

      const item = new PhysicalItem({
        title: 'Atomic Habits',
        author: 'James Clear',
        physicalLocation: 'Shelf 2'
      })

      const digitalVersion = await item.searchByTitleAuthor('Atomic Habits', 'James Clear')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('archive.org/advancedsearch.php')
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('title:"Atomic Habits" AND creator:"James Clear"')
      )

      expect(digitalVersion).toEqual({
        identifier: 'atomichabits00clea',
        url: 'https://archive.org/details/atomichabits00clea',
        title: 'Atomic Habits',
        creator: 'Clear, James',
        date: '2018',
        source: 'Internet Archive',
        searchMethod: 'Title-Author'
      })
    })

    test('should handle Internet Archive search failures gracefully', async () => {
      // Mock network failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const item = new PhysicalItem({
        title: 'Non-existent Book',
        author: 'Unknown Author',
        physicalLocation: 'Shelf 1'
      })

      const digitalVersion = await item.searchDigitalVersion()

      expect(digitalVersion).toBeNull()
      expect(mockFetch).toHaveBeenCalled()
    })

    test('should handle empty Internet Archive results', async () => {
      const emptyResponse = {
        response: {
          docs: []
        }
      }

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(emptyResponse)
      })

      const item = new PhysicalItem({
        title: 'Rare Book',
        author: 'Obscure Author',
        isbn: '978-0000000000',
        physicalLocation: 'Shelf 1'
      })

      const digitalVersion = await item.searchDigitalVersion()

      expect(digitalVersion).toBeNull()
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('Loan Management', () => {
    test('should update loan status correctly', () => {
      const item = new PhysicalItem({
        title: 'Test Book',
        physicalLocation: 'Shelf 1'
      })

      expect(item.isAvailable()).toBe(true)

      // Loan out the book
      item.updateLoanStatus('loaned-out', {
        loanedTo: 'John Doe',
        loanDate: '2023-09-01T00:00:00.000Z',
        expectedReturn: '2023-09-15T00:00:00.000Z',
        notes: 'For research project'
      })

      expect(item.loanStatus).toBe('loaned-out')
      expect(item.isAvailable()).toBe(false)
      expect(item.metadata.loanInfo.loanedTo).toBe('John Doe')
      expect(item.metadata.loanInfo.expectedReturn).toBe('2023-09-15T00:00:00.000Z')

      // Return the book
      item.updateLoanStatus('available')

      expect(item.loanStatus).toBe('available')
      expect(item.isAvailable()).toBe(true)
      expect(item.metadata.loanInfo).toBeUndefined()
    })

    test('should throw error for invalid loan status', () => {
      const item = new PhysicalItem({
        title: 'Test Book',
        physicalLocation: 'Shelf 1'
      })

      expect(() => {
        item.updateLoanStatus('invalid-status')
      }).toThrow('Invalid loan status')
    })
  })

  describe('Condition Management', () => {
    test('should update condition with notes', () => {
      const item = new PhysicalItem({
        title: 'Test Book',
        physicalLocation: 'Shelf 1',
        condition: 'good'
      })

      item.updateCondition('fair', 'Minor wear on cover')

      expect(item.condition).toBe('fair')
      expect(item.metadata.conditionNotes).toBe('Minor wear on cover')

      const originalDate = item.dateModified

      // Wait a bit and update again to verify dateModified changes
      setTimeout(() => {
        item.updateCondition('poor', 'Significant damage to spine')
        expect(item.dateModified).not.toBe(originalDate)
        expect(item.condition).toBe('poor')
      }, 10)
    })

    test('should throw error for invalid condition', () => {
      const item = new PhysicalItem({
        title: 'Test Book',
        physicalLocation: 'Shelf 1'
      })

      expect(() => {
        item.updateCondition('invalid-condition')
      }).toThrow('Invalid condition')
    })
  })

  describe('Storage Integration with Chrome Extension', () => {
    test('should serialize and deserialize correctly', async () => {
      const originalItem = new PhysicalItem({
        title: 'Test Book',
        author: 'Test Author',
        isbn: '978-0465050659',
        physicalLocation: 'Home Office',
        condition: 'excellent',
        metadata: {
          pageCount: 200,
          genre: ['Fiction', 'Mystery']
        }
      })

      // Simulate storage save
      const serialized = originalItem.toJSON()
      chrome.storage.local.set.mockResolvedValueOnce()
      await chrome.storage.local.set({
        physicalItems: [serialized]
      })

      // Verify storage call
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        physicalItems: [serialized]
      })

      // Simulate storage load
      chrome.storage.local.get.mockResolvedValueOnce({
        physicalItems: [serialized]
      })

      const { physicalItems } = await chrome.storage.local.get('physicalItems')
      const deserializedItem = PhysicalItem.fromJSON(physicalItems[0])

      // Verify all properties are preserved
      expect(deserializedItem.title).toBe(originalItem.title)
      expect(deserializedItem.author).toBe(originalItem.author)
      expect(deserializedItem.isbn).toBe(originalItem.isbn)
      expect(deserializedItem.physicalLocation).toBe(originalItem.physicalLocation)
      expect(deserializedItem.condition).toBe(originalItem.condition)
      expect(deserializedItem.isPhysical).toBe(true)
      expect(deserializedItem.metadata.pageCount).toBe(200)
      expect(deserializedItem.metadata.genre).toEqual(['Fiction', 'Mystery'])
    })

    test('should integrate with content management workflow', async () => {
      // Mock existing content items
      const existingContentItems = [
        {
          id: 'digital_1',
          title: 'Digital Article',
          isPhysical: false,
          type: 'article'
        }
      ]

      chrome.storage.local.get.mockResolvedValueOnce({
        contentItems: existingContentItems
      })

      // Create new physical item
      const physicalItem = new PhysicalItem({
        title: 'Physical Book',
        author: 'Book Author',
        physicalLocation: 'Bookshelf',
        type: 'book'
      })

      // Simulate adding to content items
      const { contentItems = [] } = await chrome.storage.local.get('contentItems')
      contentItems.push(physicalItem.toJSON())

      chrome.storage.local.set.mockResolvedValueOnce()
      await chrome.storage.local.set({ contentItems })

      // Verify integration
      expect(chrome.storage.local.get).toHaveBeenCalledWith('contentItems')
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        contentItems: [
          existingContentItems[0],
          physicalItem.toJSON()
        ]
      })

      const savedItems = chrome.storage.local.set.mock.calls[0][0].contentItems
      expect(savedItems).toHaveLength(2)
      expect(savedItems[1].isPhysical).toBe(true)
      expect(savedItems[1].title).toBe('Physical Book')
    })
  })

  describe('Search and Discovery', () => {
    test('should generate comprehensive searchable text', () => {
      const item = new PhysicalItem({
        title: 'JavaScript: The Good Parts',
        author: 'Douglas Crockford',
        publisher: 'O\'Reilly Media',
        isbn: '978-0596517748',
        physicalLocation: 'Programming Books Section',
        tags: ['javascript', 'programming', 'web-development'],
        categories: ['Technology', 'Programming'],
        notes: 'Essential reading for JS developers',
        metadata: {
          genre: ['Programming', 'Computer Science']
        }
      })

      const searchableText = item.getSearchableText()

      expect(searchableText).toContain('JavaScript: The Good Parts')
      expect(searchableText).toContain('Douglas Crockford')
      expect(searchableText).toContain('O\'Reilly Media')
      expect(searchableText).toContain('978-0596517748')
      expect(searchableText).toContain('Programming Books Section')
      expect(searchableText).toContain('javascript programming web-development')
      expect(searchableText).toContain('Technology Programming')
      expect(searchableText).toContain('Essential reading for JS developers')
      expect(searchableText).toContain('Programming Computer Science')
    })

    test('should provide formatted display information', () => {
      const item = new PhysicalItem({
        title: 'Clean Code',
        author: 'Robert C. Martin',
        acquisitionDate: '2020-01-15T00:00:00.000Z'
      })

      expect(item.getDisplayTitle()).toBe('Clean Code by Robert C. Martin')

      const acquisitionInfo = item.getAcquisitionInfo()
      expect(acquisitionInfo.date).toBe('2020-01-15T00:00:00.000Z')
      expect(acquisitionInfo.formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
      expect(acquisitionInfo.yearsOwned).toBeGreaterThanOrEqual(4)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing or malformed data gracefully', () => {
      const item = new PhysicalItem() // Empty constructor

      expect(item.title).toBe('')
      expect(item.author).toBe('')
      expect(item.isPhysical).toBe(true)
      expect(item.loanStatus).toBe('available')
      expect(item.condition).toBe('good')
      expect(item.tags).toEqual([])
      expect(item.categories).toEqual([])
      expect(item.id).toMatch(/^physical_/)

      const validation = item.validate()
      expect(validation.isValid).toBe(false) // Should fail due to missing title and location
    })

    test('should handle Internet Archive API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.reject(new Error('JSON parse error'))
      })

      const item = new PhysicalItem({
        title: 'Test Book',
        isbn: '978-0000000000',
        physicalLocation: 'Shelf 1'
      })

      const result = await item.searchDigitalVersion()

      expect(result).toBeNull()
      expect(mockFetch).toHaveBeenCalled()
    })
  })
})

/**
 * Entity Model Test: Connection
 * 
 * CRITICAL: This test MUST FAIL until proper implementation exists.
 * Tests the Connection model based on data-model.md specifications
 */

describe('Connection Model - T017', () => {
  let Connection

  beforeEach(() => {
    try {
      const { Connection: ConnectionClass } = require('../../../extension/shared/models/connection.js')
      Connection = ConnectionClass
    } catch (error) {
      Connection = null
    }
  })

  describe('Connection Class Definition', () => {
    test('should exist as a class', () => {
      expect(Connection).toBeDefined()
      expect(typeof Connection).toBe('function')
      expect(Connection.prototype.constructor).toBe(Connection)
    })

    test('should have connection-specific static properties', () => {
      expect(Connection.TYPES).toBeDefined()
      expect(Connection.TYPES).toEqual(['similarity', 'citation', 'topic-related', 'temporal', 'causal'])
      
      expect(Connection.MIN_STRENGTH).toBeDefined()
      expect(Connection.MAX_STRENGTH).toBeDefined()
      expect(Connection.MIN_STRENGTH).toBe(0.0)
      expect(Connection.MAX_STRENGTH).toBe(1.0)
    })
  })

  describe('Connection Constructor', () => {
    test('should create Connection with required fields', () => {
      const data = {
        sourceItemId: 'item-source-123',
        targetItemId: 'item-target-456',
        connectionType: 'similarity',
        strength: 0.85,
        description: 'These items are similar in topic and approach'
      }

      const connection = new Connection(data)

      expect(connection.id).toBeDefined()
      expect(typeof connection.id).toBe('string')
      expect(connection.sourceItemId).toBe(data.sourceItemId)
      expect(connection.targetItemId).toBe(data.targetItemId)
      expect(connection.connectionType).toBe(data.connectionType)
      expect(connection.strength).toBe(data.strength)
      expect(connection.description).toBe(data.description)
      expect(connection.dateDiscovered).toBeInstanceOf(Date)
      expect(connection.isUserVerified).toBe(false) // Default value
    })

    test('should auto-generate UUID for id field', () => {
      const connection1 = new Connection({
        sourceItemId: 'item-1',
        targetItemId: 'item-2',
        connectionType: 'similarity',
        strength: 0.8
      })
      
      const connection2 = new Connection({
        sourceItemId: 'item-3',
        targetItemId: 'item-4',
        connectionType: 'similarity',
        strength: 0.9
      })

      expect(connection1.id).not.toBe(connection2.id)
      expect(connection1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    test('should set default values for optional fields', () => {
      const connection = new Connection({
        sourceItemId: 'item-1',
        targetItemId: 'item-2',
        connectionType: 'similarity',
        strength: 0.7
      })

      expect(connection.description).toBe('')
      expect(connection.isUserVerified).toBe(false)
      expect(connection.userNotes).toBe('')
      expect(connection.dateDiscovered).toBeInstanceOf(Date)
    })

    test('should accept and set provided optional fields', () => {
      const data = {
        sourceItemId: 'item-1',
        targetItemId: 'item-2',
        connectionType: 'citation',
        strength: 0.95,
        description: 'Item 1 cites Item 2 as a reference',
        isUserVerified: true,
        userNotes: 'Verified this citation manually'
      }

      const connection = new Connection(data)

      expect(connection.description).toBe(data.description)
      expect(connection.isUserVerified).toBe(data.isUserVerified)
      expect(connection.userNotes).toBe(data.userNotes)
    })
  })

  describe('Connection Validation', () => {
    test('should validate required fields', () => {
      expect(() => new Connection({})).toThrow('Source item ID is required')
      
      expect(() => new Connection({
        sourceItemId: 'item-1'
      })).toThrow('Target item ID is required')
      
      expect(() => new Connection({
        sourceItemId: 'item-1',
        targetItemId: 'item-2'
      })).toThrow('Connection type is required')
      
      expect(() => new Connection({
        sourceItemId: 'item-1',
        targetItemId: 'item-2',
        connectionType: 'similarity'
      })).toThrow('Strength is required')
    })

    test('should validate connection type enum', () => {
      const validTypes = ['similarity', 'citation', 'topic-related', 'temporal', 'causal']
      const invalidTypes = ['invalid', 'related', 'linked', '']

      validTypes.forEach(type => {
        const connection = new Connection({
          sourceItemId: 'item-1',
          targetItemId: 'item-2',
          connectionType: type,
          strength: 0.8
        })
        expect(connection.connectionType).toBe(type)
      })

      invalidTypes.forEach(type => {
        expect(() => new Connection({
          sourceItemId: 'item-1',
          targetItemId: 'item-2',
          connectionType: type,
          strength: 0.8
        })).toThrow('Invalid connection type')
      })
    })

    test('should validate strength range', () => {
      const validStrengths = [0.0, 0.5, 0.85, 1.0]
      const invalidStrengths = [-0.1, 1.1, 2.0, -1.0, null, undefined, 'high']

      validStrengths.forEach(strength => {
        const connection = new Connection({
          sourceItemId: 'item-1',
          targetItemId: 'item-2',
          connectionType: 'similarity',
          strength: strength
        })
        expect(connection.strength).toBe(strength)
      })

      invalidStrengths.forEach(strength => {
        expect(() => new Connection({
          sourceItemId: 'item-1',
          targetItemId: 'item-2',
          connectionType: 'similarity',
          strength: strength
        })).toThrow('Strength must be a number between 0.0 and 1.0')
      })
    })

    test('should validate that source and target are different', () => {
      expect(() => new Connection({
        sourceItemId: 'same-item',
        targetItemId: 'same-item',
        connectionType: 'similarity',
        strength: 0.8
      })).toThrow('Source and target items must be different')
    })

    test('should validate item ID format', () => {
      const validIds = ['item-123', 'content-abc-456', 'uuid-format-id']
      const invalidIds = ['', null, undefined, '   ', 'id with spaces']

      invalidIds.forEach(id => {
        expect(() => new Connection({
          sourceItemId: id,
          targetItemId: 'valid-id',
          connectionType: 'similarity',
          strength: 0.8
        })).toThrow('Invalid source item ID')

        expect(() => new Connection({
          sourceItemId: 'valid-id',
          targetItemId: id,
          connectionType: 'similarity',
          strength: 0.8
        })).toThrow('Invalid target item ID')
      })
    })
  })

  describe('Connection Methods', () => {
    let testConnection

    beforeEach(() => {
      testConnection = new Connection({
        sourceItemId: 'source-123',
        targetItemId: 'target-456',
        connectionType: 'similarity',
        strength: 0.82,
        description: 'AI-detected similarity in content and topics'
      })
    })

    test('should implement verifyConnection() method', () => {
      expect(typeof testConnection.verifyConnection).toBe('function')
      
      testConnection.verifyConnection(true, 'Manually verified - strong similarity')
      
      expect(testConnection.isUserVerified).toBe(true)
      expect(testConnection.userNotes).toBe('Manually verified - strong similarity')
    })

    test('should implement updateStrength() method', () => {
      expect(typeof testConnection.updateStrength).toBe('function')
      
      const originalStrength = testConnection.strength
      testConnection.updateStrength(0.95, 'Updated based on additional analysis')
      
      expect(testConnection.strength).toBe(0.95)
      expect(testConnection.strength).not.toBe(originalStrength)
      expect(testConnection.userNotes).toContain('Updated based on additional analysis')
    })

    test('should implement getReciprocalConnection() method', () => {
      expect(typeof testConnection.getReciprocalConnection).toBe('function')
      
      const reciprocal = testConnection.getReciprocalConnection()
      
      expect(reciprocal).toBeInstanceOf(Connection)
      expect(reciprocal.sourceItemId).toBe(testConnection.targetItemId)
      expect(reciprocal.targetItemId).toBe(testConnection.sourceItemId)
      expect(reciprocal.connectionType).toBe(testConnection.connectionType)
      expect(reciprocal.strength).toBe(testConnection.strength)
    })

    test('should implement getOppositeItemId() method', () => {
      expect(typeof testConnection.getOppositeItemId).toBe('function')
      
      expect(testConnection.getOppositeItemId('source-123')).toBe('target-456')
      expect(testConnection.getOppositeItemId('target-456')).toBe('source-123')
      expect(testConnection.getOppositeItemId('other-item')).toBeNull()
    })

    test('should implement isStrongConnection() method', () => {
      expect(typeof testConnection.isStrongConnection).toBe('function')
      
      testConnection.strength = 0.85
      expect(testConnection.isStrongConnection()).toBe(true)
      
      testConnection.strength = 0.65
      expect(testConnection.isStrongConnection()).toBe(false)
      
      testConnection.strength = 0.75
      expect(testConnection.isStrongConnection(0.7)).toBe(true) // Custom threshold
    })

    test('should implement toJSON() method', () => {
      expect(typeof testConnection.toJSON).toBe('function')
      
      const json = testConnection.toJSON()
      
      expect(json).toMatchObject({
        id: testConnection.id,
        sourceItemId: testConnection.sourceItemId,
        targetItemId: testConnection.targetItemId,
        connectionType: testConnection.connectionType,
        strength: testConnection.strength,
        description: testConnection.description,
        isUserVerified: testConnection.isUserVerified,
        userNotes: testConnection.userNotes,
        dateDiscovered: testConnection.dateDiscovered.toISOString()
      })
    })

    test('should implement fromJSON() static method', () => {
      expect(typeof Connection.fromJSON).toBe('function')
      
      const jsonData = {
        id: 'connection-123',
        sourceItemId: 'json-source',
        targetItemId: 'json-target',
        connectionType: 'citation',
        strength: 0.91,
        description: 'JSON connection test',
        dateDiscovered: '2025-09-27T10:00:00.000Z',
        isUserVerified: true,
        userNotes: 'JSON test notes'
      }

      const connection = Connection.fromJSON(jsonData)
      
      expect(connection).toBeInstanceOf(Connection)
      expect(connection.id).toBe(jsonData.id)
      expect(connection.sourceItemId).toBe(jsonData.sourceItemId)
      expect(connection.targetItemId).toBe(jsonData.targetItemId)
      expect(connection.dateDiscovered).toBeInstanceOf(Date)
    })
  })

  describe('Connection Business Logic', () => {
    test('should calculate connection confidence', () => {
      const connection = new Connection({
        sourceItemId: 'item-1',
        targetItemId: 'item-2',
        connectionType: 'similarity',
        strength: 0.85,
        isUserVerified: true
      })

      expect(typeof connection.getConfidence).toBe('function')
      
      const confidence = connection.getConfidence()
      
      expect(confidence).toBeGreaterThan(connection.strength) // User verification should boost confidence
      expect(confidence).toBeLessThanOrEqual(1.0)
    })

    test('should determine connection bidirectionality', () => {
      const symmetricConnection = new Connection({
        sourceItemId: 'item-1',
        targetItemId: 'item-2',
        connectionType: 'similarity',
        strength: 0.8
      })

      const asymmetricConnection = new Connection({
        sourceItemId: 'item-1',
        targetItemId: 'item-2',
        connectionType: 'citation',
        strength: 0.9
      })

      expect(typeof symmetricConnection.isBidirectional).toBe('function')
      
      expect(symmetricConnection.isBidirectional()).toBe(true) // Similarity is bidirectional
      expect(asymmetricConnection.isBidirectional()).toBe(false) // Citation is directional
    })

    test('should support connection aging and decay', () => {
      const connection = new Connection({
        sourceItemId: 'item-1',
        targetItemId: 'item-2',
        connectionType: 'similarity',
        strength: 0.9
      })

      // Mock old date
      connection.dateDiscovered = new Date('2025-01-01')

      expect(typeof connection.getAgedStrength).toBe('function')
      
      const agedStrength = connection.getAgedStrength()
      
      expect(agedStrength).toBeLessThan(connection.strength) // Should decay over time
      expect(agedStrength).toBeGreaterThanOrEqual(0)
    })

    test('should support connection scoring for ranking', () => {
      const connection = new Connection({
        sourceItemId: 'item-1',
        targetItemId: 'item-2',
        connectionType: 'similarity',
        strength: 0.85,
        isUserVerified: true
      })

      expect(typeof connection.calculateScore).toBe('function')
      
      const score = connection.calculateScore({
        strengthWeight: 0.7,
        verificationWeight: 0.2,
        typeWeight: 0.1
      })

      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(1)
    })

    test('should support connection merging', () => {
      const connection1 = new Connection({
        sourceItemId: 'item-1',
        targetItemId: 'item-2',
        connectionType: 'similarity',
        strength: 0.8,
        description: 'First detection'
      })

      const connection2 = new Connection({
        sourceItemId: 'item-1',
        targetItemId: 'item-2',
        connectionType: 'similarity',
        strength: 0.9,
        description: 'Second detection'
      })

      expect(typeof connection1.mergeWith).toBe('function')
      
      const merged = connection1.mergeWith(connection2)
      
      expect(merged.strength).toBeGreaterThan(Math.max(connection1.strength, connection2.strength))
      expect(merged.description).toContain('First detection')
      expect(merged.description).toContain('Second detection')
    })
  })

  describe('Connection Integration', () => {
    test('should integrate with AI discovery services', () => {
      const connection = new Connection({
        sourceItemId: 'item-1',
        targetItemId: 'item-2',
        connectionType: 'topic-related',
        strength: 0.78
      })

      expect(typeof connection.getAIAnalysis).toBe('function')
      
      const mockAIAnalysis = {
        confidence: 0.82,
        reasoning: 'Both items discuss machine learning concepts',
        keywords: ['machine learning', 'AI', 'algorithms']
      }

      connection.setAIAnalysis(mockAIAnalysis)
      
      expect(connection.aiAnalysis).toMatchObject(mockAIAnalysis)
    })

    test('should support Chrome Storage serialization', () => {
      const connection = new Connection({
        sourceItemId: 'item-1',
        targetItemId: 'item-2',
        connectionType: 'citation',
        strength: 0.95
      })

      expect(typeof connection.toStorageFormat).toBe('function')
      
      const storageFormat = connection.toStorageFormat()
      
      expect(storageFormat).toHaveProperty('id')
      expect(storageFormat).toHaveProperty('sourceItemId')
      expect(storageFormat).toHaveProperty('targetItemId')
      expect(typeof storageFormat.dateDiscovered).toBe('string')
    })

    test('should support graph database format', () => {
      const connection = new Connection({
        sourceItemId: 'item-1',
        targetItemId: 'item-2',
        connectionType: 'similarity',
        strength: 0.88
      })

      expect(typeof connection.toGraphFormat).toBe('function')
      
      const graphFormat = connection.toGraphFormat()
      
      expect(graphFormat).toMatchObject({
        source: connection.sourceItemId,
        target: connection.targetItemId,
        weight: connection.strength,
        type: connection.connectionType,
        properties: expect.any(Object)
      })
    })
  })

  // This test will fail until Connection model is implemented
  test('Connection model should be implemented', () => {
    expect(Connection).toBeDefined()
    expect(Connection).not.toBeNull()
  })
})
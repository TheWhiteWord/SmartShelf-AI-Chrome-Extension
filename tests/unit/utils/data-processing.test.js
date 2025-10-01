/**
 * Unit Tests: Data Processing Utilities (T071J)
 * Test suite for extension/shared/utils/data-processing.js
 * 
 * Following TDD principles established in this project
 * 
 * Functions tested:
 * - debounce(fn, delay) - Debounce function execution
 * - throttle(fn, limit) - Throttle function execution
 * - chunk(array, size) - Array chunking
 * - deduplicate(array, key) - Array deduplication
 * - deepClone(obj) - Deep object cloning
 * - deepMerge(target, source) - Deep object merging
 * 
 * Test scenarios:
 * - Debounce: rapid calls, delayed execution, cancel
 * - Throttle: rate limiting, immediate first call, trailing calls
 * - Chunking: various sizes, edge cases (empty, size > length)
 * - Deduplication: primitives, objects by key
 * - Deep clone: nested objects, arrays, dates, null values
 * - Deep merge: nested objects, array handling, null values
 * - Edge cases: circular references, large arrays (10k+ items)
 * - Performance: rapid function calls, large data processing
 */

const {
  debounce,
  throttle,
  chunk,
  deduplicate,
  deepClone,
  deepMerge
} = require('../../../extension/shared/utils/data-processing.js')

describe('Data Processing Utilities (T071J)', () => {
  
  // ============================================================================
  // debounce() Tests
  // ============================================================================
  
  describe('debounce()', () => {

    describe('Basic debouncing', () => {
      it('should delay function execution', () => {
        jest.useFakeTimers()
        const fn = jest.fn()
        const debounced = debounce(fn, 300)

        debounced()
        
        expect(fn).not.toHaveBeenCalled()
        
        jest.advanceTimersByTime(299)
        expect(fn).not.toHaveBeenCalled()
        
        jest.advanceTimersByTime(1)
        expect(fn).toHaveBeenCalledTimes(1)
        jest.useRealTimers()
      })

      it('should execute function after delay with correct arguments', () => {
        jest.useFakeTimers()
        const fn = jest.fn()
        const debounced = debounce(fn, 200)

        debounced('arg1', 'arg2', 'arg3')
        
        jest.advanceTimersByTime(200)
        
        expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
        jest.useRealTimers()
      })

      it('should preserve this context', () => {
        jest.useFakeTimers()
        const obj = {
          value: 42,
          method: jest.fn(function() {
            return this.value
          })
        }

        obj.debouncedMethod = debounce(obj.method, 100)
        obj.debouncedMethod()

        jest.advanceTimersByTime(100)

        expect(obj.method).toHaveBeenCalled()
        jest.useRealTimers()
      })
    })

    describe('Rapid calls', () => {
      it('should reset delay on each call', () => {
        jest.useFakeTimers()
        const fn = jest.fn()
        const debounced = debounce(fn, 300)

        debounced()
        jest.advanceTimersByTime(100)
        
        debounced() // Reset timer
        jest.advanceTimersByTime(100)
        
        debounced() // Reset timer again
        jest.advanceTimersByTime(100)
        
        expect(fn).not.toHaveBeenCalled()
        
        jest.advanceTimersByTime(200) // Total 300ms from last call
        
        expect(fn).toHaveBeenCalledTimes(1)
        jest.useRealTimers()
      })

      it('should only execute once after rapid calls', () => {
        jest.useFakeTimers()
        const fn = jest.fn()
        const debounced = debounce(fn, 500)

        // Rapid calls
        for (let i = 0; i < 10; i++) {
          debounced()
          jest.advanceTimersByTime(50)
        }

        expect(fn).not.toHaveBeenCalled()
        
        jest.advanceTimersByTime(500)
        
        expect(fn).toHaveBeenCalledTimes(1)
        jest.useRealTimers()
      })

      it('should use arguments from last call', () => {
        jest.useFakeTimers()
        const fn = jest.fn()
        const debounced = debounce(fn, 200)

        debounced('first')
        debounced('second')
        debounced('third')
        
        jest.advanceTimersByTime(200)
        
        expect(fn).toHaveBeenCalledWith('third')
        expect(fn).toHaveBeenCalledTimes(1)
        jest.useRealTimers()
      })
    })

    describe('Cancel method', () => {
      it('should have cancel method', () => {
        const fn = jest.fn()
        const debounced = debounce(fn, 300)

        expect(typeof debounced.cancel).toBe('function')
      })

      it('should cancel pending execution', () => {
        const fn = jest.fn()
        const debounced = debounce(fn, 300)

        debounced()
        
        jest.advanceTimersByTime(100)
        debounced.cancel()
        
        jest.advanceTimersByTime(300)
        
        expect(fn).not.toHaveBeenCalled()
      })

      it('should not throw when canceling with no pending execution', () => {
        const fn = jest.fn()
        const debounced = debounce(fn, 300)

        expect(() => debounced.cancel()).not.toThrow()
      })
    })

    describe('Edge cases', () => {
      it('should throw TypeError for non-function', () => {
        expect(() => debounce('not a function', 100)).toThrow(TypeError)
        expect(() => debounce(null, 100)).toThrow(TypeError)
        expect(() => debounce(undefined, 100)).toThrow(TypeError)
      })

      it('should throw TypeError for negative delay', () => {
        const fn = jest.fn()
        expect(() => debounce(fn, -100)).toThrow(TypeError)
      })

      it('should throw TypeError for non-number delay', () => {
        const fn = jest.fn()
        expect(() => debounce(fn, 'not a number')).toThrow(TypeError)
      })

      it('should use default delay of 300ms', () => {
        jest.useFakeTimers()
        const fn = jest.fn()
        const debounced = debounce(fn)

        debounced()
        
        jest.advanceTimersByTime(299)
        expect(fn).not.toHaveBeenCalled()
        
        jest.advanceTimersByTime(1)
        expect(fn).toHaveBeenCalledTimes(1)
        jest.useRealTimers()
      })

      it('should handle delay of 0', () => {
        jest.useFakeTimers()
        const fn = jest.fn()
        const debounced = debounce(fn, 0)

        debounced()
        
        jest.advanceTimersByTime(0)
        expect(fn).toHaveBeenCalledTimes(1)
        jest.useRealTimers()
      })
    })
  })

  // ============================================================================
  // throttle() Tests
  // ============================================================================
  
  describe('throttle()', () => {

    describe('Basic throttling', () => {
      it('should execute function immediately on first call', () => {
        const fn = jest.fn()
        const throttled = throttle(fn, 300)

        throttled()
        
        expect(fn).toHaveBeenCalledTimes(1)
      })

      it('should pass arguments correctly', () => {
        const fn = jest.fn()
        const throttled = throttle(fn, 300)

        throttled('arg1', 'arg2')
        
        expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
      })

      it('should preserve this context', () => {
        const obj = {
          value: 42,
          method: jest.fn(function() {
            return this.value
          })
        }

        obj.throttledMethod = throttle(obj.method, 100)
        obj.throttledMethod()

        expect(obj.method).toHaveBeenCalled()
      })
    })

    describe('Rate limiting', () => {
      it('should limit execution rate', () => {
        jest.useFakeTimers()
        const fn = jest.fn()
        const throttled = throttle(fn, 300)

        throttled() // Immediate
        expect(fn).toHaveBeenCalledTimes(1)
        
        throttled() // Ignored (scheduled)
        throttled() // Ignored (rescheduled)
        expect(fn).toHaveBeenCalledTimes(1)
        
        jest.advanceTimersByTime(300)
        expect(fn).toHaveBeenCalledTimes(2) // Trailing call
        jest.useRealTimers()
      })

      it('should allow execution after limit time', () => {
        jest.useFakeTimers()
        const fn = jest.fn()
        const throttled = throttle(fn, 500)

        throttled() // t=0
        expect(fn).toHaveBeenCalledTimes(1)
        
        jest.advanceTimersByTime(500)
        
        throttled() // t=500
        expect(fn).toHaveBeenCalledTimes(2)
        jest.useRealTimers()
      })

      it('should execute trailing call with latest arguments', () => {
        jest.useFakeTimers()
        const fn = jest.fn()
        const throttled = throttle(fn, 300)

        throttled('first')
        throttled('second')
        throttled('third')
        
        jest.advanceTimersByTime(300)
        
        expect(fn).toHaveBeenCalledTimes(2)
        expect(fn).toHaveBeenNthCalledWith(1, 'first')
        expect(fn).toHaveBeenNthCalledWith(2, 'third')
        jest.useRealTimers()
      })
    })

    describe('Rapid calls', () => {
      it('should handle rapid consecutive calls', () => {
        jest.useFakeTimers()
        const fn = jest.fn()
        const throttled = throttle(fn, 1000)

        // Rapid calls at t=0
        for (let i = 0; i < 10; i++) {
          throttled(i)
        }
        
        expect(fn).toHaveBeenCalledTimes(1) // First call immediate
        expect(fn).toHaveBeenCalledWith(0)
        
        jest.advanceTimersByTime(1000)
        
        expect(fn).toHaveBeenCalledTimes(2) // Trailing call
        expect(fn).toHaveBeenCalledWith(9) // Last argument
        jest.useRealTimers()
      })

      it('should handle calls during limit period', () => {
        jest.useFakeTimers()
        const fn = jest.fn()
        const throttled = throttle(fn, 500)

        throttled('0ms')
        expect(fn).toHaveBeenCalledTimes(1)
        
        jest.advanceTimersByTime(100)
        throttled('100ms')
        
        jest.advanceTimersByTime(100)
        throttled('200ms')
        
        jest.advanceTimersByTime(300)
        expect(fn).toHaveBeenCalledTimes(2)
        expect(fn).toHaveBeenLastCalledWith('200ms')
        jest.useRealTimers()
      })
    })

    describe('Cancel method', () => {
      it('should have cancel method', () => {
        const fn = jest.fn()
        const throttled = throttle(fn, 300)

        expect(typeof throttled.cancel).toBe('function')
      })

      it('should cancel pending trailing call', () => {
        jest.useFakeTimers()
        const fn = jest.fn()
        const throttled = throttle(fn, 300)

        throttled() // Immediate
        throttled() // Scheduled trailing
        
        throttled.cancel()
        
        jest.advanceTimersByTime(300)
        
        expect(fn).toHaveBeenCalledTimes(1)
        jest.useRealTimers()
      })

      it('should not throw when canceling with no pending execution', () => {
        const fn = jest.fn()
        const throttled = throttle(fn, 300)

        expect(() => throttled.cancel()).not.toThrow()
      })
    })

    describe('Edge cases', () => {
      it('should throw TypeError for non-function', () => {
        expect(() => throttle('not a function', 100)).toThrow(TypeError)
        expect(() => throttle(null, 100)).toThrow(TypeError)
        expect(() => throttle(undefined, 100)).toThrow(TypeError)
      })

      it('should throw TypeError for negative limit', () => {
        const fn = jest.fn()
        expect(() => throttle(fn, -100)).toThrow(TypeError)
      })

      it('should throw TypeError for non-number limit', () => {
        const fn = jest.fn()
        expect(() => throttle(fn, 'not a number')).toThrow(TypeError)
      })

      it('should use default limit of 300ms', () => {
        jest.useFakeTimers()
        const fn = jest.fn()
        const throttled = throttle(fn)

        throttled()
        throttled()
        
        jest.advanceTimersByTime(299)
        expect(fn).toHaveBeenCalledTimes(1)
        
        jest.advanceTimersByTime(1)
        expect(fn).toHaveBeenCalledTimes(2)
        jest.useRealTimers()
      })

      it('should handle limit of 0', () => {
        const fn = jest.fn()
        const throttled = throttle(fn, 0)

        throttled()
        
        expect(fn).toHaveBeenCalledTimes(1)
        
        throttled()
        expect(fn).toHaveBeenCalledTimes(2)
      })
    })
  })

  // ============================================================================
  // chunk() Tests
  // ============================================================================
  
  describe('chunk()', () => {
    
    describe('Basic chunking', () => {
      it('should split array into chunks of specified size', () => {
        const array = [1, 2, 3, 4, 5, 6]
        const result = chunk(array, 2)

        expect(result).toEqual([
          [1, 2],
          [3, 4],
          [5, 6]
        ])
      })

      it('should handle arrays not divisible by chunk size', () => {
        const array = [1, 2, 3, 4, 5]
        const result = chunk(array, 2)

        expect(result).toEqual([
          [1, 2],
          [3, 4],
          [5]
        ])
      })

      it('should handle chunk size of 1', () => {
        const array = ['a', 'b', 'c']
        const result = chunk(array, 1)

        expect(result).toEqual([
          ['a'],
          ['b'],
          ['c']
        ])
      })

      it('should handle chunk size larger than array', () => {
        const array = [1, 2, 3]
        const result = chunk(array, 10)

        expect(result).toEqual([[1, 2, 3]])
      })

      it('should handle chunk size equal to array length', () => {
        const array = [1, 2, 3, 4, 5]
        const result = chunk(array, 5)

        expect(result).toEqual([[1, 2, 3, 4, 5]])
      })
    })

    describe('Different data types', () => {
      it('should chunk array of strings', () => {
        const array = ['a', 'b', 'c', 'd', 'e']
        const result = chunk(array, 2)

        expect(result).toEqual([
          ['a', 'b'],
          ['c', 'd'],
          ['e']
        ])
      })

      it('should chunk array of objects', () => {
        const array = [
          { id: 1 },
          { id: 2 },
          { id: 3 },
          { id: 4 }
        ]
        const result = chunk(array, 3)

        expect(result).toEqual([
          [{ id: 1 }, { id: 2 }, { id: 3 }],
          [{ id: 4 }]
        ])
      })

      it('should chunk mixed data types', () => {
        const array = [1, 'two', { three: 3 }, null, undefined]
        const result = chunk(array, 2)

        expect(result).toEqual([
          [1, 'two'],
          [{ three: 3 }, null],
          [undefined]
        ])
      })
    })

    describe('Edge cases', () => {
      it('should return empty array for empty input', () => {
        const result = chunk([], 2)
        expect(result).toEqual([])
      })

      it('should throw TypeError for non-array input', () => {
        expect(() => chunk('not an array', 2)).toThrow(TypeError)
        expect(() => chunk(null, 2)).toThrow(TypeError)
        expect(() => chunk(undefined, 2)).toThrow(TypeError)
        expect(() => chunk(123, 2)).toThrow(TypeError)
      })

      it('should throw TypeError for non-integer size', () => {
        expect(() => chunk([1, 2, 3], 2.5)).toThrow(TypeError)
        expect(() => chunk([1, 2, 3], 'not a number')).toThrow(TypeError)
      })

      it('should throw TypeError for size less than 1', () => {
        expect(() => chunk([1, 2, 3], 0)).toThrow(TypeError)
        expect(() => chunk([1, 2, 3], -1)).toThrow(TypeError)
      })

      it('should use default size of 1', () => {
        const array = [1, 2, 3]
        const result = chunk(array)

        expect(result).toEqual([[1], [2], [3]])
      })

      it('should not mutate original array', () => {
        const array = [1, 2, 3, 4, 5]
        const original = [...array]
        
        chunk(array, 2)
        
        expect(array).toEqual(original)
      })
    })

    describe('Performance', () => {
      it('should handle large arrays efficiently', () => {
        const largeArray = Array.from({ length: 10000 }, (_, i) => i)
        const startTime = Date.now()
        
        const result = chunk(largeArray, 100)
        
        const endTime = Date.now()
        const executionTime = endTime - startTime

        expect(result.length).toBe(100)
        expect(result[0].length).toBe(100)
        expect(result[99].length).toBe(100)
        expect(executionTime).toBeLessThan(100) // Should be very fast
      })
    })
  })

  // ============================================================================
  // deduplicate() Tests
  // ============================================================================
  
  describe('deduplicate()', () => {
    
    describe('Primitive deduplication', () => {
      it('should remove duplicate numbers', () => {
        const array = [1, 2, 3, 2, 1, 4, 3]
        const result = deduplicate(array)

        expect(result).toEqual([1, 2, 3, 4])
      })

      it('should remove duplicate strings', () => {
        const array = ['apple', 'banana', 'apple', 'cherry', 'banana']
        const result = deduplicate(array)

        expect(result).toEqual(['apple', 'banana', 'cherry'])
      })

      it('should handle mixed primitive types', () => {
        const array = [1, '1', 2, '2', 1, '1']
        const result = deduplicate(array)

        expect(result).toEqual([1, '1', 2, '2'])
      })

      it('should preserve order of first occurrence', () => {
        const array = [5, 3, 1, 3, 5, 2]
        const result = deduplicate(array)

        expect(result).toEqual([5, 3, 1, 2])
      })

      it('should handle boolean values', () => {
        const array = [true, false, true, true, false]
        const result = deduplicate(array)

        expect(result).toEqual([true, false])
      })
    })

    describe('Object deduplication by key', () => {
      it('should deduplicate objects by id key', () => {
        const array = [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 1, name: 'Alice Duplicate' },
          { id: 3, name: 'Charlie' }
        ]
        const result = deduplicate(array, 'id')

        expect(result).toEqual([
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Charlie' }
        ])
      })

      it('should deduplicate objects by email key', () => {
        const array = [
          { name: 'Alice', email: 'alice@test.com' },
          { name: 'Bob', email: 'bob@test.com' },
          { name: 'Alice Smith', email: 'alice@test.com' }
        ]
        const result = deduplicate(array, 'email')

        expect(result).toEqual([
          { name: 'Alice', email: 'alice@test.com' },
          { name: 'Bob', email: 'bob@test.com' }
        ])
      })

      it('should skip objects with undefined key', () => {
        const array = [
          { id: 1, name: 'Alice' },
          { name: 'Bob' }, // No id key
          { id: 2, name: 'Charlie' }
        ]
        const result = deduplicate(array, 'id')

        expect(result).toEqual([
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Charlie' }
        ])
      })

      it('should skip null and undefined items', () => {
        const array = [
          { id: 1, name: 'Alice' },
          null,
          { id: 2, name: 'Bob' },
          undefined,
          { id: 1, name: 'Alice Duplicate' }
        ]
        const result = deduplicate(array, 'id')

        expect(result).toEqual([
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ])
      })

      it('should handle numeric keys', () => {
        const array = [
          { id: 1, value: 100 },
          { id: 2, value: 200 },
          { id: 1, value: 150 }
        ]
        const result = deduplicate(array, 'id')

        expect(result.length).toBe(2)
        expect(result[0].id).toBe(1)
        expect(result[1].id).toBe(2)
      })

      it('should handle string keys with special characters', () => {
        const array = [
          { 'user-id': 'abc-123', name: 'Alice' },
          { 'user-id': 'def-456', name: 'Bob' },
          { 'user-id': 'abc-123', name: 'Alice Duplicate' }
        ]
        const result = deduplicate(array, 'user-id')

        expect(result.length).toBe(2)
      })
    })

    describe('Edge cases', () => {
      it('should return empty array for empty input', () => {
        expect(deduplicate([])).toEqual([])
        expect(deduplicate([], 'id')).toEqual([])
      })

      it('should throw TypeError for non-array input', () => {
        expect(() => deduplicate('not an array')).toThrow(TypeError)
        expect(() => deduplicate(null)).toThrow(TypeError)
        expect(() => deduplicate(undefined)).toThrow(TypeError)
      })

      it('should throw TypeError for non-string key', () => {
        const array = [{ id: 1 }, { id: 2 }]
        expect(() => deduplicate(array, 123)).toThrow(TypeError)
        expect(() => deduplicate(array, {})).toThrow(TypeError)
      })

      it('should handle array with single item', () => {
        expect(deduplicate([1])).toEqual([1])
        expect(deduplicate([{ id: 1 }], 'id')).toEqual([{ id: 1 }])
      })

      it('should handle array with no duplicates', () => {
        const array = [1, 2, 3, 4, 5]
        const result = deduplicate(array)

        expect(result).toEqual([1, 2, 3, 4, 5])
      })

      it('should not mutate original array', () => {
        const array = [1, 2, 3, 2, 1]
        const original = [...array]
        
        deduplicate(array)
        
        expect(array).toEqual(original)
      })
    })

    describe('Performance', () => {
      it('should handle large arrays of primitives efficiently', () => {
        const largeArray = Array.from({ length: 10000 }, (_, i) => i % 1000)
        const startTime = Date.now()
        
        const result = deduplicate(largeArray)
        
        const endTime = Date.now()
        const executionTime = endTime - startTime

        expect(result.length).toBe(1000)
        expect(executionTime).toBeLessThan(100)
      })

      it('should handle large arrays of objects efficiently', () => {
        const largeArray = Array.from({ length: 10000 }, (_, i) => ({
          id: i % 1000,
          value: Math.random()
        }))
        const startTime = Date.now()
        
        const result = deduplicate(largeArray, 'id')
        
        const endTime = Date.now()
        const executionTime = endTime - startTime

        expect(result.length).toBe(1000)
        expect(executionTime).toBeLessThan(200)
      })
    })
  })

  // ============================================================================
  // deepClone() Tests
  // ============================================================================
  
  describe('deepClone()', () => {
    
    describe('Primitive cloning', () => {
      it('should clone numbers', () => {
        expect(deepClone(42)).toBe(42)
        expect(deepClone(3.14)).toBe(3.14)
        expect(deepClone(-100)).toBe(-100)
        expect(deepClone(0)).toBe(0)
      })

      it('should clone strings', () => {
        expect(deepClone('hello')).toBe('hello')
        expect(deepClone('')).toBe('')
      })

      it('should clone booleans', () => {
        expect(deepClone(true)).toBe(true)
        expect(deepClone(false)).toBe(false)
      })

      it('should clone null', () => {
        expect(deepClone(null)).toBe(null)
      })

      it('should clone undefined', () => {
        expect(deepClone(undefined)).toBe(undefined)
      })
    })

    describe('Array cloning', () => {
      it('should clone simple arrays', () => {
        const array = [1, 2, 3]
        const cloned = deepClone(array)

        expect(cloned).toEqual([1, 2, 3])
        expect(cloned).not.toBe(array)
      })

      it('should clone nested arrays', () => {
        const array = [1, [2, 3], [4, [5, 6]]]
        const cloned = deepClone(array)

        expect(cloned).toEqual([1, [2, 3], [4, [5, 6]]])
        expect(cloned).not.toBe(array)
        expect(cloned[1]).not.toBe(array[1])
        expect(cloned[2]).not.toBe(array[2])
      })

      it('should clone array of objects', () => {
        const array = [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ]
        const cloned = deepClone(array)

        expect(cloned).toEqual(array)
        expect(cloned).not.toBe(array)
        expect(cloned[0]).not.toBe(array[0])
        expect(cloned[1]).not.toBe(array[1])
      })

      it('should clone empty array', () => {
        const array = []
        const cloned = deepClone(array)

        expect(cloned).toEqual([])
        expect(cloned).not.toBe(array)
      })
    })

    describe('Object cloning', () => {
      it('should clone simple objects', () => {
        const obj = { a: 1, b: 2, c: 3 }
        const cloned = deepClone(obj)

        expect(cloned).toEqual({ a: 1, b: 2, c: 3 })
        expect(cloned).not.toBe(obj)
      })

      it('should clone nested objects', () => {
        const obj = {
          name: 'Alice',
          address: {
            street: '123 Main St',
            city: 'Springfield',
            coordinates: {
              lat: 40.7128,
              lng: -74.0060
            }
          }
        }
        const cloned = deepClone(obj)

        expect(cloned).toEqual(obj)
        expect(cloned).not.toBe(obj)
        expect(cloned.address).not.toBe(obj.address)
        expect(cloned.address.coordinates).not.toBe(obj.address.coordinates)
      })

      it('should clone objects with mixed value types', () => {
        const obj = {
          num: 42,
          str: 'hello',
          bool: true,
          nil: null,
          arr: [1, 2, 3],
          obj: { nested: 'value' }
        }
        const cloned = deepClone(obj)

        expect(cloned).toEqual(obj)
        expect(cloned).not.toBe(obj)
        expect(cloned.arr).not.toBe(obj.arr)
        expect(cloned.obj).not.toBe(obj.obj)
      })

      it('should clone empty object', () => {
        const obj = {}
        const cloned = deepClone(obj)

        expect(cloned).toEqual({})
        expect(cloned).not.toBe(obj)
      })
    })

    describe('Date cloning', () => {
      it('should clone Date objects', () => {
        const date = new Date('2023-01-15T12:00:00Z')
        const cloned = deepClone(date)

        expect(cloned).toEqual(date)
        expect(cloned).not.toBe(date)
        expect(cloned instanceof Date).toBe(true)
        expect(cloned.getTime()).toBe(date.getTime())
      })

      it('should clone objects containing dates', () => {
        const obj = {
          name: 'Event',
          createdAt: new Date('2023-01-15'),
          updatedAt: new Date('2023-02-20')
        }
        const cloned = deepClone(obj)

        expect(cloned).toEqual(obj)
        expect(cloned.createdAt).not.toBe(obj.createdAt)
        expect(cloned.updatedAt).not.toBe(obj.updatedAt)
        expect(cloned.createdAt instanceof Date).toBe(true)
      })
    })

    describe('Complex structures', () => {
      it('should clone deeply nested structures', () => {
        const complex = {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    data: 'deep value'
                  }
                }
              }
            }
          }
        }
        const cloned = deepClone(complex)

        expect(cloned).toEqual(complex)
        expect(cloned.level1.level2.level3.level4.level5).not.toBe(
          complex.level1.level2.level3.level4.level5
        )
      })

      it('should clone objects with array properties containing objects', () => {
        const obj = {
          users: [
            { id: 1, name: 'Alice', tags: ['admin', 'user'] },
            { id: 2, name: 'Bob', tags: ['user'] }
          ],
          settings: {
            theme: 'dark',
            notifications: {
              email: true,
              push: false
            }
          }
        }
        const cloned = deepClone(obj)

        expect(cloned).toEqual(obj)
        expect(cloned.users).not.toBe(obj.users)
        expect(cloned.users[0]).not.toBe(obj.users[0])
        expect(cloned.users[0].tags).not.toBe(obj.users[0].tags)
        expect(cloned.settings).not.toBe(obj.settings)
      })
    })

    describe('Edge cases', () => {
      it('should not clone functions', () => {
        const fn = function() { return 42 }
        const cloned = deepClone(fn)

        // Functions are returned as-is
        expect(cloned).toBe(fn)
      })

      it('should skip function properties in objects', () => {
        const obj = {
          name: 'Test',
          method: function() { return this.name }
        }
        const cloned = deepClone(obj)

        expect(cloned.name).toBe('Test')
        expect(cloned.method).toBe(obj.method)
      })

      it('should handle objects with null prototype', () => {
        const obj = Object.create(null)
        obj.key = 'value'
        
        const cloned = deepClone(obj)

        expect(cloned.key).toBe('value')
      })
    })

    describe('Mutation independence', () => {
      it('should create independent copy of objects', () => {
        const obj = { a: 1, b: { c: 2 } }
        const cloned = deepClone(obj)

        cloned.a = 999
        cloned.b.c = 888

        expect(obj.a).toBe(1)
        expect(obj.b.c).toBe(2)
      })

      it('should create independent copy of arrays', () => {
        const arr = [1, [2, 3]]
        const cloned = deepClone(arr)

        cloned[0] = 999
        cloned[1][0] = 888

        expect(arr[0]).toBe(1)
        expect(arr[1][0]).toBe(2)
      })
    })

    describe('Performance', () => {
      it('should clone large objects efficiently', () => {
        const largeObj = {}
        for (let i = 0; i < 1000; i++) {
          largeObj[`key${i}`] = {
            id: i,
            value: Math.random(),
            nested: {
              data: `value${i}`
            }
          }
        }

        const startTime = Date.now()
        const cloned = deepClone(largeObj)
        const endTime = Date.now()
        const executionTime = endTime - startTime

        expect(Object.keys(cloned).length).toBe(1000)
        expect(executionTime).toBeLessThan(100)
      })

      it('should clone large arrays efficiently', () => {
        const largeArray = Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          value: Math.random()
        }))

        const startTime = Date.now()
        const cloned = deepClone(largeArray)
        const endTime = Date.now()
        const executionTime = endTime - startTime

        expect(cloned.length).toBe(10000)
        expect(executionTime).toBeLessThan(200)
      })
    })
  })

  // ============================================================================
  // deepMerge() Tests
  // ============================================================================
  
  describe('deepMerge()', () => {
    
    describe('Basic merging', () => {
      it('should merge simple objects', () => {
        const target = { a: 1, b: 2 }
        const source = { c: 3, d: 4 }
        const result = deepMerge(target, source)

        expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 })
      })

      it('should override target values with source values', () => {
        const target = { a: 1, b: 2 }
        const source = { b: 99, c: 3 }
        const result = deepMerge(target, source)

        expect(result).toEqual({ a: 1, b: 99, c: 3 })
      })

      it('should not mutate target object', () => {
        const target = { a: 1, b: 2 }
        const source = { c: 3 }
        const originalTarget = { ...target }
        
        deepMerge(target, source)
        
        expect(target).toEqual(originalTarget)
      })

      it('should not mutate source object', () => {
        const target = { a: 1 }
        const source = { b: 2, c: { d: 3 } }
        const originalSource = JSON.parse(JSON.stringify(source))
        
        deepMerge(target, source)
        
        expect(source).toEqual(originalSource)
      })
    })

    describe('Nested object merging', () => {
      it('should merge nested objects', () => {
        const target = {
          user: {
            name: 'Alice',
            age: 30
          }
        }
        const source = {
          user: {
            email: 'alice@test.com',
            age: 31
          }
        }
        const result = deepMerge(target, source)

        expect(result).toEqual({
          user: {
            name: 'Alice',
            age: 31,
            email: 'alice@test.com'
          }
        })
      })

      it('should merge deeply nested objects', () => {
        const target = {
          settings: {
            theme: {
              color: 'blue',
              mode: 'dark'
            }
          }
        }
        const source = {
          settings: {
            theme: {
              mode: 'light',
              fontSize: 14
            }
          }
        }
        const result = deepMerge(target, source)

        expect(result).toEqual({
          settings: {
            theme: {
              color: 'blue',
              mode: 'light',
              fontSize: 14
            }
          }
        })
      })

      it('should handle multiple levels of nesting', () => {
        const target = {
          a: {
            b: {
              c: {
                d: 1
              }
            }
          }
        }
        const source = {
          a: {
            b: {
              c: {
                e: 2
              },
              f: 3
            }
          }
        }
        const result = deepMerge(target, source)

        expect(result).toEqual({
          a: {
            b: {
              c: {
                d: 1,
                e: 2
              },
              f: 3
            }
          }
        })
      })
    })

    describe('Array handling', () => {
      it('should replace target arrays with source arrays', () => {
        const target = { items: [1, 2, 3] }
        const source = { items: [4, 5] }
        const result = deepMerge(target, source)

        expect(result).toEqual({ items: [4, 5] })
      })

      it('should not merge array elements', () => {
        const target = {
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' }
          ]
        }
        const source = {
          users: [
            { id: 3, name: 'Charlie' }
          ]
        }
        const result = deepMerge(target, source)

        expect(result.users).toEqual([{ id: 3, name: 'Charlie' }])
      })

      it('should clone source arrays', () => {
        const target = { items: [1, 2] }
        const source = { items: [3, 4] }
        const result = deepMerge(target, source)

        result.items.push(5)

        expect(source.items).toEqual([3, 4])
      })
    })

    describe('Null and undefined handling', () => {
      it('should handle null target', () => {
        const source = { a: 1, b: 2 }
        const result = deepMerge(null, source)

        expect(result).toEqual({ a: 1, b: 2 })
      })

      it('should handle undefined target', () => {
        const source = { a: 1, b: 2 }
        const result = deepMerge(undefined, source)

        expect(result).toEqual({ a: 1, b: 2 })
      })

      it('should handle null source', () => {
        const target = { a: 1, b: 2 }
        const result = deepMerge(target, null)

        expect(result).toEqual({ a: 1, b: 2 })
      })

      it('should handle undefined source', () => {
        const target = { a: 1, b: 2 }
        const result = deepMerge(target, undefined)

        expect(result).toEqual({ a: 1, b: 2 })
      })

      it('should override target null with source value', () => {
        const target = { a: null }
        const source = { a: 42 }
        const result = deepMerge(target, source)

        expect(result).toEqual({ a: 42 })
      })

      it('should override target value with source null', () => {
        const target = { a: 42 }
        const source = { a: null }
        const result = deepMerge(target, source)

        expect(result).toEqual({ a: null })
      })
    })

    describe('Type conflicts', () => {
      it('should replace primitive with object', () => {
        const target = { a: 42 }
        const source = { a: { b: 1 } }
        const result = deepMerge(target, source)

        expect(result).toEqual({ a: { b: 1 } })
      })

      it('should replace object with primitive', () => {
        const target = { a: { b: 1 } }
        const source = { a: 42 }
        const result = deepMerge(target, source)

        expect(result).toEqual({ a: 42 })
      })

      it('should replace object with array', () => {
        const target = { a: { b: 1 } }
        const source = { a: [1, 2, 3] }
        const result = deepMerge(target, source)

        expect(result).toEqual({ a: [1, 2, 3] })
      })

      it('should replace array with object', () => {
        const target = { a: [1, 2, 3] }
        const source = { a: { b: 1 } }
        const result = deepMerge(target, source)

        expect(result).toEqual({ a: { b: 1 } })
      })
    })

    describe('Complex merging', () => {
      it('should merge complex configuration objects', () => {
        const target = {
          api: {
            baseUrl: 'https://api.example.com',
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json'
            }
          },
          features: {
            search: true,
            export: false
          }
        }
        const source = {
          api: {
            timeout: 10000,
            headers: {
              'Authorization': 'Bearer token'
            },
            retries: 3
          },
          features: {
            export: true,
            import: true
          }
        }
        const result = deepMerge(target, source)

        expect(result).toEqual({
          api: {
            baseUrl: 'https://api.example.com',
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer token'
            },
            retries: 3
          },
          features: {
            search: true,
            export: true,
            import: true
          }
        })
      })

      it('should merge objects with mixed data types', () => {
        const target = {
          string: 'text',
          number: 42,
          boolean: true,
          null: null,
          array: [1, 2],
          object: { a: 1 }
        }
        const source = {
          number: 99,
          boolean: false,
          null: 'not null',
          array: [3, 4, 5],
          object: { b: 2 },
          newKey: 'new value'
        }
        const result = deepMerge(target, source)

        expect(result).toEqual({
          string: 'text',
          number: 99,
          boolean: false,
          null: 'not null',
          array: [3, 4, 5],
          object: { a: 1, b: 2 },
          newKey: 'new value'
        })
      })
    })

    describe('Edge cases', () => {
      it('should handle empty objects', () => {
        const result = deepMerge({}, {})
        expect(result).toEqual({})
      })

      it('should merge when target is empty', () => {
        const target = {}
        const source = { a: 1, b: 2 }
        const result = deepMerge(target, source)

        expect(result).toEqual({ a: 1, b: 2 })
      })

      it('should merge when source is empty', () => {
        const target = { a: 1, b: 2 }
        const source = {}
        const result = deepMerge(target, source)

        expect(result).toEqual({ a: 1, b: 2 })
      })

      it('should handle non-object inputs gracefully', () => {
        const result = deepMerge('not an object', { a: 1 })
        expect(result).toEqual({ a: 1 })
      })
    })

    describe('Mutation independence', () => {
      it('should create independent merged object', () => {
        const target = { a: { b: 1 } }
        const source = { c: { d: 2 } }
        const result = deepMerge(target, source)

        result.a.b = 999
        result.c.d = 888

        expect(target.a.b).toBe(1)
        expect(source.c.d).toBe(2)
      })

      it('should not share nested object references', () => {
        const target = { data: { value: 1 } }
        const source = { data: { value: 2 } }
        const result = deepMerge(target, source)

        result.data.value = 999

        expect(target.data.value).toBe(1)
        expect(source.data.value).toBe(2)
      })
    })

    describe('Performance', () => {
      it('should merge large objects efficiently', () => {
        const target = {}
        const source = {}
        
        for (let i = 0; i < 1000; i++) {
          target[`key${i}`] = {
            id: i,
            nested: { value: i }
          }
          source[`key${i + 500}`] = {
            id: i + 500,
            nested: { value: i + 500 }
          }
        }

        const startTime = Date.now()
        const result = deepMerge(target, source)
        const endTime = Date.now()
        const executionTime = endTime - startTime

        expect(Object.keys(result).length).toBeGreaterThan(1000)
        expect(executionTime).toBeLessThan(200)
      })
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================
  
  describe('Integration: Combined utility usage', () => {
    
    jest.useRealTimers()

    it('should combine debounce with data processing', (done) => {
      const processData = jest.fn((items) => {
        const chunks = chunk(items, 3)
        return chunks.map(chunk => deduplicate(chunk))
      })
      
      const debouncedProcess = debounce(processData, 100)

      debouncedProcess([1, 2, 3, 2, 4, 5, 6])
      debouncedProcess([1, 2, 3, 2, 4, 5, 6])
      debouncedProcess([1, 2, 3, 2, 4, 5, 6])

      setTimeout(() => {
        expect(processData).toHaveBeenCalledTimes(1)
        done()
      }, 150)
    })

    it('should clone and merge complex user settings', () => {
      const defaultSettings = {
        theme: 'light',
        notifications: {
          email: true,
          push: false
        },
        privacy: {
          analytics: true
        }
      }

      const userSettings = {
        theme: 'dark',
        notifications: {
          push: true
        }
      }

      const clonedDefaults = deepClone(defaultSettings)
      const merged = deepMerge(clonedDefaults, userSettings)

      expect(merged).toEqual({
        theme: 'dark',
        notifications: {
          email: true,
          push: true
        },
        privacy: {
          analytics: true
        }
      })
    })

    it('should process large dataset with multiple utilities', () => {
      // Generate large dataset
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i % 100, // Duplicates
        value: Math.random(),
        timestamp: new Date()
      }))

      // Deduplicate by id
      const unique = deduplicate(largeData, 'id')
      expect(unique.length).toBe(100)

      // Chunk into batches
      const batches = chunk(unique, 10)
      expect(batches.length).toBe(10)

      // Clone for processing
      const clonedBatches = deepClone(batches)
      expect(clonedBatches).toEqual(batches)
      expect(clonedBatches).not.toBe(batches)
    })
  })
})

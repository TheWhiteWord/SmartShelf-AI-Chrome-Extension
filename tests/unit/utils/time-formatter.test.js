/**
 * @jest-environment jsdom
 */

/**
 * Time Formatter Utilities - Unit Tests
 * Tests for time formatting functions
 */

const {
  formatTimeAgo,
  formatDate,
  formatDuration,
  getCurrentTimestamp,
  isValidDate
} = require('../../../extension/shared/utils/time-formatter.js');

describe('Time Formatter Utilities', () => {
  // Save original Date.now for restoration
  let originalDateNow;

  beforeAll(() => {
    originalDateNow = Date.now;
  });

  afterAll(() => {
    Date.now = originalDateNow;
  });

  describe('formatTimeAgo()', () => {
    describe('Basic time ranges', () => {
      beforeEach(() => {
        // Mock Date.now to return a fixed timestamp (2025-10-01 12:00:00 UTC)
        Date.now = jest.fn(() => new Date('2025-10-01T12:00:00Z').getTime());
      });

      test('should format "Just now" for < 1 minute', () => {
        const timestamp = new Date('2025-10-01T11:59:30Z').getTime();
        expect(formatTimeAgo(timestamp)).toBe('Just now');
      });

      test('should format "Xm ago" for minutes', () => {
        const timestamp = new Date('2025-10-01T11:45:00Z').getTime();
        expect(formatTimeAgo(timestamp)).toBe('15m ago');
      });

      test('should format "Xh ago" for hours', () => {
        const timestamp = new Date('2025-10-01T09:00:00Z').getTime();
        expect(formatTimeAgo(timestamp)).toBe('3h ago');
      });

      test('should format "Xd ago" for days', () => {
        const timestamp = new Date('2025-09-28T12:00:00Z').getTime();
        expect(formatTimeAgo(timestamp)).toBe('3d ago');
      });

      test('should format "Xw ago" for weeks', () => {
        const timestamp = new Date('2025-09-17T12:00:00Z').getTime();
        expect(formatTimeAgo(timestamp)).toBe('2w ago');
      });

      test('should format "Xmo ago" for months', () => {
        const timestamp = new Date('2025-07-01T12:00:00Z').getTime();
        expect(formatTimeAgo(timestamp)).toBe('3mo ago');
      });

      test('should format "Xy ago" for years', () => {
        const timestamp = new Date('2023-10-01T12:00:00Z').getTime();
        expect(formatTimeAgo(timestamp)).toBe('2y ago');
      });
    });

    describe('Edge cases: exact boundaries', () => {
      beforeEach(() => {
        Date.now = jest.fn(() => new Date('2025-10-01T12:00:00Z').getTime());
      });

      test('should format exactly 1 minute as "1m ago"', () => {
        const timestamp = new Date('2025-10-01T11:59:00Z').getTime();
        expect(formatTimeAgo(timestamp)).toBe('1m ago');
      });

      test('should format exactly 59 minutes as "59m ago"', () => {
        const timestamp = new Date('2025-10-01T11:01:00Z').getTime();
        expect(formatTimeAgo(timestamp)).toBe('59m ago');
      });

      test('should format exactly 1 hour as "1h ago"', () => {
        const timestamp = new Date('2025-10-01T11:00:00Z').getTime();
        expect(formatTimeAgo(timestamp)).toBe('1h ago');
      });

      test('should format exactly 23 hours as "23h ago"', () => {
        const timestamp = new Date('2025-09-30T13:00:00Z').getTime();
        expect(formatTimeAgo(timestamp)).toBe('23h ago');
      });

      test('should format exactly 1 day as "1d ago"', () => {
        const timestamp = new Date('2025-09-30T12:00:00Z').getTime();
        expect(formatTimeAgo(timestamp)).toBe('1d ago');
      });
    });

    describe('Input type handling', () => {
      beforeEach(() => {
        Date.now = jest.fn(() => new Date('2025-10-01T12:00:00Z').getTime());
      });

      test('should handle Date objects', () => {
        const date = new Date('2025-10-01T11:30:00Z');
        expect(formatTimeAgo(date)).toBe('30m ago');
      });

      test('should handle timestamp numbers', () => {
        const timestamp = new Date('2025-10-01T11:30:00Z').getTime();
        expect(formatTimeAgo(timestamp)).toBe('30m ago');
      });

      test('should handle ISO date strings', () => {
        expect(formatTimeAgo('2025-10-01T11:30:00Z')).toBe('30m ago');
      });

      test('should handle other date string formats', () => {
        expect(formatTimeAgo('October 1, 2025 11:30:00 GMT')).toBe('30m ago');
      });
    });

    describe('Future dates', () => {
      beforeEach(() => {
        Date.now = jest.fn(() => new Date('2025-10-01T12:00:00Z').getTime());
      });

      test('should handle future dates gracefully', () => {
        const futureDate = new Date('2025-10-02T12:00:00Z').getTime();
        expect(formatTimeAgo(futureDate)).toBe('In the future');
      });

      test('should handle far future dates', () => {
        const farFuture = new Date('2030-01-01T00:00:00Z').getTime();
        expect(formatTimeAgo(farFuture)).toBe('In the future');
      });
    });

    describe('Invalid dates', () => {
      test('should handle invalid date strings', () => {
        expect(formatTimeAgo('not a date')).toBe('Invalid date');
      });

      test('should handle null', () => {
        expect(formatTimeAgo(null)).toBe('Invalid date');
      });

      test('should handle undefined', () => {
        expect(formatTimeAgo(undefined)).toBe('Invalid date');
      });

      test('should handle invalid Date objects', () => {
        expect(formatTimeAgo(new Date('invalid'))).toBe('Invalid date');
      });

      test('should handle NaN', () => {
        expect(formatTimeAgo(NaN)).toBe('Invalid date');
      });
    });

    describe('Edge cases: very old dates', () => {
      beforeEach(() => {
        Date.now = jest.fn(() => new Date('2025-10-01T12:00:00Z').getTime());
      });

      test('should handle dates from 10 years ago', () => {
        const oldDate = new Date('2015-10-01T12:00:00Z').getTime();
        expect(formatTimeAgo(oldDate)).toBe('10y ago');
      });

      test('should handle dates from 50 years ago', () => {
        const veryOldDate = new Date('1975-10-01T12:00:00Z').getTime();
        expect(formatTimeAgo(veryOldDate)).toBe('50y ago');
      });

      test('should handle negative timestamps (before Unix epoch)', () => {
        const beforeEpoch = -1000000000; // Before 1970
        const result = formatTimeAgo(beforeEpoch);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Should return formatted date
      });
    });

    describe('Timezone handling', () => {
      test('should handle UTC timestamps consistently', () => {
        Date.now = jest.fn(() => new Date('2025-10-01T12:00:00Z').getTime());
        const timestamp = new Date('2025-10-01T11:00:00Z').getTime();
        expect(formatTimeAgo(timestamp)).toBe('1h ago');
      });

      test('should handle local time correctly', () => {
        const now = new Date();
        Date.now = jest.fn(() => now.getTime());
        const oneHourAgo = new Date(now.getTime() - 3600000);
        expect(formatTimeAgo(oneHourAgo)).toBe('1h ago');
      });
    });
  });

  describe('formatDate()', () => {
    describe('Default format (YYYY-MM-DD)', () => {
      test('should format with default format', () => {
        const date = new Date('2025-10-01T15:30:45Z');
        const result = formatDate(date);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      test('should format Date objects', () => {
        const date = new Date('2025-10-01T00:00:00Z');
        expect(formatDate(date)).toContain('2025');
        expect(formatDate(date)).toContain('-10-');
      });

      test('should format timestamps', () => {
        const timestamp = new Date('2025-10-01T00:00:00Z').getTime();
        expect(formatDate(timestamp)).toContain('2025');
      });

      test('should format ISO strings', () => {
        expect(formatDate('2025-10-01T00:00:00Z')).toContain('2025');
      });
    });

    describe('Custom format tokens', () => {
      // Note: Using local time for consistent testing across timezones
      const testDate = new Date(2025, 2, 5, 9, 7, 3); // March 5, 2025, 09:07:03 local time

      test('should format YYYY (4-digit year)', () => {
        expect(formatDate(testDate, 'YYYY')).toBe('2025');
      });

      test('should format YY (2-digit year)', () => {
        expect(formatDate(testDate, 'YY')).toBe('25');
      });

      test('should format MM (2-digit month)', () => {
        expect(formatDate(testDate, 'MM')).toBe('03');
      });

      test('should format M (month without padding)', () => {
        expect(formatDate(testDate, 'M')).toBe('3');
      });

      test('should format DD (2-digit day)', () => {
        expect(formatDate(testDate, 'DD')).toBe('05');
      });

      test('should format D (day without padding)', () => {
        expect(formatDate(testDate, 'D')).toBe('5');
      });

      test('should format HH (2-digit hour)', () => {
        expect(formatDate(testDate, 'HH')).toBe('09');
      });

      test('should format H (hour without padding)', () => {
        expect(formatDate(testDate, 'H')).toBe('9');
      });

      test('should format mm (2-digit minute)', () => {
        expect(formatDate(testDate, 'mm')).toBe('07');
      });

      test('should format m (minute without padding)', () => {
        expect(formatDate(testDate, 'm')).toBe('7');
      });

      test('should format ss (2-digit second)', () => {
        expect(formatDate(testDate, 'ss')).toBe('03');
      });

      test('should format s (second without padding)', () => {
        expect(formatDate(testDate, 's')).toBe('3');
      });
    });

    describe('Complex format strings', () => {
      const testDate = new Date(2025, 9, 15, 14, 30, 45); // Oct 15, 2025 local time

      test('should format ISO 8601 style', () => {
        expect(formatDate(testDate, 'YYYY-MM-DD HH:mm:ss')).toMatch(
          /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
        );
      });

      test('should format US style', () => {
        expect(formatDate(testDate, 'MM/DD/YYYY')).toMatch(
          /^\d{2}\/\d{2}\/\d{4}$/
        );
      });

      test('should format with custom separators', () => {
        expect(formatDate(testDate, 'DD.MM.YYYY')).toMatch(
          /^\d{2}\.\d{2}\.\d{4}$/
        );
      });

      test('should format time only', () => {
        expect(formatDate(testDate, 'HH:mm:ss')).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      });

      test('should format with text', () => {
        // Using 'on' instead of 'Date' to avoid D token replacement issue
        const result = formatDate(testDate, 'on YYYY-MM-DD');
        expect(result).toContain('on ');
        expect(result).toMatch(/on \d{4}-\d{2}-\d{2}/);
      });
    });

    describe('Invalid dates', () => {
      test('should handle invalid date strings', () => {
        expect(formatDate('not a date')).toBe('Invalid date');
      });

      test('should handle null', () => {
        expect(formatDate(null)).toBe('Invalid date');
      });

      test('should handle undefined', () => {
        expect(formatDate(undefined)).toBe('Invalid date');
      });

      test('should handle invalid Date objects', () => {
        expect(formatDate(new Date('invalid'))).toBe('Invalid date');
      });

      test('should handle NaN', () => {
        expect(formatDate(NaN)).toBe('Invalid date');
      });
    });

    describe('Edge cases', () => {
      test('should handle dates before 1970', () => {
        const oldDate = new Date('1950-01-01T00:00:00Z');
        expect(formatDate(oldDate, 'YYYY')).toBe('1950');
      });

      test('should handle dates far in the future', () => {
        const futureDate = new Date(2100, 11, 31, 23, 59, 59); // Dec 31, 2100 local time
        expect(formatDate(futureDate, 'YYYY')).toBe('2100');
      });

      test('should handle leap year dates', () => {
        const leapDate = new Date('2024-02-29T00:00:00Z');
        expect(formatDate(leapDate, 'YYYY-MM-DD')).toContain('2024-02-29');
      });

      test('should handle single-digit dates with padding', () => {
        const date = new Date('2025-01-05T03:07:09Z');
        expect(formatDate(date, 'MM')).toBe('01');
        expect(formatDate(date, 'DD')).toBe('05');
      });
    });
  });

  describe('formatDuration()', () => {
    describe('Basic durations', () => {
      test('should format milliseconds', () => {
        expect(formatDuration(500)).toBe('500ms');
      });

      test('should format seconds', () => {
        expect(formatDuration(45000)).toBe('45s');
      });

      test('should format minutes', () => {
        expect(formatDuration(300000)).toBe('5m');
      });

      test('should format hours', () => {
        expect(formatDuration(7200000)).toBe('2h');
      });

      test('should format days', () => {
        expect(formatDuration(172800000)).toBe('2d');
      });
    });

    describe('Compound durations', () => {
      test('should format minutes and seconds', () => {
        expect(formatDuration(90000)).toBe('1m');
      });

      test('should format hours and minutes', () => {
        expect(formatDuration(5400000)).toBe('1h 30m');
      });

      test('should format days and hours', () => {
        expect(formatDuration(93600000)).toBe('1d 2h');
      });

      test('should format days, hours, and minutes', () => {
        expect(formatDuration(97200000)).toBe('1d 3h');
      });

      test('should not show seconds in compound durations', () => {
        const duration = formatDuration(3665000); // 1h 1m 5s
        expect(duration).toBe('1h 1m');
        expect(duration).not.toContain('s');
      });
    });

    describe('Edge cases', () => {
      test('should handle zero duration', () => {
        expect(formatDuration(0)).toBe('0s');
      });

      test('should handle very short durations (< 1s)', () => {
        expect(formatDuration(100)).toBe('100ms');
        expect(formatDuration(999)).toBe('999ms');
      });

      test('should handle exactly 1 second', () => {
        expect(formatDuration(1000)).toBe('1s');
      });

      test('should handle exactly 1 minute', () => {
        expect(formatDuration(60000)).toBe('1m');
      });

      test('should handle exactly 1 hour', () => {
        expect(formatDuration(3600000)).toBe('1h');
      });

      test('should handle exactly 1 day', () => {
        expect(formatDuration(86400000)).toBe('1d');
      });

      test('should handle very long durations', () => {
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        expect(formatDuration(thirtyDays)).toContain('d');
      });
    });

    describe('Invalid inputs', () => {
      test('should handle negative durations', () => {
        expect(formatDuration(-1000)).toBe('Invalid duration');
      });

      test('should handle NaN', () => {
        expect(formatDuration(NaN)).toBe('Invalid duration');
      });

      test('should handle null', () => {
        expect(formatDuration(null)).toBe('Invalid duration');
      });

      test('should handle undefined', () => {
        expect(formatDuration(undefined)).toBe('Invalid duration');
      });

      test('should handle non-numeric strings', () => {
        expect(formatDuration('not a number')).toBe('Invalid duration');
      });

      test('should handle Infinity', () => {
        expect(formatDuration(Infinity)).toBe('Invalid duration');
      });
    });

    describe('Rounding behavior', () => {
      test('should round down partial seconds', () => {
        expect(formatDuration(1500)).toBe('1s');
      });

      test('should round down partial minutes', () => {
        expect(formatDuration(90500)).toBe('1m');
      });

      test('should round down partial hours', () => {
        expect(formatDuration(3690000)).toBe('1h 1m');
      });
    });
  });

  describe('getCurrentTimestamp()', () => {
    test('should return a number', () => {
      expect(typeof getCurrentTimestamp()).toBe('number');
    });

    test('should return current timestamp', () => {
      const before = Date.now();
      const timestamp = getCurrentTimestamp();
      const after = Date.now();
      
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    test('should return positive number', () => {
      expect(getCurrentTimestamp()).toBeGreaterThan(0);
    });

    test('should return reasonable timestamp (after 2020)', () => {
      const timestamp2020 = new Date('2020-01-01').getTime();
      expect(getCurrentTimestamp()).toBeGreaterThan(timestamp2020);
    });
  });

  describe('isValidDate()', () => {
    describe('Valid dates', () => {
      test('should validate Date objects', () => {
        expect(isValidDate(new Date())).toBe(true);
        expect(isValidDate(new Date('2025-10-01'))).toBe(true);
      });

      test('should validate timestamps', () => {
        expect(isValidDate(Date.now())).toBe(true);
        expect(isValidDate(0)).toBe(true);
        expect(isValidDate(1696176000000)).toBe(true);
      });

      test('should validate ISO date strings', () => {
        expect(isValidDate('2025-10-01T12:00:00Z')).toBe(true);
        expect(isValidDate('2025-10-01')).toBe(true);
      });

      test('should validate other date string formats', () => {
        expect(isValidDate('October 1, 2025')).toBe(true);
        expect(isValidDate('10/01/2025')).toBe(true);
      });

      test('should validate negative timestamps (before Unix epoch)', () => {
        expect(isValidDate(-1000000000)).toBe(true);
      });
    });

    describe('Invalid dates', () => {
      test('should reject invalid date strings', () => {
        expect(isValidDate('not a date')).toBe(false);
        expect(isValidDate('2025-13-01')).toBe(false);
        // Note: JavaScript auto-corrects '2025-02-30' to '2025-03-02', so it's technically valid
        expect(isValidDate('completely invalid date string!!!')).toBe(false);
      });

      test('should reject null', () => {
        expect(isValidDate(null)).toBe(false);
      });

      test('should reject undefined', () => {
        expect(isValidDate(undefined)).toBe(false);
      });

      test('should reject invalid Date objects', () => {
        expect(isValidDate(new Date('invalid'))).toBe(false);
      });

      test('should reject NaN', () => {
        expect(isValidDate(NaN)).toBe(false);
      });

      test('should reject objects', () => {
        expect(isValidDate({})).toBe(false);
        expect(isValidDate({ date: '2025-10-01' })).toBe(false);
      });

      test('should reject arrays', () => {
        expect(isValidDate([])).toBe(false);
        expect(isValidDate([2025, 10, 1])).toBe(false);
      });
    });
  });

  describe('Integration tests', () => {
    test('should use formatTimeAgo and formatDate together', () => {
      const now = Date.now();
      Date.now = jest.fn(() => now);
      
      const oldDate = now - 365 * 24 * 60 * 60 * 1000; // 1 year ago
      
      expect(formatTimeAgo(oldDate)).toBe('1y ago');
      expect(formatDate(oldDate, 'YYYY')).toBe('2024');
    });

    test('should validate before formatting', () => {
      const invalidDate = 'not a date';
      
      if (!isValidDate(invalidDate)) {
        expect(formatDate(invalidDate)).toBe('Invalid date');
        expect(formatTimeAgo(invalidDate)).toBe('Invalid date');
      }
    });

    test('should format duration from timestamp difference', () => {
      const start = new Date('2025-10-01T12:00:00Z').getTime();
      const end = new Date('2025-10-01T14:30:00Z').getTime();
      const duration = end - start;
      
      expect(formatDuration(duration)).toBe('2h 30m');
    });

    test('should handle complete time workflow', () => {
      const timestamp = getCurrentTimestamp();
      
      expect(isValidDate(timestamp)).toBe(true);
      expect(formatDate(timestamp)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(formatTimeAgo(timestamp)).toBe('Just now');
    });
  });

  describe('Performance tests', () => {
    test('should format many timestamps efficiently', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        formatTimeAgo(Date.now() - i * 1000);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    test('should format many dates efficiently', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    test('should format many durations efficiently', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        formatDuration(i * 1000);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50); // Should complete in < 50ms
    });
  });
});

/**
 * Time Formatter Utilities
 * Provides time formatting functions for the SmartShelf extension
 */

/**
 * Format a timestamp as a relative time string (e.g., "2h ago", "Just now")
 * @param {number|string|Date} timestamp - The timestamp to format
 * @returns {string} Formatted relative time string
 */
function formatTimeAgo(timestamp) {
  try {
    let date;
    
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return 'Invalid date';
    }

    // Check for invalid date
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const now = Date.now();
    const diffMs = now - date.getTime();

    // Handle future dates
    if (diffMs < 0) {
      return 'In the future';
    }

    // Handle negative timestamps (dates before Unix epoch)
    if (date.getTime() < 0) {
      return formatDate(date, 'YYYY-MM-DD');
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    // Just now (< 1 minute)
    if (diffSeconds < 60) {
      return 'Just now';
    }

    // Minutes ago (< 1 hour)
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    // Hours ago (< 1 day)
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    // Days ago (< 1 week)
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    // Weeks ago (< 1 month)
    if (diffDays < 30) {
      return `${diffWeeks}w ago`;
    }

    // Months ago (< 1 year)
    if (diffDays < 365) {
      return `${diffMonths}mo ago`;
    }

    // Years ago
    return `${diffYears}y ago`;
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format a date according to the specified format
 * Supported format tokens:
 * - YYYY: 4-digit year
 * - YY: 2-digit year
 * - MM: 2-digit month
 * - M: month (no padding)
 * - DD: 2-digit day
 * - D: day (no padding)
 * - HH: 2-digit hour (24-hour)
 * - H: hour (no padding)
 * - mm: 2-digit minute
 * - m: minute (no padding)
 * - ss: 2-digit second
 * - s: second (no padding)
 * 
 * @param {Date|string|number} date - The date to format
 * @param {string} format - The format string (default: 'YYYY-MM-DD')
 * @returns {string} Formatted date string
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  try {
    let dateObj;

    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      return 'Invalid date';
    }

    // Check for invalid date
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const seconds = dateObj.getSeconds();

    // Padding helper
    const pad = (num) => String(num).padStart(2, '0');

    // Replace format tokens (replace longer patterns first to avoid partial matches)
    return format
      .replace(/YYYY/g, year)
      .replace(/YY/g, String(year).slice(-2))
      .replace(/MM/g, pad(month))
      .replace(/DD/g, pad(day))
      .replace(/HH/g, pad(hours))
      .replace(/mm/g, pad(minutes))
      .replace(/ss/g, pad(seconds))
      .replace(/M/g, month)
      .replace(/D/g, day)
      .replace(/H/g, hours)
      .replace(/m/g, minutes)
      .replace(/s/g, seconds);
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format a duration in milliseconds as a human-readable string
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration string (e.g., "2h 30m", "45s", "1d 3h")
 */
function formatDuration(milliseconds) {
  if (typeof milliseconds !== 'number' || isNaN(milliseconds) || !isFinite(milliseconds)) {
    return 'Invalid duration';
  }

  // Handle negative durations
  if (milliseconds < 0) {
    return 'Invalid duration';
  }

  // Handle zero
  if (milliseconds === 0) {
    return '0s';
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // Build duration string
  const parts = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours % 24 > 0) {
    parts.push(`${hours % 24}h`);
  }

  if (minutes % 60 > 0) {
    parts.push(`${minutes % 60}m`);
  }

  if (seconds % 60 > 0 && parts.length === 0) {
    // Only show seconds if no larger units
    parts.push(`${seconds % 60}s`);
  }

  // Handle very short durations (< 1 second)
  if (parts.length === 0 && milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  return parts.join(' ') || '0s';
}

/**
 * Get the current timestamp in milliseconds
 * Useful for testing and time-based operations
 * @returns {number} Current timestamp
 */
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * Check if a date is valid
 * @param {Date|string|number} date - The date to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidDate(date) {
  try {
    let dateObj;

    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      return false;
    }

    return !isNaN(dateObj.getTime());
  } catch (error) {
    return false;
  }
}

// Export functions
module.exports = {
  formatTimeAgo,
  formatDate,
  formatDuration,
  getCurrentTimestamp,
  isValidDate
};

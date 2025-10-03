/**
 * PerformanceMetric Model
 * 
 * Represents performance measurements collected during automated testing
 * with comprehensive measurement data management and threshold validation.
 */

import { v4 as uuidv4 } from 'uuid';

export class PerformanceMetric {
  /**
   * Metric type constants
   */
  static TYPES = {
    AI_PROCESSING_TIME: 'ai_processing_time',
    SEARCH_RESPONSE_TIME: 'search_response_time',
    EXTENSION_LOAD_TIME: 'extension_load_time',
    MEMORY_USAGE: 'memory_usage',
    CPU_USAGE: 'cpu_usage',
    NETWORK_LATENCY: 'network_latency',
    STORAGE_OPERATION_TIME: 'storage_operation_time',
    UI_RENDER_TIME: 'ui_render_time'
  };

  /**
   * Measurement unit constants
   */
  static UNITS = {
    MILLISECONDS: 'ms',
    SECONDS: 's',
    MEGABYTES: 'MB',
    GIGABYTES: 'GB',
    PERCENTAGE: '%',
    COUNT: 'count',
    BYTES_PER_SECOND: 'bytes/s',
    REQUESTS_PER_SECOND: 'req/s'
  };

  /**
   * Browser state constants
   */
  static BROWSER_STATE = {
    IDLE: 'idle',
    PROCESSING: 'processing',
    HEAVY_LOAD: 'heavy_load',
    BACKGROUND: 'background',
    FOREGROUND: 'foreground'
  };

  /**
   * Creates a new PerformanceMetric instance
   * @param {Object} config - Metric configuration
   * @param {string} config.metricType - Type of performance metric
   * @param {string} config.metricName - Descriptive metric name
   * @param {number} config.value - Numeric metric value
   * @param {string} config.unit - Measurement unit
   * @param {number} config.threshold - Performance threshold for validation
   * @param {string} config.context - Additional context about measurement conditions
   * @param {string} config.browserState - Browser state during measurement
   */
  constructor(config = {}) {
    this.id = config.id || uuidv4();
    this.sessionId = config.sessionId || null;
    this.metricType = config.metricType;
    this.metricName = config.metricName || '';
    this.value = config.value;
    this.unit = config.unit || PerformanceMetric.UNITS.MILLISECONDS;
    this.threshold = config.threshold || null;
    this.passed = config.passed !== undefined ? config.passed : null;
    this.context = config.context || '';
    this.timestamp = config.timestamp || new Date().toISOString();
    this.browserState = config.browserState || PerformanceMetric.BROWSER_STATE.IDLE;
    
    // Additional tracking
    this.measurements = config.measurements || [];
    this.aggregations = config.aggregations || {};
    this.tags = config.tags || [];
    
    // Auto-determine pass/fail if threshold is set
    if (this.passed === null && this.threshold !== null && this.value !== undefined) {
      this.passed = this._checkThreshold();
    }
    
    this._validateConfiguration();
  }

  /**
   * Validates the metric configuration
   * @private
   */
  _validateConfiguration() {
    if (!this.metricType || !Object.values(PerformanceMetric.TYPES).includes(this.metricType)) {
      throw new Error(`Invalid metric type: ${this.metricType}`);
    }
    
    if (!this.metricName || typeof this.metricName !== 'string') {
      throw new Error('Metric name must be a non-empty string');
    }
    
    if (this.value !== undefined && (typeof this.value !== 'number' || isNaN(this.value))) {
      throw new Error('Metric value must be a valid number');
    }
    
    if (!Object.values(PerformanceMetric.UNITS).includes(this.unit)) {
      throw new Error(`Invalid unit: ${this.unit}`);
    }
    
    if (!Object.values(PerformanceMetric.BROWSER_STATE).includes(this.browserState)) {
      throw new Error(`Invalid browser state: ${this.browserState}`);
    }
  }

  /**
   * Checks if the metric value meets the threshold
   * @returns {boolean} True if threshold is met
   * @private
   */
  _checkThreshold() {
    if (this.threshold === null || this.value === undefined) {
      return null;
    }
    
    // Most performance metrics should be below threshold (lower is better)
    // except for metrics like success rate where higher is better
    const lowerIsBetter = [
      PerformanceMetric.TYPES.AI_PROCESSING_TIME,
      PerformanceMetric.TYPES.SEARCH_RESPONSE_TIME,
      PerformanceMetric.TYPES.EXTENSION_LOAD_TIME,
      PerformanceMetric.TYPES.MEMORY_USAGE,
      PerformanceMetric.TYPES.CPU_USAGE,
      PerformanceMetric.TYPES.NETWORK_LATENCY,
      PerformanceMetric.TYPES.STORAGE_OPERATION_TIME,
      PerformanceMetric.TYPES.UI_RENDER_TIME
    ].includes(this.metricType);
    
    return lowerIsBetter ? this.value <= this.threshold : this.value >= this.threshold;
  }

  /**
   * Updates the metric value and re-evaluates threshold
   * @param {number} newValue - New metric value
   * @param {string} context - Additional context for this measurement
   */
  updateValue(newValue, context = '') {
    if (typeof newValue !== 'number' || isNaN(newValue)) {
      throw new Error('New value must be a valid number');
    }
    
    // Store previous measurement
    if (this.value !== undefined) {
      this.measurements.push({
        value: this.value,
        timestamp: this.timestamp,
        context: this.context
      });
    }
    
    this.value = newValue;
    this.timestamp = new Date().toISOString();
    this.context = context;
    this.passed = this._checkThreshold();
    
    // Update aggregations
    this._updateAggregations();
  }

  /**
   * Adds a measurement to the metric (for averaging, etc.)
   * @param {number} value - Measurement value
   * @param {string} context - Measurement context
   */
  addMeasurement(value, context = '') {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Measurement value must be a valid number');
    }
    
    this.measurements.push({
      id: uuidv4(),
      value: value,
      timestamp: new Date().toISOString(),
      context: context,
      browserState: this.browserState
    });
    
    this._updateAggregations();
  }

  /**
   * Updates aggregation statistics based on all measurements
   * @private
   */
  _updateAggregations() {
    if (this.measurements.length === 0) {
      return;
    }
    
    const values = this.measurements.map(m => m.value);
    if (this.value !== undefined) {
      values.push(this.value);
    }
    
    this.aggregations = {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      median: this._calculateMedian(values),
      standardDeviation: this._calculateStandardDeviation(values),
      percentile95: this._calculatePercentile(values, 95),
      percentile99: this._calculatePercentile(values, 99)
    };
    
    // Update main value to average if multiple measurements
    if (values.length > 1) {
      this.value = this.aggregations.average;
      this.passed = this._checkThreshold();
    }
  }

  /**
   * Calculates median value
   * @param {Array<number>} values - Array of values
   * @returns {number} Median value
   * @private
   */
  _calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculates standard deviation
   * @param {Array<number>} values - Array of values
   * @returns {number} Standard deviation
   * @private
   */
  _calculateStandardDeviation(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculates percentile value
   * @param {Array<number>} values - Array of values
   * @param {number} percentile - Percentile (0-100)
   * @returns {number} Percentile value
   * @private
   */
  _calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Sets performance threshold for validation
   * @param {number} threshold - Threshold value
   * @param {string} operator - Comparison operator ('<=', '>=', '<', '>', '==')
   */
  setThreshold(threshold, operator = '<=') {
    if (typeof threshold !== 'number' || isNaN(threshold)) {
      throw new Error('Threshold must be a valid number');
    }
    
    this.threshold = threshold;
    this.thresholdOperator = operator;
    this.passed = this._checkThreshold();
  }

  /**
   * Adds a tag to the metric for categorization
   * @param {string} tag - Tag to add
   */
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * Removes a tag from the metric
   * @param {string} tag - Tag to remove
   */
  removeTag(tag) {
    this.tags = this.tags.filter(t => t !== tag);
  }

  /**
   * Gets a human-readable description of the metric
   * @returns {string} Human-readable description
   */
  getDescription() {
    let description = `${this.metricName}: ${this.value}${this.unit}`;
    
    if (this.threshold !== null) {
      const operator = this.thresholdOperator || '<=';
      const statusEmoji = this.passed ? '✅' : '❌';
      description += ` ${operator} ${this.threshold}${this.unit} ${statusEmoji}`;
    }
    
    if (this.aggregations && this.aggregations.count > 1) {
      description += ` (avg of ${this.aggregations.count} measurements)`;
    }
    
    if (this.context) {
      description += `\n  Context: ${this.context}`;
    }
    
    return description;
  }

  /**
   * Gets metric statistics and aggregations
   * @returns {Object} Comprehensive metric statistics
   */
  getStatistics() {
    return {
      id: this.id,
      sessionId: this.sessionId,
      metricType: this.metricType,
      metricName: this.metricName,
      value: this.value,
      unit: this.unit,
      threshold: this.threshold,
      passed: this.passed,
      browserState: this.browserState,
      timestamp: this.timestamp,
      measurementCount: this.measurements.length,
      tags: [...this.tags],
      aggregations: { ...this.aggregations },
      thresholdMargin: this.threshold !== null && this.value !== undefined 
        ? Math.abs(this.value - this.threshold) 
        : null,
      thresholdMarginPercent: this.threshold !== null && this.threshold !== 0 && this.value !== undefined
        ? Math.abs((this.value - this.threshold) / this.threshold) * 100
        : null
    };
  }

  /**
   * Checks if metric indicates performance degradation
   * @param {number} baselineValue - Baseline value to compare against
   * @param {number} degradationThreshold - Percentage threshold for degradation (default: 20%)
   * @returns {boolean} True if performance has degraded
   */
  hasPerformanceDegradation(baselineValue, degradationThreshold = 20) {
    if (this.value === undefined || baselineValue === undefined) {
      return false;
    }
    
    const percentageIncrease = ((this.value - baselineValue) / baselineValue) * 100;
    
    // For metrics where lower is better, degradation is an increase
    const lowerIsBetter = [
      PerformanceMetric.TYPES.AI_PROCESSING_TIME,
      PerformanceMetric.TYPES.SEARCH_RESPONSE_TIME,
      PerformanceMetric.TYPES.EXTENSION_LOAD_TIME,
      PerformanceMetric.TYPES.MEMORY_USAGE,
      PerformanceMetric.TYPES.CPU_USAGE,
      PerformanceMetric.TYPES.NETWORK_LATENCY,
      PerformanceMetric.TYPES.STORAGE_OPERATION_TIME,
      PerformanceMetric.TYPES.UI_RENDER_TIME
    ].includes(this.metricType);
    
    return lowerIsBetter 
      ? percentageIncrease > degradationThreshold
      : percentageIncrease < -degradationThreshold;
  }

  /**
   * Serializes the performance metric to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      sessionId: this.sessionId,
      metricType: this.metricType,
      metricName: this.metricName,
      value: this.value,
      unit: this.unit,
      threshold: this.threshold,
      thresholdOperator: this.thresholdOperator,
      passed: this.passed,
      context: this.context,
      timestamp: this.timestamp,
      browserState: this.browserState,
      measurements: this.measurements,
      aggregations: this.aggregations,
      tags: this.tags,
      statistics: this.getStatistics(),
      description: this.getDescription()
    };
  }

  /**
   * Creates a PerformanceMetric instance from JSON data
   * @param {Object} data - JSON data
   * @returns {PerformanceMetric} New instance
   */
  static fromJSON(data) {
    const metric = new PerformanceMetric(data);
    metric.thresholdOperator = data.thresholdOperator;
    return metric;
  }

  /**
   * Creates a timing metric (AI processing, search response, etc.)
   * @param {string} name - Metric name
   * @param {number} timeMs - Time in milliseconds
   * @param {number} thresholdMs - Threshold in milliseconds
   * @param {string} context - Additional context
   * @returns {PerformanceMetric} New timing metric
   */
  static createTimingMetric(name, timeMs, thresholdMs = null, context = '') {
    return new PerformanceMetric({
      metricType: PerformanceMetric.TYPES.AI_PROCESSING_TIME,
      metricName: name,
      value: timeMs,
      unit: PerformanceMetric.UNITS.MILLISECONDS,
      threshold: thresholdMs,
      context: context
    });
  }

  /**
   * Creates a memory usage metric
   * @param {string} name - Metric name
   * @param {number} memoryMB - Memory usage in MB
   * @param {number} thresholdMB - Threshold in MB
   * @param {string} context - Additional context
   * @returns {PerformanceMetric} New memory metric
   */
  static createMemoryMetric(name, memoryMB, thresholdMB = null, context = '') {
    return new PerformanceMetric({
      metricType: PerformanceMetric.TYPES.MEMORY_USAGE,
      metricName: name,
      value: memoryMB,
      unit: PerformanceMetric.UNITS.MEGABYTES,
      threshold: thresholdMB,
      context: context
    });
  }

  /**
   * Validates if a metric type is valid
   * @param {string} type - Type to validate
   * @returns {boolean} True if valid
   */
  static isValidType(type) {
    return Object.values(PerformanceMetric.TYPES).includes(type);
  }

  /**
   * Validates if a unit is valid
   * @param {string} unit - Unit to validate
   * @returns {boolean} True if valid
   */
  static isValidUnit(unit) {
    return Object.values(PerformanceMetric.UNITS).includes(unit);
  }
}

export default PerformanceMetric;
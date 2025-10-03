/**
 * ValidationResult Model
 * 
 * Represents test validation outcomes and assertions during MCP testing
 * with comprehensive test assertion tracking and result management.
 */

import { v4 as uuidv4 } from 'uuid';

export class ValidationResult {
  /**
   * Validation type constants
   */
  static TYPES = {
    FUNCTIONAL: 'functional',
    PERFORMANCE: 'performance',
    VISUAL: 'visual',
    API_RESPONSE: 'api_response',
    ERROR_HANDLING: 'error_handling'
  };

  /**
   * Severity level constants
   */
  static SEVERITY = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
  };

  /**
   * Validation state constants
   */
  static STATE = {
    PASSED: 'passed',
    FAILED: 'failed',
    WARNING: 'warning',
    INCONCLUSIVE: 'inconclusive'
  };

  /**
   * Creates a new ValidationResult instance
   * @param {Object} config - Validation configuration
   * @param {string} config.validationType - Type of validation
   * @param {string} config.testName - Descriptive name of specific test
   * @param {*} config.expected - Expected outcome or value
   * @param {*} config.actual - Actual observed outcome or value
   * @param {string} config.severity - Validation importance level
   * @param {string} config.message - Detailed validation message or explanation
   */
  constructor(config = {}) {
    this.id = config.id || uuidv4();
    this.sessionId = config.sessionId || null;
    this.workflowId = config.workflowId || null;
    this.validationType = config.validationType;
    this.testName = config.testName || '';
    this.expected = config.expected;
    this.actual = config.actual;
    this.passed = config.passed !== undefined ? config.passed : null;
    this.severity = config.severity || ValidationResult.SEVERITY.MEDIUM;
    this.message = config.message || '';
    this.evidence = config.evidence || {};
    this.timestamp = config.timestamp || new Date().toISOString();
    
    // Auto-determine pass/fail if not explicitly set
    if (this.passed === null && this.expected !== undefined && this.actual !== undefined) {
      this.passed = this._compareValues(this.expected, this.actual);
    }
    
    // Derived state based on pass/fail and severity
    this.state = this._determineState();
    
    this._validateConfiguration();
  }

  /**
   * Validates the validation result configuration
   * @private
   */
  _validateConfiguration() {
    if (!this.validationType || !Object.values(ValidationResult.TYPES).includes(this.validationType)) {
      throw new Error(`Invalid validation type: ${this.validationType}`);
    }
    
    if (!this.testName || typeof this.testName !== 'string') {
      throw new Error('Test name must be a non-empty string');
    }
    
    if (!Object.values(ValidationResult.SEVERITY).includes(this.severity)) {
      throw new Error(`Invalid severity level: ${this.severity}`);
    }
  }

  /**
   * Compares expected and actual values to determine pass/fail
   * @param {*} expected - Expected value
   * @param {*} actual - Actual value
   * @returns {boolean} True if values match expectation
   * @private
   */
  _compareValues(expected, actual) {
    if (typeof expected === 'object' && expected !== null) {
      // Handle object comparisons
      if (expected.operator && expected.value !== undefined) {
        return this._compareWithOperator(actual, expected.operator, expected.value);
      }
      // Deep equality for objects
      return JSON.stringify(expected) === JSON.stringify(actual);
    }
    
    // Simple equality
    return expected === actual;
  }

  /**
   * Compares values using operators (>, <, >=, <=, !=, etc.)
   * @param {*} actual - Actual value
   * @param {string} operator - Comparison operator
   * @param {*} expected - Expected value
   * @returns {boolean} Comparison result
   * @private
   */
  _compareWithOperator(actual, operator, expected) {
    switch (operator) {
      case '>': return actual > expected;
      case '<': return actual < expected;
      case '>=': return actual >= expected;
      case '<=': return actual <= expected;
      case '!=': return actual !== expected;
      case '==': return actual === expected;
      case 'contains': return String(actual).includes(String(expected));
      case 'matches': return new RegExp(expected).test(String(actual));
      case 'typeof': return typeof actual === expected;
      case 'instanceof': return actual instanceof expected;
      default: return actual === expected;
    }
  }

  /**
   * Determines the validation state based on pass/fail status and severity
   * @returns {string} Validation state
   * @private
   */
  _determineState() {
    if (this.passed === null || this.passed === undefined) {
      return ValidationResult.STATE.INCONCLUSIVE;
    }
    
    if (this.passed) {
      return ValidationResult.STATE.PASSED;
    }
    
    // Failed validation - check severity for warning vs failure
    if (this.severity === ValidationResult.SEVERITY.LOW) {
      return ValidationResult.STATE.WARNING;
    }
    
    return ValidationResult.STATE.FAILED;
  }

  /**
   * Updates the validation result with new actual value
   * @param {*} actualValue - New actual value
   * @param {string} additionalMessage - Additional context message
   */
  updateResult(actualValue, additionalMessage = '') {
    this.actual = actualValue;
    this.passed = this.expected !== undefined ? this._compareValues(this.expected, actualValue) : null;
    this.state = this._determineState();
    this.timestamp = new Date().toISOString();
    
    if (additionalMessage) {
      this.message = this.message ? `${this.message}\n${additionalMessage}` : additionalMessage;
    }
  }

  /**
   * Adds evidence to support the validation result
   * @param {string} evidenceType - Type of evidence (screenshot, log, metric, etc.)
   * @param {*} evidenceData - Evidence data
   */
  addEvidence(evidenceType, evidenceData) {
    if (!this.evidence) {
      this.evidence = {};
    }
    
    if (!this.evidence[evidenceType]) {
      this.evidence[evidenceType] = [];
    }
    
    this.evidence[evidenceType].push({
      id: uuidv4(),
      data: evidenceData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Marks validation as inconclusive with reason
   * @param {string} reason - Reason why validation is inconclusive
   */
  markInconclusive(reason) {
    this.state = ValidationResult.STATE.INCONCLUSIVE;
    this.passed = null;
    this.message = `${this.message}\nInconclusive: ${reason}`.trim();
    this.timestamp = new Date().toISOString();
  }

  /**
   * Gets a human-readable description of the validation result
   * @returns {string} Human-readable description
   */
  getDescription() {
    const statusEmoji = {
      [ValidationResult.STATE.PASSED]: '✅',
      [ValidationResult.STATE.FAILED]: '❌',
      [ValidationResult.STATE.WARNING]: '⚠️',
      [ValidationResult.STATE.INCONCLUSIVE]: '❓'
    };
    
    const severityLabel = {
      [ValidationResult.SEVERITY.CRITICAL]: 'CRITICAL',
      [ValidationResult.SEVERITY.HIGH]: 'HIGH',
      [ValidationResult.SEVERITY.MEDIUM]: 'MEDIUM',
      [ValidationResult.SEVERITY.LOW]: 'LOW'
    };
    
    let description = `${statusEmoji[this.state]} ${this.testName} [${severityLabel[this.severity]}]`;
    
    if (this.expected !== undefined && this.actual !== undefined) {
      description += `\n  Expected: ${this._formatValue(this.expected)}`;
      description += `\n  Actual: ${this._formatValue(this.actual)}`;
    }
    
    if (this.message) {
      description += `\n  Message: ${this.message}`;
    }
    
    return description;
  }

  /**
   * Formats a value for display
   * @param {*} value - Value to format
   * @returns {string} Formatted value
   * @private
   */
  _formatValue(value) {
    if (typeof value === 'object') {
      if (value && value.operator && value.value !== undefined) {
        return `${value.operator} ${value.value}`;
      }
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  /**
   * Gets validation statistics
   * @returns {Object} Statistics about this validation
   */
  getStatistics() {
    return {
      id: this.id,
      testName: this.testName,
      validationType: this.validationType,
      state: this.state,
      passed: this.passed,
      severity: this.severity,
      timestamp: this.timestamp,
      hasExpected: this.expected !== undefined,
      hasActual: this.actual !== undefined,
      hasEvidence: Object.keys(this.evidence || {}).length > 0,
      evidenceTypes: Object.keys(this.evidence || {}),
      messageLength: (this.message || '').length,
      sessionId: this.sessionId,
      workflowId: this.workflowId
    };
  }

  /**
   * Checks if this validation is critical for overall test success
   * @returns {boolean} True if critical
   */
  isCritical() {
    return this.severity === ValidationResult.SEVERITY.CRITICAL;
  }

  /**
   * Checks if this validation should block further testing
   * @returns {boolean} True if should block
   */
  shouldBlockExecution() {
    return this.isCritical() && (this.state === ValidationResult.STATE.FAILED);
  }

  /**
   * Serializes the validation result to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      sessionId: this.sessionId,
      workflowId: this.workflowId,
      validationType: this.validationType,
      testName: this.testName,
      expected: this.expected,
      actual: this.actual,
      passed: this.passed,
      severity: this.severity,
      message: this.message,
      evidence: this.evidence,
      timestamp: this.timestamp,
      state: this.state,
      statistics: this.getStatistics(),
      description: this.getDescription()
    };
  }

  /**
   * Creates a ValidationResult instance from JSON data
   * @param {Object} data - JSON data
   * @returns {ValidationResult} New instance
   */
  static fromJSON(data) {
    return new ValidationResult(data);
  }

  /**
   * Creates a simple pass/fail validation
   * @param {string} testName - Test name
   * @param {boolean} passed - Whether test passed
   * @param {string} message - Optional message
   * @param {string} severity - Severity level
   * @returns {ValidationResult} New validation instance
   */
  static createSimple(testName, passed, message = '', severity = ValidationResult.SEVERITY.MEDIUM) {
    return new ValidationResult({
      validationType: ValidationResult.TYPES.FUNCTIONAL,
      testName: testName,
      passed: passed,
      message: message,
      severity: severity
    });
  }

  /**
   * Creates a performance validation with threshold checking
   * @param {string} testName - Test name
   * @param {number} actualValue - Actual measured value
   * @param {number} threshold - Performance threshold
   * @param {string} operator - Comparison operator (default: '<=')
   * @param {string} unit - Measurement unit
   * @returns {ValidationResult} New performance validation
   */
  static createPerformance(testName, actualValue, threshold, operator = '<=', unit = 'ms') {
    const expected = { operator: operator, value: threshold };
    const message = `Performance: ${actualValue}${unit} ${operator} ${threshold}${unit}`;
    
    return new ValidationResult({
      validationType: ValidationResult.TYPES.PERFORMANCE,
      testName: testName,
      expected: expected,
      actual: actualValue,
      message: message,
      severity: ValidationResult.SEVERITY.HIGH
    });
  }

  /**
   * Creates an API response validation
   * @param {string} testName - Test name
   * @param {*} expectedResponse - Expected API response
   * @param {*} actualResponse - Actual API response
   * @param {string} message - Optional message
   * @returns {ValidationResult} New API validation
   */
  static createAPIValidation(testName, expectedResponse, actualResponse, message = '') {
    return new ValidationResult({
      validationType: ValidationResult.TYPES.API_RESPONSE,
      testName: testName,
      expected: expectedResponse,
      actual: actualResponse,
      message: message,
      severity: ValidationResult.SEVERITY.HIGH
    });
  }

  /**
   * Validates if a validation type is valid
   * @param {string} type - Type to validate
   * @returns {boolean} True if valid
   */
  static isValidType(type) {
    return Object.values(ValidationResult.TYPES).includes(type);
  }

  /**
   * Validates if a severity level is valid
   * @param {string} severity - Severity to validate
   * @returns {boolean} True if valid
   */
  static isValidSeverity(severity) {
    return Object.values(ValidationResult.SEVERITY).includes(severity);
  }
}

export default ValidationResult;
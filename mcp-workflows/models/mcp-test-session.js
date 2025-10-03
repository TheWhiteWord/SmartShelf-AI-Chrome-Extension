/**
 * MCPTestSession Model
 * 
 * Represents an automated testing session using Chrome DevTools MCP 
 * for Chrome Extension validation with session lifecycle management.
 */

import { v4 as uuidv4 } from 'uuid';

export class MCPTestSession {
  /**
   * Session status constants
   */
  static STATUS = {
    INITIALIZING: 'initializing',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    ABORTED: 'aborted'
  };

  /**
   * Creates a new MCPTestSession instance
   * @param {Object} config - Session configuration
   * @param {string} config.sessionName - Human-readable test session name
   * @param {string} config.chromeVersion - Chrome browser version used for testing
   * @param {string} config.extensionVersion - SmartShelf extension version being tested
   */
  constructor(config = {}) {
    this.id = config.id || uuidv4();
    this.sessionName = config.sessionName || `MCP Test Session ${new Date().toISOString()}`;
    this.startTime = config.startTime || new Date().toISOString();
    this.endTime = config.endTime || null;
    this.status = config.status || MCPTestSession.STATUS.INITIALIZING;
    this.chromeVersion = config.chromeVersion || null;
    this.extensionVersion = config.extensionVersion || null;
    this.mcpCommands = config.mcpCommands || [];
    this.results = config.results || {};
    this.screenshots = config.screenshots || [];
    this.logs = config.logs || [];
    
    // Relationships
    this.testWorkflows = [];
    this.performanceMetrics = [];
    this.validationResults = [];
    
    this._validateConfiguration();
  }

  /**
   * Validates the session configuration
   * @private
   */
  _validateConfiguration() {
    if (!this.sessionName || typeof this.sessionName !== 'string') {
      throw new Error('Session name must be a non-empty string');
    }
    
    if (this.status && !Object.values(MCPTestSession.STATUS).includes(this.status)) {
      throw new Error(`Invalid session status: ${this.status}`);
    }
  }

  /**
   * Starts the MCP test session
   * @param {string} chromeVersion - Chrome browser version
   * @param {string} extensionVersion - Extension version being tested
   */
  start(chromeVersion, extensionVersion) {
    if (this.status !== MCPTestSession.STATUS.INITIALIZING) {
      throw new Error(`Cannot start session in ${this.status} state`);
    }
    
    this.chromeVersion = chromeVersion;
    this.extensionVersion = extensionVersion;
    this.status = MCPTestSession.STATUS.RUNNING;
    this.startTime = new Date().toISOString();
    
    this.addLog({
      level: 'info',
      message: `MCP Test Session started - Chrome: ${chromeVersion}, Extension: ${extensionVersion}`,
      timestamp: this.startTime
    });
  }

  /**
   * Completes the MCP test session
   * @param {Object} finalResults - Aggregated test results
   */
  complete(finalResults = {}) {
    if (this.status !== MCPTestSession.STATUS.RUNNING) {
      throw new Error(`Cannot complete session in ${this.status} state`);
    }
    
    this.status = MCPTestSession.STATUS.COMPLETED;
    this.endTime = new Date().toISOString();
    this.results = { ...this.results, ...finalResults };
    
    this.addLog({
      level: 'info',
      message: 'MCP Test Session completed successfully',
      timestamp: this.endTime
    });
  }

  /**
   * Fails the MCP test session
   * @param {string} errorMessage - Reason for failure
   * @param {Object} errorDetails - Additional error information
   */
  fail(errorMessage, errorDetails = {}) {
    this.status = MCPTestSession.STATUS.FAILED;
    this.endTime = new Date().toISOString();
    this.results.error = {
      message: errorMessage,
      details: errorDetails,
      timestamp: this.endTime
    };
    
    this.addLog({
      level: 'error',
      message: `MCP Test Session failed: ${errorMessage}`,
      timestamp: this.endTime,
      details: errorDetails
    });
  }

  /**
   * Aborts the MCP test session
   * @param {string} reason - Reason for abortion
   */
  abort(reason = 'User requested') {
    this.status = MCPTestSession.STATUS.ABORTED;
    this.endTime = new Date().toISOString();
    this.results.aborted = {
      reason: reason,
      timestamp: this.endTime
    };
    
    this.addLog({
      level: 'warning',
      message: `MCP Test Session aborted: ${reason}`,
      timestamp: this.endTime
    });
  }

  /**
   * Adds an MCP command to the session
   * @param {Object} command - MCP command details
   */
  addMCPCommand(command) {
    if (!command || typeof command !== 'object') {
      throw new Error('Command must be a valid object');
    }
    
    const mcpCommand = {
      id: command.id || uuidv4(),
      timestamp: new Date().toISOString(),
      ...command
    };
    
    this.mcpCommands.push(mcpCommand);
    return mcpCommand;
  }

  /**
   * Adds a log entry to the session
   * @param {Object} logEntry - Log entry details
   */
  addLog(logEntry) {
    if (!logEntry || typeof logEntry !== 'object') {
      throw new Error('Log entry must be a valid object');
    }
    
    const log = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      level: 'info',
      ...logEntry
    };
    
    this.logs.push(log);
    return log;
  }

  /**
   * Adds a screenshot to the session
   * @param {string} screenshotPath - Path to screenshot file
   * @param {Object} metadata - Screenshot metadata
   */
  addScreenshot(screenshotPath, metadata = {}) {
    if (!screenshotPath || typeof screenshotPath !== 'string') {
      throw new Error('Screenshot path must be a non-empty string');
    }
    
    const screenshot = {
      id: uuidv4(),
      path: screenshotPath,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    
    this.screenshots.push(screenshot);
    return screenshot;
  }

  /**
   * Associates a test workflow with this session
   * @param {TestWorkflow} workflow - Test workflow instance
   */
  addTestWorkflow(workflow) {
    if (!workflow || !workflow.id) {
      throw new Error('Invalid workflow provided');
    }
    
    workflow.sessionId = this.id;
    this.testWorkflows.push(workflow);
  }

  /**
   * Associates a performance metric with this session
   * @param {PerformanceMetric} metric - Performance metric instance
   */
  addPerformanceMetric(metric) {
    if (!metric || !metric.id) {
      throw new Error('Invalid performance metric provided');
    }
    
    metric.sessionId = this.id;
    this.performanceMetrics.push(metric);
  }

  /**
   * Associates a validation result with this session
   * @param {ValidationResult} result - Validation result instance
   */
  addValidationResult(result) {
    if (!result || !result.id) {
      throw new Error('Invalid validation result provided');
    }
    
    result.sessionId = this.id;
    this.validationResults.push(result);
  }

  /**
   * Gets the session duration in milliseconds
   * @returns {number} Duration in milliseconds, or null if not completed
   */
  getDuration() {
    if (!this.startTime) return null;
    
    const endTime = this.endTime || new Date().toISOString();
    return new Date(endTime).getTime() - new Date(this.startTime).getTime();
  }

  /**
   * Gets session summary statistics
   * @returns {Object} Summary statistics
   */
  getSummary() {
    const duration = this.getDuration();
    
    return {
      id: this.id,
      sessionName: this.sessionName,
      status: this.status,
      duration: duration,
      durationHuman: duration ? `${Math.round(duration / 1000)}s` : null,
      startTime: this.startTime,
      endTime: this.endTime,
      chromeVersion: this.chromeVersion,
      extensionVersion: this.extensionVersion,
      totalWorkflows: this.testWorkflows.length,
      totalCommands: this.mcpCommands.length,
      totalScreenshots: this.screenshots.length,
      totalLogs: this.logs.length,
      totalMetrics: this.performanceMetrics.length,
      totalValidations: this.validationResults.length,
      passedValidations: this.validationResults.filter(v => v.passed).length,
      failedValidations: this.validationResults.filter(v => !v.passed).length
    };
  }

  /**
   * Serializes the session to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      sessionName: this.sessionName,
      startTime: this.startTime,
      endTime: this.endTime,
      status: this.status,
      chromeVersion: this.chromeVersion,
      extensionVersion: this.extensionVersion,
      mcpCommands: this.mcpCommands,
      results: this.results,
      screenshots: this.screenshots,
      logs: this.logs,
      testWorkflows: this.testWorkflows.map(w => w.id),
      performanceMetrics: this.performanceMetrics.map(m => m.id),
      validationResults: this.validationResults.map(r => r.id),
      summary: this.getSummary()
    };
  }

  /**
   * Creates an MCPTestSession instance from JSON data
   * @param {Object} data - JSON data
   * @returns {MCPTestSession} New instance
   */
  static fromJSON(data) {
    return new MCPTestSession(data);
  }

  /**
   * Validates if a status is valid
   * @param {string} status - Status to validate
   * @returns {boolean} True if valid
   */
  static isValidStatus(status) {
    return Object.values(MCPTestSession.STATUS).includes(status);
  }
}

export default MCPTestSession;
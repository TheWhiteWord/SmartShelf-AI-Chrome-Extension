/**
 * MCPCommand Model
 * 
 * Represents individual Chrome DevTools MCP commands executed during automated testing
 * with comprehensive command execution logging and response tracking.
 */

import { v4 as uuidv4 } from 'uuid';

export class MCPCommand {
  /**
   * MCP command type constants
   */
  static TYPES = {
    NAVIGATE_PAGE: 'navigate_page',
    EVALUATE_SCRIPT: 'evaluate_script',
    CLICK: 'click',
    TAKE_SCREENSHOT: 'take_screenshot',
    LIST_CONSOLE_MESSAGES: 'list_console_messages',
    GET_PAGE_CONTENT: 'get_page_content',
    WAIT_FOR_ELEMENT: 'wait_for_element',
    SCROLL_PAGE: 'scroll_page',
    FILL_INPUT: 'fill_input',
    PRESS_KEY: 'press_key',
    RELOAD_PAGE: 'reload_page',
    GET_NETWORK_LOGS: 'get_network_logs',
    SET_VIEWPORT: 'set_viewport',
    CLEAR_CACHE: 'clear_cache',
    ENABLE_EXTENSION: 'enable_extension',
    DISABLE_EXTENSION: 'disable_extension'
  };

  /**
   * Command status constants
   */
  static STATUS = {
    PENDING: 'pending',
    EXECUTING: 'executing',
    SUCCESS: 'success',
    FAILED: 'failed',
    TIMEOUT: 'timeout',
    CANCELLED: 'cancelled'
  };

  /**
   * Creates a new MCPCommand instance
   * @param {Object} config - Command configuration
   * @param {string} config.commandType - MCP command type
   * @param {Object} config.parameters - Command parameters and arguments
   * @param {number} config.executionOrder - Sequence order within workflow
   * @param {number} config.timeout - Command timeout in milliseconds (default: 30000)
   */
  constructor(config = {}) {
    this.id = config.id || uuidv4();
    this.workflowId = config.workflowId || null;
    this.commandType = config.commandType;
    this.parameters = config.parameters || {};
    this.executionOrder = config.executionOrder || 0;
    this.timestamp = config.timestamp || null;
    this.responseTime = config.responseTime || null;
    this.success = config.success || null;
    this.output = config.output || null;
    this.errorMessage = config.errorMessage || null;
    this.timeout = config.timeout || 30000;
    this.status = config.status || MCPCommand.STATUS.PENDING;
    
    // Execution tracking
    this.startTime = null;
    this.endTime = null;
    this.retryCount = 0;
    this.maxRetries = config.maxRetries || 3;
    
    // Related entities
    this.screenshots = [];
    this.consoleLogs = [];
    this.networkLogs = [];
    
    this._validateConfiguration();
  }

  /**
   * Validates the command configuration
   * @private
   */
  _validateConfiguration() {
    if (!this.commandType || !Object.values(MCPCommand.TYPES).includes(this.commandType)) {
      throw new Error(`Invalid command type: ${this.commandType}`);
    }
    
    if (this.parameters && typeof this.parameters !== 'object') {
      throw new Error('Parameters must be an object');
    }
    
    if (typeof this.executionOrder !== 'number') {
      throw new Error('Execution order must be a number');
    }
    
    if (!Object.values(MCPCommand.STATUS).includes(this.status)) {
      throw new Error(`Invalid command status: ${this.status}`);
    }
  }

  /**
   * Starts command execution
   * @returns {Promise<void>} Execution promise
   */
  async startExecution() {
    if (this.status !== MCPCommand.STATUS.PENDING) {
      throw new Error(`Cannot start command execution in ${this.status} state`);
    }
    
    this.status = MCPCommand.STATUS.EXECUTING;
    this.startTime = new Date().toISOString();
    this.timestamp = this.startTime;
    
    try {
      // Set timeout for command execution
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Command execution timeout')), this.timeout);
      });
      
      // Execute the command (this would be implemented by the MCP service)
      const executionPromise = this._executeCommand();
      
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      this._handleSuccess(result);
      return result;
      
    } catch (error) {
      if (error.message === 'Command execution timeout') {
        this._handleTimeout();
      } else {
        this._handleError(error);
      }
      throw error;
    }
  }

  /**
   * Executes the actual MCP command (to be overridden by MCP service)
   * @returns {Promise<*>} Command result
   * @private
   */
  async _executeCommand() {
    // This is a placeholder - actual implementation would be in the MCP service
    // that uses this model and integrates with Chrome DevTools MCP
    
    switch (this.commandType) {
      case MCPCommand.TYPES.NAVIGATE_PAGE:
        return { url: this.parameters.url, loaded: true };
      case MCPCommand.TYPES.TAKE_SCREENSHOT:
        return { screenshotPath: 'screenshots/test.png', timestamp: new Date().toISOString() };
      case MCPCommand.TYPES.EVALUATE_SCRIPT:
        return { result: 'Script executed', value: null };
      default:
        return { success: true, commandType: this.commandType };
    }
  }

  /**
   * Handles successful command execution
   * @param {*} result - Execution result
   * @private
   */
  _handleSuccess(result) {
    this.status = MCPCommand.STATUS.SUCCESS;
    this.success = true;
    this.output = result;
    this.endTime = new Date().toISOString();
    this.responseTime = new Date(this.endTime).getTime() - new Date(this.startTime).getTime();
    this.errorMessage = null;
    
    // Handle specific command types
    this._processCommandResult(result);
  }

  /**
   * Handles command execution errors
   * @param {Error} error - Execution error
   * @private
   */
  _handleError(error) {
    this.status = MCPCommand.STATUS.FAILED;
    this.success = false;
    this.errorMessage = error.message;
    this.endTime = new Date().toISOString();
    this.responseTime = this.startTime ? new Date(this.endTime).getTime() - new Date(this.startTime).getTime() : null;
  }

  /**
   * Handles command execution timeout
   * @private
   */
  _handleTimeout() {
    this.status = MCPCommand.STATUS.TIMEOUT;
    this.success = false;
    this.errorMessage = `Command timed out after ${this.timeout}ms`;
    this.endTime = new Date().toISOString();
    this.responseTime = this.timeout;
  }

  /**
   * Processes command-specific results
   * @param {*} result - Command result
   * @private
   */
  _processCommandResult(result) {
    switch (this.commandType) {
      case MCPCommand.TYPES.TAKE_SCREENSHOT:
        if (result.screenshotPath) {
          this.screenshots.push({
            id: uuidv4(),
            path: result.screenshotPath,
            timestamp: result.timestamp || this.endTime,
            metadata: result.metadata || {}
          });
        }
        break;
        
      case MCPCommand.TYPES.LIST_CONSOLE_MESSAGES:
        if (result.messages) {
          this.consoleLogs = result.messages.map(msg => ({
            id: uuidv4(),
            level: msg.level,
            message: msg.message,
            timestamp: msg.timestamp,
            source: msg.source
          }));
        }
        break;
        
      case MCPCommand.TYPES.GET_NETWORK_LOGS:
        if (result.requests) {
          this.networkLogs = result.requests.map(req => ({
            id: uuidv4(),
            url: req.url,
            method: req.method,
            status: req.status,
            responseTime: req.responseTime,
            timestamp: req.timestamp
          }));
        }
        break;
    }
  }

  /**
   * Retries command execution if it failed
   * @returns {Promise<*>} Retry result
   */
  async retry() {
    if (this.retryCount >= this.maxRetries) {
      throw new Error(`Maximum retry attempts (${this.maxRetries}) exceeded`);
    }
    
    if (this.status !== MCPCommand.STATUS.FAILED && this.status !== MCPCommand.STATUS.TIMEOUT) {
      throw new Error(`Cannot retry command in ${this.status} state`);
    }
    
    this.retryCount++;
    this.status = MCPCommand.STATUS.PENDING;
    this.success = null;
    this.output = null;
    this.errorMessage = null;
    this.startTime = null;
    this.endTime = null;
    this.responseTime = null;
    
    return this.startExecution();
  }

  /**
   * Cancels command execution
   * @param {string} reason - Cancellation reason
   */
  cancel(reason = 'User requested') {
    if (this.status === MCPCommand.STATUS.SUCCESS || this.status === MCPCommand.STATUS.FAILED) {
      throw new Error(`Cannot cancel command in ${this.status} state`);
    }
    
    this.status = MCPCommand.STATUS.CANCELLED;
    this.success = false;
    this.errorMessage = `Command cancelled: ${reason}`;
    this.endTime = new Date().toISOString();
    this.responseTime = this.startTime ? new Date(this.endTime).getTime() - new Date(this.startTime).getTime() : 0;
  }

  /**
   * Updates command parameters
   * @param {Object} newParameters - New parameters to merge
   */
  updateParameters(newParameters) {
    if (this.status === MCPCommand.STATUS.EXECUTING) {
      throw new Error('Cannot update parameters while command is executing');
    }
    
    this.parameters = { ...this.parameters, ...newParameters };
  }

  /**
   * Gets command execution statistics
   * @returns {Object} Execution statistics
   */
  getStatistics() {
    return {
      id: this.id,
      workflowId: this.workflowId,
      commandType: this.commandType,
      status: this.status,
      success: this.success,
      executionOrder: this.executionOrder,
      responseTime: this.responseTime,
      responseTimeHuman: this.responseTime ? `${this.responseTime}ms` : null,
      startTime: this.startTime,
      endTime: this.endTime,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      hasError: !!this.errorMessage,
      hasOutput: !!this.output,
      screenshotCount: this.screenshots.length,
      consoleLogCount: this.consoleLogs.length,
      networkLogCount: this.networkLogs.length,
      timeout: this.timeout,
      parameterCount: Object.keys(this.parameters).length
    };
  }

  /**
   * Gets a human-readable description of the command
   * @returns {string} Human-readable description
   */
  getDescription() {
    const statusEmoji = {
      [MCPCommand.STATUS.PENDING]: '⏳',
      [MCPCommand.STATUS.EXECUTING]: '🔄',
      [MCPCommand.STATUS.SUCCESS]: '✅',
      [MCPCommand.STATUS.FAILED]: '❌',
      [MCPCommand.STATUS.TIMEOUT]: '⏰',
      [MCPCommand.STATUS.CANCELLED]: '🚫'
    };
    
    let description = `${statusEmoji[this.status]} ${this.commandType}`;
    
    if (this.responseTime !== null) {
      description += ` (${this.responseTime}ms)`;
    }
    
    if (this.retryCount > 0) {
      description += ` [retry ${this.retryCount}/${this.maxRetries}]`;
    }
    
    // Add key parameters
    const keyParams = this._getKeyParameters();
    if (keyParams.length > 0) {
      description += `\n  Parameters: ${keyParams.join(', ')}`;
    }
    
    if (this.errorMessage) {
      description += `\n  Error: ${this.errorMessage}`;
    }
    
    return description;
  }

  /**
   * Gets key parameters for display
   * @returns {Array<string>} Array of key parameter descriptions
   * @private
   */
  _getKeyParameters() {
    const keyParams = [];
    
    switch (this.commandType) {
      case MCPCommand.TYPES.NAVIGATE_PAGE:
        if (this.parameters.url) keyParams.push(`url: ${this.parameters.url}`);
        break;
      case MCPCommand.TYPES.CLICK:
        if (this.parameters.selector) keyParams.push(`selector: ${this.parameters.selector}`);
        break;
      case MCPCommand.TYPES.EVALUATE_SCRIPT:
        if (this.parameters.script) keyParams.push(`script: ${this.parameters.script.substring(0, 50)}...`);
        break;
      case MCPCommand.TYPES.WAIT_FOR_ELEMENT:
        if (this.parameters.selector) keyParams.push(`selector: ${this.parameters.selector}`);
        if (this.parameters.timeout) keyParams.push(`timeout: ${this.parameters.timeout}ms`);
        break;
      case MCPCommand.TYPES.FILL_INPUT:
        if (this.parameters.selector) keyParams.push(`selector: ${this.parameters.selector}`);
        if (this.parameters.value) keyParams.push(`value: ${this.parameters.value}`);
        break;
    }
    
    return keyParams;
  }

  /**
   * Serializes the MCP command to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      workflowId: this.workflowId,
      commandType: this.commandType,
      parameters: this.parameters,
      executionOrder: this.executionOrder,
      timestamp: this.timestamp,
      responseTime: this.responseTime,
      success: this.success,
      output: this.output,
      errorMessage: this.errorMessage,
      timeout: this.timeout,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      screenshots: this.screenshots,
      consoleLogs: this.consoleLogs,
      networkLogs: this.networkLogs,
      statistics: this.getStatistics(),
      description: this.getDescription()
    };
  }

  /**
   * Creates an MCPCommand instance from JSON data
   * @param {Object} data - JSON data
   * @returns {MCPCommand} New instance
   */
  static fromJSON(data) {
    const command = new MCPCommand(data);
    command.startTime = data.startTime;
    command.endTime = data.endTime;
    command.retryCount = data.retryCount || 0;
    command.screenshots = data.screenshots || [];
    command.consoleLogs = data.consoleLogs || [];
    command.networkLogs = data.networkLogs || [];
    return command;
  }

  /**
   * Creates a navigation command
   * @param {string} url - URL to navigate to
   * @param {number} executionOrder - Execution order
   * @param {number} timeout - Command timeout
   * @returns {MCPCommand} New navigation command
   */
  static createNavigateCommand(url, executionOrder = 0, timeout = 10000) {
    return new MCPCommand({
      commandType: MCPCommand.TYPES.NAVIGATE_PAGE,
      parameters: { url: url },
      executionOrder: executionOrder,
      timeout: timeout
    });
  }

  /**
   * Creates a screenshot command
   * @param {string} filename - Screenshot filename
   * @param {Object} options - Screenshot options
   * @param {number} executionOrder - Execution order
   * @returns {MCPCommand} New screenshot command
   */
  static createScreenshotCommand(filename, options = {}, executionOrder = 0) {
    return new MCPCommand({
      commandType: MCPCommand.TYPES.TAKE_SCREENSHOT,
      parameters: { filename: filename, ...options },
      executionOrder: executionOrder,
      timeout: 5000
    });
  }

  /**
   * Creates a script evaluation command
   * @param {string} script - JavaScript code to evaluate
   * @param {number} executionOrder - Execution order
   * @param {number} timeout - Command timeout
   * @returns {MCPCommand} New script command
   */
  static createScriptCommand(script, executionOrder = 0, timeout = 15000) {
    return new MCPCommand({
      commandType: MCPCommand.TYPES.EVALUATE_SCRIPT,
      parameters: { script: script },
      executionOrder: executionOrder,
      timeout: timeout
    });
  }

  /**
   * Validates if a command type is valid
   * @param {string} type - Type to validate
   * @returns {boolean} True if valid
   */
  static isValidType(type) {
    return Object.values(MCPCommand.TYPES).includes(type);
  }

  /**
   * Validates if a status is valid
   * @param {string} status - Status to validate
   * @returns {boolean} True if valid
   */
  static isValidStatus(status) {
    return Object.values(MCPCommand.STATUS).includes(status);
  }
}

export default MCPCommand;
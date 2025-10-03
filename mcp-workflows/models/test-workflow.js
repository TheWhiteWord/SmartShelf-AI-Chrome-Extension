/**
 * TestWorkflow Model
 * 
 * Represents a specific automated testing workflow within an MCP session
 * with workflow execution tracking and lifecycle management.
 */

import { v4 as uuidv4 } from 'uuid';

export class TestWorkflow {
  /**
   * Workflow status constants
   */
  static STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    PASSED: 'passed',
    FAILED: 'failed',
    SKIPPED: 'skipped'
  };

  /**
   * Workflow type constants
   */
  static TYPES = {
    EXTENSION_LOADING: 'extension_loading',
    AI_API_VALIDATION: 'ai_api_validation',
    CONTENT_CAPTURE: 'content_capture',
    UI_TESTING: 'ui_testing',
    PERFORMANCE_PROFILING: 'performance_profiling'
  };

  /**
   * Creates a new TestWorkflow instance
   * @param {Object} config - Workflow configuration
   * @param {string} config.workflowType - Type of test workflow
   * @param {string} config.name - Descriptive workflow name
   * @param {string} config.description - Detailed workflow description and objectives
   * @param {Array} config.steps - Array of automated steps with MCP commands
   * @param {Array} config.expectedOutcomes - Predefined success criteria
   * @param {Array} config.dependencies - Array of prerequisite workflow IDs
   */
  constructor(config = {}) {
    this.id = config.id || uuidv4();
    this.sessionId = config.sessionId || null;
    this.workflowType = config.workflowType;
    this.name = config.name || '';
    this.description = config.description || '';
    this.steps = config.steps || [];
    this.expectedOutcomes = config.expectedOutcomes || [];
    this.actualResults = config.actualResults || [];
    this.status = config.status || TestWorkflow.STATUS.PENDING;
    this.startTime = config.startTime || null;
    this.duration = config.duration || null;
    this.errorMessages = config.errorMessages || [];
    this.dependencies = config.dependencies || [];
    
    // Relationships
    this.mcpCommands = [];
    this.validationResults = [];
    
    // Internal tracking
    this.currentStepIndex = 0;
    this.executionLog = [];
    
    this._validateConfiguration();
  }

  /**
   * Validates the workflow configuration
   * @private
   */
  _validateConfiguration() {
    if (!this.workflowType || !Object.values(TestWorkflow.TYPES).includes(this.workflowType)) {
      throw new Error(`Invalid workflow type: ${this.workflowType}`);
    }
    
    if (!this.name || typeof this.name !== 'string') {
      throw new Error('Workflow name must be a non-empty string');
    }
    
    if (this.status && !Object.values(TestWorkflow.STATUS).includes(this.status)) {
      throw new Error(`Invalid workflow status: ${this.status}`);
    }
    
    if (!Array.isArray(this.steps)) {
      throw new Error('Steps must be an array');
    }
  }

  /**
   * Starts the workflow execution
   * @param {string} sessionId - Parent session ID
   */
  start(sessionId = null) {
    if (this.status !== TestWorkflow.STATUS.PENDING) {
      throw new Error(`Cannot start workflow in ${this.status} state`);
    }
    
    if (sessionId) {
      this.sessionId = sessionId;
    }
    
    this.status = TestWorkflow.STATUS.RUNNING;
    this.startTime = new Date().toISOString();
    this.currentStepIndex = 0;
    
    this.logExecution('info', 'Workflow execution started', {
      workflowType: this.workflowType,
      totalSteps: this.steps.length,
      dependencies: this.dependencies
    });
  }

  /**
   * Executes the next step in the workflow
   * @returns {Promise<Object>} Step execution result
   */
  async executeNextStep() {
    if (this.status !== TestWorkflow.STATUS.RUNNING) {
      throw new Error(`Cannot execute step in ${this.status} state`);
    }
    
    if (this.currentStepIndex >= this.steps.length) {
      return this.complete();
    }
    
    const step = this.steps[this.currentStepIndex];
    const stepStart = new Date().toISOString();
    
    try {
      this.logExecution('info', `Executing step ${this.currentStepIndex + 1}/${this.steps.length}`, {
        stepName: step.name || step.command,
        stepDescription: step.description
      });
      
      // Execute the step (this would be implemented by the calling service)
      const result = await this.executeStep(step);
      
      // Log successful execution
      this.actualResults.push({
        stepIndex: this.currentStepIndex,
        step: step,
        result: result,
        timestamp: new Date().toISOString(),
        executionTime: new Date().getTime() - new Date(stepStart).getTime()
      });
      
      this.currentStepIndex++;
      
      return result;
      
    } catch (error) {
      this.handleStepError(error, step);
      throw error;
    }
  }

  /**
   * Executes a single step (to be overridden or called by external service)
   * @param {Object} step - Step configuration
   * @returns {Promise<Object>} Step result
   */
  async executeStep(step) {
    // This is a placeholder - actual implementation would be in a service
    // that uses this model and integrates with MCP commands
    return {
      success: true,
      step: step,
      message: 'Step execution placeholder'
    };
  }

  /**
   * Handles step execution errors
   * @param {Error} error - Error that occurred
   * @param {Object} step - Step that failed
   * @private
   */
  handleStepError(error, step) {
    const errorMessage = `Step ${this.currentStepIndex + 1} failed: ${error.message}`;
    
    this.errorMessages.push({
      stepIndex: this.currentStepIndex,
      step: step,
      error: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
    
    this.logExecution('error', errorMessage, {
      stepName: step.name || step.command,
      errorDetails: error.message
    });
    
    this.fail(errorMessage);
  }

  /**
   * Completes the workflow successfully
   * @returns {Object} Completion result
   */
  complete() {
    if (this.status !== TestWorkflow.STATUS.RUNNING) {
      throw new Error(`Cannot complete workflow in ${this.status} state`);
    }
    
    this.status = TestWorkflow.STATUS.PASSED;
    this.duration = new Date().getTime() - new Date(this.startTime).getTime();
    
    const result = {
      workflowId: this.id,
      status: this.status,
      duration: this.duration,
      stepsExecuted: this.currentStepIndex,
      totalSteps: this.steps.length,
      results: this.actualResults
    };
    
    this.logExecution('info', 'Workflow completed successfully', result);
    
    return result;
  }

  /**
   * Fails the workflow
   * @param {string} errorMessage - Reason for failure
   */
  fail(errorMessage) {
    this.status = TestWorkflow.STATUS.FAILED;
    this.duration = this.startTime ? new Date().getTime() - new Date(this.startTime).getTime() : null;
    
    if (errorMessage && !this.errorMessages.find(e => e.error === errorMessage)) {
      this.errorMessages.push({
        error: errorMessage,
        timestamp: new Date().toISOString(),
        stepIndex: this.currentStepIndex
      });
    }
    
    this.logExecution('error', 'Workflow failed', {
      errorMessage: errorMessage,
      stepsCompleted: this.currentStepIndex,
      totalSteps: this.steps.length
    });
  }

  /**
   * Skips the workflow
   * @param {string} reason - Reason for skipping
   */
  skip(reason = 'Dependencies not met') {
    this.status = TestWorkflow.STATUS.SKIPPED;
    this.duration = this.startTime ? new Date().getTime() - new Date(this.startTime).getTime() : 0;
    
    this.logExecution('warning', `Workflow skipped: ${reason}`, {
      reason: reason,
      dependencies: this.dependencies
    });
  }

  /**
   * Adds an MCP command to this workflow
   * @param {MCPCommand} command - MCP command instance
   */
  addMCPCommand(command) {
    if (!command || !command.id) {
      throw new Error('Invalid MCP command provided');
    }
    
    command.workflowId = this.id;
    this.mcpCommands.push(command);
  }

  /**
   * Adds a validation result to this workflow
   * @param {ValidationResult} result - Validation result instance
   */
  addValidationResult(result) {
    if (!result || !result.id) {
      throw new Error('Invalid validation result provided');
    }
    
    result.workflowId = this.id;
    this.validationResults.push(result);
  }

  /**
   * Logs execution information
   * @param {string} level - Log level (info, warning, error)
   * @param {string} message - Log message
   * @param {Object} details - Additional details
   * @private
   */
  logExecution(level, message, details = {}) {
    const logEntry = {
      id: uuidv4(),
      level: level,
      message: message,
      timestamp: new Date().toISOString(),
      workflowId: this.id,
      workflowType: this.workflowType,
      currentStep: this.currentStepIndex,
      status: this.status,
      ...details
    };
    
    this.executionLog.push(logEntry);
  }

  /**
   * Checks if all dependencies are satisfied
   * @param {Array<TestWorkflow>} allWorkflows - All workflows in session
   * @returns {boolean} True if dependencies are satisfied
   */
  areDependenciesSatisfied(allWorkflows = []) {
    if (!this.dependencies || this.dependencies.length === 0) {
      return true;
    }
    
    return this.dependencies.every(depId => {
      const dependency = allWorkflows.find(w => w.id === depId);
      return dependency && dependency.status === TestWorkflow.STATUS.PASSED;
    });
  }

  /**
   * Gets workflow progress as percentage
   * @returns {number} Progress percentage (0-100)
   */
  getProgress() {
    if (this.status === TestWorkflow.STATUS.PENDING) return 0;
    if (this.status === TestWorkflow.STATUS.PASSED) return 100;
    if (this.status === TestWorkflow.STATUS.FAILED) return Math.round((this.currentStepIndex / this.steps.length) * 100);
    if (this.status === TestWorkflow.STATUS.SKIPPED) return 0;
    
    // Running status
    return Math.round((this.currentStepIndex / this.steps.length) * 100);
  }

  /**
   * Gets workflow execution statistics
   * @returns {Object} Execution statistics
   */
  getStatistics() {
    return {
      id: this.id,
      name: this.name,
      workflowType: this.workflowType,
      status: this.status,
      progress: this.getProgress(),
      duration: this.duration,
      durationHuman: this.duration ? `${Math.round(this.duration / 1000)}s` : null,
      startTime: this.startTime,
      totalSteps: this.steps.length,
      stepsExecuted: this.currentStepIndex,
      stepsRemaining: Math.max(0, this.steps.length - this.currentStepIndex),
      totalCommands: this.mcpCommands.length,
      totalValidations: this.validationResults.length,
      passedValidations: this.validationResults.filter(v => v.passed).length,
      failedValidations: this.validationResults.filter(v => !v.passed).length,
      errorCount: this.errorMessages.length,
      logEntries: this.executionLog.length
    };
  }

  /**
   * Serializes the workflow to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      sessionId: this.sessionId,
      workflowType: this.workflowType,
      name: this.name,
      description: this.description,
      steps: this.steps,
      expectedOutcomes: this.expectedOutcomes,
      actualResults: this.actualResults,
      status: this.status,
      startTime: this.startTime,
      duration: this.duration,
      errorMessages: this.errorMessages,
      dependencies: this.dependencies,
      currentStepIndex: this.currentStepIndex,
      executionLog: this.executionLog,
      mcpCommands: this.mcpCommands.map(c => c.id),
      validationResults: this.validationResults.map(r => r.id),
      statistics: this.getStatistics()
    };
  }

  /**
   * Creates a TestWorkflow instance from JSON data
   * @param {Object} data - JSON data
   * @returns {TestWorkflow} New instance
   */
  static fromJSON(data) {
    const workflow = new TestWorkflow(data);
    workflow.currentStepIndex = data.currentStepIndex || 0;
    workflow.executionLog = data.executionLog || [];
    return workflow;
  }

  /**
   * Validates if a workflow type is valid
   * @param {string} type - Type to validate
   * @returns {boolean} True if valid
   */
  static isValidType(type) {
    return Object.values(TestWorkflow.TYPES).includes(type);
  }

  /**
   * Validates if a status is valid
   * @param {string} status - Status to validate
   * @returns {boolean} True if valid
   */
  static isValidStatus(status) {
    return Object.values(TestWorkflow.STATUS).includes(status);
  }
}

export default TestWorkflow;
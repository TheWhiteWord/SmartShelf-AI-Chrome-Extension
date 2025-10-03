/**
 * MCP Session Manager Service
 * 
 * Coordinates MCP test sessions with lifecycle management, workflow orchestration,
 * and session state tracking for Chrome Extension automated testing.
 */

import EventEmitter from 'events';
import { MCPTestSession, TestWorkflow, Constants } from '../models/index.js';

export class MCPSessionManager extends EventEmitter {
  /**
   * Session manager events
   */
  static EVENTS = {
    SESSION_CREATED: 'session_created',
    SESSION_STARTED: 'session_started',
    SESSION_COMPLETED: 'session_completed',
    SESSION_FAILED: 'session_failed',
    SESSION_ABORTED: 'session_aborted',
    WORKFLOW_STARTED: 'workflow_started',
    WORKFLOW_COMPLETED: 'workflow_completed',
    WORKFLOW_FAILED: 'workflow_failed',
    PROGRESS_UPDATED: 'progress_updated'
  };

  /**
   * Creates a new MCP Session Manager instance
   * @param {Object} config - Manager configuration
   * @param {number} config.maxConcurrentSessions - Maximum concurrent sessions (default: 3)
   * @param {number} config.sessionTimeout - Session timeout in milliseconds (default: 30 minutes)
   * @param {boolean} config.autoRetryFailedWorkflows - Auto-retry failed workflows (default: true)
   */
  constructor(config = {}) {
    super();
    
    this.config = {
      maxConcurrentSessions: config.maxConcurrentSessions || 3,
      sessionTimeout: config.sessionTimeout || 30 * 60 * 1000, // 30 minutes
      autoRetryFailedWorkflows: config.autoRetryFailedWorkflows !== false,
      workflowRetryAttempts: config.workflowRetryAttempts || 2,
      workflowTimeout: config.workflowTimeout || 10 * 60 * 1000, // 10 minutes
      ...config
    };
    
    // Active sessions tracking
    this.activeSessions = new Map();
    this.completedSessions = new Map();
    this.sessionQueue = [];
    
    // Workflow execution tracking
    this.activeWorkflows = new Map();
    this.workflowQueue = [];
    
    // Statistics and monitoring
    this.statistics = {
      totalSessions: 0,
      successfulSessions: 0,
      failedSessions: 0,
      abortedSessions: 0,
      totalWorkflows: 0,
      successfulWorkflows: 0,
      failedWorkflows: 0,
      averageSessionDuration: 0,
      averageWorkflowDuration: 0
    };
    
    // Initialize session cleanup timer
    this._setupSessionCleanup();
  }

  /**
   * Creates a new MCP test session
   * @param {Object} sessionConfig - Session configuration
   * @param {Array<Object>} workflowConfigs - Workflow configurations
   * @returns {MCPTestSession} Created session
   */
  async createSession(sessionConfig, workflowConfigs = []) {
    const session = new MCPTestSession(sessionConfig);
    
    // Create and add workflows
    for (const workflowConfig of workflowConfigs) {
      const workflow = new TestWorkflow(workflowConfig);
      session.addTestWorkflow(workflow);
    }
    
    // Validate session configuration
    this._validateSession(session);
    
    // Add to queue or start immediately if capacity available
    if (this.activeSessions.size < this.config.maxConcurrentSessions) {
      await this._initializeSession(session);
    } else {
      this.sessionQueue.push(session);
      session.addLog({
        level: 'info',
        message: `Session queued - ${this.activeSessions.size}/${this.config.maxConcurrentSessions} sessions active`
      });
    }
    
    this.statistics.totalSessions++;
    this.emit(MCPSessionManager.EVENTS.SESSION_CREATED, session);
    
    return session;
  }

  /**
   * Starts execution of a specific session
   * @param {string} sessionId - Session ID to start
   * @returns {Promise<MCPTestSession>} Started session
   */
  async startSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found in active sessions`);
    }
    
    if (session.status !== Constants.SessionStatus.INITIALIZING) {
      throw new Error(`Cannot start session in ${session.status} state`);
    }
    
    try {
      // Start the session
      session.start(
        await this._detectChromeVersion(),
        await this._detectExtensionVersion()
      );
      
      this.emit(MCPSessionManager.EVENTS.SESSION_STARTED, session);
      
      // Start workflow execution
      await this._executeSessionWorkflows(session);
      
      return session;
      
    } catch (error) {
      await this._handleSessionError(session, error);
      throw error;
    }
  }

  /**
   * Aborts a running session
   * @param {string} sessionId - Session ID to abort
   * @param {string} reason - Reason for abortion
   */
  async abortSession(sessionId, reason = 'User requested') {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Abort all active workflows for this session
    for (const [workflowId, workflow] of this.activeWorkflows) {
      if (workflow.sessionId === sessionId) {
        workflow.skip(`Session aborted: ${reason}`);
        this.activeWorkflows.delete(workflowId);
      }
    }
    
    // Abort the session
    session.abort(reason);
    
    // Move to completed sessions
    this.activeSessions.delete(sessionId);
    this.completedSessions.set(sessionId, session);
    
    this.statistics.abortedSessions++;
    this.emit(MCPSessionManager.EVENTS.SESSION_ABORTED, session);
    
    // Start next session in queue if any
    await this._processSessionQueue();
  }

  /**
   * Gets session by ID
   * @param {string} sessionId - Session ID
   * @returns {MCPTestSession|null} Session or null if not found
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId) || this.completedSessions.get(sessionId) || null;
  }

  /**
   * Gets all sessions with optional filtering
   * @param {Object} filter - Filter criteria
   * @returns {Array<MCPTestSession>} Filtered sessions
   */
  getSessions(filter = {}) {
    const allSessions = [
      ...Array.from(this.activeSessions.values()),
      ...Array.from(this.completedSessions.values())
    ];
    
    return this._filterSessions(allSessions, filter);
  }

  /**
   * Gets current manager statistics
   * @returns {Object} Manager statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      activeSessions: this.activeSessions.size,
      queuedSessions: this.sessionQueue.length,
      completedSessions: this.completedSessions.size,
      activeWorkflows: this.activeWorkflows.size,
      queuedWorkflows: this.workflowQueue.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Initializes a session for execution
   * @param {MCPTestSession} session - Session to initialize
   * @private
   */
  async _initializeSession(session) {
    this.activeSessions.set(session.id, session);
    
    // Set session timeout
    setTimeout(async () => {
      if (this.activeSessions.has(session.id) && session.status === Constants.SessionStatus.RUNNING) {
        await this.abortSession(session.id, 'Session timeout');
      }
    }, this.config.sessionTimeout);
    
    session.addLog({
      level: 'info',
      message: 'Session initialized and ready for execution'
    });
  }

  /**
   * Executes all workflows in a session
   * @param {MCPTestSession} session - Session to execute workflows for
   * @private
   */
  async _executeSessionWorkflows(session) {
    const workflows = session.testWorkflows;
    
    if (workflows.length === 0) {
      session.complete({ message: 'No workflows to execute' });
      return;
    }
    
    try {
      // Sort workflows by dependencies and execution order
      const sortedWorkflows = this._sortWorkflowsByDependencies(workflows);
      
      // Execute workflows sequentially, respecting dependencies
      for (const workflow of sortedWorkflows) {
        await this._executeWorkflow(workflow, session);
      }
      
      // Check if all workflows passed
      const failedWorkflows = workflows.filter(w => w.status === Constants.WorkflowStatus.FAILED);
      const skippedWorkflows = workflows.filter(w => w.status === Constants.WorkflowStatus.SKIPPED);
      
      if (failedWorkflows.length > 0) {
        const errorMessage = `${failedWorkflows.length} workflow(s) failed`;
        session.fail(errorMessage, {
          failedWorkflows: failedWorkflows.map(w => w.id),
          skippedWorkflows: skippedWorkflows.map(w => w.id)
        });
        this.statistics.failedSessions++;
        this.emit(MCPSessionManager.EVENTS.SESSION_FAILED, session);
      } else {
        session.complete({
          totalWorkflows: workflows.length,
          passedWorkflows: workflows.filter(w => w.status === Constants.WorkflowStatus.PASSED).length,
          skippedWorkflows: skippedWorkflows.length
        });
        this.statistics.successfulSessions++;
        this.emit(MCPSessionManager.EVENTS.SESSION_COMPLETED, session);
      }
      
    } catch (error) {
      await this._handleSessionError(session, error);
    } finally {
      // Clean up and move to completed
      this.activeSessions.delete(session.id);
      this.completedSessions.set(session.id, session);
      
      // Update statistics
      this._updateSessionStatistics(session);
      
      // Process next session in queue
      await this._processSessionQueue();
    }
  }

  /**
   * Executes a single workflow
   * @param {TestWorkflow} workflow - Workflow to execute
   * @param {MCPTestSession} session - Parent session
   * @private
   */
  async _executeWorkflow(workflow, session) {
    // Check dependencies
    if (!workflow.areDependenciesSatisfied(session.testWorkflows)) {
      workflow.skip('Dependencies not satisfied');
      this.emit(MCPSessionManager.EVENTS.WORKFLOW_FAILED, workflow);
      return;
    }
    
    try {
      this.activeWorkflows.set(workflow.id, workflow);
      this.statistics.totalWorkflows++;
      
      // Start workflow
      workflow.start(session.id);
      this.emit(MCPSessionManager.EVENTS.WORKFLOW_STARTED, workflow);
      
      // Set workflow timeout
      const timeoutId = setTimeout(() => {
        if (this.activeWorkflows.has(workflow.id)) {
          workflow.fail('Workflow execution timeout');
        }
      }, this.config.workflowTimeout);
      
      // Execute workflow steps
      while (workflow.currentStepIndex < workflow.steps.length && 
             workflow.status === Constants.WorkflowStatus.RUNNING) {
        
        await workflow.executeNextStep();
        
        // Emit progress update
        this.emit(MCPSessionManager.EVENTS.PROGRESS_UPDATED, {
          sessionId: session.id,
          workflowId: workflow.id,
          progress: workflow.getProgress()
        });
      }
      
      clearTimeout(timeoutId);
      
      // Complete workflow if all steps executed
      if (workflow.currentStepIndex >= workflow.steps.length) {
        workflow.complete();
        this.statistics.successfulWorkflows++;
        this.emit(MCPSessionManager.EVENTS.WORKFLOW_COMPLETED, workflow);
      }
      
    } catch (error) {
      workflow.fail(`Workflow execution error: ${error.message}`);
      this.statistics.failedWorkflows++;
      this.emit(MCPSessionManager.EVENTS.WORKFLOW_FAILED, workflow);
      
      // Retry if enabled
      if (this.config.autoRetryFailedWorkflows && workflow.retryCount < this.config.workflowRetryAttempts) {
        workflow.retryCount = (workflow.retryCount || 0) + 1;
        workflow.status = Constants.WorkflowStatus.PENDING;
        await this._executeWorkflow(workflow, session);
      }
      
    } finally {
      this.activeWorkflows.delete(workflow.id);
    }
  }

  /**
   * Sorts workflows by dependencies to ensure proper execution order
   * @param {Array<TestWorkflow>} workflows - Workflows to sort
   * @returns {Array<TestWorkflow>} Sorted workflows
   * @private
   */
  _sortWorkflowsByDependencies(workflows) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();
    
    const visit = (workflow) => {
      if (visiting.has(workflow.id)) {
        throw new Error(`Circular dependency detected involving workflow ${workflow.id}`);
      }
      
      if (visited.has(workflow.id)) {
        return;
      }
      
      visiting.add(workflow.id);
      
      // Visit dependencies first
      for (const depId of workflow.dependencies) {
        const dependency = workflows.find(w => w.id === depId);
        if (dependency) {
          visit(dependency);
        }
      }
      
      visiting.delete(workflow.id);
      visited.add(workflow.id);
      sorted.push(workflow);
    };
    
    // Visit all workflows
    for (const workflow of workflows) {
      if (!visited.has(workflow.id)) {
        visit(workflow);
      }
    }
    
    return sorted;
  }

  /**
   * Handles session execution errors
   * @param {MCPTestSession} session - Session that encountered error
   * @param {Error} error - Error that occurred
   * @private
   */
  async _handleSessionError(session, error) {
    session.fail(error.message, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    this.statistics.failedSessions++;
    this.emit(MCPSessionManager.EVENTS.SESSION_FAILED, session);
    
    // Clean up active workflows
    for (const [workflowId, workflow] of this.activeWorkflows) {
      if (workflow.sessionId === session.id) {
        workflow.fail('Session failed');
        this.activeWorkflows.delete(workflowId);
      }
    }
  }

  /**
   * Processes the session queue to start next available session
   * @private
   */
  async _processSessionQueue() {
    if (this.sessionQueue.length > 0 && 
        this.activeSessions.size < this.config.maxConcurrentSessions) {
      
      const nextSession = this.sessionQueue.shift();
      await this._initializeSession(nextSession);
      
      // Auto-start if configured
      if (this.config.autoStartQueuedSessions !== false) {
        setTimeout(() => this.startSession(nextSession.id), 100);
      }
    }
  }

  /**
   * Updates session statistics
   * @param {MCPTestSession} session - Completed session
   * @private
   */
  _updateSessionStatistics(session) {
    const duration = session.getDuration();
    if (duration) {
      const totalDuration = this.statistics.averageSessionDuration * (this.statistics.totalSessions - 1) + duration;
      this.statistics.averageSessionDuration = totalDuration / this.statistics.totalSessions;
    }
  }

  /**
   * Filters sessions based on criteria
   * @param {Array<MCPTestSession>} sessions - Sessions to filter
   * @param {Object} filter - Filter criteria
   * @returns {Array<MCPTestSession>} Filtered sessions
   * @private
   */
  _filterSessions(sessions, filter) {
    return sessions.filter(session => {
      if (filter.status && session.status !== filter.status) return false;
      if (filter.sessionName && !session.sessionName.includes(filter.sessionName)) return false;
      if (filter.chromeVersion && session.chromeVersion !== filter.chromeVersion) return false;
      if (filter.extensionVersion && session.extensionVersion !== filter.extensionVersion) return false;
      if (filter.dateFrom && new Date(session.startTime) < new Date(filter.dateFrom)) return false;
      if (filter.dateTo && new Date(session.startTime) > new Date(filter.dateTo)) return false;
      return true;
    });
  }

  /**
   * Detects Chrome browser version
   * @returns {Promise<string>} Chrome version
   * @private
   */
  async _detectChromeVersion() {
    // This would integrate with actual Chrome detection
    // For now, return a placeholder
    return 'Chrome/120.0.6099.109';
  }

  /**
   * Detects extension version
   * @returns {Promise<string>} Extension version
   * @private
   */
  async _detectExtensionVersion() {
    // This would read from manifest.json
    // For now, return a placeholder
    return '1.0.0';
  }

  /**
   * Validates session configuration
   * @param {MCPTestSession} session - Session to validate
   * @private
   */
  _validateSession(session) {
    if (!session.sessionName) {
      throw new Error('Session name is required');
    }
    
    if (session.testWorkflows.length === 0) {
      throw new Error('At least one workflow is required');
    }
    
    // Validate workflow dependencies
    const workflowIds = new Set(session.testWorkflows.map(w => w.id));
    for (const workflow of session.testWorkflows) {
      for (const depId of workflow.dependencies) {
        if (!workflowIds.has(depId)) {
          throw new Error(`Workflow ${workflow.id} depends on non-existent workflow ${depId}`);
        }
      }
    }
  }

  /**
   * Sets up session cleanup timer
   * @private
   */
  _setupSessionCleanup() {
    // Clean up completed sessions older than 24 hours
    setInterval(() => {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      for (const [sessionId, session] of this.completedSessions) {
        if (session.endTime && new Date(session.endTime) < cutoffTime) {
          this.completedSessions.delete(sessionId);
        }
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Shuts down the session manager gracefully
   * @returns {Promise<void>} Shutdown promise
   */
  async shutdown() {
    // Abort all active sessions
    const abortPromises = [];
    for (const sessionId of this.activeSessions.keys()) {
      abortPromises.push(this.abortSession(sessionId, 'Manager shutdown'));
    }
    
    await Promise.all(abortPromises);
    
    // Clear all data
    this.activeSessions.clear();
    this.activeWorkflows.clear();
    this.sessionQueue.length = 0;
    this.workflowQueue.length = 0;
    
    this.emit('shutdown');
  }
}

export default MCPSessionManager;
/**
 * MCP Test Data Models
 * 
 * Comprehensive data models for tracking MCP test results and session management.
 * These models support the Chrome Extension MCP Testing infrastructure with
 * session lifecycle management, workflow execution tracking, and result validation.
 */

export { default as MCPTestSession } from './mcp-test-session.js';
export { default as TestWorkflow } from './test-workflow.js';
export { default as ValidationResult } from './validation-result.js';
export { default as PerformanceMetric } from './performance-metric.js';
export { default as MCPCommand } from './mcp-command.js';

/**
 * Model registry for dynamic instantiation and validation
 */
export const ModelRegistry = {
  MCPTestSession: () => import('./mcp-test-session.js'),
  TestWorkflow: () => import('./test-workflow.js'),
  ValidationResult: () => import('./validation-result.js'),
  PerformanceMetric: () => import('./performance-metric.js'),
  MCPCommand: () => import('./mcp-command.js')
};

/**
 * Model validation utilities
 */
export const ModelValidator = {
  /**
   * Validates if a model instance is of the expected type
   * @param {Object} instance - Model instance to validate
   * @param {string} expectedType - Expected model type name
   * @returns {boolean} True if instance is of expected type
   */
  isInstanceOf(instance, expectedType) {
    if (!instance || !instance.constructor || !instance.constructor.name) {
      return false;
    }
    return instance.constructor.name === expectedType;
  },

  /**
   * Validates model relationships
   * @param {MCPTestSession} session - Test session
   * @returns {Array<string>} Array of validation errors, empty if valid
   */
  validateSessionRelationships(session) {
    const errors = [];
    
    // Check that all workflows belong to this session
    session.testWorkflows.forEach(workflow => {
      if (workflow.sessionId !== session.id) {
        errors.push(`Workflow ${workflow.id} has sessionId ${workflow.sessionId} but belongs to session ${session.id}`);
      }
    });
    
    // Check that all metrics belong to this session
    session.performanceMetrics.forEach(metric => {
      if (metric.sessionId !== session.id) {
        errors.push(`Metric ${metric.id} has sessionId ${metric.sessionId} but belongs to session ${session.id}`);
      }
    });
    
    // Check that all validation results belong to this session
    session.validationResults.forEach(result => {
      if (result.sessionId && result.sessionId !== session.id) {
        errors.push(`ValidationResult ${result.id} has sessionId ${result.sessionId} but belongs to session ${session.id}`);
      }
    });
    
    return errors;
  },

  /**
   * Validates workflow relationships
   * @param {TestWorkflow} workflow - Test workflow
   * @returns {Array<string>} Array of validation errors, empty if valid
   */
  validateWorkflowRelationships(workflow) {
    const errors = [];
    
    // Check that all commands belong to this workflow
    workflow.mcpCommands.forEach(command => {
      if (command.workflowId !== workflow.id) {
        errors.push(`Command ${command.id} has workflowId ${command.workflowId} but belongs to workflow ${workflow.id}`);
      }
    });
    
    // Check that all validation results belong to this workflow
    workflow.validationResults.forEach(result => {
      if (result.workflowId && result.workflowId !== workflow.id) {
        errors.push(`ValidationResult ${result.id} has workflowId ${result.workflowId} but belongs to workflow ${workflow.id}`);
      }
    });
    
    return errors;
  }
};

/**
 * Model factory utilities
 */
export const ModelFactory = {
  /**
   * Creates a complete test session with sample data for testing
   * @param {Object} config - Session configuration override
   * @returns {MCPTestSession} Configured test session
   */
  async createSampleSession(config = {}) {
    const { default: MCPTestSession } = await import('./mcp-test-session.js');
    const { default: TestWorkflow } = await import('./test-workflow.js');
    const { default: MCPCommand } = await import('./mcp-command.js');
    const { default: ValidationResult } = await import('./validation-result.js');
    const { default: PerformanceMetric } = await import('./performance-metric.js');
    
    const session = new MCPTestSession({
      sessionName: 'Sample MCP Test Session',
      chromeVersion: '120.0.6099.109',
      extensionVersion: '1.0.0',
      ...config
    });
    
    // Add sample workflow
    const workflow = new TestWorkflow({
      workflowType: TestWorkflow.TYPES.AI_API_VALIDATION,
      name: 'Chrome Built-in AI API Test',
      description: 'Validates Chrome Built-in AI APIs availability and functionality',
      steps: [
        { name: 'Check AI API availability', command: 'checkAIAvailability' },
        { name: 'Create AI session', command: 'createAISession' },
        { name: 'Test content processing', command: 'processContent' }
      ],
      expectedOutcomes: ['AI APIs available', 'Session created', 'Content processed']
    });
    
    // Add sample commands
    const navCommand = MCPCommand.createNavigateCommand('https://example.com', 0);
    const screenshotCommand = MCPCommand.createScreenshotCommand('test-page.png', {}, 1);
    
    workflow.addMCPCommand(navCommand);
    workflow.addMCPCommand(screenshotCommand);
    
    // Add sample validation results
    const validation1 = ValidationResult.createSimple(
      'AI API Availability',
      true,
      'Chrome Built-in AI APIs are available',
      ValidationResult.SEVERITY.CRITICAL
    );
    
    const validation2 = ValidationResult.createPerformance(
      'AI Processing Speed',
      3500,
      5000,
      '<=',
      'ms'
    );
    
    workflow.addValidationResult(validation1);
    workflow.addValidationResult(validation2);
    
    // Add sample performance metrics
    const metric1 = PerformanceMetric.createTimingMetric(
      'Extension Load Time',
      1200,
      2000,
      'Extension loading performance'
    );
    
    const metric2 = PerformanceMetric.createMemoryMetric(
      'Extension Memory Usage',
      45.2,
      100,
      'Memory usage after loading'
    );
    
    session.addTestWorkflow(workflow);
    session.addPerformanceMetric(metric1);
    session.addPerformanceMetric(metric2);
    session.addValidationResult(validation1);
    session.addValidationResult(validation2);
    
    return session;
  },

  /**
   * Creates a minimal test workflow for specific testing scenarios
   * @param {string} workflowType - Type of workflow to create
   * @param {string} name - Workflow name
   * @returns {TestWorkflow} Configured workflow
   */
  async createWorkflow(workflowType, name) {
    const { default: TestWorkflow } = await import('./test-workflow.js');
    
    const workflowConfigs = {
      [TestWorkflow.TYPES.EXTENSION_LOADING]: {
        steps: [
          { name: 'Load extension', command: 'loadExtension' },
          { name: 'Verify components', command: 'verifyComponents' }
        ],
        expectedOutcomes: ['Extension loaded', 'All components active']
      },
      [TestWorkflow.TYPES.AI_API_VALIDATION]: {
        steps: [
          { name: 'Check API availability', command: 'checkAIAvailability' },
          { name: 'Test API calls', command: 'testAPICalls' }
        ],
        expectedOutcomes: ['APIs available', 'API calls successful']
      },
      [TestWorkflow.TYPES.CONTENT_CAPTURE]: {
        steps: [
          { name: 'Navigate to page', command: 'navigateToPage' },
          { name: 'Capture content', command: 'captureContent' },
          { name: 'Process with AI', command: 'processWithAI' }
        ],
        expectedOutcomes: ['Page loaded', 'Content captured', 'AI processing complete']
      },
      [TestWorkflow.TYPES.UI_TESTING]: {
        steps: [
          { name: 'Open extension UI', command: 'openUI' },
          { name: 'Test interactions', command: 'testInteractions' }
        ],
        expectedOutcomes: ['UI rendered', 'Interactions working']
      },
      [TestWorkflow.TYPES.PERFORMANCE_PROFILING]: {
        steps: [
          { name: 'Start profiling', command: 'startProfiling' },
          { name: 'Execute operations', command: 'executeOperations' },
          { name: 'Collect metrics', command: 'collectMetrics' }
        ],
        expectedOutcomes: ['Profiling started', 'Operations completed', 'Metrics collected']
      }
    };
    
    const config = workflowConfigs[workflowType] || workflowConfigs[TestWorkflow.TYPES.EXTENSION_LOADING];
    
    return new TestWorkflow({
      workflowType: workflowType,
      name: name,
      description: `Automated ${workflowType} testing workflow`,
      ...config
    });
  }
};

/**
 * Export all model constants for external use
 */
export const Constants = {
  SessionStatus: {
    INITIALIZING: 'initializing',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    ABORTED: 'aborted'
  },
  WorkflowTypes: {
    EXTENSION_LOADING: 'extension_loading',
    AI_API_VALIDATION: 'ai_api_validation',
    CONTENT_CAPTURE: 'content_capture',
    UI_TESTING: 'ui_testing',
    PERFORMANCE_PROFILING: 'performance_profiling'
  },
  WorkflowStatus: {
    PENDING: 'pending',
    RUNNING: 'running',
    PASSED: 'passed',
    FAILED: 'failed',
    SKIPPED: 'skipped'
  },
  ValidationTypes: {
    FUNCTIONAL: 'functional',
    PERFORMANCE: 'performance',
    VISUAL: 'visual',
    API_RESPONSE: 'api_response',
    ERROR_HANDLING: 'error_handling'
  },
  ValidationSeverity: {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
  },
  MetricTypes: {
    AI_PROCESSING_TIME: 'ai_processing_time',
    SEARCH_RESPONSE_TIME: 'search_response_time',
    EXTENSION_LOAD_TIME: 'extension_load_time',
    MEMORY_USAGE: 'memory_usage',
    CPU_USAGE: 'cpu_usage'
  },
  CommandTypes: {
    NAVIGATE_PAGE: 'navigate_page',
    EVALUATE_SCRIPT: 'evaluate_script',
    CLICK: 'click',
    TAKE_SCREENSHOT: 'take_screenshot',
    LIST_CONSOLE_MESSAGES: 'list_console_messages'
  }
};

export default {
  MCPTestSession,
  TestWorkflow,
  ValidationResult,
  PerformanceMetric,
  MCPCommand,
  ModelRegistry,
  ModelValidator,
  ModelFactory,
  Constants
};
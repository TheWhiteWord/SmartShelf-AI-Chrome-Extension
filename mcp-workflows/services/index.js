/**
 * MCP Integration Services
 * 
 * Comprehensive services to orchestrate MCP workflows and manage test execution
 * for Chrome Extension automated testing with full lifecycle management.
 */

export { default as MCPSessionManager } from './session-manager.js';
export { default as ChromeExtensionController } from './extension-controller.js';
export { default as PerformanceMonitor } from './performance-monitor.js';
export { default as TestResultAggregator } from './result-aggregator.js';
export { default as VisualValidator } from './visual-validator.js';

/**
 * Service registry for dynamic instantiation and dependency management
 */
export const ServiceRegistry = {
  MCPSessionManager: () => import('./session-manager.js'),
  ChromeExtensionController: () => import('./extension-controller.js'),
  PerformanceMonitor: () => import('./performance-monitor.js'),
  TestResultAggregator: () => import('./result-aggregator.js'),
  VisualValidator: () => import('./visual-validator.js')
};

/**
 * Service orchestrator for managing multiple services
 */
export class ServiceOrchestrator {
  constructor(config = {}) {
    this.config = {
      enableSessionManager: config.enableSessionManager !== false,
      enableExtensionController: config.enableExtensionController !== false,
      enablePerformanceMonitor: config.enablePerformanceMonitor !== false,
      enableResultAggregator: config.enableResultAggregator !== false,
      enableVisualValidator: config.enableVisualValidator !== false,
      ...config
    };
    
    this.services = new Map();
    this.isInitialized = false;
  }

  /**
   * Initializes all enabled services
   * @param {Object} chromeConnection - Chrome DevTools MCP connection
   * @returns {Promise<void>} Initialization promise
   */
  async initialize(chromeConnection) {
    if (this.isInitialized) {
      throw new Error('Service orchestrator is already initialized');
    }
    
    try {
      // Initialize Session Manager
      if (this.config.enableSessionManager) {
        const { default: MCPSessionManager } = await import('./session-manager.js');
        const sessionManager = new MCPSessionManager(this.config.sessionManager || {});
        this.services.set('sessionManager', sessionManager);
      }
      
      // Initialize Extension Controller
      if (this.config.enableExtensionController) {
        const { default: ChromeExtensionController } = await import('./extension-controller.js');
        const extensionController = new ChromeExtensionController(this.config.extensionController || {});
        await extensionController.initialize(chromeConnection);
        this.services.set('extensionController', extensionController);
      }
      
      // Initialize Performance Monitor
      if (this.config.enablePerformanceMonitor) {
        const { default: PerformanceMonitor } = await import('./performance-monitor.js');
        const performanceMonitor = new PerformanceMonitor(this.config.performanceMonitor || {});
        this.services.set('performanceMonitor', performanceMonitor);
      }
      
      // Initialize Result Aggregator
      if (this.config.enableResultAggregator) {
        const { default: TestResultAggregator } = await import('./result-aggregator.js');
        const resultAggregator = new TestResultAggregator(this.config.resultAggregator || {});
        this.services.set('resultAggregator', resultAggregator);
      }
      
      // Initialize Visual Validator
      if (this.config.enableVisualValidator) {
        const { default: VisualValidator } = await import('./visual-validator.js');
        const visualValidator = new VisualValidator(this.config.visualValidator || {});
        this.services.set('visualValidator', visualValidator);
      }
      
      this.isInitialized = true;
      
    } catch (error) {
      throw new Error(`Failed to initialize services: ${error.message}`);
    }
  }

  /**
   * Gets a service by name
   * @param {string} serviceName - Service name
   * @returns {Object|null} Service instance or null if not found
   */
  getService(serviceName) {
    return this.services.get(serviceName) || null;
  }

  /**
   * Gets all initialized services
   * @returns {Map} Map of service name to service instance
   */
  getAllServices() {
    return new Map(this.services);
  }

  /**
   * Executes a comprehensive test session using all services
   * @param {Object} testConfig - Test configuration
   * @returns {Promise<Object>} Test execution result
   */
  async executeTestSession(testConfig) {
    if (!this.isInitialized) {
      throw new Error('Service orchestrator is not initialized');
    }
    
    const sessionManager = this.getService('sessionManager');
    const extensionController = this.getService('extensionController');
    const performanceMonitor = this.getService('performanceMonitor');
    const resultAggregator = this.getService('resultAggregator');
    const visualValidator = this.getService('visualValidator');
    
    if (!sessionManager) {
      throw new Error('Session manager is required for test execution');
    }
    
    try {
      // Create and start test session
      const session = await sessionManager.createSession(
        testConfig.session || {},
        testConfig.workflows || []
      );
      
      const sessionId = session.id;
      
      // Load extension if controller is available
      if (extensionController && testConfig.extensionPath) {
        await extensionController.loadExtension(testConfig.extensionPath);
      }
      
      // Start performance monitoring if available
      if (performanceMonitor) {
        await performanceMonitor.startMonitoring(sessionId);
      }
      
      // Start the session
      await sessionManager.startSession(sessionId);
      
      // Wait for session completion
      await this._waitForSessionCompletion(session);
      
      // Stop performance monitoring
      if (performanceMonitor) {
        await performanceMonitor.stopMonitoring();
      }
      
      // Aggregate results if aggregator is available
      let aggregationResult = null;
      if (resultAggregator) {
        aggregationResult = await resultAggregator.aggregateSessionResults(session);
      }
      
      // Generate visual validation if validator is available and requested
      let visualValidationResult = null;
      if (visualValidator && testConfig.enableVisualValidation) {
        // This would capture screenshots and perform validations
        // Implementation depends on the specific test requirements
      }
      
      return {
        sessionId: sessionId,
        session: session,
        aggregationResult: aggregationResult,
        visualValidationResult: visualValidationResult,
        status: 'completed',
        completedAt: new Date().toISOString()
      };
      
    } catch (error) {
      // Clean up on error
      if (performanceMonitor) {
        await performanceMonitor.stopMonitoring();
      }
      
      if (extensionController) {
        await extensionController.unloadExtension();
      }
      
      throw error;
    }
  }

  /**
   * Shuts down all services
   * @returns {Promise<void>} Shutdown promise
   */
  async shutdown() {
    const shutdownPromises = [];
    
    for (const [serviceName, service] of this.services) {
      if (service.shutdown && typeof service.shutdown === 'function') {
        shutdownPromises.push(service.shutdown());
      }
    }
    
    await Promise.all(shutdownPromises);
    
    this.services.clear();
    this.isInitialized = false;
  }

  /**
   * Waits for session completion
   * @param {MCPTestSession} session - Session to wait for
   * @returns {Promise<void>} Completion promise
   * @private
   */
  async _waitForSessionCompletion(session) {
    return new Promise((resolve) => {
      const checkCompletion = () => {
        if (session.status === 'completed' || 
            session.status === 'failed' || 
            session.status === 'aborted') {
          resolve();
        } else {
          setTimeout(checkCompletion, 1000);
        }
      };
      
      checkCompletion();
    });
  }
}

/**
 * Service factory utilities
 */
export const ServiceFactory = {
  /**
   * Creates a complete MCP testing environment with all services
   * @param {Object} config - Configuration for all services
   * @param {Object} chromeConnection - Chrome DevTools MCP connection
   * @returns {Promise<ServiceOrchestrator>} Configured service orchestrator
   */
  async createFullTestingEnvironment(config = {}, chromeConnection) {
    const orchestrator = new ServiceOrchestrator(config);
    await orchestrator.initialize(chromeConnection);
    return orchestrator;
  },

  /**
   * Creates a minimal testing environment with essential services
   * @param {Object} chromeConnection - Chrome DevTools MCP connection
   * @returns {Promise<ServiceOrchestrator>} Minimal service orchestrator
   */
  async createMinimalTestingEnvironment(chromeConnection) {
    const config = {
      enableSessionManager: true,
      enableExtensionController: true,
      enablePerformanceMonitor: false,
      enableResultAggregator: true,
      enableVisualValidator: false
    };
    
    const orchestrator = new ServiceOrchestrator(config);
    await orchestrator.initialize(chromeConnection);
    return orchestrator;
  },

  /**
   * Creates a performance-focused testing environment
   * @param {Object} chromeConnection - Chrome DevTools MCP connection
   * @returns {Promise<ServiceOrchestrator>} Performance-focused orchestrator
   */
  async createPerformanceTestingEnvironment(chromeConnection) {
    const config = {
      enableSessionManager: true,
      enableExtensionController: true,
      enablePerformanceMonitor: true,
      enableResultAggregator: true,
      enableVisualValidator: false,
      performanceMonitor: {
        mode: 'continuous',
        collectionInterval: 500, // More frequent collection
        enableRealTimeAlerts: true
      }
    };
    
    const orchestrator = new ServiceOrchestrator(config);
    await orchestrator.initialize(chromeConnection);
    return orchestrator;
  },

  /**
   * Creates a visual validation focused testing environment
   * @param {Object} chromeConnection - Chrome DevTools MCP connection
   * @returns {Promise<ServiceOrchestrator>} Visual validation focused orchestrator
   */
  async createVisualTestingEnvironment(chromeConnection) {
    const config = {
      enableSessionManager: true,
      enableExtensionController: true,
      enablePerformanceMonitor: false,
      enableResultAggregator: true,
      enableVisualValidator: true,
      visualValidator: {
        enableRegression: true,
        enableAccessibility: true,
        enableResponsive: true,
        similarityThreshold: 0.98
      }
    };
    
    const orchestrator = new ServiceOrchestrator(config);
    await orchestrator.initialize(chromeConnection);
    return orchestrator;
  }
};

/**
 * Export service constants and types
 */
export const ServiceConstants = {
  ServiceNames: {
    SESSION_MANAGER: 'sessionManager',
    EXTENSION_CONTROLLER: 'extensionController',
    PERFORMANCE_MONITOR: 'performanceMonitor',
    RESULT_AGGREGATOR: 'resultAggregator',
    VISUAL_VALIDATOR: 'visualValidator'
  },
  
  ServiceStates: {
    UNINITIALIZED: 'uninitialized',
    INITIALIZING: 'initializing',
    READY: 'ready',
    RUNNING: 'running',
    ERROR: 'error',
    SHUTDOWN: 'shutdown'
  },
  
  OrchestrationModes: {
    SEQUENTIAL: 'sequential',
    PARALLEL: 'parallel',
    CONDITIONAL: 'conditional'
  }
};

export default {
  MCPSessionManager,
  ChromeExtensionController,
  PerformanceMonitor,
  TestResultAggregator,
  VisualValidator,
  ServiceRegistry,
  ServiceOrchestrator,
  ServiceFactory,
  ServiceConstants
};
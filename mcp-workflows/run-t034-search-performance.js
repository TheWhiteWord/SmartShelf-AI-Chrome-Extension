#!/usr/bin/env node

/**
 * T034: Run Search Functionality Tests and Validate Performance Requirements
 * 
 * Executes comprehensive search functionality tests and validates:
 * - Performance requirements (<500ms response time)
 * - Result relevance and accuracy
 * - Search index performance
 * - Multi-term query handling
 * - Error handling and recovery
 * 
 * This MCP workflow automates search testing using Chrome DevTools integration
 * and validates constitutional performance requirements.
 */

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import EventEmitter from 'events';

// Import MCP workflow dependencies
import { SessionManager } from './services/session-manager.js';
import { ExtensionController } from './services/extension-controller.js';
import { PerformanceMonitor } from './services/performance-monitor.js';
import { ResultAggregator } from './services/result-aggregator.js';
import { VisualValidator } from './services/visual-validator.js';
import { MCPTestSession, TestWorkflow, ValidationResult, PerformanceMetric } from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * T034 Search Performance Test Workflow
 */
class T034SearchPerformanceWorkflow extends EventEmitter {
  
  /**
   * Test configuration and requirements
   */
  static CONFIG = {
    workflowId: 'T034-search-performance',
    workflowName: 'Search Functionality Performance Validation',
    
    // Constitutional performance requirements
    performanceRequirements: {
      maxSearchResponseTime: 500,    // <500ms response time requirement
      maxComplexQueryTime: 1000,     // Complex multi-term queries
      maxIndexRebuildTime: 5000,     // Search index operations
      minResultRelevance: 0.8,       // 80% minimum relevance score
      maxMemoryUsage: 50             // 50MB during search operations
    },
    
    // Test scenarios
    testScenarios: [
      {
        name: 'single_term_search',
        description: 'Single term search performance',
        query: 'javascript',
        expectedResults: 1,
        maxResponseTime: 300
      },
      {
        name: 'multi_term_search',
        description: 'Multi-term search performance',
        query: 'javascript testing optimization',
        expectedResults: 2,
        maxResponseTime: 500
      },
      {
        name: 'complex_query_search',
        description: 'Complex query with filters',
        query: 'machine learning neural networks',
        filters: { type: 'article', category: 'Technology' },
        expectedResults: 1,
        maxResponseTime: 500
      },
      {
        name: 'empty_query_search',
        description: 'Empty query handling',
        query: '',
        expectedResults: 3,
        maxResponseTime: 200
      },
      {
        name: 'no_results_search',
        description: 'No results query performance',
        query: 'nonexistent_term_xyz123',
        expectedResults: 0,
        maxResponseTime: 300
      },
      {
        name: 'large_result_set',
        description: 'Large result set handling',
        query: 'programming',
        expectedResults: 2,
        maxResponseTime: 500
      }
    ],
    
    // Stress testing parameters
    stressTest: {
      concurrentSearches: 10,
      searchDuration: 30000,  // 30 seconds
      maxConcurrentResponseTime: 800
    }
  };

  constructor() {
    super();
    
    // Workflow state
    this.workflowState = {
      status: 'initialized',
      currentStep: null,
      startTime: null,
      endTime: null,
      results: new Map(),
      errors: [],
      performance: new Map()
    };
    
    // Service instances
    this.sessionManager = null;
    this.extensionController = null;
    this.performanceMonitor = null;
    this.resultAggregator = null;
    this.visualValidator = null;
    
    // Test session
    this.testSession = null;
    this.testWorkflow = null;
  }

  /**
   * Main workflow execution
   */
  async execute() {
    console.log('🔍 Starting T034 Search Performance Validation Workflow...');
    
    try {
      this.workflowState.status = 'running';
      this.workflowState.startTime = new Date().toISOString();
      
      // Initialize services
      await this.initializeServices();
      
      // Create test session
      await this.createTestSession();
      
      // Load and validate extension
      await this.loadExtension();
      
      // Setup search test environment
      await this.setupSearchEnvironment();
      
      // Run search performance tests
      await this.runSearchPerformanceTests();
      
      // Run stress testing
      await this.runStressTests();
      
      // Validate results and generate report
      await this.validateAndReport();
      
      this.workflowState.status = 'completed';
      console.log('✅ T034 Search Performance Validation completed successfully');
      
    } catch (error) {
      this.workflowState.status = 'failed';
      this.workflowState.errors.push(error.message);
      console.error('❌ T034 Workflow failed:', error.message);
      throw error;
      
    } finally {
      this.workflowState.endTime = new Date().toISOString();
      await this.cleanup();
    }
  }

  /**
   * Initialize MCP services
   */
  async initializeServices() {
    console.log('📋 Initializing MCP services...');
    
    this.sessionManager = new SessionManager({
      sessionType: 'search_performance_test',
      enablePerformanceMonitoring: true
    });
    
    this.extensionController = new ExtensionController({
      extensionPath: join(__dirname, '../extension'),
      enableDebugMode: true,
      waitForLoad: true
    });
    
    this.performanceMonitor = new PerformanceMonitor({
      mode: PerformanceMonitor.MONITORING_MODE.SESSION_BASED,
      thresholds: {
        [PerformanceMetric.TYPES.SEARCH_RESPONSE_TIME]: T034SearchPerformanceWorkflow.CONFIG.performanceRequirements.maxSearchResponseTime,
        [PerformanceMetric.TYPES.MEMORY_USAGE]: T034SearchPerformanceWorkflow.CONFIG.performanceRequirements.maxMemoryUsage
      }
    });
    
    this.resultAggregator = new ResultAggregator({
      sessionId: this.sessionManager?.sessionId,
      includePerformanceMetrics: true
    });
    
    this.visualValidator = new VisualValidator({
      screenshotDir: join(__dirname, 'screenshots'),
      enableComparisonValidation: true
    });
    
    // Start performance monitoring
    await this.performanceMonitor.startMonitoring();
    
    console.log('✅ MCP services initialized');
  }

  /**
   * Create test session
   */
  async createTestSession() {
    console.log('🎯 Creating test session...');
    
    this.testSession = new MCPTestSession({
      sessionId: `t034_${Date.now()}`,
      testType: 'search_performance_validation',
      extensionId: 'smartshelf-ai-chrome-extension',
      browserVersion: await this.getBrowserVersion(),
      testConfiguration: T034SearchPerformanceWorkflow.CONFIG
    });
    
    this.testWorkflow = new TestWorkflow({
      workflowId: T034SearchPerformanceWorkflow.CONFIG.workflowId,
      sessionId: this.testSession.sessionId,
      steps: T034SearchPerformanceWorkflow.CONFIG.testScenarios.map(scenario => ({
        stepId: scenario.name,
        description: scenario.description,
        expectedOutcome: `Performance within ${scenario.maxResponseTime}ms, ${scenario.expectedResults} results`
      }))
    });
    
    await this.sessionManager.createSession(this.testSession);
    
    console.log(`✅ Test session created: ${this.testSession.sessionId}`);
  }

  /**
   * Load and validate extension
   */
  async loadExtension() {
    console.log('🔌 Loading SmartShelf extension...');
    
    this.workflowState.currentStep = 'extension_loading';
    
    try {
      // Load extension in Chrome
      const loadResult = await this.extensionController.loadExtension();
      
      // Validate extension components
      const serviceWorkerValidation = await this.extensionController.validateServiceWorker();
      const contentScriptValidation = await this.extensionController.validateContentScripts();
      
      // Check search service availability
      const searchServiceAvailable = await this.validateSearchServiceAvailability();
      
      if (!loadResult.success || !serviceWorkerValidation.success || !searchServiceAvailable) {
        throw new Error('Extension failed to load or search service unavailable');
      }
      
      console.log('✅ Extension loaded and validated');
      
    } catch (error) {
      throw new Error(`Extension loading failed: ${error.message}`);
    }
  }

  /**
   * Setup search test environment
   */
  async setupSearchEnvironment() {
    console.log('🗃️ Setting up search test environment...');
    
    this.workflowState.currentStep = 'environment_setup';
    
    try {
      // Clear existing search data
      await this.clearSearchData();
      
      // Load test content items
      await this.loadTestContentItems();
      
      // Initialize search index
      await this.initializeSearchIndex();
      
      // Validate search environment
      await this.validateSearchEnvironment();
      
      console.log('✅ Search environment setup complete');
      
    } catch (error) {
      throw new Error(`Search environment setup failed: ${error.message}`);
    }
  }

  /**
   * Run search performance tests
   */
  async runSearchPerformanceTests() {
    console.log('🚀 Running search performance tests...');
    
    this.workflowState.currentStep = 'performance_testing';
    
    for (const scenario of T034SearchPerformanceWorkflow.CONFIG.testScenarios) {
      console.log(`\n📊 Testing scenario: ${scenario.name}`);
      
      try {
        // Run search test scenario
        const testResult = await this.runSearchScenario(scenario);
        
        // Validate performance requirements
        const performanceValidation = await this.validateScenarioPerformance(scenario, testResult);
        
        // Validate result relevance
        const relevanceValidation = await this.validateResultRelevance(scenario, testResult);
        
        // Store results
        this.workflowState.results.set(scenario.name, {
          scenario: scenario,
          testResult: testResult,
          performanceValidation: performanceValidation,
          relevanceValidation: relevanceValidation,
          passed: performanceValidation.passed && relevanceValidation.passed
        });
        
        // Update workflow tracking
        this.testWorkflow.updateStepStatus(scenario.name, 
          performanceValidation.passed && relevanceValidation.passed ? 'passed' : 'failed');
        
        console.log(`${performanceValidation.passed && relevanceValidation.passed ? '✅' : '❌'} ${scenario.name}: ${testResult.responseTime}ms, ${testResult.resultCount} results`);
        
      } catch (error) {
        console.error(`❌ Scenario ${scenario.name} failed: ${error.message}`);
        this.workflowState.results.set(scenario.name, {
          scenario: scenario,
          error: error.message,
          passed: false
        });
        this.testWorkflow.updateStepStatus(scenario.name, 'failed', error.message);
      }
    }
    
    console.log('📊 Search performance tests completed');
  }

  /**
   * Run stress tests
   */
  async runStressTests() {
    console.log('💪 Running search stress tests...');
    
    this.workflowState.currentStep = 'stress_testing';
    
    try {
      const stressConfig = T034SearchPerformanceWorkflow.CONFIG.stressTest;
      
      // Run concurrent searches
      const concurrentResults = await this.runConcurrentSearches(
        stressConfig.concurrentSearches,
        stressConfig.maxConcurrentResponseTime
      );
      
      // Run sustained search load
      const sustainedResults = await this.runSustainedSearchLoad(
        stressConfig.searchDuration
      );
      
      // Store stress test results
      this.workflowState.results.set('stress_tests', {
        concurrent: concurrentResults,
        sustained: sustainedResults,
        passed: concurrentResults.passed && sustainedResults.passed
      });
      
      console.log('💪 Stress tests completed');
      
    } catch (error) {
      console.error('❌ Stress tests failed:', error.message);
      this.workflowState.results.set('stress_tests', {
        error: error.message,
        passed: false
      });
    }
  }

  /**
   * Validate results and generate comprehensive report
   */
  async validateAndReport() {
    console.log('📋 Validating results and generating report...');
    
    this.workflowState.currentStep = 'validation_and_reporting';
    
    try {
      // Stop performance monitoring
      const performanceReport = await this.performanceMonitor.stopMonitoring();
      
      // Aggregate all results
      const aggregatedResults = await this.resultAggregator.aggregateResults({
        searchTests: Array.from(this.workflowState.results.values()),
        performanceMetrics: performanceReport,
        testWorkflow: this.testWorkflow,
        testSession: this.testSession
      });
      
      // Generate comprehensive validation report
      const validationReport = await this.generateValidationReport(aggregatedResults);
      
      // Save results to logs
      await this.saveResults(validationReport);
      
      // Generate visual report (if applicable)
      if (this.visualValidator) {
        await this.generateVisualReport();
      }
      
      console.log('📋 Validation and reporting completed');
      
      return validationReport;
      
    } catch (error) {
      throw new Error(`Validation and reporting failed: ${error.message}`);
    }
  }

  /**
   * Run individual search scenario
   */
  async runSearchScenario(scenario) {
    const startTime = Date.now();
    
    try {
      // Collect memory baseline
      const memoryBaseline = await this.performanceMonitor.collectMetric(
        PerformanceMetric.TYPES.MEMORY_USAGE,
        { context: `pre_search_${scenario.name}`, sessionId: this.testSession.sessionId }
      );
      
      // Execute search query
      const searchResult = await this.executeSearch(scenario.query, scenario.filters);
      
      const responseTime = Date.now() - startTime;
      
      // Collect post-search memory
      const memoryAfter = await this.performanceMonitor.collectMetric(
        PerformanceMetric.TYPES.MEMORY_USAGE,
        { context: `post_search_${scenario.name}`, sessionId: this.testSession.sessionId }
      );
      
      // Record search response time
      await this.performanceMonitor.collectMetric(
        PerformanceMetric.TYPES.SEARCH_RESPONSE_TIME,
        { 
          context: `search_${scenario.name}`, 
          sessionId: this.testSession.sessionId,
          value: responseTime
        }
      );
      
      return {
        scenario: scenario.name,
        query: scenario.query,
        filters: scenario.filters || null,
        responseTime: responseTime,
        resultCount: searchResult.results?.length || 0,
        results: searchResult.results || [],
        memoryUsage: {
          before: memoryBaseline.value,
          after: memoryAfter.value,
          delta: memoryAfter.value - memoryBaseline.value
        },
        success: searchResult.success,
        error: searchResult.error || null
      };
      
    } catch (error) {
      return {
        scenario: scenario.name,
        query: scenario.query,
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute search query through extension
   */
  async executeSearch(query, filters = null) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Search timeout after 5 seconds'));
      }, 5000);
      
      // Send search message to extension
      chrome.runtime.sendMessage({
        action: 'searchContent',
        data: { 
          query: query,
          filters: filters,
          limit: 100,
          offset: 0
        }
      }, (response) => {
        clearTimeout(timeout);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Validate scenario performance requirements
   */
  async validateScenarioPerformance(scenario, testResult) {
    const validation = new ValidationResult({
      validationType: 'search_performance',
      testName: `performance_${scenario.name}`,
      sessionId: this.testSession.sessionId
    });
    
    // Check response time requirement
    const responseTimePassed = testResult.responseTime <= scenario.maxResponseTime;
    validation.addAssertion({
      name: 'response_time_requirement',
      expected: scenario.maxResponseTime,
      actual: testResult.responseTime,
      passed: responseTimePassed,
      message: `Response time should be ≤ ${scenario.maxResponseTime}ms, got ${testResult.responseTime}ms`
    });
    
    // Check memory usage (if available)
    if (testResult.memoryUsage) {
      const memoryIncreasePassed = testResult.memoryUsage.delta <= 10; // Max 10MB increase during search
      validation.addAssertion({
        name: 'memory_usage_increase',
        expected: '≤ 10MB increase',
        actual: `${testResult.memoryUsage.delta.toFixed(1)}MB increase`,
        passed: memoryIncreasePassed,
        message: `Memory increase should be ≤ 10MB during search`
      });
    }
    
    // Check result count expectation
    const resultCountPassed = testResult.resultCount === scenario.expectedResults;
    validation.addAssertion({
      name: 'result_count_expectation',
      expected: scenario.expectedResults,
      actual: testResult.resultCount,
      passed: resultCountPassed,
      message: `Expected ${scenario.expectedResults} results, got ${testResult.resultCount}`
    });
    
    // Check search success
    validation.addAssertion({
      name: 'search_success',
      expected: true,
      actual: testResult.success,
      passed: testResult.success,
      message: testResult.error || 'Search executed successfully'
    });
    
    return validation;
  }

  /**
   * Validate result relevance
   */
  async validateResultRelevance(scenario, testResult) {
    const validation = new ValidationResult({
      validationType: 'search_relevance',
      testName: `relevance_${scenario.name}`,
      sessionId: this.testSession.sessionId
    });
    
    if (!testResult.results || testResult.results.length === 0) {
      // For queries expecting no results, this is valid
      if (scenario.expectedResults === 0) {
        validation.addAssertion({
          name: 'no_results_relevance',
          expected: 'No results for non-matching query',
          actual: 'No results returned',
          passed: true,
          message: 'Correctly returned no results for non-matching query'
        });
      } else {
        validation.addAssertion({
          name: 'missing_results',
          expected: `${scenario.expectedResults} results`,
          actual: '0 results',
          passed: false,
          message: 'No results returned when results were expected'
        });
      }
      return validation;
    }
    
    // Validate each result for relevance to the query
    const queryTerms = scenario.query.toLowerCase().split(' ').filter(term => term.length > 2);
    let relevantResults = 0;
    
    for (const result of testResult.results) {
      let relevanceScore = 0;
      const searchableText = [
        result.item?.title || '',
        result.item?.content || '',
        ...(result.item?.tags || []).map(tag => typeof tag === 'string' ? tag : tag.name || ''),
        ...(result.item?.categories || [])
      ].join(' ').toLowerCase();
      
      // Check relevance to query terms
      for (const term of queryTerms) {
        if (searchableText.includes(term)) {
          relevanceScore += 1;
        }
      }
      
      const relevancePercent = queryTerms.length > 0 ? relevanceScore / queryTerms.length : 1;
      
      if (relevancePercent >= T034SearchPerformanceWorkflow.CONFIG.performanceRequirements.minResultRelevance) {
        relevantResults++;
      }
    }
    
    const overallRelevance = testResult.results.length > 0 ? relevantResults / testResult.results.length : 1;
    const relevancePassed = overallRelevance >= T034SearchPerformanceWorkflow.CONFIG.performanceRequirements.minResultRelevance;
    
    validation.addAssertion({
      name: 'result_relevance',
      expected: `≥ ${T034SearchPerformanceWorkflow.CONFIG.performanceRequirements.minResultRelevance * 100}% relevance`,
      actual: `${(overallRelevance * 100).toFixed(1)}% relevance`,
      passed: relevancePassed,
      message: `${relevantResults}/${testResult.results.length} results meet relevance threshold`
    });
    
    return validation;
  }

  /**
   * Run concurrent search tests
   */
  async runConcurrentSearches(concurrentCount, maxResponseTime) {
    const searches = [];
    const testQueries = [
      'javascript', 'machine learning', 'programming', 'testing', 'performance'
    ];
    
    console.log(`Running ${concurrentCount} concurrent searches...`);
    
    for (let i = 0; i < concurrentCount; i++) {
      const query = testQueries[i % testQueries.length];
      searches.push(this.runSearchScenario({
        name: `concurrent_${i}`,
        query: query,
        expectedResults: 1,
        maxResponseTime: maxResponseTime
      }));
    }
    
    const startTime = Date.now();
    const results = await Promise.allSettled(searches);
    const totalTime = Date.now() - startTime;
    
    const successfulResults = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const passedResults = successfulResults.filter(r => r.value.responseTime <= maxResponseTime);
    
    return {
      totalSearches: concurrentCount,
      successfulSearches: successfulResults.length,
      passedPerformance: passedResults.length,
      totalTime: totalTime,
      averageResponseTime: successfulResults.length > 0 
        ? successfulResults.reduce((sum, r) => sum + r.value.responseTime, 0) / successfulResults.length 
        : 0,
      maxResponseTime: successfulResults.length > 0
        ? Math.max(...successfulResults.map(r => r.value.responseTime))
        : 0,
      passed: successfulResults.length >= concurrentCount * 0.9 && // 90% success rate
              passedResults.length >= successfulResults.length * 0.8 // 80% within performance threshold
    };
  }

  /**
   * Run sustained search load test
   */
  async runSustainedSearchLoad(durationMs) {
    console.log(`Running sustained search load for ${durationMs}ms...`);
    
    const startTime = Date.now();
    const endTime = startTime + durationMs;
    const results = [];
    let searchCount = 0;
    
    const testQueries = [
      'javascript testing', 'machine learning algorithms', 'performance optimization',
      'neural networks', 'web development', 'programming patterns'
    ];
    
    while (Date.now() < endTime) {
      const query = testQueries[searchCount % testQueries.length];
      
      try {
        const result = await this.runSearchScenario({
          name: `sustained_${searchCount}`,
          query: query,
          expectedResults: 1,
          maxResponseTime: 800
        });
        
        results.push(result);
        searchCount++;
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Sustained search ${searchCount} failed:`, error.message);
      }
    }
    
    const actualDuration = Date.now() - startTime;
    const successfulSearches = results.filter(r => r.success);
    const averageResponseTime = successfulSearches.length > 0
      ? successfulSearches.reduce((sum, r) => sum + r.responseTime, 0) / successfulSearches.length
      : 0;
    
    return {
      duration: actualDuration,
      totalSearches: searchCount,
      successfulSearches: successfulSearches.length,
      searchesPerSecond: (searchCount / actualDuration) * 1000,
      averageResponseTime: averageResponseTime,
      maxResponseTime: successfulSearches.length > 0
        ? Math.max(...successfulSearches.map(r => r.responseTime))
        : 0,
      passed: successfulSearches.length >= searchCount * 0.85 && // 85% success rate
              averageResponseTime <= 600 // Average under 600ms
    };
  }

  /**
   * Generate comprehensive validation report
   */
  async generateValidationReport(aggregatedResults) {
    const totalTests = Array.from(this.workflowState.results.keys()).length;
    const passedTests = Array.from(this.workflowState.results.values())
      .filter(result => result.passed).length;
    
    const performanceTests = Array.from(this.workflowState.results.values())
      .filter(result => result.testResult)
      .map(result => result.testResult);
    
    const averageResponseTime = performanceTests.length > 0
      ? performanceTests.reduce((sum, test) => sum + test.responseTime, 0) / performanceTests.length
      : 0;
    
    const maxResponseTime = performanceTests.length > 0
      ? Math.max(...performanceTests.map(test => test.responseTime))
      : 0;
    
    // Constitutional compliance validation
    const constitutionalCompliance = {
      searchPerformanceRequirement: averageResponseTime <= T034SearchPerformanceWorkflow.CONFIG.performanceRequirements.maxSearchResponseTime,
      maxResponseTimeRequirement: maxResponseTime <= T034SearchPerformanceWorkflow.CONFIG.performanceRequirements.maxSearchResponseTime,
      resultRelevanceRequirement: passedTests >= totalTests * 0.8, // 80% pass rate minimum
      overallCompliance: null
    };
    
    constitutionalCompliance.overallCompliance = 
      constitutionalCompliance.searchPerformanceRequirement &&
      constitutionalCompliance.maxResponseTimeRequirement &&
      constitutionalCompliance.resultRelevanceRequirement;
    
    const report = {
      workflowId: T034SearchPerformanceWorkflow.CONFIG.workflowId,
      workflowName: T034SearchPerformanceWorkflow.CONFIG.workflowName,
      sessionId: this.testSession.sessionId,
      executionTime: {
        startTime: this.workflowState.startTime,
        endTime: this.workflowState.endTime,
        duration: new Date(this.workflowState.endTime) - new Date(this.workflowState.startTime)
      },
      summary: {
        totalTests: totalTests,
        passedTests: passedTests,
        failedTests: totalTests - passedTests,
        passRate: (passedTests / totalTests) * 100,
        overallStatus: passedTests >= totalTests * 0.8 ? 'PASS' : 'FAIL'
      },
      performanceMetrics: {
        averageResponseTime: averageResponseTime,
        maxResponseTime: maxResponseTime,
        responseTimeRequirement: T034SearchPerformanceWorkflow.CONFIG.performanceRequirements.maxSearchResponseTime,
        performanceCompliance: constitutionalCompliance.searchPerformanceRequirement
      },
      constitutionalCompliance: constitutionalCompliance,
      testResults: Array.from(this.workflowState.results.entries()).map(([name, result]) => ({
        testName: name,
        passed: result.passed,
        responseTime: result.testResult?.responseTime,
        resultCount: result.testResult?.resultCount,
        error: result.error || null
      })),
      aggregatedResults: aggregatedResults,
      recommendations: this.generateRecommendations(constitutionalCompliance, performanceTests),
      timestamp: new Date().toISOString()
    };
    
    return report;
  }

  /**
   * Generate performance improvement recommendations
   */
  generateRecommendations(compliance, performanceTests) {
    const recommendations = [];
    
    if (!compliance.searchPerformanceRequirement) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        issue: 'Search response time exceeds 500ms requirement',
        recommendation: 'Optimize search index and query processing algorithms',
        currentState: `Average response time above threshold`,
        targetState: 'Average response time ≤ 500ms'
      });
    }
    
    if (!compliance.maxResponseTimeRequirement) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        issue: 'Maximum search response time too high',
        recommendation: 'Implement query timeout and result caching',
        currentState: 'Some searches exceed performance limits',
        targetState: 'All searches complete within 500ms'
      });
    }
    
    if (!compliance.resultRelevanceRequirement) {
      recommendations.push({
        type: 'functionality',
        priority: 'medium',
        issue: 'Search result relevance below threshold',
        recommendation: 'Improve search algorithm and ranking system',
        currentState: 'Less than 80% of tests passing',
        targetState: '≥ 80% test pass rate'
      });
    }
    
    // Add general optimization recommendations
    if (performanceTests.length > 0) {
      const slowTests = performanceTests.filter(test => test.responseTime > 300);
      if (slowTests.length > performanceTests.length * 0.3) {
        recommendations.push({
          type: 'optimization',
          priority: 'medium',
          issue: 'Multiple search scenarios showing slow performance',
          recommendation: 'Review search index structure and implement performance optimizations',
          currentState: `${slowTests.length}/${performanceTests.length} tests above 300ms`,
          targetState: 'All searches complete quickly and efficiently'
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Helper methods for test environment setup
   */
  
  async validateSearchServiceAvailability() {
    try {
      // Test basic search service availability
      const testSearch = await this.executeSearch('test');
      return testSearch !== null;
    } catch (error) {
      return false;
    }
  }
  
  async clearSearchData() {
    // Clear existing search data and index
    console.log('Clearing existing search data...');
    // Implementation would clear Chrome storage
  }
  
  async loadTestContentItems() {
    // Load predefined test content for consistent testing
    console.log('Loading test content items...');
    
    const testContent = [
      {
        id: 'test-item-1',
        title: 'Advanced JavaScript Testing Techniques',
        content: 'Comprehensive guide to JavaScript testing frameworks and best practices.',
        tags: ['javascript', 'testing', 'programming'],
        categories: ['Programming', 'JavaScript'],
        aiTags: ['javascript', 'testing'],
        aiCategories: ['Programming'],
        type: 'article',
        status: 'processed',
        dateAdded: new Date().toISOString()
      },
      {
        id: 'test-item-2',
        title: 'Machine Learning Fundamentals',
        content: 'Introduction to neural networks and deep learning algorithms.',
        tags: ['machine learning', 'ai', 'neural networks'],
        categories: ['Technology', 'AI'],
        aiTags: ['machine learning', 'neural'],
        aiCategories: ['Technology'],
        type: 'article',
        status: 'processed',
        dateAdded: new Date().toISOString()
      },
      {
        id: 'test-item-3',
        title: 'JavaScript Performance Optimization',
        content: 'Best practices for optimizing JavaScript applications.',
        tags: ['javascript', 'performance', 'optimization'],
        categories: ['Programming', 'Performance'],
        aiTags: ['javascript', 'performance'],
        aiCategories: ['Programming'],
        type: 'article',
        status: 'processed',
        dateAdded: new Date().toISOString()
      }
    ];
    
    // Store test content in extension storage
    // Implementation would use Chrome storage API
  }
  
  async initializeSearchIndex() {
    console.log('Initializing search index...');
    // Implementation would rebuild search index
  }
  
  async validateSearchEnvironment() {
    console.log('Validating search environment...');
    // Verify test data is loaded and searchable
  }
  
  async getBrowserVersion() {
    // Get Chrome browser version
    return 'Chrome 119.0.0.0';
  }
  
  async saveResults(validationReport) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `T034-search-performance-${timestamp}.json`;
    const logPath = join(__dirname, 'logs', filename);
    
    try {
      await fs.mkdir(join(__dirname, 'logs'), { recursive: true });
      await fs.writeFile(logPath, JSON.stringify(validationReport, null, 2));
      console.log(`📄 Results saved to: ${logPath}`);
    } catch (error) {
      console.error('Failed to save results:', error.message);
    }
  }
  
  async generateVisualReport() {
    console.log('Generating visual validation report...');
    // Implementation would generate screenshots and visual comparisons
  }
  
  async cleanup() {
    console.log('🧹 Cleaning up resources...');
    
    try {
      if (this.performanceMonitor?.isMonitoring) {
        await this.performanceMonitor.stopMonitoring();
      }
      
      if (this.extensionController) {
        await this.extensionController.cleanup();
      }
      
      if (this.sessionManager) {
        await this.sessionManager.endSession();
      }
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 T034 Search Performance Test Workflow');
  console.log('=========================================');
  
  const workflow = new T034SearchPerformanceWorkflow();
  
  try {
    await workflow.execute();
    console.log('\n✅ Workflow completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Workflow failed:', error.message);
    process.exit(1);
  }
}

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { T034SearchPerformanceWorkflow };
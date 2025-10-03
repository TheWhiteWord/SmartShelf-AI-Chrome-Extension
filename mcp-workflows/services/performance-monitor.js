/**
 * Performance Monitor Service
 * 
 * Provides comprehensive performance monitoring for MCP automated testing
 * with metrics collection, analysis, and threshold validation with real-time tracking.
 */

import EventEmitter from 'events';
import { PerformanceMetric, Constants } from '../models/index.js';

export class PerformanceMonitor extends EventEmitter {
  /**
   * Performance monitor events
   */
  static EVENTS = {
    METRIC_COLLECTED: 'metric_collected',
    THRESHOLD_EXCEEDED: 'threshold_exceeded',
    PERFORMANCE_DEGRADATION: 'performance_degradation',
    MONITORING_STARTED: 'monitoring_started',
    MONITORING_STOPPED: 'monitoring_stopped',
    BASELINE_ESTABLISHED: 'baseline_established',
    REPORT_GENERATED: 'report_generated'
  };

  /**
   * Monitoring modes
   */
  static MONITORING_MODE = {
    CONTINUOUS: 'continuous',
    SESSION_BASED: 'session_based',
    ON_DEMAND: 'on_demand'
  };

  /**
   * Alert levels for performance issues
   */
  static ALERT_LEVEL = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical'
  };

  /**
   * Creates a new Performance Monitor instance
   * @param {Object} config - Monitor configuration
   * @param {string} config.mode - Monitoring mode (continuous, session_based, on_demand)
   * @param {number} config.collectionInterval - Collection interval in ms (default: 1000)
   * @param {Object} config.thresholds - Default thresholds for different metric types
   */
  constructor(config = {}) {
    super();
    
    this.config = {
      mode: config.mode || PerformanceMonitor.MONITORING_MODE.SESSION_BASED,
      collectionInterval: config.collectionInterval || 1000,
      maxMetricsHistory: config.maxMetricsHistory || 1000,
      enableRealTimeAlerts: config.enableRealTimeAlerts !== false,
      alertThresholdPercent: config.alertThresholdPercent || 20,
      baselineWindow: config.baselineWindow || 10, // number of measurements for baseline
      ...config
    };
    
    // Default performance thresholds (constitutional requirements)
    this.thresholds = {
      [PerformanceMetric.TYPES.AI_PROCESSING_TIME]: 5000,    // 5 seconds max
      [PerformanceMetric.TYPES.SEARCH_RESPONSE_TIME]: 500,    // 500ms max
      [PerformanceMetric.TYPES.EXTENSION_LOAD_TIME]: 3000,    // 3 seconds max
      [PerformanceMetric.TYPES.MEMORY_USAGE]: 100,            // 100MB max
      [PerformanceMetric.TYPES.CPU_USAGE]: 80,                // 80% max
      [PerformanceMetric.TYPES.UI_RENDER_TIME]: 100,          // 100ms max
      ...config.thresholds
    };
    
    // Monitoring state
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.activeMetrics = new Map();
    this.metricsHistory = [];
    this.baselines = new Map();
    this.activeAlerts = new Map();
    
    // Statistics and reporting
    this.statistics = {
      totalMetricsCollected: 0,
      thresholdViolations: 0,
      performanceDegradations: 0,
      averageCollectionTime: 0,
      monitoringStartTime: null,
      monitoringDuration: 0
    };
    
    // Metric collectors
    this.collectors = new Map();
    this._initializeDefaultCollectors();
  }

  /**
   * Starts performance monitoring
   * @param {string} sessionId - Session ID to monitor (optional)
   * @returns {Promise<void>} Start promise
   */
  async startMonitoring(sessionId = null) {
    if (this.isMonitoring) {
      throw new Error('Performance monitoring is already active');
    }
    
    this.isMonitoring = true;
    this.statistics.monitoringStartTime = new Date().toISOString();
    
    // Start continuous monitoring if configured
    if (this.config.mode === PerformanceMonitor.MONITORING_MODE.CONTINUOUS) {
      this.monitoringInterval = setInterval(
        () => this._collectAllMetrics(sessionId),
        this.config.collectionInterval
      );
    }
    
    this.emit(PerformanceMonitor.EVENTS.MONITORING_STARTED, {
      sessionId: sessionId,
      mode: this.config.mode,
      interval: this.config.collectionInterval
    });
  }

  /**
   * Stops performance monitoring
   * @returns {Promise<Object>} Stop result with final statistics
   */
  async stopMonitoring() {
    if (!this.isMonitoring) {
      return { status: 'not_monitoring' };
    }
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.statistics.monitoringDuration = this.statistics.monitoringStartTime 
      ? Date.now() - new Date(this.statistics.monitoringStartTime).getTime()
      : 0;
    
    const result = {
      status: 'stopped',
      statistics: { ...this.statistics },
      totalMetrics: this.metricsHistory.length,
      activeAlerts: this.activeAlerts.size
    };
    
    this.emit(PerformanceMonitor.EVENTS.MONITORING_STOPPED, result);
    
    return result;
  }

  /**
   * Collects a specific performance metric
   * @param {string} metricType - Type of metric to collect
   * @param {Object} context - Collection context
   * @returns {Promise<PerformanceMetric>} Collected metric
   */
  async collectMetric(metricType, context = {}) {
    if (!Object.values(PerformanceMetric.TYPES).includes(metricType)) {
      throw new Error(`Invalid metric type: ${metricType}`);
    }
    
    const startTime = Date.now();
    
    try {
      // Get collector for this metric type
      const collector = this.collectors.get(metricType);
      if (!collector) {
        throw new Error(`No collector registered for metric type: ${metricType}`);
      }
      
      // Collect the metric value
      const value = await collector.collect(context);
      
      // Create performance metric
      const metric = new PerformanceMetric({
        metricType: metricType,
        metricName: collector.name,
        value: value,
        unit: collector.unit,
        threshold: this.thresholds[metricType],
        context: JSON.stringify(context),
        browserState: context.browserState || PerformanceMetric.BROWSER_STATE.IDLE,
        sessionId: context.sessionId
      });
      
      // Store metric
      this.activeMetrics.set(metricType, metric);
      this.metricsHistory.push(metric);
      this.statistics.totalMetricsCollected++;
      
      // Trim history if needed
      if (this.metricsHistory.length > this.config.maxMetricsHistory) {
        this.metricsHistory.shift();
      }
      
      // Update collection time statistics
      const collectionTime = Date.now() - startTime;
      this._updateCollectionStatistics(collectionTime);
      
      // Check thresholds and alerts
      await this._checkThresholds(metric);
      await this._checkPerformanceDegradation(metric);
      
      // Update baseline if needed
      this._updateBaseline(metric);
      
      this.emit(PerformanceMonitor.EVENTS.METRIC_COLLECTED, metric);
      
      return metric;
      
    } catch (error) {
      throw new Error(`Failed to collect metric ${metricType}: ${error.message}`);
    }
  }

  /**
   * Collects multiple metrics in parallel
   * @param {Array<string>} metricTypes - Metric types to collect
   * @param {Object} context - Collection context
   * @returns {Promise<Array<PerformanceMetric>>} Collected metrics
   */
  async collectMetrics(metricTypes, context = {}) {
    const collectionPromises = metricTypes.map(type => 
      this.collectMetric(type, context)
    );
    
    return Promise.all(collectionPromises);
  }

  /**
   * Sets a custom threshold for a metric type
   * @param {string} metricType - Metric type
   * @param {number} threshold - Threshold value
   * @param {string} unit - Threshold unit (optional)
   */
  setThreshold(metricType, threshold, unit = null) {
    if (!Object.values(PerformanceMetric.TYPES).includes(metricType)) {
      throw new Error(`Invalid metric type: ${metricType}`);
    }
    
    this.thresholds[metricType] = threshold;
    
    // Update existing metrics with new threshold
    for (const metric of this.metricsHistory) {
      if (metric.metricType === metricType) {
        metric.setThreshold(threshold);
      }
    }
  }

  /**
   * Establishes a performance baseline from recent measurements
   * @param {string} metricType - Metric type to baseline
   * @param {number} windowSize - Number of recent measurements to use
   * @returns {Object} Baseline information
   */
  establishBaseline(metricType, windowSize = null) {
    const window = windowSize || this.config.baselineWindow;
    
    // Get recent measurements for this metric type
    const recentMetrics = this.metricsHistory
      .filter(m => m.metricType === metricType)
      .slice(-window);
    
    if (recentMetrics.length < 3) {
      throw new Error(`Insufficient data to establish baseline (need at least 3 measurements, have ${recentMetrics.length})`);
    }
    
    const values = recentMetrics.map(m => m.value);
    const baseline = {
      metricType: metricType,
      average: values.reduce((sum, v) => sum + v, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      median: this._calculateMedian(values),
      standardDeviation: this._calculateStandardDeviation(values),
      sampleSize: values.length,
      establishedAt: new Date().toISOString()
    };
    
    this.baselines.set(metricType, baseline);
    
    this.emit(PerformanceMonitor.EVENTS.BASELINE_ESTABLISHED, baseline);
    
    return baseline;
  }

  /**
   * Generates a comprehensive performance report
   * @param {Object} options - Report options
   * @returns {Object} Performance report
   */
  generateReport(options = {}) {
    const reportPeriod = options.period || 'all';
    const includeBaselines = options.includeBaselines !== false;
    const includeAlerts = options.includeAlerts !== false;
    
    // Filter metrics based on report period
    let metricsToAnalyze = this.metricsHistory;
    
    if (reportPeriod !== 'all') {
      const cutoffTime = this._getPeriodCutoffTime(reportPeriod);
      metricsToAnalyze = this.metricsHistory.filter(
        m => new Date(m.timestamp) >= cutoffTime
      );
    }
    
    // Group metrics by type
    const metricsByType = this._groupMetricsByType(metricsToAnalyze);
    
    // Generate analysis for each metric type
    const analysis = {};
    for (const [metricType, metrics] of metricsByType) {
      analysis[metricType] = this._analyzeMetrics(metrics, metricType);
    }
    
    const report = {
      reportId: `perf_report_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      reportPeriod: reportPeriod,
      totalMetrics: metricsToAnalyze.length,
      statistics: { ...this.statistics },
      analysis: analysis,
      summary: this._generateSummary(analysis),
      recommendations: this._generateRecommendations(analysis)
    };
    
    // Include baselines if requested
    if (includeBaselines) {
      report.baselines = Object.fromEntries(this.baselines);
    }
    
    // Include active alerts if requested
    if (includeAlerts) {
      report.activeAlerts = Array.from(this.activeAlerts.values());
    }
    
    this.emit(PerformanceMonitor.EVENTS.REPORT_GENERATED, report);
    
    return report;
  }

  /**
   * Gets current performance metrics
   * @returns {Object} Current metrics snapshot
   */
  getCurrentMetrics() {
    return {
      timestamp: new Date().toISOString(),
      isMonitoring: this.isMonitoring,
      activeMetrics: Object.fromEntries(this.activeMetrics),
      recentMetrics: this.metricsHistory.slice(-10), // Last 10 metrics
      statistics: { ...this.statistics },
      activeAlerts: Array.from(this.activeAlerts.values()),
      thresholds: { ...this.thresholds }
    };
  }

  /**
   * Registers a custom metric collector
   * @param {string} metricType - Metric type
   * @param {Object} collector - Collector implementation
   */
  registerCollector(metricType, collector) {
    if (!collector.collect || typeof collector.collect !== 'function') {
      throw new Error('Collector must have a collect() method');
    }
    
    this.collectors.set(metricType, {
      name: collector.name || metricType,
      unit: collector.unit || 'ms',
      collect: collector.collect.bind(collector)
    });
  }

  /**
   * Initializes default metric collectors
   * @private
   */
  _initializeDefaultCollectors() {
    // AI Processing Time Collector
    this.registerCollector(PerformanceMetric.TYPES.AI_PROCESSING_TIME, {
      name: 'AI Processing Time',
      unit: 'ms',
      collect: async (context) => {
        // This would measure actual AI processing time
        // For now, simulate based on context
        const baseTime = 2000;
        const variation = Math.random() * 2000;
        return baseTime + variation;
      }
    });
    
    // Search Response Time Collector
    this.registerCollector(PerformanceMetric.TYPES.SEARCH_RESPONSE_TIME, {
      name: 'Search Response Time',
      unit: 'ms',
      collect: async (context) => {
        // Simulate search response time
        const baseTime = 150;
        const variation = Math.random() * 200;
        return baseTime + variation;
      }
    });
    
    // Extension Load Time Collector
    this.registerCollector(PerformanceMetric.TYPES.EXTENSION_LOAD_TIME, {
      name: 'Extension Load Time',
      unit: 'ms',
      collect: async (context) => {
        // Simulate extension load time
        const baseTime = 1000;
        const variation = Math.random() * 1500;
        return baseTime + variation;
      }
    });
    
    // Memory Usage Collector
    this.registerCollector(PerformanceMetric.TYPES.MEMORY_USAGE, {
      name: 'Memory Usage',
      unit: 'MB',
      collect: async (context) => {
        // This would use Chrome DevTools to get actual memory usage
        const baseMemory = 25;
        const variation = Math.random() * 30;
        return baseMemory + variation;
      }
    });
    
    // CPU Usage Collector
    this.registerCollector(PerformanceMetric.TYPES.CPU_USAGE, {
      name: 'CPU Usage',
      unit: '%',
      collect: async (context) => {
        // This would use Chrome DevTools to get actual CPU usage
        const baseCPU = 10;
        const variation = Math.random() * 40;
        return baseCPU + variation;
      }
    });
  }

  /**
   * Collects all registered metrics
   * @param {string} sessionId - Session ID for context
   * @private
   */
  async _collectAllMetrics(sessionId) {
    try {
      const context = { sessionId: sessionId, automated: true };
      const metricTypes = Array.from(this.collectors.keys());
      await this.collectMetrics(metricTypes, context);
    } catch (error) {
      // Log error but don't break monitoring
      console.error('Error collecting metrics:', error.message);
    }
  }

  /**
   * Checks if metric exceeds thresholds
   * @param {PerformanceMetric} metric - Metric to check
   * @private
   */
  async _checkThresholds(metric) {
    if (!metric.passed && metric.threshold !== null) {
      this.statistics.thresholdViolations++;
      
      const alert = {
        id: `threshold_${Date.now()}`,
        type: 'threshold_exceeded',
        metricType: metric.metricType,
        metricName: metric.metricName,
        value: metric.value,
        threshold: metric.threshold,
        unit: metric.unit,
        severity: this._calculateAlertSeverity(metric),
        timestamp: new Date().toISOString(),
        sessionId: metric.sessionId
      };
      
      this.activeAlerts.set(alert.id, alert);
      
      this.emit(PerformanceMonitor.EVENTS.THRESHOLD_EXCEEDED, alert);
    }
  }

  /**
   * Checks for performance degradation compared to baseline
   * @param {PerformanceMetric} metric - Metric to check
   * @private
   */
  async _checkPerformanceDegradation(metric) {
    const baseline = this.baselines.get(metric.metricType);
    
    if (!baseline) return;
    
    const degradationPercent = ((metric.value - baseline.average) / baseline.average) * 100;
    
    if (degradationPercent > this.config.alertThresholdPercent) {
      this.statistics.performanceDegradations++;
      
      const alert = {
        id: `degradation_${Date.now()}`,
        type: 'performance_degradation',
        metricType: metric.metricType,
        metricName: metric.metricName,
        currentValue: metric.value,
        baselineValue: baseline.average,
        degradationPercent: degradationPercent,
        severity: degradationPercent > 50 ? PerformanceMonitor.ALERT_LEVEL.CRITICAL : 
                 degradationPercent > 30 ? PerformanceMonitor.ALERT_LEVEL.WARNING : 
                 PerformanceMonitor.ALERT_LEVEL.INFO,
        timestamp: new Date().toISOString(),
        sessionId: metric.sessionId
      };
      
      this.activeAlerts.set(alert.id, alert);
      
      this.emit(PerformanceMonitor.EVENTS.PERFORMANCE_DEGRADATION, alert);
    }
  }

  /**
   * Updates baseline with new measurement
   * @param {PerformanceMetric} metric - New metric measurement
   * @private
   */
  _updateBaseline(metric) {
    const baseline = this.baselines.get(metric.metricType);
    
    if (!baseline) return;
    
    // Add new measurement to rolling window
    // This is a simplified approach - a full implementation would maintain
    // a proper rolling window of measurements
  }

  /**
   * Calculates alert severity based on metric
   * @param {PerformanceMetric} metric - Metric to evaluate
   * @returns {string} Alert severity level
   * @private
   */
  _calculateAlertSeverity(metric) {
    if (!metric.threshold) return PerformanceMonitor.ALERT_LEVEL.INFO;
    
    const exceedancePercent = ((metric.value - metric.threshold) / metric.threshold) * 100;
    
    if (exceedancePercent > 100) return PerformanceMonitor.ALERT_LEVEL.CRITICAL;
    if (exceedancePercent > 50) return PerformanceMonitor.ALERT_LEVEL.WARNING;
    return PerformanceMonitor.ALERT_LEVEL.INFO;
  }

  /**
   * Groups metrics by type for analysis
   * @param {Array<PerformanceMetric>} metrics - Metrics to group
   * @returns {Map} Grouped metrics
   * @private
   */
  _groupMetricsByType(metrics) {
    const groups = new Map();
    
    for (const metric of metrics) {
      if (!groups.has(metric.metricType)) {
        groups.set(metric.metricType, []);
      }
      groups.get(metric.metricType).push(metric);
    }
    
    return groups;
  }

  /**
   * Analyzes metrics for a specific type
   * @param {Array<PerformanceMetric>} metrics - Metrics to analyze
   * @param {string} metricType - Metric type
   * @returns {Object} Analysis results
   * @private
   */
  _analyzeMetrics(metrics, metricType) {
    if (metrics.length === 0) {
      return { metricType: metricType, noData: true };
    }
    
    const values = metrics.map(m => m.value);
    const passedCount = metrics.filter(m => m.passed).length;
    
    return {
      metricType: metricType,
      sampleSize: metrics.length,
      average: values.reduce((sum, v) => sum + v, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      median: this._calculateMedian(values),
      standardDeviation: this._calculateStandardDeviation(values),
      passRate: (passedCount / metrics.length) * 100,
      failCount: metrics.length - passedCount,
      threshold: this.thresholds[metricType] || null,
      trend: this._calculateTrend(values),
      unit: metrics[0]?.unit || 'unknown'
    };
  }

  /**
   * Generates performance summary
   * @param {Object} analysis - Analysis results
   * @returns {Object} Performance summary
   * @private
   */
  _generateSummary(analysis) {
    const metricTypes = Object.keys(analysis);
    const overallPassRate = this._calculateOverallPassRate(analysis);
    
    return {
      totalMetricTypes: metricTypes.length,
      overallPassRate: overallPassRate,
      status: overallPassRate > 80 ? 'good' : overallPassRate > 60 ? 'warning' : 'critical',
      keyFindings: this._identifyKeyFindings(analysis),
      worstPerformers: this._identifyWorstPerformers(analysis),
      bestPerformers: this._identifyBestPerformers(analysis)
    };
  }

  /**
   * Generates performance recommendations
   * @param {Object} analysis - Analysis results
   * @returns {Array<Object>} Recommendations
   * @private
   */
  _generateRecommendations(analysis) {
    const recommendations = [];
    
    for (const [metricType, data] of Object.entries(analysis)) {
      if (data.passRate < 80) {
        recommendations.push({
          metricType: metricType,
          priority: data.passRate < 50 ? 'high' : 'medium',
          issue: `Poor performance in ${metricType}`,
          recommendation: `Optimize ${metricType} to improve pass rate from ${data.passRate.toFixed(1)}%`,
          currentAverage: data.average,
          threshold: data.threshold
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Calculates median value
   * @param {Array<number>} values - Values to analyze
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
   * @param {Array<number>} values - Values to analyze
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
   * Calculates performance trend
   * @param {Array<number>} values - Values in chronological order
   * @returns {string} Trend direction
   * @private
   */
  _calculateTrend(values) {
    if (values.length < 2) return 'insufficient_data';
    
    const first = values.slice(0, Math.floor(values.length / 3));
    const last = values.slice(-Math.floor(values.length / 3));
    
    const firstAvg = first.reduce((sum, v) => sum + v, 0) / first.length;
    const lastAvg = last.reduce((sum, v) => sum + v, 0) / last.length;
    
    const changePercent = ((lastAvg - firstAvg) / firstAvg) * 100;
    
    if (changePercent > 5) return 'degrading';
    if (changePercent < -5) return 'improving';
    return 'stable';
  }

  /**
   * Calculates overall pass rate across all metrics
   * @param {Object} analysis - Analysis results
   * @returns {number} Overall pass rate percentage
   * @private
   */
  _calculateOverallPassRate(analysis) {
    const analyses = Object.values(analysis);
    const totalSamples = analyses.reduce((sum, a) => sum + (a.sampleSize || 0), 0);
    const totalPassed = analyses.reduce((sum, a) => sum + ((a.sampleSize || 0) * (a.passRate || 0) / 100), 0);
    
    return totalSamples > 0 ? (totalPassed / totalSamples) * 100 : 0;
  }

  /**
   * Identifies key performance findings
   * @param {Object} analysis - Analysis results
   * @returns {Array<string>} Key findings
   * @private
   */
  _identifyKeyFindings(analysis) {
    const findings = [];
    
    for (const [metricType, data] of Object.entries(analysis)) {
      if (data.passRate < 50) {
        findings.push(`Critical performance issue in ${metricType} (${data.passRate.toFixed(1)}% pass rate)`);
      } else if (data.trend === 'degrading') {
        findings.push(`Performance degradation trend detected in ${metricType}`);
      } else if (data.passRate > 95) {
        findings.push(`Excellent performance in ${metricType} (${data.passRate.toFixed(1)}% pass rate)`);
      }
    }
    
    return findings;
  }

  /**
   * Identifies worst performing metrics
   * @param {Object} analysis - Analysis results
   * @returns {Array<Object>} Worst performers
   * @private
   */
  _identifyWorstPerformers(analysis) {
    return Object.entries(analysis)
      .filter(([_, data]) => !data.noData)
      .sort(([_, a], [__, b]) => a.passRate - b.passRate)
      .slice(0, 3)
      .map(([metricType, data]) => ({
        metricType: metricType,
        passRate: data.passRate,
        average: data.average,
        threshold: data.threshold
      }));
  }

  /**
   * Identifies best performing metrics
   * @param {Object} analysis - Analysis results
   * @returns {Array<Object>} Best performers
   * @private
   */
  _identifyBestPerformers(analysis) {
    return Object.entries(analysis)
      .filter(([_, data]) => !data.noData)
      .sort(([_, a], [__, b]) => b.passRate - a.passRate)
      .slice(0, 3)
      .map(([metricType, data]) => ({
        metricType: metricType,
        passRate: data.passRate,
        average: data.average,
        threshold: data.threshold
      }));
  }

  /**
   * Gets cutoff time for report period
   * @param {string} period - Report period
   * @returns {Date} Cutoff time
   * @private
   */
  _getPeriodCutoffTime(period) {
    const now = new Date();
    switch (period) {
      case 'hour': return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default: return new Date(0);
    }
  }

  /**
   * Updates collection statistics
   * @param {number} collectionTime - Collection time in ms
   * @private
   */
  _updateCollectionStatistics(collectionTime) {
    const totalTime = this.statistics.averageCollectionTime * (this.statistics.totalMetricsCollected - 1) + collectionTime;
    this.statistics.averageCollectionTime = totalTime / this.statistics.totalMetricsCollected;
  }
}

export default PerformanceMonitor;
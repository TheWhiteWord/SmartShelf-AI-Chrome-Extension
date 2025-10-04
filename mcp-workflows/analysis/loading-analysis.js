#!/usr/bin/env node

/**
 * T037: Extension Loading Performance Analysis & Optimization Opportunities
 * 
 * Analyzes extension loading performance from T036 profiling data and identifies
 * concrete optimization opportunities based on constitutional requirements.
 * 
 * Constitutional Requirements Analysis:
 * - Extension Loading: <2s startup time (current: ~502ms avg, 1057ms service worker)
 * - Memory Efficiency: <100MB peak usage (current: ~4.8MB peak)
 * - Component Loading: <1s per component (current: popup 163ms, sidepanel 631ms, options 158ms)
 * - Service Worker: <2s initialization (current: 1057ms)
 * 
 * Focus Areas:
 * 1. Service Worker optimization (main bottleneck at 1057ms)
 * 2. Sidepanel loading optimization (631ms vs 163ms popup)
 * 3. AI service initialization timing
 * 4. Import script optimization
 * 5. Memory usage efficiency
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
    name: 'T037-Extension-Loading-Analysis',
    description: 'Performance analysis and optimization opportunities for extension loading',
    
    // Data sources
    performanceDataFile: path.resolve(__dirname, '../logs/T036-performance-profiling.json'),
    extensionPath: path.resolve(__dirname, '../../extension'),
    manifestPath: path.resolve(__dirname, '../../extension/manifest.json'),
    serviceWorkerPath: path.resolve(__dirname, '../../extension/background/service-worker.js'),
    
    // Output files
    outputFile: path.resolve(__dirname, '../logs/T037-loading-analysis.json'),
    reportFile: path.resolve(__dirname, '../reports/T037-optimization-report.md'),
    
    // Analysis thresholds (based on constitutional requirements)
    thresholds: {
        EXTENSION_LOAD_TARGET: 2000,      // <2s total loading time
        SERVICE_WORKER_TARGET: 1500,      // <1.5s service worker initialization  
        COMPONENT_LOAD_TARGET: 800,       // <800ms per UI component
        MEMORY_EFFICIENCY_TARGET: 50,     // <50MB for optimal efficiency
        IMPORT_SCRIPT_TARGET: 300,        // <300ms for script imports
        AI_INIT_TARGET: 1000,            // <1s for AI service initialization
        
        // Critical performance indicators
        CRITICAL_THRESHOLD: 1500,         // >1.5s is critical
        WARNING_THRESHOLD: 1000,          // >1s is warning
        GOOD_THRESHOLD: 500               // <500ms is good
    },
    
    // Extension component analysis
    components: {
        serviceWorker: {
            file: 'background/service-worker.js',
            description: 'Background service worker with AI processing',
            expectedLoadTime: 1000,
            currentPerformance: null
        },
        popup: {
            file: 'popup/popup.html',
            description: 'Extension popup interface',
            expectedLoadTime: 500,
            currentPerformance: null
        },
        sidepanel: {
            file: 'sidepanel/sidepanel.html', 
            description: 'Side panel search and content management',
            expectedLoadTime: 600,
            currentPerformance: null
        },
        options: {
            file: 'options/options.html',
            description: 'Settings and configuration page',
            expectedLoadTime: 400,
            currentPerformance: null
        },
        contentScript: {
            file: 'content/content-script.js',
            description: 'Content extraction script',
            expectedLoadTime: 300,
            currentPerformance: null
        }
    }
};

class ExtensionLoadingAnalyzer {
    constructor() {
        this.analysisResults = {
            sessionId: `t037-${Date.now()}`,
            startTime: new Date().toISOString(),
            performanceData: null,
            componentAnalysis: {},
            bottleneckIdentification: {},
            optimizationOpportunities: [],
            constitutionalCompliance: {},
            recommendations: [],
            success: false,
            errors: []
        };
        
        this.setupDirectories();
    }

    setupDirectories() {
        [path.dirname(CONFIG.outputFile), path.dirname(CONFIG.reportFile)].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async runLoadingAnalysis() {
        console.log('🔍 T037: Extension Loading Performance Analysis Started');
        console.log(`📊 Analyzing performance data and identifying optimization opportunities`);
        console.log(`🎯 Constitutional Requirements:`);
        console.log(`   - Extension Loading: <${CONFIG.thresholds.EXTENSION_LOAD_TARGET}ms`);
        console.log(`   - Service Worker: <${CONFIG.thresholds.SERVICE_WORKER_TARGET}ms`);
        console.log(`   - Component Loading: <${CONFIG.thresholds.COMPONENT_LOAD_TARGET}ms`);
        console.log('');

        try {
            // Load performance data from T036
            console.log('📥 Loading T036 performance profiling data...');
            await this.loadPerformanceData();

            // Analyze component loading performance
            console.log('🔧 Analyzing component loading performance...');
            await this.analyzeComponentPerformance();

            // Identify performance bottlenecks
            console.log('🚫 Identifying performance bottlenecks...');
            await this.identifyBottlenecks();

            // Analyze extension manifest and structure
            console.log('📋 Analyzing extension manifest and structure...');
            await this.analyzeExtensionStructure();

            // Analyze service worker performance
            console.log('⚙️ Analyzing service worker performance...');
            await this.analyzeServiceWorkerPerformance();

            // Generate optimization opportunities
            console.log('💡 Generating optimization opportunities...');
            await this.generateOptimizationOpportunities();

            // Validate constitutional compliance
            console.log('🏛️ Validating constitutional compliance...');
            await this.validateConstitutionalCompliance();

            // Generate recommendations
            console.log('📝 Generating performance recommendations...');
            await this.generateRecommendations();

            // Generate comprehensive report
            this.analysisResults.success = true;
            this.analysisResults.endTime = new Date().toISOString();
            
            await this.generateReport();
            
            console.log('✅ T037: Extension loading analysis completed successfully');
            console.log(`📊 ${this.analysisResults.optimizationOpportunities.length} optimization opportunities identified`);
            console.log(`🎯 ${this.analysisResults.recommendations.length} actionable recommendations generated`);
            return this.analysisResults;

        } catch (error) {
            this.analysisResults.errors.push(error.message);
            this.analysisResults.success = false;
            this.analysisResults.endTime = new Date().toISOString();
            
            console.error('❌ T037: Loading analysis failed:', error.message);
            await this.generateReport();
            throw error;
        }
    }

    async loadPerformanceData() {
        if (!fs.existsSync(CONFIG.performanceDataFile)) {
            throw new Error(`Performance data file not found: ${CONFIG.performanceDataFile}`);
        }

        const rawData = fs.readFileSync(CONFIG.performanceDataFile, 'utf8');
        this.analysisResults.performanceData = JSON.parse(rawData);
        
        console.log(`   📄 Loaded performance data from: ${CONFIG.performanceDataFile}`);
        console.log(`   ⏱️ Test session: ${this.analysisResults.performanceData.sessionId}`);
        console.log(`   📊 Total tests: ${this.analysisResults.performanceData.summary?.totalTests || 'N/A'}`);
        
        // Extract component performance data
        const extensionPerformance = this.analysisResults.performanceData.testResults?.find(
            r => r.category === 'extension_performance'
        );
        
        if (extensionPerformance) {
            extensionPerformance.tests.forEach(test => {
                const componentKey = this.mapTestNameToComponent(test.name);
                if (componentKey && CONFIG.components[componentKey]) {
                    CONFIG.components[componentKey].currentPerformance = {
                        duration: test.duration,
                        passed: test.passed,
                        success: test.success,
                        maxTime: test.maxTime
                    };
                }
            });
            
            console.log(`   🔧 Extension performance tests: ${extensionPerformance.tests.length}`);
            console.log(`   📈 Average performance: ${extensionPerformance.averageDuration}ms`);
            console.log(`   ✅ Pass rate: ${(extensionPerformance.passRate * 100).toFixed(1)}%`);
        }
    }

    mapTestNameToComponent(testName) {
        const mapping = {
            'service_worker_startup': 'serviceWorker',
            'popup_load_time': 'popup',
            'sidepanel_load_time': 'sidepanel',
            'options_load_time': 'options'
        };
        return mapping[testName] || null;
    }

    async analyzeComponentPerformance() {
        console.log('   🔍 Analyzing individual component performance...');
        
        for (const [componentKey, component] of Object.entries(CONFIG.components)) {
            const analysis = {
                name: componentKey,
                file: component.file,
                description: component.description,
                expectedLoadTime: component.expectedLoadTime,
                currentPerformance: component.currentPerformance,
                status: 'unknown',
                performanceGrade: 'N/A',
                optimizationPotential: 'N/A',
                fileSize: 0,
                complexity: 'unknown'
            };

            // Get file information
            const filePath = path.join(CONFIG.extensionPath, component.file);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                analysis.fileSize = stats.size;
                
                // Analyze file complexity (basic heuristic)
                if (component.file.endsWith('.js')) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    analysis.complexity = this.analyzeCodeComplexity(content);
                }
            }

            // Determine performance status
            if (component.currentPerformance) {
                const { duration } = component.currentPerformance;
                
                if (duration <= CONFIG.thresholds.GOOD_THRESHOLD) {
                    analysis.status = 'excellent';
                    analysis.performanceGrade = 'A';
                    analysis.optimizationPotential = 'low';
                } else if (duration <= CONFIG.thresholds.WARNING_THRESHOLD) {
                    analysis.status = 'good';
                    analysis.performanceGrade = 'B';
                    analysis.optimizationPotential = 'medium';
                } else if (duration <= CONFIG.thresholds.CRITICAL_THRESHOLD) {
                    analysis.status = 'warning';
                    analysis.performanceGrade = 'C';
                    analysis.optimizationPotential = 'high';
                } else {
                    analysis.status = 'critical';
                    analysis.performanceGrade = 'D';
                    analysis.optimizationPotential = 'critical';
                }

                console.log(`      ${this.getStatusIcon(analysis.status)} ${componentKey}: ${duration}ms (${analysis.performanceGrade}) - ${analysis.optimizationPotential} optimization potential`);
            } else {
                console.log(`      ⚪ ${componentKey}: No performance data available`);
            }

            this.analysisResults.componentAnalysis[componentKey] = analysis;
        }
    }

    analyzeCodeComplexity(content) {
        const lines = content.split('\n').length;
        const functions = (content.match(/function\s+\w+|const\s+\w+\s*=.*=>|async\s+function/g) || []).length;
        const imports = (content.match(/import|importScripts/g) || []).length;
        const asyncCalls = (content.match(/await|\.then\(|Promise\./g) || []).length;
        
        const complexityScore = lines * 0.1 + functions * 2 + imports * 1.5 + asyncCalls * 1.2;
        
        if (complexityScore < 50) return 'low';
        if (complexityScore < 150) return 'medium';
        if (complexityScore < 300) return 'high';
        return 'very_high';
    }

    async identifyBottlenecks() {
        console.log('   🔍 Identifying performance bottlenecks...');
        
        const bottlenecks = {
            critical: [],
            major: [],
            minor: [],
            serviceWorkerAnalysis: {},
            loadingSequenceAnalysis: {}
        };

        // Analyze each component for bottlenecks
        for (const [componentKey, analysis] of Object.entries(this.analysisResults.componentAnalysis)) {
            if (!analysis.currentPerformance) continue;
            
            const { duration } = analysis.currentPerformance;
            const expected = analysis.expectedLoadTime;
            const overhead = duration - expected;
            const overheadPercent = ((duration / expected) - 1) * 100;

            if (duration > CONFIG.thresholds.CRITICAL_THRESHOLD) {
                bottlenecks.critical.push({
                    component: componentKey,
                    issue: 'Critical loading time',
                    current: duration,
                    expected: expected,
                    overhead: overhead,
                    overheadPercent: overheadPercent.toFixed(1),
                    impact: 'high',
                    priority: 'immediate'
                });
            } else if (duration > CONFIG.thresholds.WARNING_THRESHOLD) {
                bottlenecks.major.push({
                    component: componentKey,
                    issue: 'Slow loading time',
                    current: duration,
                    expected: expected,
                    overhead: overhead,
                    overheadPercent: overheadPercent.toFixed(1),
                    impact: 'medium',
                    priority: 'high'
                });
            } else if (overhead > 100) {
                bottlenecks.minor.push({
                    component: componentKey,
                    issue: 'Performance overhead',
                    current: duration,
                    expected: expected,
                    overhead: overhead,
                    overheadPercent: overheadPercent.toFixed(1),
                    impact: 'low',
                    priority: 'medium'
                });
            }
        }

        // Analyze service worker specifically (main bottleneck identified)
        const serviceWorkerAnalysis = this.analysisResults.componentAnalysis.serviceWorker;
        if (serviceWorkerAnalysis?.currentPerformance) {
            const swDuration = serviceWorkerAnalysis.currentPerformance.duration;
            
            bottlenecks.serviceWorkerAnalysis = {
                currentTime: swDuration,
                targetTime: CONFIG.thresholds.SERVICE_WORKER_TARGET,
                isBottleneck: swDuration > CONFIG.thresholds.SERVICE_WORKER_TARGET,
                optimizationPotential: Math.max(0, swDuration - CONFIG.thresholds.SERVICE_WORKER_TARGET),
                mainCauses: this.identifyServiceWorkerBottlenecks(swDuration),
                recommendations: this.generateServiceWorkerOptimizations(swDuration)
            };
        }

        // Analyze loading sequence
        bottlenecks.loadingSequenceAnalysis = this.analyzeLoadingSequence();

        this.analysisResults.bottleneckIdentification = bottlenecks;

        console.log(`      🚨 Critical bottlenecks: ${bottlenecks.critical.length}`);
        console.log(`      ⚠️ Major bottlenecks: ${bottlenecks.major.length}`);
        console.log(`      ℹ️ Minor bottlenecks: ${bottlenecks.minor.length}`);

        // Log critical bottlenecks
        bottlenecks.critical.forEach(bottleneck => {
            console.log(`      🚨 ${bottleneck.component}: ${bottleneck.current}ms (+${bottleneck.overheadPercent}% overhead) - ${bottleneck.issue}`);
        });
    }

    identifyServiceWorkerBottlenecks(duration) {
        const causes = [];
        
        // Analyze based on known service worker code
        if (duration > 800) {
            causes.push({
                cause: 'Multiple importScripts calls',
                description: 'Service worker loads 6+ separate scripts synchronously',
                impact: 'high',
                estimatedTime: '300-500ms'
            });
        }
        
        if (duration > 600) {
            causes.push({
                cause: 'AI service initialization',
                description: 'Chrome Built-in AI APIs initialization during startup',
                impact: 'medium',
                estimatedTime: '200-400ms'
            });
        }
        
        if (duration > 400) {
            causes.push({
                cause: 'Storage initialization',
                description: 'Chrome storage setup and data structure creation',
                impact: 'medium',
                estimatedTime: '100-200ms'
            });
        }
        
        return causes;
    }

    generateServiceWorkerOptimizations(duration) {
        const optimizations = [];
        
        if (duration > 800) {
            optimizations.push({
                optimization: 'Lazy load non-critical services',
                description: 'Initialize AI services only when needed, not during startup',
                expectedImprovement: '300-400ms',
                difficulty: 'medium',
                priority: 'high'
            });
        }
        
        if (duration > 600) {
            optimizations.push({
                optimization: 'Bundle import scripts',
                description: 'Combine multiple importScripts into single bundled file',
                expectedImprovement: '200-300ms',
                difficulty: 'low',
                priority: 'high'
            });
        }
        
        if (duration > 400) {
            optimizations.push({
                optimization: 'Async initialization pattern',
                description: 'Use async/await for initialization instead of synchronous blocking',
                expectedImprovement: '100-200ms',
                difficulty: 'medium',
                priority: 'medium'
            });
        }
        
        return optimizations;
    }

    analyzeLoadingSequence() {
        return {
            currentSequence: [
                { step: 'Manifest parsing', estimatedTime: '10-20ms', canOptimize: false },
                { step: 'Service worker script loading', estimatedTime: '50-100ms', canOptimize: true },
                { step: 'importScripts execution', estimatedTime: '300-500ms', canOptimize: true },
                { step: 'Service initialization', estimatedTime: '200-400ms', canOptimize: true },
                { step: 'AI services setup', estimatedTime: '200-300ms', canOptimize: true },
                { step: 'Storage initialization', estimatedTime: '100-200ms', canOptimize: true }
            ],
            totalEstimated: '860-1520ms',
            optimizedSequence: [
                { step: 'Manifest parsing', estimatedTime: '10-20ms', optimization: 'none' },
                { step: 'Service worker script loading', estimatedTime: '50-100ms', optimization: 'minification' },
                { step: 'Core services bundle', estimatedTime: '100-150ms', optimization: 'bundled imports' },
                { step: 'Basic initialization', estimatedTime: '50-100ms', optimization: 'streamlined init' },
                { step: 'Lazy AI services (on-demand)', estimatedTime: '0ms startup', optimization: 'deferred loading' },
                { step: 'Async storage setup', estimatedTime: '20-50ms', optimization: 'async pattern' }
            ],
            optimizedTotal: '230-420ms',
            potentialImprovement: '630-1100ms'
        };
    }

    async analyzeExtensionStructure() {
        console.log('   📋 Analyzing extension manifest and structure...');
        
        // Load and analyze manifest
        const manifest = JSON.parse(fs.readFileSync(CONFIG.manifestPath, 'utf8'));
        
        const structureAnalysis = {
            manifestVersion: manifest.manifest_version,
            permissions: manifest.permissions?.length || 0,
            hostPermissions: manifest.host_permissions?.length || 0,
            contentScripts: manifest.content_scripts?.length || 0,
            backgroundType: manifest.background?.service_worker ? 'service_worker' : 'page',
            components: {
                popup: !!manifest.action?.default_popup,
                sidepanel: !!manifest.side_panel?.default_path,
                options: !!manifest.options_ui?.page,
                contentScript: manifest.content_scripts?.length > 0
            },
            optimizationOpportunities: []
        };

        // Identify manifest-level optimizations
        if (structureAnalysis.permissions > 5) {
            structureAnalysis.optimizationOpportunities.push({
                area: 'permissions',
                issue: 'Excessive permissions may slow startup',
                recommendation: 'Audit and remove unused permissions',
                impact: 'low'
            });
        }

        if (structureAnalysis.hostPermissions > 0 && manifest.host_permissions?.includes('<all_urls>')) {
            structureAnalysis.optimizationOpportunities.push({
                area: 'host_permissions',
                issue: 'Broad host permissions may impact performance',
                recommendation: 'Use specific domain patterns where possible',
                impact: 'low'
            });
        }

        this.analysisResults.extensionStructure = structureAnalysis;
        
        console.log(`      📋 Manifest v${structureAnalysis.manifestVersion}`);
        console.log(`      🔐 Permissions: ${structureAnalysis.permissions}`);
        console.log(`      🌐 Host permissions: ${structureAnalysis.hostPermissions}`);
        console.log(`      🧩 Components: ${Object.values(structureAnalysis.components).filter(Boolean).length}/4`);
    }

    async analyzeServiceWorkerPerformance() {
        console.log('   ⚙️ Analyzing service worker performance in detail...');
        
        if (!fs.existsSync(CONFIG.serviceWorkerPath)) {
            console.log('      ⚠️ Service worker file not found');
            return;
        }

        const serviceWorkerContent = fs.readFileSync(CONFIG.serviceWorkerPath, 'utf8');
        const analysis = {
            fileSize: fs.statSync(CONFIG.serviceWorkerPath).size,
            linesOfCode: serviceWorkerContent.split('\n').length,
            importScriptsCalls: (serviceWorkerContent.match(/importScripts\(/g) || []).length,
            asyncFunctions: (serviceWorkerContent.match(/async\s+function|async\s+\w+\s*=>/g) || []).length,
            eventListeners: (serviceWorkerContent.match(/\.addEventListener\(/g) || []).length,
            chromeApiCalls: (serviceWorkerContent.match(/chrome\.\w+/g) || []).length,
            aiServiceCalls: (serviceWorkerContent.match(/Summarizer|LanguageModel|Writer|Rewriter/g) || []).length,
            
            performanceIssues: [],
            optimizationOpportunities: []
        };

        // Identify performance issues
        if (analysis.importScriptsCalls > 3) {
            analysis.performanceIssues.push({
                issue: 'Multiple importScripts calls',
                count: analysis.importScriptsCalls,
                impact: 'high',
                description: 'Each importScripts call blocks service worker initialization'
            });
        }

        if (analysis.fileSize > 50000) { // 50KB
            analysis.performanceIssues.push({
                issue: 'Large service worker file',
                size: analysis.fileSize,
                impact: 'medium',
                description: 'Large files take longer to parse and execute'
            });
        }

        if (analysis.aiServiceCalls > 10) {
            analysis.performanceIssues.push({
                issue: 'Extensive AI service usage',
                calls: analysis.aiServiceCalls,
                impact: 'medium',
                description: 'AI services should be initialized lazily'
            });
        }

        // Generate optimization opportunities
        if (analysis.importScriptsCalls > 0) {
            analysis.optimizationOpportunities.push({
                opportunity: 'Bundle imported scripts',
                description: 'Combine multiple importScripts into a single bundled file',
                expectedImprovement: `${analysis.importScriptsCalls * 50}-${analysis.importScriptsCalls * 100}ms`,
                difficulty: 'low'
            });
        }

        if (analysis.aiServiceCalls > 5) {
            analysis.optimizationOpportunities.push({
                opportunity: 'Lazy AI service initialization',
                description: 'Initialize AI services only when first needed, not during startup',
                expectedImprovement: '200-400ms',
                difficulty: 'medium'
            });
        }

        if (analysis.linesOfCode > 1000) {
            analysis.optimizationOpportunities.push({
                opportunity: 'Code splitting',
                description: 'Split large service worker into smaller modules with dynamic imports',
                expectedImprovement: '100-300ms',
                difficulty: 'high'
            });
        }

        this.analysisResults.serviceWorkerAnalysis = analysis;

        console.log(`      📄 File size: ${(analysis.fileSize / 1024).toFixed(1)}KB`);
        console.log(`      📝 Lines of code: ${analysis.linesOfCode}`);
        console.log(`      📦 Import scripts: ${analysis.importScriptsCalls}`);
        console.log(`      🤖 AI API calls: ${analysis.aiServiceCalls}`);
        console.log(`      ⚠️ Performance issues: ${analysis.performanceIssues.length}`);
        console.log(`      💡 Optimization opportunities: ${analysis.optimizationOpportunities.length}`);
    }

    async generateOptimizationOpportunities() {
        console.log('   💡 Generating optimization opportunities...');
        
        const opportunities = [];

        // Service Worker optimizations (highest impact)
        const swAnalysis = this.analysisResults.serviceWorkerAnalysis;
        if (swAnalysis) {
            swAnalysis.optimizationOpportunities.forEach(opt => {
                opportunities.push({
                    category: 'service_worker',
                    title: opt.opportunity,
                    description: opt.description,
                    expectedImprovement: opt.expectedImprovement,
                    difficulty: opt.difficulty,
                    priority: this.calculatePriority(opt.expectedImprovement, opt.difficulty),
                    implementation: this.generateImplementationSteps(opt.opportunity),
                    impact: 'high'
                });
            });
        }

        // Component-specific optimizations
        Object.entries(this.analysisResults.componentAnalysis).forEach(([componentKey, analysis]) => {
            if (analysis.optimizationPotential === 'high' || analysis.optimizationPotential === 'critical') {
                opportunities.push({
                    category: 'component',
                    component: componentKey,
                    title: `Optimize ${componentKey} loading`,
                    description: `Improve ${componentKey} performance from ${analysis.status} to good`,
                    expectedImprovement: this.estimateComponentImprovement(analysis),
                    difficulty: analysis.complexity === 'high' || analysis.complexity === 'very_high' ? 'medium' : 'low',
                    priority: analysis.optimizationPotential === 'critical' ? 'immediate' : 'high',
                    implementation: this.generateComponentOptimizations(componentKey, analysis),
                    impact: analysis.optimizationPotential === 'critical' ? 'high' : 'medium'
                });
            }
        });

        // Loading sequence optimizations
        const sequenceAnalysis = this.analysisResults.bottleneckIdentification.loadingSequenceAnalysis;
        if (sequenceAnalysis) {
            opportunities.push({
                category: 'loading_sequence',
                title: 'Optimize loading sequence',
                description: 'Implement async initialization patterns and lazy loading',
                expectedImprovement: sequenceAnalysis.potentialImprovement,
                difficulty: 'medium',
                priority: 'high',
                implementation: [
                    'Implement lazy AI service loading',
                    'Use async patterns for storage initialization',
                    'Bundle and minify import scripts',
                    'Defer non-critical service initialization'
                ],
                impact: 'high'
            });
        }

        // Memory optimization opportunities
        const performanceData = this.analysisResults.performanceData;
        if (performanceData?.performanceMetrics?.systemResources) {
            const memory = performanceData.performanceMetrics.systemResources;
            if (memory.peakMemoryUsage > CONFIG.thresholds.MEMORY_EFFICIENCY_TARGET) {
                opportunities.push({
                    category: 'memory',
                    title: 'Optimize memory usage',
                    description: 'Reduce memory footprint during extension loading',
                    expectedImprovement: `${(memory.peakMemoryUsage - CONFIG.thresholds.MEMORY_EFFICIENCY_TARGET).toFixed(1)}MB reduction`,
                    difficulty: 'medium',
                    priority: 'medium',
                    implementation: [
                        'Implement object pooling for content items',
                        'Use WeakMap for temporary references',
                        'Clean up unused event listeners',
                        'Optimize data structures'
                    ],
                    impact: 'medium'
                });
            }
        }

        this.analysisResults.optimizationOpportunities = opportunities.sort((a, b) => {
            const priorityOrder = { immediate: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        console.log(`      💡 Generated ${opportunities.length} optimization opportunities`);
        opportunities.slice(0, 5).forEach((opp, index) => {
            console.log(`         ${index + 1}. ${opp.title} (${opp.priority} priority, ${opp.impact} impact)`);
        });
    }

    calculatePriority(improvement, difficulty) {
        const impactScore = this.parseImprovementScore(improvement);
        const difficultyScore = { low: 1, medium: 2, high: 3 }[difficulty] || 2;
        
        const score = impactScore / difficultyScore;
        
        if (score > 200) return 'immediate';
        if (score > 100) return 'high';
        if (score > 50) return 'medium';
        return 'low';
    }

    parseImprovementScore(improvement) {
        const match = improvement.match(/(\d+)/);
        return match ? parseInt(match[1]) : 50;
    }

    generateImplementationSteps(opportunity) {
        const steps = {
            'Bundle imported scripts': [
                'Create build script to concatenate imported files',
                'Replace multiple importScripts with single bundled file',
                'Add minification to build process',
                'Test service worker functionality'
            ],
            'Lazy AI service initialization': [
                'Move AI service initialization from startup to first use',
                'Implement service getter with lazy initialization',
                'Add loading states for UI components',
                'Update error handling for async initialization'
            ],
            'Code splitting': [
                'Identify independent modules in service worker',
                'Implement dynamic imports for large modules',
                'Create module loading orchestration',
                'Test module loading sequence'
            ]
        };
        
        return steps[opportunity] || [
            'Analyze current implementation',
            'Design optimization approach',
            'Implement changes incrementally',
            'Test performance improvements'
        ];
    }

    estimateComponentImprovement(analysis) {
        if (!analysis.currentPerformance) return 'Unknown';
        
        const current = analysis.currentPerformance.duration;
        const target = analysis.expectedLoadTime;
        const improvement = Math.max(0, current - target);
        
        return `${improvement}ms (${((improvement / current) * 100).toFixed(1)}% reduction)`;
    }

    generateComponentOptimizations(componentKey, analysis) {
        const optimizations = {
            serviceWorker: [
                'Lazy load AI services',
                'Bundle import scripts',
                'Async storage initialization',
                'Reduce startup complexity'
            ],
            popup: [
                'Minimize DOM complexity',
                'Optimize CSS loading',
                'Use virtual scrolling for lists',
                'Cache frequently accessed data'
            ],
            sidepanel: [
                'Implement virtual scrolling',
                'Lazy load search results',
                'Optimize rendering pipeline',
                'Use efficient state management'
            ],
            options: [
                'Minimize form complexity',
                'Use progressive enhancement',
                'Cache settings data',
                'Optimize validation logic'
            ]
        };
        
        return optimizations[componentKey] || [
            'Profile component loading',
            'Identify performance bottlenecks',
            'Implement targeted optimizations',
            'Test performance improvements'
        ];
    }

    async validateConstitutionalCompliance() {
        console.log('   🏛️ Validating constitutional compliance...');
        
        const compliance = {
            extensionLoadingCompliance: true,
            serviceWorkerCompliance: true,
            componentLoadingCompliance: true,
            memoryEfficiencyCompliance: true,
            overallCompliance: true,
            issues: [],
            recommendations: []
        };

        // Check extension loading time
        const extensionPerformance = this.analysisResults.performanceData?.testResults?.find(
            r => r.category === 'extension_performance'
        );
        
        if (extensionPerformance) {
            const avgLoadTime = extensionPerformance.averageDuration;
            
            if (avgLoadTime > CONFIG.thresholds.EXTENSION_LOAD_TARGET) {
                compliance.extensionLoadingCompliance = false;
                compliance.issues.push({
                    type: 'extension_loading',
                    issue: `Extension loading time ${avgLoadTime}ms exceeds ${CONFIG.thresholds.EXTENSION_LOAD_TARGET}ms target`,
                    severity: 'high',
                    impact: 'User experience degradation'
                });
            }
        }

        // Check service worker performance
        const swAnalysis = this.analysisResults.componentAnalysis.serviceWorker;
        if (swAnalysis?.currentPerformance) {
            const swTime = swAnalysis.currentPerformance.duration;
            
            if (swTime > CONFIG.thresholds.SERVICE_WORKER_TARGET) {
                compliance.serviceWorkerCompliance = false;
                compliance.issues.push({
                    type: 'service_worker',
                    issue: `Service worker initialization ${swTime}ms exceeds ${CONFIG.thresholds.SERVICE_WORKER_TARGET}ms target`,
                    severity: 'critical',
                    impact: 'Extension startup delay'
                });
            }
        }

        // Check component loading times
        Object.entries(this.analysisResults.componentAnalysis).forEach(([componentKey, analysis]) => {
            if (analysis.currentPerformance && analysis.currentPerformance.duration > CONFIG.thresholds.COMPONENT_LOAD_TARGET) {
                compliance.componentLoadingCompliance = false;
                compliance.issues.push({
                    type: 'component_loading',
                    component: componentKey,
                    issue: `${componentKey} loading time ${analysis.currentPerformance.duration}ms exceeds ${CONFIG.thresholds.COMPONENT_LOAD_TARGET}ms target`,
                    severity: 'medium',
                    impact: 'Component interaction delay'
                });
            }
        });

        // Check memory efficiency
        const systemResources = this.analysisResults.performanceData?.performanceMetrics?.systemResources;
        if (systemResources && systemResources.peakMemoryUsage > CONFIG.thresholds.MEMORY_EFFICIENCY_TARGET) {
            compliance.memoryEfficiencyCompliance = false;
            compliance.issues.push({
                type: 'memory_efficiency',
                issue: `Peak memory usage ${systemResources.peakMemoryUsage.toFixed(1)}MB exceeds ${CONFIG.thresholds.MEMORY_EFFICIENCY_TARGET}MB efficiency target`,
                severity: 'low',
                impact: 'Resource consumption'
            });
        }

        // Calculate overall compliance
        compliance.overallCompliance = 
            compliance.extensionLoadingCompliance &&
            compliance.serviceWorkerCompliance &&
            compliance.componentLoadingCompliance &&
            compliance.memoryEfficiencyCompliance;

        this.analysisResults.constitutionalCompliance = compliance;

        console.log(`      🏛️ Extension Loading: ${compliance.extensionLoadingCompliance ? 'PASS ✅' : 'FAIL ❌'}`);
        console.log(`      ⚙️ Service Worker: ${compliance.serviceWorkerCompliance ? 'PASS ✅' : 'FAIL ❌'}`);
        console.log(`      🔧 Component Loading: ${compliance.componentLoadingCompliance ? 'PASS ✅' : 'FAIL ❌'}`);
        console.log(`      💾 Memory Efficiency: ${compliance.memoryEfficiencyCompliance ? 'PASS ✅' : 'FAIL ❌'}`);
        console.log(`      🎯 Overall Compliance: ${compliance.overallCompliance ? 'PASS ✅' : 'FAIL ❌'}`);

        if (compliance.issues.length > 0) {
            console.log(`      ⚠️ Issues found: ${compliance.issues.length}`);
        }
    }

    async generateRecommendations() {
        console.log('   📝 Generating performance recommendations...');
        
        const recommendations = [];

        // High priority recommendations based on bottlenecks
        const criticalBottlenecks = this.analysisResults.bottleneckIdentification.critical;
        criticalBottlenecks.forEach(bottleneck => {
            recommendations.push({
                priority: 'immediate',
                category: 'critical_performance',
                title: `Fix critical performance issue in ${bottleneck.component}`,
                description: bottleneck.issue,
                actionItems: [
                    `Investigate ${bottleneck.component} loading performance`,
                    `Implement optimizations to reduce ${bottleneck.overhead}ms overhead`,
                    `Target loading time: <${bottleneck.expected}ms`,
                    'Test and validate improvements'
                ],
                expectedBenefit: `${bottleneck.overhead}ms improvement`,
                effort: this.estimateEffort(bottleneck.component, bottleneck.overhead)
            });
        });

        // Service worker optimization (major impact)
        const swBottleneck = this.analysisResults.bottleneckIdentification.serviceWorkerAnalysis;
        if (swBottleneck?.isBottleneck) {
            recommendations.push({
                priority: 'high',
                category: 'service_worker_optimization',
                title: 'Optimize service worker initialization',
                description: 'Service worker is the primary loading bottleneck',
                actionItems: [
                    'Implement lazy AI service loading',
                    'Bundle importScripts into single file',
                    'Use async initialization patterns',
                    'Defer non-critical service setup'
                ],
                expectedBenefit: `${swBottleneck.optimizationPotential}ms improvement`,
                effort: 'medium'
            });
        }

        // Top optimization opportunities
        this.analysisResults.optimizationOpportunities.slice(0, 3).forEach(opportunity => {
            recommendations.push({
                priority: opportunity.priority,
                category: 'optimization',
                title: opportunity.title,
                description: opportunity.description,
                actionItems: opportunity.implementation,
                expectedBenefit: opportunity.expectedImprovement,
                effort: opportunity.difficulty
            });
        });

        // Constitutional compliance recommendations
        const complianceIssues = this.analysisResults.constitutionalCompliance.issues;
        complianceIssues.forEach(issue => {
            recommendations.push({
                priority: issue.severity === 'critical' ? 'immediate' : 'high',
                category: 'constitutional_compliance',
                title: `Address ${issue.type} compliance`,
                description: issue.issue,
                actionItems: [
                    'Profile current performance',
                    'Implement targeted optimizations',
                    'Validate constitutional compliance',
                    'Monitor performance metrics'
                ],
                expectedBenefit: `Meet constitutional requirements`,
                effort: this.estimateComplianceEffort(issue)
            });
        });

        // Sort by priority
        const priorityOrder = { immediate: 4, high: 3, medium: 2, low: 1 };
        recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

        this.analysisResults.recommendations = recommendations;

        console.log(`      📝 Generated ${recommendations.length} recommendations`);
        console.log(`      🚨 Immediate priority: ${recommendations.filter(r => r.priority === 'immediate').length}`);
        console.log(`      ⚠️ High priority: ${recommendations.filter(r => r.priority === 'high').length}`);
    }

    estimateEffort(component, overheadMs) {
        if (overheadMs > 500) return 'high';
        if (overheadMs > 200) return 'medium';
        return 'low';
    }

    estimateComplianceEffort(issue) {
        if (issue.severity === 'critical') return 'high';
        if (issue.severity === 'medium') return 'medium';
        return 'low';
    }

    getStatusIcon(status) {
        const icons = {
            excellent: '🟢',
            good: '🟡', 
            warning: '🟠',
            critical: '🔴'
        };
        return icons[status] || '⚪';
    }

    async generateReport() {
        // Generate JSON report
        const report = {
            ...this.analysisResults,
            summary: {
                totalComponents: Object.keys(this.analysisResults.componentAnalysis).length,
                bottlenecks: {
                    critical: this.analysisResults.bottleneckIdentification?.critical?.length || 0,
                    major: this.analysisResults.bottleneckIdentification?.major?.length || 0,
                    minor: this.analysisResults.bottleneckIdentification?.minor?.length || 0
                },
                optimizations: this.analysisResults.optimizationOpportunities?.length || 0,
                recommendations: this.analysisResults.recommendations?.length || 0,
                constitutionalCompliance: this.analysisResults.constitutionalCompliance?.overallCompliance || false
            }
        };

        // Save JSON report
        fs.writeFileSync(CONFIG.outputFile, JSON.stringify(report, null, 2));

        // Generate Markdown report
        const markdownReport = this.generateMarkdownReport(report);
        fs.writeFileSync(CONFIG.reportFile, markdownReport);

        // Console summary
        console.log('\n📊 T037 Extension Loading Analysis Summary Report');
        console.log('═'.repeat(60));
        console.log(`🎯 Components Analyzed: ${report.summary.totalComponents}`);
        console.log(`🚨 Critical Bottlenecks: ${report.summary.bottlenecks.critical}`);
        console.log(`⚠️ Major Bottlenecks: ${report.summary.bottlenecks.major}`);
        console.log(`💡 Optimization Opportunities: ${report.summary.optimizations}`);
        console.log(`📝 Recommendations: ${report.summary.recommendations}`);
        console.log(`🏛️ Constitutional Compliance: ${report.summary.constitutionalCompliance ? 'PASS ✅' : 'FAIL ❌'}`);
        console.log('');
        console.log(`📄 Detailed Analysis: ${CONFIG.outputFile}`);
        console.log(`📋 Report: ${CONFIG.reportFile}`);
        
        return report;
    }

    generateMarkdownReport(report) {
        return `# T037: Extension Loading Performance Analysis Report

Generated: ${new Date().toISOString()}

## Executive Summary

**Status**: ${report.success ? 'Completed Successfully ✅' : 'Failed ❌'}  
**Constitutional Compliance**: ${report.summary.constitutionalCompliance ? 'PASS ✅' : 'FAIL ❌'}

### Key Findings

- **Components Analyzed**: ${report.summary.totalComponents}
- **Critical Bottlenecks**: ${report.summary.bottlenecks.critical}
- **Major Bottlenecks**: ${report.summary.bottlenecks.major}
- **Optimization Opportunities**: ${report.summary.optimizations}
- **Actionable Recommendations**: ${report.summary.recommendations}

## Performance Analysis

### Component Performance Overview

| Component | Current Time | Expected Time | Status | Grade | Optimization Potential |
|-----------|-------------|---------------|---------|-------|----------------------|
${Object.entries(report.componentAnalysis).map(([key, analysis]) => {
    const current = analysis.currentPerformance?.duration || 'N/A';
    const expected = analysis.expectedLoadTime;
    return `| ${key} | ${current}ms | ${expected}ms | ${analysis.status} | ${analysis.performanceGrade} | ${analysis.optimizationPotential} |`;
}).join('\n')}

### Critical Bottlenecks

${report.bottleneckIdentification?.critical?.map(bottleneck => `
#### ${bottleneck.component}
- **Issue**: ${bottleneck.issue}
- **Current Time**: ${bottleneck.current}ms
- **Expected Time**: ${bottleneck.expected}ms
- **Overhead**: ${bottleneck.overhead}ms (+${bottleneck.overheadPercent}%)
- **Priority**: ${bottleneck.priority}
`).join('\n') || 'No critical bottlenecks identified.'}

## Optimization Opportunities

${report.optimizationOpportunities?.slice(0, 10).map((opp, index) => `
### ${index + 1}. ${opp.title}

- **Category**: ${opp.category}
- **Priority**: ${opp.priority}
- **Expected Improvement**: ${opp.expectedImprovement}
- **Difficulty**: ${opp.difficulty}
- **Impact**: ${opp.impact}

**Description**: ${opp.description}

**Implementation Steps**:
${opp.implementation?.map(step => `- ${step}`).join('\n') || '- Implementation details not available'}

`).join('\n') || 'No optimization opportunities identified.'}

## Recommendations

${report.recommendations?.slice(0, 8).map((rec, index) => `
### ${index + 1}. ${rec.title} (${rec.priority} priority)

**Category**: ${rec.category}  
**Expected Benefit**: ${rec.expectedBenefit}  
**Effort**: ${rec.effort}

**Description**: ${rec.description}

**Action Items**:
${rec.actionItems?.map(item => `- ${item}`).join('\n') || '- Action items not available'}

`).join('\n') || 'No recommendations generated.'}

## Constitutional Compliance Details

### Extension Loading Requirements

- **Target**: <${CONFIG.thresholds.EXTENSION_LOAD_TARGET}ms
- **Status**: ${report.constitutionalCompliance?.extensionLoadingCompliance ? 'PASS ✅' : 'FAIL ❌'}

### Service Worker Requirements

- **Target**: <${CONFIG.thresholds.SERVICE_WORKER_TARGET}ms
- **Status**: ${report.constitutionalCompliance?.serviceWorkerCompliance ? 'PASS ✅' : 'FAIL ❌'}

### Component Loading Requirements

- **Target**: <${CONFIG.thresholds.COMPONENT_LOAD_TARGET}ms per component
- **Status**: ${report.constitutionalCompliance?.componentLoadingCompliance ? 'PASS ✅' : 'FAIL ❌'}

### Memory Efficiency Requirements

- **Target**: <${CONFIG.thresholds.MEMORY_EFFICIENCY_TARGET}MB
- **Status**: ${report.constitutionalCompliance?.memoryEfficiencyCompliance ? 'PASS ✅' : 'FAIL ❌'}

${report.constitutionalCompliance?.issues?.length > 0 ? `
### Compliance Issues

${report.constitutionalCompliance.issues.map(issue => `
- **${issue.type}**: ${issue.issue}
  - Severity: ${issue.severity}
  - Impact: ${issue.impact}
`).join('\n')}
` : ''}

## Service Worker Deep Analysis

${report.serviceWorkerAnalysis ? `
- **File Size**: ${(report.serviceWorkerAnalysis.fileSize / 1024).toFixed(1)}KB
- **Lines of Code**: ${report.serviceWorkerAnalysis.linesOfCode}
- **Import Scripts**: ${report.serviceWorkerAnalysis.importScriptsCalls}
- **AI API Calls**: ${report.serviceWorkerAnalysis.aiServiceCalls}
- **Performance Issues**: ${report.serviceWorkerAnalysis.performanceIssues?.length || 0}

### Identified Issues

${report.serviceWorkerAnalysis.performanceIssues?.map(issue => `
- **${issue.issue}**: ${issue.description}
  - Count: ${issue.count}
  - Impact: ${issue.impact}
`).join('\n') || 'No performance issues identified.'}
` : 'Service worker analysis not available.'}

## Next Steps

1. **Immediate Actions** (Critical Priority)
   - Address critical bottlenecks identified in service worker
   - Implement lazy AI service loading
   - Bundle importScripts for faster loading

2. **Short-term Improvements** (High Priority) 
   - Optimize component loading sequences
   - Implement async initialization patterns
   - Profile and optimize memory usage

3. **Long-term Enhancements** (Medium Priority)
   - Implement code splitting for large modules
   - Add performance monitoring and alerting
   - Continuous optimization based on real user metrics

## Files Generated

- **Detailed Analysis**: \`${CONFIG.outputFile}\`
- **This Report**: \`${CONFIG.reportFile}\`

---

*Analysis completed on ${new Date().toISOString()}*
*Constitutional requirements based on Chrome Built-in AI Challenge 2025*
`;
    }
}

// Main execution
async function main() {
    const analyzer = new ExtensionLoadingAnalyzer();
    
    try {
        const results = await analyzer.runLoadingAnalysis();
        
        if (results.success) {
            console.log('\n🎉 T037: Extension loading analysis completed successfully!');
            console.log('✅ Performance analysis and optimization opportunities identified');
            
            const recommendations = results.recommendations?.filter(r => r.priority === 'immediate' || r.priority === 'high') || [];
            if (recommendations.length > 0) {
                console.log(`\n🚀 Next: Implement ${recommendations.length} high-priority optimizations`);
                console.log('📋 See generated report for detailed implementation steps');
            }
            
            process.exit(0);
        } else {
            console.log('\n⚠️ T037: Analysis completed with issues');
            console.log('❌ Review analysis results and address critical bottlenecks');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 T037: Critical analysis failure:', error.message);
        process.exit(1);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { ExtensionLoadingAnalyzer, CONFIG };
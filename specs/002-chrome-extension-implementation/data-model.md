# Data Model: MCP Automated Testing Workflows

## Core Entities

### MCPTestSession

Represents an automated testing session using Chrome DevTools MCP for Chrome Extension validation.

**Fields**:

- `id`: Unique session identifier (UUID)
- `sessionName`: Human-readable test session name
- `startTime`: Session initiation timestamp
- `endTime`: Session completion timestamp (nullable)
- `status`: Session state (initializing, running, completed, failed, aborted)
- `chromeVersion`: Chrome browser version used for testing
- `extensionVersion`: SmartShelf extension version being tested
- `mcpCommands`: Array of executed MCP commands with parameters
- `results`: Aggregated test results and metrics
- `screenshots`: Array of captured screenshot paths for visual validation
- `logs`: Console logs and debug information collected during session

**Relationships**:

- Has many `TestWorkflow` entities (one-to-many)
- Has many `PerformanceMetric` entities (one-to-many)
- Has many `ValidationResult` entities (one-to-many)

### TestWorkflow

Represents a specific automated testing workflow within an MCP session.

**Fields**:

- `id`: Unique workflow identifier
- `sessionId`: Reference to parent MCPTestSession
- `workflowType`: Type of test (extension_loading, ai_api_validation, content_capture, ui_testing, performance_profiling)
- `name`: Descriptive workflow name
- `description`: Detailed workflow description and objectives
- `steps`: Array of automated steps with MCP commands
- `expectedOutcomes`: Predefined success criteria
- `actualResults`: Captured results and observations
- `status`: Workflow execution status (pending, running, passed, failed, skipped)
- `startTime`: Workflow start timestamp
- `duration`: Total execution time in milliseconds
- `errorMessages`: Array of error messages if workflow failed
- `dependencies`: Array of prerequisite workflow IDs

**Relationships**:

- Belongs to one MCPTestSession
- Has many `MCPCommand` entities (one-to-many)
- Has many `ValidationResult` entities (one-to-many)

### MCPCommand

Represents individual Chrome DevTools MCP commands executed during automated testing.

**Fields**:

- `id`: Unique command identifier
- `workflowId`: Reference to parent TestWorkflow
- `commandType`: MCP command type (navigate_page, evaluate_script, click, take_screenshot, list_console_messages)
- `parameters`: Command parameters and arguments (JSON object)
- `executionOrder`: Sequence order within workflow
- `timestamp`: Command execution timestamp
- `responseTime`: Command execution duration in milliseconds
- `success`: Boolean indicating command success
- `output`: Command response data or output
- `errorMessage`: Error details if command failed (nullable)

**Relationships**:

- Belongs to one TestWorkflow
- May reference `Screenshot` entity (if screenshot command)
- May reference `ConsoleLog` entity (if console monitoring)

### ValidationResult

Represents test validation outcomes and assertions during MCP testing.

**Fields**:

- `id`: Unique validation identifier
- `sessionId`: Reference to MCPTestSession (nullable for session-level validations)
- `workflowId`: Reference to TestWorkflow (nullable for workflow-level validations)
- `validationType`: Type of validation (functional, performance, visual, api_response, error_handling)
- `testName`: Descriptive name of specific test
- `expected`: Expected outcome or value
- `actual`: Actual observed outcome or value
- `passed`: Boolean indicating validation success
- `severity`: Validation importance (critical, high, medium, low)
- `message`: Detailed validation message or explanation
- `evidence`: Supporting data (screenshots, logs, metrics)
- `timestamp`: Validation execution timestamp

**Relationships**:

- May belong to MCPTestSession (session-level validations)
- May belong to TestWorkflow (workflow-level validations)

### PerformanceMetric

Represents performance measurements collected during automated testing.

**Fields**:

- `id`: Unique metric identifier
- `sessionId`: Reference to MCPTestSession
- `metricType`: Type of performance metric (ai_processing_time, search_response_time, extension_load_time, memory_usage, cpu_usage)
- `metricName`: Descriptive metric name
- `value`: Numeric metric value
- `unit`: Measurement unit (ms, MB, %, count)
- `threshold`: Performance threshold for validation
- `passed`: Boolean indicating threshold compliance
- `context`: Additional context about measurement conditions
- `timestamp`: Metric collection timestamp
- `browserState`: Browser state during measurement (idle, processing, heavy_load)

**Relationships**:

- Belongs to one MCPTestSession
- May be associated with specific TestWorkflow

### ExtensionComponent

Represents Chrome Extension components being tested via MCP workflows.

**Fields**:

- `id`: Unique component identifier
- `componentType`: Component type (service_worker, content_script, popup, sidepanel, options_page)
- `name`: Component name or identifier
- `filePath`: Path to component source file
- `version`: Component version or hash
- `loadStatus`: Component loading status (loaded, failed, not_found)
- `apiDependencies`: Array of required Chrome APIs
- `testCoverage`: Percentage of component functionality tested
- `knownIssues`: Array of known issues or limitations
- `lastTested`: Timestamp of most recent testing

**Relationships**:

- May be tested by multiple TestWorkflow entities (many-to-many)
- May have multiple ValidationResult entities (one-to-many)

### ChromeAIAPI

Represents Chrome Built-in AI API endpoints being validated through MCP testing.

**Fields**:

- `id`: Unique API identifier
- `apiName`: API name (LanguageModel, Summarizer, Writer, Rewriter, Translator)
- `availability`: API availability status (available, unavailable, downloading, error)
- `version`: API version or capabilities identifier
- `initializationTime`: Time required for API initialization (ms)
- `sessionCreationTime`: Average session creation time (ms)
- `averageResponseTime`: Average API response time (ms)
- `successRate`: Percentage of successful API calls
- `errorRate`: Percentage of failed API calls
- `lastTestedTimestamp`: Most recent testing timestamp
- `testConfiguration`: API testing configuration parameters

**Relationships**:

- May be tested by multiple TestWorkflow entities (many-to-many)
- Has many PerformanceMetric entities (one-to-many)
- Has many ValidationResult entities (one-to-many)

## State Transitions

### MCPTestSession States

1. **initializing**: Session setup, Chrome browser launching, extension loading
2. **running**: Active test execution with workflow processing
3. **completed**: All workflows completed successfully
4. **failed**: Critical failure preventing session completion
5. **aborted**: Manual or automatic session termination

### TestWorkflow States

1. **pending**: Workflow scheduled but not started
2. **running**: Active workflow execution
3. **passed**: Workflow completed with all validations successful
4. **failed**: Workflow completed with validation failures
5. **skipped**: Workflow skipped due to dependency failures or conditions

### ValidationResult States

1. **passed**: Validation successful, actual matches expected
2. **failed**: Validation failed, actual differs from expected
3. **warning**: Validation partially successful with minor issues
4. **inconclusive**: Validation could not be determined due to technical issues

## Data Flow Patterns

### MCP Testing Session Flow

1. MCPTestSession created with configuration parameters
2. Chrome DevTools MCP connection established
3. Chrome browser launched with extension loading
4. TestWorkflow entities queued based on session configuration
5. Individual MCPCommand entities executed in sequence
6. ValidationResult entities generated for each test assertion
7. PerformanceMetric entities collected throughout execution
8. Session completed with aggregated results and evidence

### Extension Component Validation Flow

1. ExtensionComponent entities identified for testing scope
2. Component loading status verified via MCP commands
3. API dependencies validated for availability and functionality
4. Functional testing executed via automated user workflows
5. Performance metrics collected for response times and resource usage
6. ValidationResult entities generated for each component test
7. Test coverage updated based on successful validations

### AI API Integration Testing Flow

1. ChromeAIAPI entities initialized with availability checking
2. API session creation and configuration tested
3. Real content processing workflows executed
4. Response times and success rates measured
5. Error handling scenarios validated
6. Performance thresholds verified against constitutional requirements
7. Results aggregated for overall AI integration assessment
# Performance Tests

This directory contains performance-related test suites for the SmartShelf Chrome Extension.

## Test Structure

### T034 - Search Performance Tests
- **File**: `t034-search-performance.test.js`
- **Purpose**: Validates constitutional search performance requirements (<500ms response time)
- **Coverage**: Search functionality, result relevance, performance benchmarks

## Constitutional Requirements Tested

### Search Performance Requirements
- ✅ **Response Time**: <500ms search response time
- ✅ **Result Relevance**: ≥80% relevance threshold  
- ✅ **Test Pass Rate**: ≥80% overall compliance
- ✅ **Memory Usage**: Within 50MB constitutional limit

### Test Scenarios
1. **Basic Search Performance**: Single-term queries
2. **Multi-term Search**: Complex multi-term queries
3. **Complex Queries**: Filtered searches with multiple parameters
4. **Edge Cases**: Empty queries, no-result scenarios
5. **Stress Testing**: Concurrent searches and sustained load

## Running Performance Tests

```bash
# Run all performance tests
npm test -- --testPathPattern="performance"

# Run specific T034 test
npm test -- --testPathPattern="t034-search-performance"

# Run with verbose output
npm test -- --testPathPattern="performance" --verbose
```

## Test Results

Performance tests validate constitutional compliance and generate detailed performance reports in `/mcp-workflows/logs/`.

## Integration with MCP Workflows

Performance tests are integrated with MCP automated testing workflows for comprehensive validation and reporting.
# Tasks: SmartShelf - AI-Powered Personal Knowledge Hub

**Input**: Design documents from `/media/theww/AI/Code/AI/Google_Chrome_Built_In/specs/001-smartshelf-ai-powered/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

Chrome Extension structure (from implementation plan):

- **Extension**: `extension/` at repository root
- **Tests**: `tests/` with unit/, integration/, e2e/ subdirectories

## Phase 3.1: Setup & Project Structure

- [ ] T001 Create Chrome Extension project structure with manifest.json, background/, content/, popup/, sidepanel/, options/, shared/ directories
- [ ] T002 Initialize package.json with Jest, Puppeteer, Chrome Extension Testing Framework dependencies
- [ ] T003 [P] Configure ESLint and Prettier for JavaScript ES2022 with Chrome Extension rules
- [ ] T004 [P] Set up Jest configuration for Chrome Extension testing in tests/jest.config.js
- [ ] T005 Create manifest.json with Manifest V3 configuration, permissions for Chrome Built-in AI APIs, Storage API, and Internet Archive access

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Endpoints)

- [ ] T006 [P] Contract test POST /api/content/save in tests/unit/contracts/test-content-save.js
- [ ] T007 [P] Contract test GET /api/content/{id} in tests/unit/contracts/test-content-get.js  
- [ ] T008 [P] Contract test PUT /api/content/{id} in tests/unit/contracts/test-content-update.js
- [ ] T009 [P] Contract test GET /api/search in tests/unit/contracts/test-search.js
- [ ] T010 [P] Contract test POST /api/ai/summarize in tests/unit/contracts/test-ai-summarize.js
- [ ] T011 [P] Contract test POST /api/ai/categorize in tests/unit/contracts/test-ai-categorize.js
- [ ] T012 [P] Contract test GET /api/external/content in tests/unit/contracts/test-external-api.js

### Entity Model Tests

- [ ] T013 [P] ContentItem model tests in tests/unit/models/test-content-item.js
- [ ] T014 [P] PhysicalItem model tests in tests/unit/models/test-physical-item.js
- [ ] T015 [P] Category model tests in tests/unit/models/test-category.js
- [ ] T016 [P] Tag model tests in tests/unit/models/test-tag.js
- [ ] T017 [P] Connection model tests in tests/unit/models/test-connection.js
- [ ] T018 [P] SearchIndex model tests in tests/unit/models/test-search-index.js
- [ ] T019 [P] Collection model tests in tests/unit/models/test-collection.js
- [ ] T020 [P] APIToken model tests in tests/unit/models/test-api-token.js
- [ ] T021 [P] UserSettings model tests in tests/unit/models/test-user-settings.js

### Integration Tests (Test Scenarios from Quickstart)

- [ ] T022 [P] Digital content capture & AI processing integration test in tests/integration/test-content-capture.js
- [ ] T023 [P] Natural language search integration test in tests/integration/test-search.js
- [ ] T024 [P] Physical item integration test in tests/integration/test-physical-items.js
- [ ] T025 [P] AI content connections integration test in tests/integration/test-ai-connections.js
- [ ] T026 [P] External API access integration test in tests/integration/test-external-api.js

### Chrome Extension Integration Tests

- [ ] T027 [P] Content Script functionality test in tests/integration/test-content-script.js
- [ ] T028 [P] Service Worker background processing test in tests/integration/test-service-worker.js
- [ ] T029 [P] Chrome Storage API integration test in tests/integration/test-storage.js
- [ ] T030 [P] Chrome Built-in AI APIs integration test in tests/integration/test-chrome-ai.js

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models (Independent - Can Run in Parallel)

- [ ] T031 [P] ContentItem model class in extension/shared/models/content-item.js
- [ ] T032 [P] PhysicalItem model class in extension/shared/models/physical-item.js
- [ ] T033 [P] Category model class in extension/shared/models/category.js
- [ ] T034 [P] Tag model class in extension/shared/models/tag.js
- [ ] T035 [P] Connection model class in extension/shared/models/connection.js
- [ ] T036 [P] SearchIndex model class in extension/shared/models/search-index.js
- [ ] T037 [P] Collection model class in extension/shared/models/collection.js
- [ ] T038 [P] APIToken model class in extension/shared/models/api-token.js
- [ ] T039 [P] UserSettings model class in extension/shared/models/user-settings.js

### Storage Services (Depend on Models)

- [ ] T040 Storage service for Chrome Storage API and IndexedDB in extension/shared/services/storage-service.js
- [ ] T041 Content repository for ContentItem CRUD operations in extension/shared/services/content-repository.js
- [ ] T042 Search service for natural language queries in extension/shared/services/search-service.js

### Chrome Built-in AI Integration Services

- [ ] T043 [P] AI Summarizer service using Chrome Summarizer API in extension/shared/services/ai-summarizer.js
- [ ] T044 [P] AI Categorizer service using Chrome Prompt API in extension/shared/services/ai-categorizer.js
- [ ] T045 [P] AI Connection Discovery service using Chrome Prompt API in extension/shared/services/ai-connections.js
- [ ] T046 [P] AI Writer service for insights and notes in extension/shared/services/ai-writer.js

### External API Integration

- [ ] T047 [P] Internet Archive API client in extension/shared/services/internet-archive-client.js
- [ ] T048 [P] API Gateway server for external access in extension/shared/services/api-gateway.js

### Chrome Extension Components

- [ ] T049 Content Script for page content capture in extension/content/content-script.js
- [ ] T050 Service Worker for background AI processing in extension/background/service-worker.js
- [ ] T051 Extension popup interface in extension/popup/popup.html and extension/popup/popup.js
- [ ] T052 Side panel main interface in extension/sidepanel/sidepanel.html and extension/sidepanel/sidepanel.js
- [ ] T053 Options page for settings in extension/options/options.html and extension/options/options.js

### API Endpoints Implementation

- [ ] T054 POST /api/content/save endpoint implementation in extension/background/api/content-api.js
- [ ] T055 GET /api/content/{id} and PUT /api/content/{id} endpoints in extension/background/api/content-api.js
- [ ] T056 GET /api/search endpoint implementation in extension/background/api/search-api.js
- [ ] T057 POST /api/ai/summarize endpoint implementation in extension/background/api/ai-api.js
- [ ] T058 POST /api/ai/categorize endpoint implementation in extension/background/api/ai-api.js
- [ ] T059 GET /api/external/content endpoint implementation in extension/background/api/external-api.js

## Phase 3.4: Integration & Chrome Extension Features

- [ ] T060 Connect Content Script to Service Worker messaging for content capture
- [ ] T061 Implement Chrome Storage persistence for user data and settings
- [ ] T062 Add Chrome Extension Action (toolbar icon) with popup integration
- [ ] T063 Implement Side Panel registration and communication with Service Worker
- [ ] T064 Add keyboard shortcuts for power users via Chrome Commands API
- [ ] T065 Implement Chrome Extension installation and update handlers

## Phase 3.5: AI Processing Pipeline

- [ ] T066 Content processing pipeline in Service Worker (capture → AI processing → storage → indexing)
- [ ] T067 Background AI processing queue with progress tracking and error handling
- [ ] T068 Connection discovery background job for relationship identification
- [ ] T069 Search indexing optimization for large collections (10k+ items)
- [ ] T070 AI processing error handling and retry mechanisms

## Phase 3.6: Polish & Performance

- [ ] T071 [P] Unit tests for utility functions in tests/unit/utils/
- [ ] T072 [P] Performance tests for AI processing pipeline in tests/performance/test-ai-performance.js
- [ ] T073 [P] Performance tests for search with large collections in tests/performance/test-search-performance.js
- [ ] T074 [P] E2E Chrome Extension tests using Puppeteer in tests/e2e/test-extension-workflow.js
- [ ] T075 [P] Update README.md with installation and usage instructions
- [ ] T076 [P] Create demo data generator for testing large collections
- [ ] T077 Error handling improvements and user-friendly error messages
- [ ] T078 Memory optimization for large collections and background processing
- [ ] T079 [P] Extension packaging and distribution preparation
- [ ] T080 Create 3-minute demo video showcasing core features

## Dependencies

**Critical Path Dependencies:**

- Setup (T001-T005) → All other tasks
- Tests (T006-T030) → Implementation tasks (T031-T080)
- Models (T031-T039) → Services (T040-T048)
- Services (T040-T048) → Extension Components (T049-T053)
- Extension Components (T049-T053) → API Endpoints (T054-T059)
- Core Implementation (T031-T059) → Integration (T060-T070) → Polish (T071-T080)

**Parallel Execution Groups:**

- **Setup Parallel**: T003, T004 (linting and Jest config)
- **Contract Tests**: T006-T012 (all API contract tests)
- **Model Tests**: T013-T021 (all entity model tests)
- **Integration Tests**: T022-T030 (all integration and Chrome extension tests)
- **Models Implementation**: T031-T039 (all data models)
- **AI Services**: T043-T046 (Chrome Built-in AI integrations)
- **External Services**: T047-T048 (Internet Archive and API Gateway)
- **Polish Tasks**: T071-T076, T079 (tests, docs, packaging)

## Parallel Example

```bash
# Launch contract test group together:
Task: "Contract test POST /api/content/save in tests/unit/contracts/test-content-save.js"
Task: "Contract test GET /api/content/{id} in tests/unit/contracts/test-content-get.js"
Task: "Contract test GET /api/search in tests/unit/contracts/test-search.js"
Task: "Contract test POST /api/ai/summarize in tests/unit/contracts/test-ai-summarize.js"

# Launch model implementation group together:
Task: "ContentItem model class in extension/shared/models/content-item.js"
Task: "Category model class in extension/shared/models/category.js"
Task: "Tag model class in extension/shared/models/tag.js"
Task: "Connection model class in extension/shared/models/connection.js"
```

## Validation Checklist

**Task Completeness:**

- [x] All 6 API contracts have corresponding tests (T006-T012)
- [x] All 9 entities have model tests and implementations (T013-T021, T031-T039)
- [x] All 5 test scenarios from quickstart have integration tests (T022-T026)
- [x] All Chrome Extension components covered (Content Script, Service Worker, UI components)
- [x] All Chrome Built-in AI APIs integrated (Prompt, Summarizer, Writer, Rewriter)
- [x] Performance and E2E testing included
- [x] Demo preparation and hackathon deliverables addressed

**Constitutional Compliance:**

- [x] AI-First: Multiple Chrome Built-in AI APIs integrated throughout
- [x] Privacy-Local: All AI processing client-side, no external AI APIs
- [x] Extension-Native: Full Chrome Extension integration with proper APIs
- [x] Test-Chrome-APIs: Comprehensive testing strategy for Chrome AI APIs
- [x] Hackathon-Focused: Clear demo path and 3-minute video preparation

## Estimated Timeline

- **Phase 3.1 (Setup)**: 1-2 days
- **Phase 3.2 (Tests)**: 3-4 days  
- **Phase 3.3 (Core Implementation)**: 5-7 days
- **Phase 3.4 (Integration)**: 2-3 days
- **Phase 3.5 (AI Pipeline)**: 2-3 days
- **Phase 3.6 (Polish)**: 2-3 days
- **Total**: 15-22 days (3-4 weeks for hackathon completion)

## Notes

- All [P] tasks can be executed in parallel when prerequisites are met
- TDD approach: All tests (T006-T030) MUST be written and failing before implementation
- Chrome Extension testing requires special setup with Chrome Extension Testing Framework
- AI API testing should include both mock data and real content scenarios
- Performance testing crucial for 10k+ item collections requirement
- Demo video (T080) should highlight constitutional principles and competitive advantages

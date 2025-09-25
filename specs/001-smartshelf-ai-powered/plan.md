
# Implementation Plan: SmartShelf - AI-Powered Personal Knowledge Hub

**Branch**: `001-smartshelf-ai-powered` | **Date**: 2025-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/media/theww/AI/Code/AI/Google_Chrome_Built_In/specs/001-smartshelf-ai-powered/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Chrome Extension that creates an AI-powered personal knowledge management hub, enabling users to save and organize both digital content (articles, videos, web pages) and physical items (books, documents) with automatic AI summarization, categorization, and intelligent search. Integrates Chrome Built-in AI APIs for content processing, Internet Archive for digital content access, and provides API gateway for external AI agent integration.

## Technical Context
**Language/Version**: JavaScript ES2022, HTML5, CSS3 (Chrome Extension Manifest V3)  
**Primary Dependencies**: Chrome Built-in AI APIs (Prompt, Summarizer, Writer, Rewriter, Translator), Internet Archive API, Chrome Extension APIs (Storage, Action, Content Scripts, Service Worker)  
**Storage**: Chrome Storage API (local/sync), IndexedDB for large datasets, no external databases  
**Testing**: Jest for unit tests, Chrome Extension Testing Framework, Puppeteer for integration tests  
**Target Platform**: Chrome Browser (Desktop/Mobile) with Manifest V3 support
**Project Type**: single (Chrome Extension with integrated frontend/backend via Service Worker)  
**Performance Goals**: <500ms AI processing response, <100ms search response, <2s content capture  
**Constraints**: Client-side only processing, <100MB local storage per user, offline-capable core features, no external AI APIs  
**Scale/Scope**: Individual users, 10k+ items per collection, 5 core screens (popup, side panel, options)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **AI-First Architecture**: Feature leverages Chrome Built-in AI APIs as primary processing engine (Prompt API for categorization, Summarizer API for content processing, Writer API for notes, Rewriter API for content improvement)
- [x] **Privacy-Local Processing**: All AI processing occurs client-side, no external AI API calls for core functionality (Internet Archive only for content retrieval, API gateway for export only)
- [x] **Extension-Native Design**: Integrates seamlessly with Chrome browsing workflow (Content Scripts for page capture, Service Worker for background AI processing, Side Panel for main interface, Action for quick access)
- [x] **Test-Chrome-APIs Integration**: AI API usage includes mock testing, real content testing, and error handling (comprehensive testing strategy planned for each API)
- [x] **Hackathon-Focused Scope**: Feature is completable within timeline and demo-ready for 3-minute video (MVP focused on core AI features with clear demo scenarios)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Chrome Extension structure (single project with extension-specific architecture):
```
extension/
├── manifest.json        # Extension manifest
├── background/          # Service Worker
├── content/             # Content Scripts  
├── popup/               # Extension popup UI
├── sidepanel/           # Side panel UI
├── options/             # Options/settings page
└── shared/              # Shared utilities and AI modules

tests/
├── unit/                # Unit tests for modules
├── integration/         # Extension integration tests
└── e2e/                 # End-to-end Chrome tests
```

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS  
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*

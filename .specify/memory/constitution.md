<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.1.0
- Added principle: VI. Debug-Native Development (new debugging workflow principle)
- Modified sections: Chrome Extension Standards (added debugging requirements)
- Templates requiring updates: plan-template.md (✅ updated Constitution Check), tasks-template.md (✅ verified alignment)
- Follow-up TODOs: None - chrome-devtools-mcp integration fully documented
-->

# SmartShelf Constitution

## Core Principles

### I. AI-First Architecture

Every feature MUST leverage Chrome Built-in AI APIs as the primary processing engine; No feature ships without demonstrable AI enhancement using Prompt, Summarizer, Writer, Rewriter, Translator, or Proofreader APIs; AI functionality must provide clear user value, not cosmetic enhancement.

Rationale: This is a Chrome Built-in AI Challenge submission where AI integration is mandatory and will be heavily weighted in judging criteria.

### II. Privacy-Local Processing (NON-NEGOTIABLE)

All AI processing MUST occur client-side using Chrome Built-in APIs; User data NEVER leaves the device; No external AI API calls permitted for core functionality; Internet Archive and API gateway are only exceptions for content retrieval and export.

Rationale: Privacy-first design is a key differentiator of Chrome Built-in AI and critical for personal knowledge management where users handle sensitive information.

### III. Extension-Native Design

Features MUST integrate seamlessly with Chrome browsing workflow; Content Scripts for seamless page capture; Background Service Worker for AI processing; Side Panel or Popup for primary interface; No standalone web app redirects.

Rationale: Chrome Extension category requires deep browser integration to demonstrate platform-specific value and user experience excellence.

### IV. Test-Chrome-APIs Integration

Every AI API usage MUST be tested with mock data first; Real Chrome API testing on actual content before implementation completion; Integration tests for content capture, categorization, and retrieval workflows; API error handling and fallback strategies required.

Rationale: Chrome Built-in AI APIs are cutting-edge technology requiring robust testing to ensure reliable functionality across different content types and user scenarios.

### V. Hackathon-Focused Scope

Features MUST be completable within hackathon timeline; MVP over comprehensive functionality; Demo-ready features prioritized over hidden complexity; Every feature must be showcasable in 3-minute video format.

Rationale: Hackathon success requires strategic feature prioritization and deliverable focus rather than attempting comprehensive solutions.

### VI. Debug-Native Development

All development MUST integrate chrome-devtools-mcp for real-time debugging; Extension debugging workflows must be automatable through MCP commands; AI API testing and performance monitoring required via Chrome DevTools integration; Developer environment must support Node.js v22.12.0+ for MCP tooling.

Rationale: Chrome Extension development with cutting-edge AI APIs requires sophisticated debugging tools to ensure reliable functionality, performance optimization, and rapid iteration during development cycles.

## Hackathon Requirements

**Technical Compliance**: All code MUST be open source with clear license; GitHub repository with comprehensive README and setup instructions; Functioning demo accessible for judging; YouTube/Vimeo demo video under 3 minutes.

**API Showcase Strategy**: Each Chrome Built-in AI API used must solve a distinct user problem; Multimodal capabilities (Prompt API with images) strongly preferred for competitive advantage; Minimum 3 APIs integration required for comprehensive demonstration.

**Content Integration**: Internet Archive API integration for physical book content access; Local storage for offline capability; Export API for external LLM/agent integration; Clean separation between local AI processing and external content retrieval.

## Chrome Extension Standards

**Manifest V3 Compliance**: Service Worker architecture for background processing; Content Scripts with proper host permissions; Storage API for local data persistence; Action API for user interface elements.

**Performance Requirements**: AI processing must not block UI interactions; Background processing with progress indicators; Efficient local storage management; Memory-conscious design for large collections.

**User Experience**: Intuitive content capture workflow; Visual feedback for AI processing states; Error messages with actionable recovery steps; Keyboard shortcuts for power users.

**Development Workflow**: Chrome DevTools MCP integration mandatory for debugging; Real-time AI API monitoring and performance analysis; Automated extension testing through MCP commands; Developer setup script must handle Node.js environment requirements.

## Governance

Constitution supersedes all development decisions; Chrome Built-in AI API requirements are non-negotiable; Hackathon timeline constraints override feature completeness; All features must align with judging criteria for functionality, purpose, content quality, user experience, and technological execution.

Complexity additions require explicit justification tied to competitive advantage; Changes to AI API integration strategy require constitutional amendment; Performance degradation below responsive UI standards constitutes constitutional violation.

**Version**: 1.1.0 | **Ratified**: 2025-09-25 | **Last Amended**: 2025-09-29

# SmartShelf - AI-Powered Personal Knowledge Hub

> **Chrome Extension for the Google Chrome Built-in AI Challenge 2025**

SmartShelf is an intelligent Chrome extension that revolutionizes personal knowledge management by seamlessly bridging your digital and physical content collections. Using Chrome's Built-in AI APIs, it automatically organizes, summarizes, and connects your saved articles, videos, books, and documents into a searchable, AI-enhanced knowledge hub.

## 🏆 Chrome Built-in AI Challenge 2025

This project is designed for the [Google Chrome Built-in AI Challenge 2025](https://devpost.com/software/chrome-built-in-ai-challenge-2025), showcasing innovative use of Chrome's local AI processing capabilities while maintaining user privacy and delivering exceptional user experience.

### 🎯 Challenge Categories Targeted
- **Most Helpful - Chrome Extension** ($14,000 prize)
- **Best Multimodal AI Application** ($9,000 prize) 
- **Best Hybrid AI Application** ($9,000 prize)

## ✨ Key Features

### 🤖 AI-First Architecture
- **Chrome Summarizer API**: Instant content summarization
- **Chrome Prompt API**: Smart categorization and relationship discovery
- **Chrome Writer API**: AI-generated insights and notes
- **Chrome Rewriter API**: Content improvement suggestions
- **Chrome Translator API**: Multi-language support (planned)

### 🔒 Privacy-First Design
- **100% Local Processing**: All AI operations happen client-side
- **No Data Transmission**: Personal content never leaves your device
- **Offline Capable**: Core features work without internet connection
- **Zero External AI APIs**: Exclusively uses Chrome's Built-in AI

### 📚 Unified Knowledge Management
- **Digital Content**: Save articles, videos, PDFs, web pages with one click
- **Physical Items**: Track books, documents, and materials you own
- **Internet Archive Integration**: Access digital versions of physical books
- **Smart Categorization**: AI-powered organization and tagging
- **Natural Language Search**: Find content using conversational queries
- **Relationship Discovery**: AI identifies connections between your content

### 🔧 Chrome Extension Native
- **Manifest V3 Compliant**: Modern Chrome Extension architecture
- **Content Scripts**: Seamless page content capture
- **Service Worker**: Background AI processing
- **Side Panel**: Primary knowledge management interface
- **Extension Popup**: Quick access and content saving
- **Keyboard Shortcuts**: Power user productivity features

### 🌐 External Integration Ready
- **API Gateway**: Expose your knowledge base to external AI agents
- **Token-Based Security**: Controlled access to your personal data
- **Export Capabilities**: Data portability and backup options
- **AI Agent Integration**: Use with ChatGPT, Claude, and other AI assistants

## 🚀 Quick Start

### Prerequisites
- Chrome Browser (Latest version with Manifest V3 support)
- Chrome Built-in AI APIs enabled (Experimental features)

### Installation
```bash
# Clone the repository
git clone https://github.com/TheWhiteWord/SmartShelf-AI-Chrome-Extension.git
cd SmartShelf-AI-Chrome-Extension

# Install dependencies
npm install

# Build the extension
npm run build

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" and select the extension/ directory
```

### First Use
1. **Save Content**: Click the SmartShelf icon on any webpage to save it
2. **AI Processing**: Watch as content gets automatically summarized and categorized
3. **Search & Explore**: Use natural language to search your growing collection
4. **Add Physical Items**: Track books and documents you own physically
5. **Discover Connections**: Let AI reveal relationships between your content

## 🏗 Technical Architecture

### Chrome Extension Structure
```
extension/
├── manifest.json          # Extension configuration
├── background/           # Service Worker for AI processing
├── content/             # Content Scripts for page capture
├── popup/               # Quick access interface
├── sidepanel/           # Main knowledge management UI
├── options/             # Settings and configuration
└── shared/              # AI utilities and shared modules
```

### AI Processing Pipeline
1. **Content Capture**: Extract text, metadata, and context from web pages
2. **AI Enhancement**: Summarize, categorize, and tag using Chrome Built-in APIs
3. **Relationship Analysis**: Discover connections between content items
4. **Search Indexing**: Build optimized indices for fast natural language search
5. **Storage Optimization**: Efficient local storage using Chrome APIs and IndexedDB

### Data Models
- **ContentItem**: Digital and physical content with AI-enhanced metadata
- **Category**: Hierarchical organization structure
- **Tag**: Descriptive labels (user-defined and AI-generated)
- **Connection**: AI-discovered relationships between items
- **Collection**: Project-based content groupings

## 🧪 Testing Strategy

### Comprehensive Test Coverage
- **Unit Tests**: Individual components and AI API integrations
- **Integration Tests**: Chrome Extension functionality and workflows
- **Contract Tests**: Internal API endpoint validation
- **E2E Tests**: Complete user scenarios using Puppeteer
- **Performance Tests**: Large collection handling and AI processing speed

### Chrome AI API Testing
- **Mock Testing**: Controlled AI API responses for consistent testing
- **Real Content Testing**: Validation with actual web content
- **Error Handling**: Robust fallback strategies for API failures
- **Performance Validation**: Sub-500ms AI processing requirements

## 📊 Performance Goals

- **Content Capture**: <2 seconds from click to save
- **AI Processing**: <5 seconds for summarization
- **Search Response**: <500ms for query results
- **Collection Loading**: <1 second for 100+ items
- **Memory Usage**: <50MB for typical collections
- **Storage Efficiency**: Support 10,000+ items per user

## 🎯 Development Roadmap

### Phase 1: Foundation (Completed ✅)
- [x] Project constitution and governance
- [x] Feature specification and requirements
- [x] Technical research and architecture design
- [x] Implementation planning and task breakdown

### Phase 2: Core Development (In Progress 🚧)
- [ ] Chrome Extension project structure
- [ ] Test-Driven Development setup
- [ ] Chrome Built-in AI API integration
- [ ] Data models and storage services
- [ ] Content capture and processing pipeline

### Phase 3: AI Enhancement (Planned 📋)
- [ ] Advanced relationship discovery
- [ ] Natural language search optimization
- [ ] Internet Archive integration
- [ ] External API gateway development
- [ ] Performance optimization

### Phase 4: Polish & Launch (Planned 🎬)
- [ ] User interface refinement
- [ ] Comprehensive testing and bug fixes
- [ ] Documentation and tutorials
- [ ] Demo video production
- [ ] Hackathon submission preparation

## 🏛 Constitutional Principles

This project operates under a strict [constitutional framework](.specify/memory/constitution.md) ensuring:

1. **AI-First Architecture**: Every feature leverages Chrome Built-in AI APIs
2. **Privacy-Local Processing**: All AI operations remain client-side
3. **Extension-Native Design**: Deep Chrome browser integration
4. **Test-Chrome-APIs Integration**: Comprehensive AI API testing
5. **Hackathon-Focused Scope**: Timeline-conscious, demo-ready development

## 🤝 Contributing

This project is developed for the Chrome Built-in AI Challenge 2025. Post-hackathon, we welcome contributions!

### Development Setup
```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development mode
npm run dev

# Build extension
npm run build

# Lint code
npm run lint
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏅 Hackathon Submission

### Judging Criteria Alignment
- **Functionality**: Scalable AI-powered knowledge management
- **Purpose**: Solves real productivity challenges for knowledge workers
- **Content**: Clean, intuitive interface with AI enhancement
- **User Experience**: Seamless Chrome integration with powerful features
- **Technological Execution**: Comprehensive Chrome Built-in AI API showcase

### Competitive Advantages
1. **Physical-Digital Bridge**: First Chrome extension to unite physical and digital collections
2. **Privacy-First AI**: Local processing with zero data transmission
3. **AI Agent Ready**: Future-proof integration with external AI assistants
4. **Multimodal Processing**: Handle text, images, video, and audio content
5. **Relationship Intelligence**: AI-powered content connection discovery

---

**Built for the Chrome Built-in AI Challenge 2025** 🚀  
*Giving the web a brain boost and a creative spark!*
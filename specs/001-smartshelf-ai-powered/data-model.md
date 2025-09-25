# Data Model: SmartShelf Knowledge Hub

## Core Entities

### ContentItem

Represents any saved piece of digital or physical content in the user's collection.

**Fields**:

- `id`: Unique identifier (UUID)
- `title`: Display title
- `type`: Content type (article, video, book, document, image, audio)
- `source`: Origin information (URL, physical location, file path)
- `contentText`: Extracted or input content text
- `summary`: AI-generated summary
- `tags`: Array of descriptive labels (user-defined + AI-generated)
- `categories`: Hierarchical organization labels
- `dateAdded`: Creation timestamp
- `dateModified`: Last update timestamp
- `isPhysical`: Boolean indicating physical vs digital item
- `notes`: User annotations and personal insights
- `status`: Processing status (pending, processed, error)

**Relationships**:

- Has many `Tag` entities (many-to-many)
- Belongs to many `Category` entities (many-to-many)
- Has many `Connection` entities (one-to-many as source or target)
- Has many `SearchIndex` entries (one-to-many)

**Validation Rules**:

- Title required, max 200 characters
- Type must be from predefined enum
- Source required for digital items
- At least one category assignment required
- Summary generated within 24 hours of creation

### PhysicalItem

Extends ContentItem with physical-specific metadata for owned materials.

**Additional Fields**:

- `isbn`: Book ISBN when applicable
- `author`: Creator/author information
- `publisher`: Publishing information
- `physicalLocation`: Where item is stored
- `digitalVersion`: Link to Internet Archive or digital copy
- `acquisitionDate`: When item was acquired
- `condition`: Physical condition notes
- `loanStatus`: Available, loaned out, borrowed

**Relationships**:

- Inherits all ContentItem relationships
- May link to `DigitalVersion` entity

### Category

User-defined or AI-suggested organizational structure.

**Fields**:

- `id`: Unique identifier
- `name`: Category name
- `description`: Category purpose and scope
- `parentId`: Parent category for hierarchy (nullable)
- `color`: UI color assignment
- `isSystemGenerated`: Whether AI created this category
- `itemCount`: Number of items in category

**Relationships**:

- Has many ContentItem entities (many-to-many)
- Has many child Category entities (self-referential)
- Belongs to parent Category entity (self-referential, nullable)

### Tag

Descriptive labels for content discovery and organization.

**Fields**:

- `id`: Unique identifier
- `name`: Tag text
- `type`: user-defined, ai-generated, system
- `usageCount`: Number of items with this tag
- `confidence`: AI confidence score (for AI-generated tags)
- `color`: Optional UI color

**Relationships**:

- Has many ContentItem entities (many-to-many)

### Connection

AI-identified relationships between content items.

**Fields**:

- `id`: Unique identifier
- `sourceItemId`: First connected item
- `targetItemId`: Second connected item
- `connectionType`: similarity, citation, topic-related, temporal, causal
- `strength`: Relationship strength (0.0-1.0)
- `description`: AI-generated explanation of connection
- `isUserVerified`: Whether user confirmed connection
- `dateDiscovered`: When AI identified this connection

**Relationships**:

- Belongs to source ContentItem
- Belongs to target ContentItem

### SearchIndex

Optimized searchable representation of content for fast natural language queries.

**Fields**:

- `id`: Unique identifier
- `itemId`: Reference to ContentItem
- `searchableText`: Processed text for search
- `keywords`: Extracted key terms
- `embeddings`: Vector embeddings (when available)
- `lastIndexed`: Index update timestamp
- `indexVersion`: Schema version for migrations

**Relationships**:

- Belongs to one ContentItem

### Collection

User-defined groups of related items for project-based organization.

**Fields**:

- `id`: Unique identifier
- `name`: Collection name
- `description`: Purpose and contents description
- `isPrivate`: Privacy setting
- `dateCreated`: Creation date
- `itemIds`: Array of ContentItem IDs
- `shareToken`: Token for external access (nullable)

**Relationships**:

- Contains many ContentItem entities (many-to-many through itemIds)

### APIToken

Authentication mechanism for external access to knowledge base.

**Fields**:

- `id`: Unique identifier
- `name`: Human-readable token name
- `token`: Secure access token
- `permissions`: Array of allowed operations
- `expiresAt`: Expiration date (nullable for permanent)
- `lastUsed`: Last access timestamp
- `isActive`: Whether token is currently valid
- `rateLimitPerHour`: Usage limitations

### UserSettings

Extension configuration and preferences.

**Fields**:

- `id`: User identifier (always 'default' for single-user)
- `defaultCategories`: Initial category assignments
- `aiProcessingEnabled`: Whether to use AI features
- `autoTagging`: Automatic tagging preferences
- `searchPreferences`: Search behavior configuration
- `interfaceTheme`: UI appearance settings
- `backupFrequency`: Automatic backup settings
- `privacySettings`: Data sharing preferences

## State Transitions

### ContentItem Processing States

1. **pending**: Just saved, awaiting AI processing
2. **processing**: AI APIs currently analyzing content  
3. **processed**: All AI analysis complete
4. **error**: Processing failed, user intervention needed
5. **manual**: User opted out of AI processing

### Connection Discovery States

1. **candidate**: Potential connection identified
2. **confirmed**: AI confidence above threshold
3. **user-verified**: User manually confirmed
4. **rejected**: User or system rejected connection

### API Token States

1. **active**: Valid and usable
2. **expired**: Past expiration date
3. **revoked**: Manually disabled
4. **suspended**: Temporarily disabled due to abuse

## Data Flow Patterns

### Content Capture Flow

1. User triggers save action (click extension, keyboard shortcut)
2. ContentItem created with basic metadata (pending state)
3. Content extraction (text, metadata) via Content Script
4. Background Service Worker queues AI processing
5. AI APIs process content (summarization, categorization, tagging)
6. SearchIndex updated with processed content
7. Connection discovery runs against existing items
8. ContentItem state updated to processed

### Search Query Flow

1. User enters natural language query
2. Query processed by Prompt API for intent understanding
3. SearchIndex queried using keywords and embeddings
4. Results ranked by relevance and connection strength
5. Related items surfaced through Connection entities
6. Results presented with AI-generated explanations

### Physical Item Integration Flow

1. User manually adds physical item details
2. PhysicalItem created with available metadata
3. Internet Archive API queried for digital version
4. If found, digital content linked and indexed
5. Physical location tracking enabled
6. Item participates in search and connections like digital content

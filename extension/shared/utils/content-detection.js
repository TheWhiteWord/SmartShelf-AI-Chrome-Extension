/**
 * Content Detection Utilities
 * 
 * Provides intelligent content type classification and platform detection.
 * Used by content script to categorize web pages and determine optimal processing strategies.
 * 
 * Detection Categories:
 * - video: Video platforms and streaming services
 * - document: PDFs, Word docs, images, and other file types
 * - social: Social media platforms
 * - research: Academic papers, journals, and scholarly content
 * - code: Code repositories and version control platforms
 * - documentation: API docs, programming guides, and technical references
 * - blog: Blog platforms and personal publishing sites
 * - news: News outlets and journalism sites
 * - article: Generic articles and long-form content
 * - reference: Encyclopedias and knowledge bases
 * - shopping: E-commerce and retail sites
 * - webpage: Default classification for unidentified content
 * 
 * @module content-detection
 */

/**
 * Video platform hostnames for detection
 */
const VIDEO_PLATFORMS = [
  'youtube.com', 'youtu.be', 'm.youtube.com',
  'vimeo.com', 'player.vimeo.com',
  'dailymotion.com', 'dai.ly',
  'twitch.tv',
  'tiktok.com',
  'netflix.com',
  'hulu.com',
  'primevideo.com',
  'disneyplus.com'
];

/**
 * Document file extensions
 */
const DOCUMENT_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'odt',
  'xls', 'xlsx', 'ods',
  'ppt', 'pptx', 'odp',
  'txt', 'rtf'
];

/**
 * Image file extensions
 */
const IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'
];

/**
 * Document MIME types
 */
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'text/plain'
];

/**
 * Image MIME types
 */
const IMAGE_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'
];

/**
 * Social media platform hostnames
 */
const SOCIAL_PLATFORMS = [
  'twitter.com', 'x.com', 'mobile.twitter.com',
  'linkedin.com',
  'facebook.com', 'm.facebook.com', 'fb.com',
  'instagram.com',
  'reddit.com',
  'mastodon.social',
  'threads.net',
  'bsky.app',
  'snapchat.com',
  'pinterest.com'
];

/**
 * Research platform hostnames
 */
const RESEARCH_PLATFORMS = [
  'arxiv.org',
  'pubmed.ncbi.nlm.nih.gov', 'ncbi.nlm.nih.gov',
  'scholar.google.com',
  'springer.com',
  'sciencedirect.com',
  'ieee.org',
  'acm.org',
  'nature.com',
  'science.org',
  'researchgate.net',
  'academia.edu',
  'jstor.org',
  'wiley.com'
];

/**
 * Research content keywords
 */
const RESEARCH_KEYWORDS = [
  'abstract:', 'doi:', 'references:', 'citation', 'journal', 'peer-reviewed'
];

/**
 * Code repository platforms
 */
const CODE_PLATFORMS = [
  'github.com',
  'gitlab.com',
  'bitbucket.org',
  'codeberg.org',
  'sourceforge.net'
];

/**
 * Documentation site patterns
 */
const DOCUMENTATION_PATTERNS = [
  'docs.', 'developer.', 'documentation.',
  'stackoverflow.com', 'stackexchange.com'
];

/**
 * Blog platforms
 */
const BLOG_PLATFORMS = [
  'medium.com',
  'substack.com',
  'dev.to',
  'hashnode.com',
  'blogger.com',
  'wordpress.com',
  'ghost.io',
  'tumblr.com'
];

/**
 * News outlets
 */
const NEWS_OUTLETS = [
  'cnn.com', 'bbc.com', 'bbc.co.uk', 'reuters.com',
  'nytimes.com', 'theguardian.com', 'wsj.com',
  'washingtonpost.com', 'apnews.com', 'npr.org',
  'aljazeera.com', 'ft.com', 'bloomberg.com'
];

/**
 * Reference sites
 */
const REFERENCE_SITES = [
  'wikipedia.org',
  'britannica.com',
  'dictionary.com',
  'merriam-webster.com'
];

/**
 * Shopping sites
 */
const SHOPPING_SITES = [
  'amazon.com', 'ebay.com', 'etsy.com',
  'walmart.com', 'target.com', 'bestbuy.com',
  'aliexpress.com', 'shopify.com'
];

/**
 * Detect if URL is from a video platform
 * 
 * @param {string} url - Full URL to check
 * @param {string} hostname - Hostname extracted from URL
 * @returns {string|null} 'video' if video platform detected, null otherwise
 */
function detectVideoContent(url, hostname) {
  if (!url || !hostname) return null;
  
  const normalizedHostname = hostname.toLowerCase().replace(/^www\./, '');
  
  return VIDEO_PLATFORMS.some(platform => 
    normalizedHostname === platform || normalizedHostname.endsWith('.' + platform)
  ) ? 'video' : null;
}

/**
 * Detect document type from URL and content type
 * 
 * @param {string} url - Full URL to check
 * @param {string} contentType - MIME type from HTTP headers
 * @returns {string|null} 'document' for documents, 'image' for images, null otherwise
 */
function detectDocumentType(url, contentType) {
  if (!url && !contentType) return null;
  
  // Check MIME type first (more reliable)
  if (contentType) {
    const normalizedType = contentType.toLowerCase().split(';')[0].trim();
    
    if (IMAGE_MIME_TYPES.includes(normalizedType)) {
      return 'image';
    }
    
    if (DOCUMENT_MIME_TYPES.includes(normalizedType)) {
      return 'document';
    }
  }
  
  // Check file extension in URL
  if (url) {
    const urlLower = url.toLowerCase();
    const extension = urlLower.split('.').pop().split('?')[0].split('#')[0];
    
    if (IMAGE_EXTENSIONS.includes(extension)) {
      return 'image';
    }
    
    if (DOCUMENT_EXTENSIONS.includes(extension)) {
      return 'document';
    }
  }
  
  return null;
}

/**
 * Detect if hostname is a social media platform
 * 
 * @param {string} hostname - Hostname to check
 * @returns {string|null} 'social' if social media platform detected, null otherwise
 */
function detectSocialMedia(hostname) {
  if (!hostname) return null;
  
  const normalizedHostname = hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  
  return SOCIAL_PLATFORMS.some(platform =>
    normalizedHostname === platform || normalizedHostname.endsWith('.' + platform)
  ) ? 'social' : null;
}

/**
 * Detect if content is research/academic material
 * 
 * @param {string} hostname - Hostname to check
 * @param {string} content - Page content to analyze (optional)
 * @returns {string|null} 'research' if research content detected, null otherwise
 */
function detectResearchContent(hostname, content) {
  if (!hostname && !content) return null;
  
  // Check hostname first
  if (hostname) {
    const normalizedHostname = hostname.toLowerCase().replace(/^www\./, '');
    
    const isResearchPlatform = RESEARCH_PLATFORMS.some(platform =>
      normalizedHostname === platform || normalizedHostname.endsWith('.' + platform)
    );
    
    if (isResearchPlatform) return 'research';
  }
  
  // Check content for research keywords
  if (content) {
    const contentLower = content.toLowerCase().substring(0, 5000); // Check first 5KB only
    
    const hasResearchKeywords = RESEARCH_KEYWORDS.some(keyword =>
      contentLower.includes(keyword)
    );
    
    if (hasResearchKeywords) return 'research';
  }
  
  return null;
}

/**
 * Detect if hostname is a code repository platform
 * 
 * @param {string} hostname - Hostname to check
 * @returns {string|null} 'code' if code platform detected, null otherwise
 */
function detectCodePlatform(hostname) {
  if (!hostname) return null;
  
  const normalizedHostname = hostname.toLowerCase().replace(/^www\./, '');
  
  return CODE_PLATFORMS.some(platform =>
    normalizedHostname === platform || normalizedHostname.endsWith('.' + platform)
  ) ? 'code' : null;
}

/**
 * Detect if hostname is a documentation site
 * 
 * @param {string} hostname - Hostname to check
 * @returns {string|null} 'documentation' if docs site detected, null otherwise
 */
function detectDocumentation(hostname) {
  if (!hostname) return null;
  
  const normalizedHostname = hostname.toLowerCase();
  
  // Check exact matches first
  const exactMatch = DOCUMENTATION_PATTERNS.some(pattern =>
    normalizedHostname === pattern || normalizedHostname.includes(pattern)
  );
  
  if (exactMatch) return 'documentation';
  
  // Check for common documentation subdomain patterns
  if (normalizedHostname.startsWith('docs.') || 
      normalizedHostname.startsWith('developer.') ||
      normalizedHostname.startsWith('api.')) {
    return 'documentation';
  }
  
  return null;
}

/**
 * Detect if hostname is a blog platform
 * 
 * @param {string} hostname - Hostname to check
 * @returns {string|null} 'blog' if blog platform detected, null otherwise
 */
function detectBlogPlatform(hostname) {
  if (!hostname) return null;
  
  const normalizedHostname = hostname.toLowerCase().replace(/^www\./, '');
  
  return BLOG_PLATFORMS.some(platform =>
    normalizedHostname === platform || normalizedHostname.endsWith('.' + platform)
  ) ? 'blog' : null;
}

/**
 * Detect if hostname is a news outlet
 * 
 * @param {string} hostname - Hostname to check
 * @returns {string|null} 'news' if news outlet detected, null otherwise
 */
function detectNewsOutlet(hostname) {
  if (!hostname) return null;
  
  const normalizedHostname = hostname.toLowerCase().replace(/^www\./, '');
  
  return NEWS_OUTLETS.some(outlet =>
    normalizedHostname === outlet || normalizedHostname.endsWith('.' + outlet)
  ) ? 'news' : null;
}

/**
 * Detect if hostname is a reference site
 * 
 * @param {string} hostname - Hostname to check
 * @returns {string|null} 'reference' if reference site detected, null otherwise
 */
function detectReferenceSite(hostname) {
  if (!hostname) return null;
  
  const normalizedHostname = hostname.toLowerCase().replace(/^www\./, '');
  
  return REFERENCE_SITES.some(site =>
    normalizedHostname.includes(site)
  ) ? 'reference' : null;
}

/**
 * Detect if hostname is a shopping site
 * 
 * @param {string} hostname - Hostname to check
 * @returns {string|null} 'shopping' if shopping site detected, null otherwise
 */
function detectShoppingSite(hostname) {
  if (!hostname) return null;
  
  const normalizedHostname = hostname.toLowerCase().replace(/^www\./, '');
  
  return SHOPPING_SITES.some(site =>
    normalizedHostname === site || normalizedHostname.endsWith('.' + site)
  ) ? 'shopping' : null;
}

/**
 * Detect if content contains article structure
 * 
 * @param {string} content - Page content to check
 * @returns {string|null} 'article' if article structure detected, null otherwise
 */
function detectArticleContent(content) {
  if (!content) return null;
  
  const contentLower = content.toLowerCase();
  
  // Look for article HTML tags
  if (contentLower.includes('<article>') || contentLower.includes('<article ')) {
    return 'article';
  }
  
  return null;
}

/**
 * Classify content type based on URL, hostname, and content
 * 
 * Detection priority (highest to lowest):
 * 1. Video platforms
 * 2. Research content (takes priority over document type for academic PDFs)
 * 3. Document/Image files
 * 4. Social media
 * 5. Code repositories
 * 6. Documentation sites
 * 7. Blog platforms
 * 8. News outlets
 * 9. Reference sites
 * 10. Shopping sites
 * 11. Article content
 * 12. Generic webpage (default)
 * 
 * @param {string} url - Full URL of the page
 * @param {string} hostname - Hostname extracted from URL
 * @param {string} content - Page content for additional analysis (optional)
 * @returns {string} Content type classification
 */
function detectContentType(url, hostname, content) {
  // Handle null/undefined inputs
  if (!url && !hostname) return 'webpage';
  
  // Priority 1: Video content
  const videoType = detectVideoContent(url, hostname);
  if (videoType) return videoType;
  
  // Priority 2: Research content (check before documents for academic PDFs)
  const researchType = detectResearchContent(hostname, content);
  if (researchType) return researchType;
  
  // Priority 3: Document/Image files
  const docType = detectDocumentType(url, null);
  if (docType) return docType;
  
  // Priority 4: Social media
  const socialType = detectSocialMedia(hostname);
  if (socialType) return socialType;
  
  // Priority 5: Code repositories
  const codeType = detectCodePlatform(hostname);
  if (codeType) return codeType;
  
  // Priority 6: Documentation
  const docsType = detectDocumentation(hostname);
  if (docsType) return docsType;
  
  // Priority 7: Blog platforms
  const blogType = detectBlogPlatform(hostname);
  if (blogType) return blogType;
  
  // Priority 8: News outlets
  const newsType = detectNewsOutlet(hostname);
  if (newsType) return newsType;
  
  // Priority 9: Reference sites
  const refType = detectReferenceSite(hostname);
  if (refType) return refType;
  
  // Priority 10: Shopping sites
  const shopType = detectShoppingSite(hostname);
  if (shopType) return shopType;
  
  // Priority 11: Article content
  const articleType = detectArticleContent(content);
  if (articleType) return articleType;
  
  // Default: Generic webpage
  return 'webpage';
}

// Export all functions
module.exports = {
  detectContentType,
  detectVideoContent,
  detectDocumentType,
  detectSocialMedia,
  detectResearchContent,
  // Additional exports for granular testing
  detectCodePlatform,
  detectDocumentation,
  detectBlogPlatform,
  detectNewsOutlet,
  detectReferenceSite,
  detectShoppingSite,
  detectArticleContent
};

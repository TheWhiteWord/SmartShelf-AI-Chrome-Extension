/**
 * Unit Tests: Content Type Detection Utilities
 * 
 * Tests for content type classification, platform detection, and content analysis.
 * Following TDD - these tests will fail until content-detection.js is implemented.
 * 
 * Test Coverage:
 * - Video platform detection (YouTube, Vimeo, Dailymotion, etc.)
 * - Document type detection (PDF, DOC, images, etc.)
 * - Social media platform detection (Twitter/X, LinkedIn, Facebook, etc.)
 * - Research content detection (ArXiv, PubMed, Google Scholar, etc.)
 * - Development platforms (GitHub, GitLab, documentation sites)
 * - Blog platforms (Reddit, Medium, Substack, WordPress, etc.)
 * - News sites (CNN, BBC, Reuters, etc.)
 * - Generic content classification
 * - Edge cases and error handling
 */

const {
  detectContentType,
  detectVideoContent,
  detectDocumentType,
  detectSocialMedia,
  detectResearchContent,
} = require('../../../extension/shared/utils/content-detection');

describe('Content Detection Utilities', () => {
  
  // ============================================================================
  // Video Platform Detection Tests
  // ============================================================================
  
  describe('detectVideoContent', () => {
    test('should detect YouTube URLs', () => {
      expect(detectVideoContent('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube.com')).toBe('video');
      expect(detectVideoContent('https://youtu.be/dQw4w9WgXcQ', 'youtu.be')).toBe('video');
      expect(detectVideoContent('https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'm.youtube.com')).toBe('video');
      expect(detectVideoContent('https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube.com')).toBe('video');
    });

    test('should detect Vimeo URLs', () => {
      expect(detectVideoContent('https://vimeo.com/123456789', 'vimeo.com')).toBe('video');
      expect(detectVideoContent('https://player.vimeo.com/video/123456789', 'player.vimeo.com')).toBe('video');
    });

    test('should detect Dailymotion URLs', () => {
      expect(detectVideoContent('https://www.dailymotion.com/video/x8abcdef', 'dailymotion.com')).toBe('video');
      expect(detectVideoContent('https://dai.ly/x8abcdef', 'dai.ly')).toBe('video');
    });

    test('should detect other video platforms', () => {
      expect(detectVideoContent('https://www.twitch.tv/channel', 'twitch.tv')).toBe('video');
      expect(detectVideoContent('https://www.tiktok.com/@user/video/123', 'tiktok.com')).toBe('video');
      expect(detectVideoContent('https://www.netflix.com/watch/123', 'netflix.com')).toBe('video');
      expect(detectVideoContent('https://www.hulu.com/watch/123', 'hulu.com')).toBe('video');
    });

    test('should return null for non-video URLs', () => {
      expect(detectVideoContent('https://www.google.com', 'google.com')).toBeNull();
      expect(detectVideoContent('https://www.wikipedia.org', 'wikipedia.org')).toBeNull();
    });

    test('should handle edge cases', () => {
      expect(detectVideoContent('', '')).toBeNull();
      expect(detectVideoContent(null, null)).toBeNull();
      expect(detectVideoContent(undefined, undefined)).toBeNull();
    });
  });

  // ============================================================================
  // Document Type Detection Tests
  // ============================================================================
  
  describe('detectDocumentType', () => {
    test('should detect PDF files', () => {
      expect(detectDocumentType('https://example.com/document.pdf', 'application/pdf')).toBe('document');
      expect(detectDocumentType('https://example.com/file.PDF', null)).toBe('document');
      expect(detectDocumentType('https://example.com/path/to/file.pdf', null)).toBe('document');
    });

    test('should detect Word documents', () => {
      expect(detectDocumentType('https://example.com/document.doc', null)).toBe('document');
      expect(detectDocumentType('https://example.com/document.docx', null)).toBe('document');
      expect(detectDocumentType('https://example.com/file.DOC', null)).toBe('document');
    });

    test('should detect image files', () => {
      expect(detectDocumentType('https://example.com/image.jpg', 'image/jpeg')).toBe('image');
      expect(detectDocumentType('https://example.com/image.png', 'image/png')).toBe('image');
      expect(detectDocumentType('https://example.com/image.gif', 'image/gif')).toBe('image');
      expect(detectDocumentType('https://example.com/image.webp', 'image/webp')).toBe('image');
      expect(detectDocumentType('https://example.com/image.svg', 'image/svg+xml')).toBe('image');
    });

    test('should detect other document formats', () => {
      expect(detectDocumentType('https://example.com/spreadsheet.xlsx', null)).toBe('document');
      expect(detectDocumentType('https://example.com/presentation.pptx', null)).toBe('document');
      expect(detectDocumentType('https://example.com/file.odt', null)).toBe('document');
      expect(detectDocumentType('https://example.com/file.txt', 'text/plain')).toBe('document');
    });

    test('should handle content type parameter', () => {
      expect(detectDocumentType('https://example.com/download', 'application/pdf')).toBe('document');
      expect(detectDocumentType('https://example.com/download', 'application/msword')).toBe('document');
      expect(detectDocumentType('https://example.com/download', 'image/jpeg')).toBe('image');
    });

    test('should return null for non-document URLs', () => {
      expect(detectDocumentType('https://example.com/page.html', 'text/html')).toBeNull();
      expect(detectDocumentType('https://example.com/', null)).toBeNull();
    });

    test('should handle edge cases', () => {
      expect(detectDocumentType('', '')).toBeNull();
      expect(detectDocumentType(null, null)).toBeNull();
      expect(detectDocumentType('https://example.com/file.unknown', null)).toBeNull();
    });
  });

  // ============================================================================
  // Social Media Platform Detection Tests
  // ============================================================================
  
  describe('detectSocialMedia', () => {
    test('should detect Twitter/X', () => {
      expect(detectSocialMedia('twitter.com')).toBe('social');
      expect(detectSocialMedia('x.com')).toBe('social');
      expect(detectSocialMedia('mobile.twitter.com')).toBe('social');
    });

    test('should detect LinkedIn', () => {
      expect(detectSocialMedia('linkedin.com')).toBe('social');
      expect(detectSocialMedia('www.linkedin.com')).toBe('social');
    });

    test('should detect Facebook', () => {
      expect(detectSocialMedia('facebook.com')).toBe('social');
      expect(detectSocialMedia('www.facebook.com')).toBe('social');
      expect(detectSocialMedia('m.facebook.com')).toBe('social');
      expect(detectSocialMedia('fb.com')).toBe('social');
    });

    test('should detect other social media platforms', () => {
      expect(detectSocialMedia('instagram.com')).toBe('social');
      expect(detectSocialMedia('reddit.com')).toBe('social');
      expect(detectSocialMedia('mastodon.social')).toBe('social');
      expect(detectSocialMedia('threads.net')).toBe('social');
      expect(detectSocialMedia('bsky.app')).toBe('social');
    });

    test('should return null for non-social media sites', () => {
      expect(detectSocialMedia('google.com')).toBeNull();
      expect(detectSocialMedia('wikipedia.org')).toBeNull();
    });

    test('should handle edge cases', () => {
      expect(detectSocialMedia('')).toBeNull();
      expect(detectSocialMedia(null)).toBeNull();
      expect(detectSocialMedia(undefined)).toBeNull();
    });
  });

  // ============================================================================
  // Research Content Detection Tests
  // ============================================================================
  
  describe('detectResearchContent', () => {
    test('should detect ArXiv', () => {
      expect(detectResearchContent('arxiv.org', null)).toBe('research');
      expect(detectResearchContent('www.arxiv.org', null)).toBe('research');
    });

    test('should detect PubMed', () => {
      expect(detectResearchContent('pubmed.ncbi.nlm.nih.gov', null)).toBe('research');
      expect(detectResearchContent('ncbi.nlm.nih.gov', null)).toBe('research');
    });

    test('should detect Google Scholar', () => {
      expect(detectResearchContent('scholar.google.com', null)).toBe('research');
    });

    test('should detect academic publishers', () => {
      expect(detectResearchContent('springer.com', null)).toBe('research');
      expect(detectResearchContent('sciencedirect.com', null)).toBe('research');
      expect(detectResearchContent('ieee.org', null)).toBe('research');
      expect(detectResearchContent('acm.org', null)).toBe('research');
      expect(detectResearchContent('nature.com', null)).toBe('research');
    });

    test('should detect research keywords in content', () => {
      const academicContent = 'Abstract: This paper presents a novel approach...';
      expect(detectResearchContent('example.com', academicContent)).toBe('research');
      
      const citationContent = 'References: [1] Smith et al. (2023)...';
      expect(detectResearchContent('example.com', citationContent)).toBe('research');
      
      const doiContent = 'DOI: 10.1234/example.2023.123';
      expect(detectResearchContent('example.com', doiContent)).toBe('research');
    });

    test('should return null for non-research content', () => {
      expect(detectResearchContent('google.com', null)).toBeNull();
      expect(detectResearchContent('example.com', 'Just a blog post')).toBeNull();
    });

    test('should handle edge cases', () => {
      expect(detectResearchContent('', '')).toBeNull();
      expect(detectResearchContent(null, null)).toBeNull();
      expect(detectResearchContent('example.com', null)).toBeNull();
    });
  });

  // ============================================================================
  // Content Type Classification Tests
  // ============================================================================
  
  describe('detectContentType', () => {
    test('should classify video content', () => {
      const result = detectContentType('https://www.youtube.com/watch?v=123', 'youtube.com', null);
      expect(result).toBe('video');
    });

    test('should classify documents', () => {
      const result = detectContentType('https://example.com/paper.pdf', 'example.com', null);
      expect(result).toBe('document');
    });

    test('should classify social media content', () => {
      const result = detectContentType('https://twitter.com/user/status/123', 'twitter.com', null);
      expect(result).toBe('social');
    });

    test('should classify research content', () => {
      const result = detectContentType('https://arxiv.org/abs/2301.12345', 'arxiv.org', null);
      expect(result).toBe('research');
    });

    test('should classify GitHub repositories', () => {
      const result = detectContentType('https://github.com/user/repo', 'github.com', null);
      expect(result).toBe('code');
      
      const gitlabResult = detectContentType('https://gitlab.com/user/repo', 'gitlab.com', null);
      expect(gitlabResult).toBe('code');
    });

    test('should classify documentation sites', () => {
      const result = detectContentType('https://docs.python.org/3/', 'docs.python.org', null);
      expect(result).toBe('documentation');
      
      const mdnResult = detectContentType('https://developer.mozilla.org/', 'developer.mozilla.org', null);
      expect(mdnResult).toBe('documentation');
    });

    test('should classify blog platforms', () => {
      const mediumResult = detectContentType('https://medium.com/@user/post', 'medium.com', null);
      expect(mediumResult).toBe('blog');
      
      const substackResult = detectContentType('https://example.substack.com/p/post', 'example.substack.com', null);
      expect(substackResult).toBe('blog');
      
      const devToResult = detectContentType('https://dev.to/user/post', 'dev.to', null);
      expect(devToResult).toBe('blog');
    });

    test('should classify news sites', () => {
      const cnnResult = detectContentType('https://www.cnn.com/2024/article', 'cnn.com', null);
      expect(cnnResult).toBe('news');
      
      const bbcResult = detectContentType('https://www.bbc.com/news/article', 'bbc.com', null);
      expect(bbcResult).toBe('news');
      
      const reutersResult = detectContentType('https://www.reuters.com/article', 'reuters.com', null);
      expect(reutersResult).toBe('news');
    });

    test('should classify generic articles', () => {
      const result = detectContentType('https://example.com/article', 'example.com', '<article>Content</article>');
      expect(result).toBe('article');
    });

    test('should default to webpage for unclassified content', () => {
      const result = detectContentType('https://example.com/', 'example.com', null);
      expect(result).toBe('webpage');
    });

    test('should handle edge cases: localhost', () => {
      const result = detectContentType('http://localhost:3000/', 'localhost', null);
      expect(result).toBe('webpage');
    });

    test('should handle edge cases: file:// URLs', () => {
      const result = detectContentType('file:///home/user/document.pdf', '', null);
      expect(result).toBe('document');
    });

    test('should handle edge cases: chrome:// URLs', () => {
      const result = detectContentType('chrome://extensions/', '', null);
      expect(result).toBe('webpage');
    });

    test('should handle priority: video > document > social > research', () => {
      // Video should take priority
      const videoResult = detectContentType('https://youtube.com/watch?v=123', 'youtube.com', null);
      expect(videoResult).toBe('video');
      
      // Document should take priority over generic content
      const docResult = detectContentType('https://example.com/file.pdf', 'example.com', null);
      expect(docResult).toBe('document');
    });

    test('should handle null/undefined inputs', () => {
      expect(detectContentType(null, null, null)).toBe('webpage');
      expect(detectContentType(undefined, undefined, undefined)).toBe('webpage');
      expect(detectContentType('', '', '')).toBe('webpage');
    });

    test('should handle malformed URLs', () => {
      const result = detectContentType('not-a-url', 'invalid', null);
      expect(result).toBe('webpage');
    });

    test('should be case-insensitive for extensions', () => {
      const upperCase = detectContentType('https://example.com/FILE.PDF', 'example.com', null);
      expect(upperCase).toBe('document');
      
      const mixedCase = detectContentType('https://example.com/file.PdF', 'example.com', null);
      expect(mixedCase).toBe('document');
    });

    test('should detect Stack Overflow as documentation', () => {
      const result = detectContentType('https://stackoverflow.com/questions/123', 'stackoverflow.com', null);
      expect(result).toBe('documentation');
    });

    test('should detect Wikipedia as reference', () => {
      const result = detectContentType('https://en.wikipedia.org/wiki/Topic', 'en.wikipedia.org', null);
      expect(result).toBe('reference');
    });

    test('should detect e-commerce sites', () => {
      const amazonResult = detectContentType('https://www.amazon.com/product/dp/123', 'amazon.com', null);
      expect(amazonResult).toBe('shopping');
      
      const ebayResult = detectContentType('https://www.ebay.com/itm/123', 'ebay.com', null);
      expect(ebayResult).toBe('shopping');
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  
  describe('Content Detection Integration', () => {
    test('should handle complete real-world scenarios', () => {
      // YouTube video
      expect(detectContentType(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'youtube.com',
        '<title>Never Gonna Give You Up - YouTube</title>'
      )).toBe('video');

      // ArXiv paper
      expect(detectContentType(
        'https://arxiv.org/abs/2301.12345',
        'arxiv.org',
        'Abstract: This paper presents...'
      )).toBe('research');

      // Medium blog post
      expect(detectContentType(
        'https://medium.com/@user/great-article-123',
        'medium.com',
        '<article>Content here</article>'
      )).toBe('blog');

      // GitHub repository
      expect(detectContentType(
        'https://github.com/facebook/react',
        'github.com',
        '<div class="repository-content">'
      )).toBe('code');

      // PDF document
      expect(detectContentType(
        'https://example.com/whitepaper.pdf',
        'example.com',
        null
      )).toBe('document');
    });

    test('should handle multiple detection methods', () => {
      // Should detect via hostname AND content
      const result = detectContentType(
        'https://arxiv.org/pdf/2301.12345.pdf',
        'arxiv.org',
        'Abstract: Machine learning...'
      );
      expect(result).toBe('research');
    });

    test('should handle conflicting signals gracefully', () => {
      // PDF on YouTube (hypothetical edge case)
      const result = detectContentType(
        'https://www.youtube.com/something.pdf',
        'youtube.com',
        null
      );
      // Video detection should take priority
      expect(result).toBe('video');
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================
  
  describe('Performance', () => {
    test('should handle large content efficiently', () => {
      const largeContent = 'Abstract: '.repeat(10000) + 'Machine learning...';
      
      const startTime = performance.now();
      detectContentType('https://example.com/article', 'example.com', largeContent);
      const endTime = performance.now();
      
      // Should complete in less than 100ms even with large content
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should handle many consecutive calls efficiently', () => {
      const urls = [
        'https://youtube.com/watch?v=1',
        'https://twitter.com/user/status/1',
        'https://arxiv.org/abs/1',
        'https://github.com/user/repo',
        'https://example.com/article.pdf',
      ];

      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        const url = urls[i % urls.length];
        const hostname = new URL(url).hostname;
        detectContentType(url, hostname, null);
      }
      const endTime = performance.now();

      // Should handle 1000 calls in less than 500ms
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});

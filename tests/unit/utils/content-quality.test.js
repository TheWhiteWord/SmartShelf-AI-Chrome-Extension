/**
 * Unit Tests: Content Quality Assessment Utilities
 * Test suite for extension/shared/utils/content-quality.js
 * 
 * Following TDD principles - comprehensive testing of quality assessment functions
 * 
 * Test Coverage:
 * - estimateReadingTime() - Reading time calculation
 * - assessContentQuality() - Overall quality scoring
 * - calculateQualityScore() - Score calculation logic
 * - detectSpamContent() - Spam/promotional content detection
 * 
 * Test Scenarios:
 * - High-quality articles (excellent: 80-100)
 * - Medium-quality content (good: 60-79, fair: 40-59)
 * - Low-quality content (poor: <40)
 * - Spam/promotional content detection
 * - Reading time: short (<1 min), medium (1-10 min), long (>10 min)
 * - Edge cases: empty content, very long content (100k+ words)
 */

const {
  estimateReadingTime,
  assessContentQuality,
  calculateQualityScore,
  detectSpamContent
} = require('../../../extension/shared/utils/content-quality.js')

describe('Content Quality Assessment Utilities', () => {

  // ============================================================================
  // estimateReadingTime() Tests
  // ============================================================================

  describe('estimateReadingTime()', () => {

    it('should calculate reading time for short content (<1 min)', () => {
      const content = 'This is a short paragraph with about twenty words in total for testing purposes.'
      const result = estimateReadingTime(content)

      expect(result.words).toBe(14)
      expect(result.minutes).toBe(1)
      expect(result.text).toBe('1 min read')
    })

    it('should calculate reading time for medium content (1-10 min)', () => {
      const content = 'word '.repeat(500) // 500 words
      const result = estimateReadingTime(content)

      expect(result.words).toBe(500)
      expect(result.minutes).toBe(3) // 500 / 200 WPM = 2.5, rounds to 3
      expect(result.text).toBe('3 min read')
    })

    it('should calculate reading time for long content (>10 min)', () => {
      const content = 'word '.repeat(2500) // 2500 words
      const result = estimateReadingTime(content)

      expect(result.words).toBe(2500)
      expect(result.minutes).toBe(13) // 2500 / 200 WPM = 12.5, rounds to 13
      expect(result.text).toBe('13 min read')
    })

    it('should handle empty content', () => {
      const result = estimateReadingTime('')

      expect(result.words).toBe(0)
      expect(result.minutes).toBe(0)
      expect(result.text).toBe('0 min read')
    })

    it('should handle null/undefined content', () => {
      expect(estimateReadingTime(null).minutes).toBe(0)
      expect(estimateReadingTime(undefined).minutes).toBe(0)
      expect(estimateReadingTime(null).text).toBe('0 min read')
    })

    it('should handle content with multiple spaces and newlines', () => {
      const content = 'Word1   Word2\n\nWord3\tWord4     Word5'
      const result = estimateReadingTime(content)

      expect(result.words).toBe(5)
      expect(result.minutes).toBe(1)
    })

    it('should use custom words per minute rate', () => {
      const content = 'word '.repeat(300) // 300 words
      const result = estimateReadingTime(content, 300) // Fast reader

      expect(result.words).toBe(300)
      expect(result.minutes).toBe(1) // 300 / 300 = 1
    })

    it('should handle very long content (100k+ words)', () => {
      const content = 'word '.repeat(100000) // 100k words
      const result = estimateReadingTime(content)

      expect(result.words).toBe(100000)
      expect(result.minutes).toBe(500) // 100000 / 200 = 500 minutes
      expect(result.text).toBe('500 min read')
    })

    it('should always return at least 1 minute for non-empty content', () => {
      const content = 'Just five words here now'
      const result = estimateReadingTime(content)

      expect(result.minutes).toBeGreaterThanOrEqual(1)
    })

    it('should handle content with only whitespace', () => {
      const content = '     \n\n\t\t   '
      const result = estimateReadingTime(content)

      expect(result.words).toBe(0)
      expect(result.minutes).toBe(0)
    })
  })

  // ============================================================================
  // assessContentQuality() Tests
  // ============================================================================

  describe('assessContentQuality()', () => {

    // High-quality content tests (excellent: 80-100)

    it('should rate high-quality article as excellent (80-100)', () => {
      const pageData = {
        title: 'Comprehensive Guide to Modern Web Development',
        content: 'This is a detailed article with substantial content. '.repeat(50), // ~500 words
        meta: {
          description: 'A thorough guide covering all aspects of modern web development practices.'
        },
        images: [
          { src: 'image1.jpg', alt: 'Diagram 1' },
          { src: 'image2.jpg', alt: 'Diagram 2' }
        ],
        links: [
          { href: 'https://example.com/resource1', text: 'Resource 1' },
          { href: 'https://example.com/resource2', text: 'Resource 2' }
        ],
        structuredData: {
          '@type': 'Article',
          author: 'John Doe'
        }
      }

      const result = assessContentQuality(pageData)

      expect(result.score).toBeGreaterThanOrEqual(80)
      expect(result.rating).toBe('excellent')
      expect(result.indicators.hasTitle).toBe(true)
      expect(result.indicators.hasMeaningfulTitle).toBe(true)
      expect(result.indicators.hasSubstantialContent).toBe(true)
      expect(result.isSpam).toBe(false)
    })

    it('should rate article with all quality indicators as excellent', () => {
      const pageData = {
        title: 'Understanding Machine Learning Algorithms',
        content: 'word '.repeat(1000), // 1000 words
        meta: {
          description: 'Comprehensive guide to ML algorithms'
        },
        images: [{ src: 'diagram.jpg', alt: 'ML Diagram' }],
        links: Array(10).fill({ href: 'https://example.com', text: 'Reference' }),
        structuredData: { '@type': 'TechArticle' }
      }

      const result = assessContentQuality(pageData)

      expect(result.score).toBeGreaterThanOrEqual(80)
      expect(result.rating).toBe('excellent')
      expect(result.indicators.wordCount).toBeGreaterThan(300)
      expect(result.indicators.hasStructuredData).toBe(true)
    })

    // Medium-quality content tests (good: 60-79, fair: 40-59)

    it('should rate medium content with some indicators as good (60-79)', () => {
      const pageData = {
        title: 'Basic Tutorial',
        content: 'This is a moderate article. '.repeat(30), // ~150 words
        meta: {
          description: 'A basic tutorial'
        },
        images: [{ src: 'image.jpg' }],
        links: []
      }

      const result = assessContentQuality(pageData)

      expect(result.score).toBeGreaterThanOrEqual(60)
      expect(result.score).toBeLessThan(80)
      expect(result.rating).toBe('good')
    })

    it('should rate content with minimal metadata as fair (40-59)', () => {
      const pageData = {
        title: 'Short Post',
        content: 'This is a short post with minimal content that barely meets the threshold. '.repeat(10), // ~150 words
        meta: {},
        images: [],
        links: []
      }

      const result = assessContentQuality(pageData)

      expect(result.score).toBeGreaterThanOrEqual(40)
      expect(result.score).toBeLessThan(60)
      expect(result.rating).toBe('fair')
    })

    // Low-quality content tests (poor: <40)

    it('should rate content without title as poor (<40)', () => {
      const pageData = {
        title: '',
        content: 'Some content without a title.',
        meta: {},
        images: [],
        links: []
      }

      const result = assessContentQuality(pageData)

      expect(result.score).toBeLessThan(40)
      expect(result.rating).toBe('poor')
      expect(result.indicators.hasTitle).toBe(false)
    })

    it('should rate content without substantial text as poor', () => {
      const pageData = {
        title: 'Empty Page',
        content: 'Only a few words',
        meta: {},
        images: [],
        links: []
      }

      const result = assessContentQuality(pageData)

      expect(result.score).toBeLessThan(40)
      expect(result.rating).toBe('poor')
      expect(result.indicators.hasContent).toBe(false)
    })

    it('should rate completely empty content as poor', () => {
      const pageData = {
        title: '',
        content: '',
        meta: {},
        images: [],
        links: []
      }

      const result = assessContentQuality(pageData)

      expect(result.score).toBe(0)
      expect(result.rating).toBe('poor')
    })

    // Edge cases

    it('should handle null/undefined pageData', () => {
      expect(assessContentQuality(null).score).toBe(0)
      expect(assessContentQuality(undefined).score).toBe(0)
      expect(assessContentQuality({}).rating).toBe('poor')
    })

    it('should handle missing properties gracefully', () => {
      const pageData = {
        title: 'Title Only'
      }

      const result = assessContentQuality(pageData)

      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.rating).toBeDefined()
      expect(result.indicators).toBeDefined()
    })

    it('should detect spam content and reduce quality score', () => {
      const pageData = {
        title: 'BUY NOW!!! LIMITED TIME OFFER!!!',
        content: 'CLICK HERE TO WIN! ACT NOW! SPECIAL OFFER! BUY NOW! FREE TRIAL! RISK FREE! MONEY BACK GUARANTEE!',
        meta: {},
        images: [],
        links: Array(20).fill({ href: 'https://spam.com', text: 'Click here!' })
      }

      const result = assessContentQuality(pageData)

      expect(result.isSpam).toBe(true)
      expect(result.spamIndicators.length).toBeGreaterThan(0)
      expect(result.score).toBeLessThan(40) // Spam content gets low score
    })

    it('should handle very long content (100k+ words)', () => {
      const pageData = {
        title: 'Comprehensive Encyclopedia Entry',
        content: 'word '.repeat(100000), // 100k words
        meta: {
          description: 'Very long content'
        },
        images: [{ src: 'image.jpg' }],
        links: [{ href: 'https://example.com' }]
      }

      const result = assessContentQuality(pageData)

      expect(result.score).toBeGreaterThan(0)
      expect(result.indicators.wordCount).toBe(100000)
      expect(result.rating).toBeDefined()
    })

    it('should properly assess content with structured data', () => {
      const pageData = {
        title: 'Research Paper',
        content: 'word '.repeat(500),
        structuredData: {
          '@type': 'ScholarlyArticle',
          author: 'Dr. Smith',
          datePublished: '2025-01-01'
        }
      }

      const result = assessContentQuality(pageData)

      expect(result.indicators.hasStructuredData).toBe(true)
      expect(result.score).toBeGreaterThan(50) // Structured data adds points
    })
  })

  // ============================================================================
  // calculateQualityScore() Tests
  // ============================================================================

  describe('calculateQualityScore()', () => {

    it('should calculate score from complete indicators object', () => {
      const indicators = {
        hasTitle: true,
        hasMeaningfulTitle: true,
        hasContent: true,
        hasSubstantialContent: true,
        hasDescription: true,
        hasImages: true,
        hasLinks: true,
        hasStructuredData: true,
        wordCount: 1000,
        linkCount: 10,
        isSpam: false
      }

      const score = calculateQualityScore(indicators)

      expect(score).toBeGreaterThanOrEqual(80)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('should give 20 points for title quality', () => {
      const withTitle = {
        hasTitle: true,
        hasMeaningfulTitle: true,
        wordCount: 0
      }
      const withoutTitle = {
        hasTitle: false,
        hasMeaningfulTitle: false,
        wordCount: 0
      }

      const scoreWith = calculateQualityScore(withTitle)
      const scoreWithout = calculateQualityScore(withoutTitle)

      expect(scoreWith - scoreWithout).toBe(20)
    })

    it('should give 30 points for substantial content', () => {
      const withContent = {
        hasContent: true,
        hasSubstantialContent: true,
        wordCount: 0
      }
      const withoutContent = {
        hasContent: false,
        hasSubstantialContent: false,
        wordCount: 0
      }

      const scoreWith = calculateQualityScore(withContent)
      const scoreWithout = calculateQualityScore(withoutContent)

      expect(scoreWith - scoreWithout).toBe(30)
    })

    it('should give 15 points for metadata', () => {
      const withMeta = {
        hasDescription: true,
        hasStructuredData: true,
        wordCount: 0
      }
      const withoutMeta = {
        hasDescription: false,
        hasStructuredData: false,
        wordCount: 0
      }

      const scoreWith = calculateQualityScore(withMeta)
      const scoreWithout = calculateQualityScore(withoutMeta)

      expect(scoreWith - scoreWithout).toBe(15)
    })

    it('should give 10 points for images', () => {
      const withImages = {
        hasImages: true,
        wordCount: 0
      }
      const withoutImages = {
        hasImages: false,
        wordCount: 0
      }

      const scoreWith = calculateQualityScore(withImages)
      const scoreWithout = calculateQualityScore(withoutImages)

      expect(scoreWith - scoreWithout).toBe(10)
    })

    it('should give up to 10 points for links', () => {
      const manyLinks = {
        hasLinks: true,
        linkCount: 10,
        wordCount: 0
      }
      const fewLinks = {
        hasLinks: true,
        linkCount: 2,
        wordCount: 0
      }
      const noLinks = {
        hasLinks: false,
        linkCount: 0,
        wordCount: 0
      }

      const scoreManyLinks = calculateQualityScore(manyLinks)
      const scoreFewLinks = calculateQualityScore(fewLinks)
      const scoreNoLinks = calculateQualityScore(noLinks)

      expect(scoreManyLinks).toBe(10)
      expect(scoreFewLinks).toBe(5)
      expect(scoreNoLinks).toBe(0)
    })

    it('should give progressive word count bonus (up to 15 points)', () => {
      const scores = [
        calculateQualityScore({ wordCount: 50 }), // 0 points
        calculateQualityScore({ wordCount: 150 }), // 3 points
        calculateQualityScore({ wordCount: 400 }), // 7 points
        calculateQualityScore({ wordCount: 1000 }), // 11 points
        calculateQualityScore({ wordCount: 2000 }) // 15 points
      ]

      expect(scores[0]).toBe(0)
      expect(scores[1]).toBe(3)
      expect(scores[2]).toBe(7)
      expect(scores[3]).toBe(11)
      expect(scores[4]).toBe(15)
    })

    it('should reduce score by 70% for spam content', () => {
      const normalContent = {
        hasTitle: true,
        hasMeaningfulTitle: true,
        hasContent: true,
        wordCount: 500,
        isSpam: false
      }
      const spamContent = {
        ...normalContent,
        isSpam: true
      }

      const normalScore = calculateQualityScore(normalContent)
      const spamScore = calculateQualityScore(spamContent)

      expect(spamScore).toBeLessThan(normalScore * 0.35) // Roughly 30% of normal
      expect(spamScore).toBeGreaterThanOrEqual(0)
    })

    it('should never exceed 100 points', () => {
      const maxIndicators = {
        hasTitle: true,
        hasMeaningfulTitle: true,
        hasContent: true,
        hasSubstantialContent: true,
        hasDescription: true,
        hasImages: true,
        hasLinks: true,
        hasStructuredData: true,
        wordCount: 10000,
        linkCount: 50,
        isSpam: false
      }

      const score = calculateQualityScore(maxIndicators)

      expect(score).toBeLessThanOrEqual(100)
    })

    it('should never go below 0 points', () => {
      const minIndicators = {
        hasTitle: false,
        hasContent: false,
        wordCount: 0,
        isSpam: true
      }

      const score = calculateQualityScore(minIndicators)

      expect(score).toBeGreaterThanOrEqual(0)
    })

    it('should handle null/undefined indicators', () => {
      expect(calculateQualityScore(null)).toBe(0)
      expect(calculateQualityScore(undefined)).toBe(0)
      expect(calculateQualityScore({})).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================================================
  // detectSpamContent() Tests
  // ============================================================================

  describe('detectSpamContent()', () => {

    it('should not flag high-quality content as spam', () => {
      const content = 'This is a well-written article about technology trends. It provides valuable insights and references.'
      const title = 'Understanding Modern Technology'

      const result = detectSpamContent(content, title)

      expect(result.isSpam).toBe(false)
      expect(result.indicators.length).toBe(0)
      expect(result.confidence).toBe(0)
    })

    it('should detect excessive capitalization', () => {
      const content = 'THIS IS ALL CAPS AND VERY ANNOYING TO READ'
      const title = 'CAPS LOCK TITLE'

      const result = detectSpamContent(content, title)

      expect(result.indicators).toContain('excessive_capitalization')
    })

    it('should detect excessive exclamation marks', () => {
      const content = 'Amazing!!! Incredible!!! You won\'t believe this!!!'
      const title = 'WOW!!!'

      const result = detectSpamContent(content, title)

      expect(result.indicators).toContain('excessive_exclamation')
    })

    it('should detect promotional keywords', () => {
      const content = 'Click here to buy now! Limited time offer! Act now! Free trial with money back guarantee!'
      const title = 'Special Discount - Order Now'

      const result = detectSpamContent(content, title)

      expect(result.indicators).toContain('promotional_keywords')
    })

    it('should detect excessive links relative to content', () => {
      const content = 'Short content with links'
      const pageData = {
        content,
        links: Array(20).fill({ href: 'https://spam.com' })
      }

      const result = detectSpamContent(content, '', pageData)

      expect(result.indicators).toContain('excessive_links')
    })

    it('should detect excessive special characters', () => {
      const content = '$$$$$$ Make Money Fast!!! €€€€€ #winning @everyone %discount &more *special'
      const title = 'Easy Money'

      const result = detectSpamContent(content, title)

      expect(result.indicators).toContain('excessive_special_chars')
    })

    it('should detect clickbait patterns', () => {
      const content = 'You won\'t believe what happens next! Doctors hate this one trick!'
      const title = 'This shocking discovery will change your life'

      const result = detectSpamContent(content, title)

      expect(result.indicators).toContain('clickbait_pattern')
    })

    it('should detect thin content with many links', () => {
      const content = 'Check out these links!'
      const pageData = {
        content,
        links: Array(10).fill({ href: 'https://example.com' })
      }

      const result = detectSpamContent(content, '', pageData)

      expect(result.indicators).toContain('thin_content')
    })

    it('should detect repetitive content', () => {
      const content = 'Buy now. Buy now. Buy now. Buy now. Buy now. Buy now. Buy now.'
      const title = 'Products'

      const result = detectSpamContent(content, title)

      expect(result.indicators).toContain('repetitive_content')
    })

    it('should flag content as spam with 3+ indicators', () => {
      const content = 'CLICK HERE NOW!!! BUY NOW!!! LIMITED TIME!!! ACT NOW!!! FREE TRIAL!!!'
      const title = 'AMAZING OFFER!!!'

      const result = detectSpamContent(content, title)

      expect(result.isSpam).toBe(true)
      expect(result.indicators.length).toBeGreaterThanOrEqual(3)
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should calculate confidence score based on indicator count', () => {
      const lowSpam = 'Some promotional content with buy now and click here'
      const highSpam = 'BUY NOW!!! CLICK HERE!!! LIMITED TIME!!! ACT NOW!!! FREE!!! GUARANTEE!!!'

      const lowResult = detectSpamContent(lowSpam, '')
      const highResult = detectSpamContent(highSpam, '')

      expect(highResult.confidence).toBeGreaterThan(lowResult.confidence)
      expect(highResult.confidence).toBeLessThanOrEqual(1)
    })

    it('should handle empty content gracefully', () => {
      const result = detectSpamContent('', '')

      expect(result.isSpam).toBe(false)
      expect(result.indicators.length).toBe(0)
      expect(result.confidence).toBe(0)
    })

    it('should handle null/undefined inputs', () => {
      expect(detectSpamContent(null).isSpam).toBe(false)
      expect(detectSpamContent(undefined).isSpam).toBe(false)
      expect(detectSpamContent(null, null).indicators).toEqual([])
    })

    it('should properly analyze mixed quality content', () => {
      const content = 'This article provides useful information about technology. However, click here to buy now!'
      const title = 'Tech Guide'

      const result = detectSpamContent(content, title)

      // Should detect some spam indicators but not flag as full spam
      expect(result.isSpam).toBe(false)
      expect(result.indicators.length).toBeLessThan(3)
    })

    it('should detect real-world spam patterns', () => {
      const spamExamples = [
        {
          content: 'Congratulations! You won a FREE iPhone! Click here to claim now! Limited time offer!',
          title: 'WINNER!!!'
        },
        {
          content: 'Weight loss miracle! Doctors hate this! Lose 50 pounds in 2 weeks! ORDER NOW!!!',
          title: 'SHOCKING WEIGHT LOSS'
        },
        {
          content: 'Make money fast! Work from home! Earn $5000/week! Risk free! Money back guarantee!',
          title: 'EASY MONEY'
        }
      ]

      spamExamples.forEach(example => {
        const result = detectSpamContent(example.content, example.title)
        expect(result.isSpam).toBe(true)
        expect(result.indicators.length).toBeGreaterThanOrEqual(3)
      })
    })

    it('should not flag technical content as spam', () => {
      const content = 'Algorithm complexity: O(n log n). Performance metrics: 99.9% uptime. Cost: $0.05/request.'
      const title = 'System Architecture Analysis'

      const result = detectSpamContent(content, title)

      expect(result.isSpam).toBe(false)
    })

    it('should handle very long content efficiently', () => {
      const content = 'word '.repeat(10000) // 10k words
      const title = 'Long Article'

      const startTime = Date.now()
      const result = detectSpamContent(content, title)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000) // Should complete in <1 second
      expect(result).toBeDefined()
    })
  })

  // ============================================================================
  // Integration Tests - Complete Quality Assessment Pipeline
  // ============================================================================

  describe('Integration: Complete Quality Assessment Pipeline', () => {

    it('should perform complete quality assessment for high-quality article', () => {
      const pageData = {
        title: 'Comprehensive Guide to Web Performance Optimization',
        content: 'In this comprehensive guide, we will explore various techniques for optimizing web performance. '.repeat(50),
        meta: {
          description: 'A detailed guide covering all aspects of web performance'
        },
        images: [
          { src: 'chart1.png', alt: 'Performance Chart' },
          { src: 'diagram.png', alt: 'System Diagram' }
        ],
        links: [
          { href: 'https://w3.org/performance', text: 'W3C Performance' },
          { href: 'https://web.dev/vitals', text: 'Web Vitals' }
        ],
        structuredData: {
          '@type': 'TechArticle',
          author: 'Performance Expert'
        }
      }

      const quality = assessContentQuality(pageData)
      const readingTime = estimateReadingTime(pageData.content)

      expect(quality.score).toBeGreaterThanOrEqual(80)
      expect(quality.rating).toBe('excellent')
      expect(quality.isSpam).toBe(false)
      expect(readingTime.minutes).toBeGreaterThan(1)
      expect(readingTime.words).toBeGreaterThan(300)
    })

    it('should identify and penalize spam content in quality assessment', () => {
      const pageData = {
        title: 'BUY NOW - AMAZING OFFER!!!',
        content: 'CLICK HERE TO WIN!!! LIMITED TIME!!! ACT NOW!!! FREE TRIAL!!! RISK FREE!!! MONEY BACK GUARANTEE!!!',
        meta: {},
        images: [],
        links: Array(15).fill({ href: 'https://spam.com', text: 'CLICK HERE' })
      }

      const quality = assessContentQuality(pageData)
      const spam = detectSpamContent(pageData.content, pageData.title, pageData)

      expect(spam.isSpam).toBe(true)
      expect(spam.indicators.length).toBeGreaterThanOrEqual(3)
      expect(quality.score).toBeLessThan(40) // Spam penalty applied
      expect(quality.isSpam).toBe(true)
    })

    it('should handle edge case: minimal valid content', () => {
      const pageData = {
        title: 'Quick Note',
        content: 'This is a brief note with just enough content to be considered valid for processing. '.repeat(10), // ~160 words
        meta: {},
        images: [],
        links: []
      }

      const quality = assessContentQuality(pageData)
      const readingTime = estimateReadingTime(pageData.content)

      expect(quality.rating).toBe('fair')
      expect(quality.score).toBeGreaterThanOrEqual(40)
      expect(readingTime.minutes).toBe(1)
    })

    it('should process very large content efficiently', () => {
      const pageData = {
        title: 'Encyclopedia Entry',
        content: 'word '.repeat(100000), // 100k words
        meta: {
          description: 'Comprehensive encyclopedia entry'
        },
        images: [{ src: 'image.jpg' }],
        links: [{ href: 'https://example.com' }]
      }

      const startTime = Date.now()
      const quality = assessContentQuality(pageData)
      const readingTime = estimateReadingTime(pageData.content)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(2000) // Should complete in <2 seconds
      expect(quality.score).toBeGreaterThan(0)
      expect(readingTime.words).toBe(100000)
      expect(readingTime.minutes).toBeGreaterThan(100)
    })
  })
})

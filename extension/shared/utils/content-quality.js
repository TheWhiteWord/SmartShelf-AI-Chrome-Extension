/**
 * Content Quality Assessment Utilities
 * 
 * Provides functions for evaluating content quality, estimating reading time,
 * and detecting spam/low-quality content for AI processing optimization.
 * 
 * @module content-quality
 */

/**
 * Estimate reading time for content
 * 
 * @param {string} content - The text content to analyze
 * @param {number} wordsPerMinute - Average reading speed (default: 200 WPM)
 * @returns {Object} Reading time information
 * @returns {number} .words - Total word count
 * @returns {number} .minutes - Estimated reading time in minutes
 * @returns {string} .text - Human-readable reading time
 */
function estimateReadingTime(content, wordsPerMinute = 200) {
  if (!content || typeof content !== 'string') {
    return {
      words: 0,
      minutes: 0,
      text: '0 min read'
    }
  }

  const words = content.trim().split(/\s+/).filter(word => word.length > 0).length
  const minutes = words === 0 ? 0 : Math.max(1, Math.ceil(words / wordsPerMinute))

  return {
    words,
    minutes,
    text: minutes === 0 ? '0 min read' : minutes === 1 ? '1 min read' : `${minutes} min read`
  }
}

/**
 * Assess overall content quality
 * 
 * Evaluates content based on multiple quality indicators:
 * - Title presence and quality
 * - Content length and substance
 * - Metadata (description, images, links)
 * - Spam/promotional content detection
 * - Structural quality (headers, paragraphs)
 * 
 * @param {Object} pageData - Page data object
 * @param {string} pageData.title - Page title
 * @param {string} pageData.content - Main content text
 * @param {Object} pageData.meta - Page metadata
 * @param {Array} pageData.images - Extracted images
 * @param {Array} pageData.links - Extracted links
 * @param {Object} pageData.structuredData - Structured data (JSON-LD, microdata)
 * @returns {Object} Quality assessment
 * @returns {number} .score - Quality score (0-100)
 * @returns {string} .rating - Rating category (excellent/good/fair/poor)
 * @returns {Object} .indicators - Individual quality indicators
 * @returns {boolean} .isSpam - Spam detection flag
 * @returns {Array<string>} .spamIndicators - Detected spam patterns
 */
function assessContentQuality(pageData) {
  if (!pageData || typeof pageData !== 'object') {
    return {
      score: 0,
      rating: 'poor',
      indicators: {},
      isSpam: false,
      spamIndicators: []
    }
  }

  const content = pageData.content || ''
  const title = pageData.title || ''
  const meta = pageData.meta || {}
  const images = pageData.images || []
  const links = pageData.links || []
  const structuredData = pageData.structuredData || {}

  // Extract quality indicators
  const indicators = {
    hasTitle: title.length > 0,
    hasMeaningfulTitle: title.length >= 10 && title.length <= 200,
    hasContent: content.length > 100,
    hasSubstantialContent: content.length > 500,
    hasDescription: (meta.description || '').length > 0,
    hasImages: images.length > 0,
    hasLinks: links.length > 0,
    hasStructuredData: Object.keys(structuredData).length > 0,
    wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
    titleLength: title.length,
    contentLength: content.length,
    linkCount: links.length,
    imageCount: images.length,
    hasHeaders: content.includes('\n\n') || /#{1,6}\s/.test(content),
    hasParagraphs: content.split(/\n\n/).length > 2
  }

  // Detect spam content
  const spamCheck = detectSpamContent(content, title, pageData)
  indicators.isSpam = spamCheck.isSpam
  indicators.spamIndicators = spamCheck.indicators

  // Calculate quality score
  const score = calculateQualityScore(indicators)

  return {
    score,
    rating: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor',
    indicators,
    isSpam: spamCheck.isSpam,
    spamIndicators: spamCheck.indicators
  }
}

/**
 * Calculate quality score from indicators
 * 
 * Score breakdown (0-100):
 * - Title quality: 20 points
 * - Content presence: 30 points
 * - Metadata: 15 points
 * - Visual content (images): 10 points
 * - Links and references: 10 points
 * - Word count: 15 points
 * 
 * @param {Object} indicators - Quality indicators object
 * @returns {number} Quality score (0-100)
 */
function calculateQualityScore(indicators) {
  if (!indicators || typeof indicators !== 'object') {
    return 0
  }

  let score = 0

  // Title quality (20 points)
  if (indicators.hasTitle) {
    score += 10
    if (indicators.hasMeaningfulTitle) {
      score += 10
    }
  }

  // Content presence (30 points)
  if (indicators.hasContent) {
    score += 15
    if (indicators.hasSubstantialContent) {
      score += 15
    }
  }

  // Metadata (15 points)
  if (indicators.hasDescription) {
    score += 10
  }
  if (indicators.hasStructuredData) {
    score += 5
  }

  // Visual content (10 points)
  if (indicators.hasImages) {
    score += 10
  }

  // Links and references (10 points)
  if (indicators.hasLinks) {
    score += 5
  }
  if (indicators.linkCount > 5) {
    score += 5
  }

  // Word count bonus (15 points)
  const wordCount = indicators.wordCount || 0
  if (wordCount > 100) score += 3
  if (wordCount > 300) score += 4
  if (wordCount > 800) score += 4
  if (wordCount > 1500) score += 4

  // Structure bonus (deductions for spam)
  if (indicators.isSpam) {
    score = Math.floor(score * 0.3) // Reduce score by 70% for spam
  }

  return Math.min(Math.max(score, 0), 100)
}

/**
 * Detect spam or promotional content
 * 
 * Checks for common spam indicators:
 * - Excessive capitalization
 * - Excessive exclamation marks
 * - Promotional keywords
 * - Low content-to-link ratio
 * - Excessive special characters
 * - Click-bait patterns
 * 
 * @param {string} content - Content text to analyze
 * @param {string} title - Page title
 * @param {Object} pageData - Complete page data (optional)
 * @returns {Object} Spam detection result
 * @returns {boolean} .isSpam - Whether content is likely spam
 * @returns {Array<string>} .indicators - Detected spam patterns
 * @returns {number} .confidence - Confidence score (0-1)
 */
function detectSpamContent(content, title = '', pageData = {}) {
  if (!content && !title) {
    return {
      isSpam: false,
      indicators: [],
      confidence: 0
    }
  }

  const indicators = []
  const originalText = `${title} ${content}`
  const text = originalText.toLowerCase()

  // Check for excessive capitalization (use original text before lowercasing)
  const capsCount = (originalText.match(/[A-Z]/g) || []).length
  const totalLetters = (originalText.match(/[a-zA-Z]/g) || []).length
  if (totalLetters > 20 && capsCount / totalLetters > 0.3) {
    indicators.push('excessive_capitalization')
  }

  // Check for excessive exclamation marks
  const exclamationCount = (text.match(/!/g) || []).length
  if (exclamationCount > 5 || (text.length > 0 && exclamationCount / text.length > 0.02)) {
    indicators.push('excessive_exclamation')
  }

  // Check for promotional keywords
  const promoKeywords = [
    'click here', 'buy now', 'limited time', 'act now', 'order now',
    'free trial', 'risk free', 'money back', 'guarantee', 'winner',
    'congratulations', 'you won', 'claim now', 'urgent', 'hurry',
    'special offer', 'discount', 'save money', 'lowest price',
    'viagra', 'casino', 'lottery', 'weight loss', 'make money',
    'earn $', 'work from home', 'shocking', 'miracle', 'doctors hate'
  ]
  const promoMatches = promoKeywords.filter(keyword => text.includes(keyword))
  if (promoMatches.length >= 3) {
    indicators.push('promotional_keywords')
  }

  // Check content-to-link ratio
  const links = pageData.links || []
  const words = content.split(/\s+/).filter(w => w.length > 0).length
  if (words > 0 && links.length > 0 && links.length / words > 0.1) {
    indicators.push('excessive_links')
  }

  // Check for excessive special characters
  const specialChars = (text.match(/[$€£¥₹@#%&*]/g) || []).length
  if (specialChars > 10) {
    indicators.push('excessive_special_chars')
  }

  // Check for click-bait patterns
  const clickBaitPatterns = [
    /you won't believe/i,
    /shocking/i,
    /doctors hate/i,
    /this one trick/i,
    /what happens next/i,
    /will shock you/i,
    /number \d+ will/i
  ]
  if (clickBaitPatterns.some(pattern => pattern.test(text))) {
    indicators.push('clickbait_pattern')
  }

  // Check for very short content with many links
  if (words < 50 && links.length > 5) {
    indicators.push('thin_content')
  }

  // Check for repetitive content
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length > 5) {
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()))
    if (uniqueSentences.size / sentences.length < 0.5) {
      indicators.push('repetitive_content')
    }
  }

  // Check for ALL CAPS words (another spam indicator)
  const capsWords = originalText.match(/\b[A-Z]{3,}\b/g) || []
  if (capsWords.length >= 3) {
    indicators.push('excessive_caps_words')
  }

  // Check for currency symbols and prices (common in spam)
  const currencyMatches = (originalText.match(/[$€£¥₹]\d+/g) || []).length
  if (currencyMatches >= 1) {
    indicators.push('price_emphasis')
  }

  // Check for "FREE" or "free" emphasis (very common in spam)
  if (/\bFREE\b/i.test(originalText) && /[!]{2,}/.test(originalText)) {
    indicators.push('free_offer_emphasis')
  }

  // Check for urgency words combined with exclamation
  const urgencyWords = ['now', 'today', 'immediately', 'hurry', 'fast', 'quick']
  const urgencyCount = urgencyWords.filter(word => {
    const regex = new RegExp(`\\b${word}\\b[^.]{0,20}!`, 'i')
    return regex.test(originalText)
  }).length
  if (urgencyCount >= 2) {
    indicators.push('urgency_tactics')
  }

  // Determine if content is spam
  const isSpam = indicators.length >= 3
  const confidence = Math.min(indicators.length / 5, 1)

  return {
    isSpam,
    indicators,
    confidence
  }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    estimateReadingTime,
    assessContentQuality,
    calculateQualityScore,
    detectSpamContent
  }
}

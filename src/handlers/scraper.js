// @ts-nocheck
const ScraperFactory = require('../services/ScraperFactory');

// Helper to parse request body
const parseRequest = (event) => {
  try {
    if (event.body) {
      return typeof event.body === 'string' 
        ? JSON.parse(event.body) 
        : event.body;
    }
    return event; // For direct invocation (e.g. local testing)
  } catch (error) {
    console.error('Error parsing request:', error);
    throw new Error('Invalid request body');
  }
};

// Helper to format API response
const formatResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // CORS support
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body),
  };
};

/**
 * Lambda handler for the content scraper
 */
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    // Parse request
    const request = parseRequest(event);
    
    // Validate request
    if (!request.url) {
      return formatResponse(400, { error: 'URL is required' });
    }

    if (!request.platform) {
      return formatResponse(400, { error: 'Platform is required (e.g., "facebook", "google", "tiktok")' });
    }
    
    // Configure scraper
    const config = {
      url: request.url,
      browser: {
        // In production, always run headless. For local testing, use the provided setting or true
        headless: request.headless ?? true,
        timeout: request.timeout || 30000,
        ...request.browser,
      },
    };
    
    try {
      // Create the appropriate scraper for the platform
      const scraper = ScraperFactory.createScraper(request.platform, config);
      
      // Run scraping process
      console.log(`Starting scraping process for ${request.platform}`);
      await scraper.initialize();
      const results = await scraper.scrapeRawContent();
      
      // Close browser
      await scraper.close();
      
      // Return results
      console.log('Scraping completed successfully');
      return formatResponse(200, {
        success: true,
        platform: request.platform,
        data: results,
      });
    } catch (err) {
      if (err.message.includes('Unsupported platform')) {
        return formatResponse(400, {
          success: false,
          error: err.message
        });
      }
      throw err;
    }
    
  } catch (error) {
    console.error('Error during scraping:', error);
    return formatResponse(500, {
      success: false,
      error: error.message || 'An error occurred during scraping',
    });
  }
}; 
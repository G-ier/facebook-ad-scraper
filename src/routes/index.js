// Third Party Imports
const express = require('express');
const router = express.Router();

// Local Imports
const ScraperFactory = require('../services/ScraperFactory');

// New dynamic endpoint for all scrapers using factory pattern
router.post('/scrape', async (req, res) => {
  try {
    // Validate request
    if (!req.body.url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!req.body.platform) {
      return res.status(400).json({ error: 'Platform is required (e.g., "facebook", "google", "tiktok")' });
    }
    
    // Configure scraper
    const config = {
      url: req.body.url,
      browser: {
        headless: req.body.headless ?? true,
        timeout: req.body.timeout || 30000,
        ...req.body.browser,
      },
    };
    
    try {
      // Create the appropriate scraper for the platform
      const scraper = ScraperFactory.createScraper(req.body.platform, config);
      
      // Run scraping process
      console.log(`Starting scraping process for ${req.body.platform}`);
      await scraper.initialize();
      const results = await scraper.scrapeRawContent();
      
      // Close browser
      await scraper.close();
      
      // Return results
      console.log('Scraping completed successfully');
      return res.status(200).json({
        success: true,
        platform: req.body.platform,
        data: results,
      });
    } catch (err) {
      if (err.message.includes('Unsupported platform')) {
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
      throw err;
    }
    
  } catch (error) {
    console.error('Error during scraping:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred during scraping',
    });
  }
});

module.exports = router;
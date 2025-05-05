// @ts-nocheck
const FacebookScraper = require('./scrapers/FacebookScraper');
const GoogleScraper = require('./scrapers/GoogleScraper');

/**
 * Factory to create the appropriate scraper based on platform
 */
class ScraperFactory {
    /**
     * Create a scraper instance for the specified platform
     * @param {string} platform - The platform to scrape (e.g., 'facebook', 'google', 'tiktok')
     * @param {object} config - Configuration for the scraper
     * @returns {object} A scraper instance
     */
    static createScraper(platform, config) {
        switch (platform.toLowerCase()) {
            case 'facebook':
                return new FacebookScraper(config);
            case 'google':
                return new GoogleScraper(config);
            // Add more platforms here as they are implemented
            // case 'tiktok':
            //     return new TikTokScraper(config);
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }
}

module.exports = ScraperFactory; 
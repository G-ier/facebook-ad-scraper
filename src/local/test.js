// Alternative method: direct invocation by importing handler function
async function runTest() {
    console.log("Starting direct handler test...");
    
    try {
        // Import the route handler directly if needed
        const ScraperFactory = require('../services/ScraperFactory');
        
        // Test data
        const testConfig = {
            // Test cases - uncomment the one you want to test
            // url: 'https://www.facebook.com/ads/library/?id=688960707014802', // image - NO CTA
            // url: 'https://www.facebook.com/ads/library/?id=1506084790352712', // image - CTA
            // url: 'https://www.facebook.com/ads/library/?id=563743339654797', // video - CTA
            // url: 'https://www.facebook.com/ads/library/?id=992535872641567', // video - NO CTA
            // url: 'https://www.facebook.com/ads/library/?id=653943904083331', // video - TEXT CTA
            // url: 'https://www.facebook.com/ads/library/?id=9566170886807874', // video - TEXT CTA
            url: 'https://www.facebook.com/ads/library/?id=1315209842900001', // slider - images
            // url: 'https://www.facebook.com/ads/library/?id=990645213255470', // slider - videos
            // url: 'https://www.facebook.com/ads/library/?id=1019869216447337', // slider - images + videos
            platform: 'facebook',
            browser: {
                headless: false, // For local testing, we can see the browser
                timeout: 60000
            }
        };
        
        // Create the scraper directly
        const scraper = ScraperFactory.createScraper(testConfig.platform, {
            url: testConfig.url,
            browser: testConfig.browser
        });
        
        // Run scraping process
        console.log(`Starting direct scraping process for ${testConfig.platform}`);
        await scraper.initialize();
        const results = await scraper.scrapeRawContent();

        // Close browser
        await scraper.close();
        
        // Log results
        console.log('Direct scraping completed successfully');
        console.log('Results:', JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('Error during direct test:', error.message);
        console.error('Stack trace:', error.stack);
    }
}


// Run with proper error handling
runTest()
    .then(() => {
        console.log('Test completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('Unhandled error in test:', error);
        process.exit(1);
    });
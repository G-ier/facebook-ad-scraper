// Local test runner for the scraper function
const { handler } = require('../handlers/scraper');

async function test() {
    try {
        // Sample request for scraping a single Facebook ad
        const result = await handler({
            // url: 'https://www.facebook.com/ads/library/?id=688960707014802', // image - NO CTA
            // url: 'https://www.facebook.com/ads/library/?id=1506084790352712', // image - CTA
            // url: 'https://www.facebook.com/ads/library/?id=563743339654797', // video - CTA
            // url: 'https://www.facebook.com/ads/library/?id=992535872641567', // video - NO CTA
            // url: 'https://www.facebook.com/ads/library/?id=653943904083331', // video - TEXT CTA
            // url: 'https://www.facebook.com/ads/library/?id=9566170886807874', // video - TEXT CTA
            // url: 'https://www.facebook.com/ads/library/?id=1315209842900001', // slider - images
            url: 'https://www.facebook.com/ads/library/?id=990645213255470', // slider - videos
            platform: 'facebook',
            browser: {
                headless: false,
                timeout: 60000 // Increased timeout to ensure ad loads completely
            }
        });
        
    } catch (error) {
        console.error('Error during test:', error);
    }
}

test().catch(console.error); 
# Ad Library Scrapper

A serverless scraping service for various platforms, deployed as an AWS Lambda function.

## Overview

This project provides a flexible, serverless approach to web scraping. It's designed to run as an AWS Lambda function that can be called from frontend applications to perform various scraping tasks. The architecture is modular and extensible, allowing for easy addition of new platform-specific scrapers.

## Features

- Serverless architecture using AWS Lambda
- Modular design with platform-specific scrapers
- Anti-detection measures for reliable scraping
- Local testing capabilities
- Extensible for multiple platforms (Facebook, Google, TikTok, etc.)
- Utility functions for common scraping tasks
- Proxy management for avoiding IP bans
- Environment-aware configuration

## Project Structure

```
├── legacy/               # Original scraping code
├── src/
│   ├── handlers/         # Lambda function handlers
│   ├── services/         # Service layer
│   │   ├── scrapers/     # Platform-specific scrapers
│   │   │   ├── BaseScraper.js
│   │   │   ├── FacebookScraper.js
│   │   │   ├── GoogleScraper.js
│   │   │   └── ...
│   │   └── ScraperFactory.js
│   ├── utils/            # Utility functions
│   │   ├── config.js     # Environment configuration
│   │   ├── proxy-manager.js # Proxy rotation and management
│   │   └── scraping-helpers.js # Common scraping utilities
│   └── local/            # Local testing utilities
├── serverless.yml        # Serverless configuration
└── package.json          # Project dependencies
```

## Setup

1. Install dependencies:
```
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
npm install --save-dev serverless serverless-offline serverless-dotenv-plugin
```

2. Create a .env file:
```
cp env.example .env
```

## Testing & Usage Environments

### 1. Local Direct Testing

The simplest way to test the scraper locally without any serverless setup:

```bash
# Run the local test script
node src/local/test.js
```

This will:
- Execute the handler function directly
- Open a browser window (headless=false by default in development) 
- Scrape the Facebook Ad Library
- Return the results in the console

You can edit `src/local/test.js` to test different platforms or URLs.

### 2. Local Serverless Testing

Test the function as it would run on AWS, but locally:

```bash
# Start the serverless offline server
npx serverless offline
# Or use the npm script
npm start
```

Then send requests to the local endpoint:

```bash
# Using curl
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=dental%20implants",
    "platform": "facebook",
    "browser": {
      "headless": false,
      "timeout": 30000
    }
  }'
```

### 3. AWS Deployment

Deploy to AWS Lambda for production use:

```bash
# Deploy to AWS (requires AWS credentials to be configured)
npx serverless deploy
# Or use the npm script
npm run deploy
```

After deployment, you'll get an endpoint URL. Make POST requests to this endpoint:

```bash
# Replace YOUR_ENDPOINT_URL with the actual URL from the deployment
curl -X POST https://YOUR_ENDPOINT_URL/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=dental%20implants",
    "platform": "facebook",
    "browser": {
      "headless": true,
      "timeout": 30000
    }
  }'
```

In production (AWS Lambda), the browser will always run in headless mode for better performance.

### 4. Frontend Integration

To call the scraper from a frontend application, use fetch or axios:

```javascript
// Using fetch
async function scrapeAds() {
  const response = await fetch('https://YOUR_ENDPOINT_URL/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=dental%20implants',
      platform: 'facebook',
      browser: {
        timeout: 30000
      }
    }),
  });
  
  const data = await response.json();
  console.log('Scraped ads:', data);
}
```

## Request Parameters

The API accepts the following parameters:

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `url` | Yes | The URL to scrape | `"https://www.facebook.com/ads/library/?q=dental"` |
| `platform` | Yes | Platform to scrape (facebook, google) | `"facebook"` |
| `browser.headless` | No | Run browser in headless mode | `true` or `false` |
| `browser.timeout` | No | Browser operation timeout (ms) | `30000` |
| `browser.stealth` | No | Enable stealth mode | `true` or `false` |

## Response Format

```json
{
  "success": true,
  "platform": "facebook",
  "data": {
    "videoUrls": ["https://example.com/video1.mp4", "..."],
    "totalVideos": 10
  }
}
```

## Troubleshooting

Common issues and solutions:

1. **Browser launch errors**:
   - Ensure Chrome is installed on your system
   - Check if you have proper permissions

2. **Timeouts**:
   - Increase `browser.timeout` for complex pages 
   - Pages with many dynamic elements may need longer timeouts

3. **Rate limiting/blocking**:
   - Consider enabling the proxy feature
   - Reduce scraping frequency

4. **Memory issues on Lambda**:
   - Increase Lambda memory allocation in serverless.yml
   - Optimize puppeteer settings

## Adding New Scrapers

1. Create a new file in `src/services/scrapers` named `[Platform]Scraper.js`
2. Extend the `BaseScraper` class and implement the `scrapeRawContent` method
3. Add the new scraper to the `ScraperFactory.js` file

## Utility Functions

The `utils` folder contains several helper modules:

- `config.js`: Environment-aware configuration
- `proxy-manager.js`: Rotate and manage proxy connections
- `scraping-helpers.js`: Common functions for scraping (delays, scrolling, etc.)

Example usage:

```javascript
const { randomDelay, retry } = require('../utils/scraping-helpers');
const ProxyManager = require('../utils/proxy-manager');
const { getConfig } = require('../utils/config');

// Get configuration based on environment
const config = getConfig({
  browser: {
    timeout: 60000 // Override default timeout
  }
});

// Add proxies for rotation
const proxyManager = new ProxyManager([
  'http://proxy1.example.com:8080',
  'http://proxy2.example.com:8080'
]);

// Use proxy with puppeteer
const launchArgs = proxyManager.getPuppeteerArgs();
```

## License

MIT 
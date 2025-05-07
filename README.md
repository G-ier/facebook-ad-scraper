# Ad Inspo Scraper

A serverless scraping service for various ad platforms, deployed as an AWS Lambda function.

## Overview

This project provides a flexible, serverless approach to web scraping. It's designed to run as an AWS Lambda function that can be called from frontend applications to perform various scraping tasks. The architecture is modular and extensible, allowing for easy addition of new platform-specific scrapers.

## Features

- Serverless architecture using AWS Lambda and AWS SAM
- Modular design with platform-specific scrapers
- Anti-detection measures for reliable scraping
- Local testing capabilities
- Extensible for multiple platforms (Facebook, Google, TikTok, etc.)
- Utility functions for common scraping tasks
- Optimized deployment with small package size (under Lambda's 250MB limit)
- Environment-aware configuration

## Architecture

- **Lambda Function**: Runs on x86_64 architecture with 2GB memory
- **Chrome**: Uses `@sparticuz/chromium` with public chrome-aws-lambda layer (Layer ARN: arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:50)
- **API Gateway**: HTTP API with custom domain (scrap.efflux.com)
- **Runtime**: Node.js 20.x

## Project Structure

```
├── src/
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
│   └── routes/           # Express routes
│       └── index.js      # API endpoints
├── script/               # Build scripts
│   └── prepare-deploy.sh # Optimized deployment preparation
├── template.yaml         # AWS SAM template
├── app.js                # Express application
└── lambda.js             # Lambda handler
```

## Setup

1. Install dependencies:
```
npm install
```

## Deployment Instructions

### 1. Prepare the optimized deployment package

```bash
# Clean and prepare the deployment package
npm run prepare-deploy
```

This script:
- Creates a clean .build-tmp directory
- Copies only necessary files
- Installs only production dependencies
- Removes unnecessary packages that are provided by the Lambda layer

### 2. Build with SAM

```bash
# Build using the optimized package
npm run build:optimized

# Or manually:
sam build --template template.yaml --base-dir .build-tmp
```

### 3. Deploy to AWS

```bash
# Deploy the application
npm run deploy:sam

# Or manually:
sam deploy
```

## Testing & Usage Environments

### 1. Local Direct Testing

The simplest way to test the scraper locally:

```bash
# Run the local test script
npm test
```

This will:
- Execute the handler function directly
- Open a browser window (headless=false by default in development) 
- Scrape the Facebook Ad Library
- Return the results in the console

You can edit `src/local/test.js` to test different platforms or URLs.

### 2. AWS Lambda Testing

After deployment, you can test the Lambda function directly:

```bash
aws lambda invoke --function-name efflux-ad-inspo-scraper \
  --payload '{"version":"2.0","routeKey":"POST /scrape","rawPath":"/scrape","rawQueryString":"","headers":{"content-type":"application/json"},"requestContext":{"http":{"method":"POST","path":"/scrape"}},"body":"{\"url\":\"https://www.facebook.com/ads/library/?id=24981650168280552\",\"platform\":\"facebook\"}","isBase64Encoded":false}' \
  --cli-binary-format raw-in-base64-out response.json
```

### 3. Frontend Integration

To call the scraper from a frontend application, use fetch or axios:

```javascript
// Using fetch
async function scrapeAds() {
  const response = await fetch('https://scrap.efflux.com/scrape', {
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
    "type": "image",
    "libraryId": "123456789",
    "media": {
      "type": "image",
      "url": "https://example.com/image.jpg"
    },
    "advertiser": {
      "name": "Example Company",
      "avatar": "https://example.com/avatar.jpg"
    },
    "content": {
      "text": "Ad description text"
    },
    "callToAction": {
      "url": "https://example.com",
      "text": "Learn More"
    }
  }
}
```

## How It Works

1. When running locally, the code uses your local Chrome installation with full Puppeteer
2. When running in Lambda, it uses Chrome from the Lambda layer with @sparticuz/chromium
3. The optimized deployment package excludes development dependencies and unnecessary files

## Troubleshooting

### Package Size Issues

If you encounter "Unzipped size must be smaller than 262144000 bytes" error:
- Make sure you're using the optimized build process
- Check if any unnecessary dependencies are included
- Use the `npm run prepare-deploy` script to clean up the package

### Chrome Compatibility Issues

If you encounter "Failed to launch the browser process!" error:
- Make sure architecture settings match (x86_64 in template.yaml)
- Check if chrome-aws-lambda layer version is compatible with your Node.js version
- For local testing, use the direct test script instead of SAM local

### API Gateway Issues

If you're unable to reach your endpoint:
- Check Route53 configuration for your custom domain
- Verify the API Gateway deployment was successful
- Check CloudWatch logs for any Lambda errors

## Adding New Scrapers

1. Create a new file in `src/services/scrapers` named `[Platform]Scraper.js`
2. Extend the `BaseScraper` class and implement the `scrapeRawContent` method
3. Add the new scraper to the `ScraperFactory.js` file

## License

MIT 
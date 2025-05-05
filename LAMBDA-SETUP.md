# AWS Lambda Setup for Puppeteer

Since our scraping function uses Puppeteer, we need to consider some additional setup for AWS Lambda.

## Puppeteer on Lambda

Running Puppeteer on AWS Lambda requires including Chromium and its dependencies. There are a few approaches:

### Option 1: Lambda Layers

Create a Lambda layer with Chromium binary and dependencies:

1. Use the `chrome-aws-lambda` package:
   ```
   npm install chrome-aws-lambda puppeteer-core
   ```

2. Create a layer with these dependencies.

### Option 2: Serverless-Chrome Plugin

1. Add the serverless-chrome plugin:
   ```
   npm install serverless-plugin-chrome --save-dev
   ```

2. Update the `serverless.yml`:
   ```yaml
   plugins:
     - serverless-plugin-chrome
     - serverless-offline
   ```

### Option 3: Use Docker Deployment Package

Create a Docker deployment package that includes all the necessary Chrome dependencies:

1. Create a Dockerfile that installs Chrome and its dependencies
2. Build your Lambda function inside this container
3. Deploy the resulting package

## Considerations for Puppeteer in Lambda

1. **Memory**: Allocate at least 1024MB to 2048MB for Chrome to run reliably
2. **Timeout**: Set sufficient timeout (30+ seconds) for scraping operations
3. **Headless Mode**: Always run in headless mode in production
4. **Optimize**: Disable unnecessary Chrome features to reduce memory usage

## Testing Locally

The included local test script simulates the Lambda environment but with regular Puppeteer. When deploying to AWS, you'll need to ensure the Lambda environment has the appropriate Chrome binaries available. 
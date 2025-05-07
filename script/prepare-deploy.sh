#!/bin/bash

# Create a clean build directory
rm -rf .aws-sam
mkdir -p .build-tmp

# Copy important files to build directory
cp -r src .build-tmp/
cp app.js lambda.js package.json .npmignore .build-tmp/

# Install only production dependencies in build directory
cd .build-tmp
npm install --production

# Remove unnecessary files for deployment
rm -rf node_modules/puppeteer node_modules/puppeteer-*

# Return to root directory
cd ..

# Display package size
du -sh .build-tmp

echo "Build prepared in .build-tmp directory"
echo "Run 'sam build --use-container --template template.yaml --base-dir .build-tmp' to build" 
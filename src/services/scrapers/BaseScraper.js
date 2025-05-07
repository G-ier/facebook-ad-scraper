// @ts-nocheck
const puppeteer = require('puppeteer');
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { sleep, randomDelay, waitForNetworkIdle } = require('../../utils/scraping-helpers');
const { getConfig } = require('../../utils/config');

// Initialize puppeteer-extra with stealth plugin
puppeteerExtra.use(StealthPlugin());

// Helper functions
function generateFingerprint() {
    // Simple fingerprint generation
    return {
        userAgent: [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
        ][Math.floor(Math.random() * 3)],
        viewport: {
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
            isMobile: false,
            hasTouch: false,
            isLandscape: true
        }
    };
}

async function applyFingerprint(page, fingerprint) {
    await page.setUserAgent(fingerprint.userAgent);
    await page.setViewport(fingerprint.viewport);
}

// Simplified BaseScraper class with focus on reliability
class BaseScraper {
    
    constructor(config) {
        // Merge default config, environment config, and user config
        const baseConfig = getConfig();
        
        // Default configuration with user overrides
        this.config = {
            browser: {
                headless: baseConfig.browser.headless,
                timeout: baseConfig.browser.timeout,
                stealth: baseConfig.browser.stealth,
                rotateFingerprint: baseConfig.browser.rotateFingerprint,
                minDelay: baseConfig.browser.minDelay,
                maxDelay: baseConfig.browser.maxDelay,
                args: baseConfig.browser.args || [],
                executablePath: baseConfig.browser.executablePath || null,
                ...config.browser      // Allow user to override defaults
            },
            ...config               // Include any other config options
        };

        // Initialize instance variables
        this.browser = null;      // Will hold the browser instance
        this.page = null;         // Will hold the current page
        this.currentFingerprint = null; // Will hold current browser fingerprint
    }

    // Helper function to create delays between actions
    async sleep(ms) {
        return sleep(ms);
    }

    // Initialize the browser with anti-detection measures
    async initialize() {
        try {
            console.log('Initializing browser with anti-detection measures');
            
            // Convert headless option to use new headless mode if true
            let headlessOption = this.config.browser.headless;
            if (headlessOption === true) {
                headlessOption = "new";
            }
            
            // Browser launch options for avoiding detection
            const launchOptions = {
                headless: headlessOption,
                args: [
                    '--no-sandbox',                    // Disable Chrome's sandbox for better performance
                    '--disable-setuid-sandbox',        // Disable setuid sandbox (Linux only)
                    '--disable-infobars',              // Hide automation infobar
                    '--window-position=0,0',           // Set window position
                    '--ignore-certificate-errors',     // Ignore SSL certificate errors
                    '--ignore-certificate-errors-spki-list', // Ignore certificate errors in SPKI list
                    '--disable-blink-features=AutomationControlled', // Hide automation flags
                    '--disable-dev-shm-usage',         // Overcome limited /dev/shm in Docker
                    '--disable-accelerated-2d-canvas', // Reduce memory usage
                    '--no-first-run',                  // Skip first run wizards
                    '--no-zygote',                     // Don't use a zygote process for launching new processes
                    ...(this.config.browser.args || [])  // Additional args from config
                ],
            };
            
            // Use executable path if provided
            if (this.config.browser.executablePath) {
                console.log(`Using Chrome executable path: ${this.config.browser.executablePath}`);
                launchOptions.executablePath = this.config.browser.executablePath;
            }

            // Launch browser with managed retries
            console.log('Launching browser with options:', JSON.stringify({
                headless: launchOptions.headless,
                stealth: this.config.browser.stealth,
                executablePath: launchOptions.executablePath ? '(custom path)' : '(default)',
                args: launchOptions.args.slice(0, 3) + '...' // Just show first few args to keep log clean
            }, null, 2));
            
            let attempts = 0;
            const maxAttempts = 2;
            
            while (attempts < maxAttempts) {
                try {
                    // Use stealth or regular puppeteer based on config
                    this.browser = this.config.browser.stealth
                        ? await puppeteerExtra.launch(launchOptions)
                        : await puppeteer.launch(launchOptions);
                    break;
                } catch (err) {
                    attempts++;
                    console.error(`Browser launch attempt ${attempts} failed: ${err.message}`);
                    
                    if (attempts >= maxAttempts) {
                        throw err;
                    }
                    await sleep(1000);
                }
            }
            
            // Create new page with appropriate timeouts
            console.log('Creating new page...');
            this.page = await this.browser.newPage();
            await this.page.setDefaultTimeout(this.config.browser.timeout);
            await this.page.setDefaultNavigationTimeout(this.config.browser.timeout);
            
            // Add error handler for the page
            this.page.on('error', err => {
                console.error('Page error:', err);
            });
            
            // Apply anti-detection measures
            await this.rotateFingerprint();
            await this.setupPage();
            
            console.log('Browser initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize scraper:', error);
            if (this.browser) {
                try {
                    await this.browser.close();
                } catch (closeError) {
                    console.error('Error closing browser:', closeError);
                }
                this.browser = null;
            }
            throw error;
        }
    }

    // Rotate browser fingerprint
    async rotateFingerprint() {
        if (!this.config.browser.rotateFingerprint) return;

        this.currentFingerprint = generateFingerprint();
        if (this.page) {
            await applyFingerprint(this.page, this.currentFingerprint);
        }
    }

    // Set up anti-detection measures on the page
    async setupPage() {
        // Enable JavaScript (should be enabled by default)
        await this.page.setJavaScriptEnabled(true);

        // Handle any popup dialogs
        this.page.on('dialog', async dialog => {
            await dialog.dismiss();
        });

        // Apply various anti-detection measures
        await this.page.evaluateOnNewDocument(() => {
            // Hide webdriver property
            Object.defineProperty(navigator, 'webdriver', { get: () => false });

            // Add fake chrome runtime
            Object.defineProperty(window, 'chrome', {
                writable: true,
                enumerable: true,
                configurable: true,
                value: { runtime: {} }
            });

            // Override permissions API
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => {
                if (parameters.name === 'notifications') {
                    return Promise.resolve({ state: Notification.permission });
                }
                return originalQuery.call(window.navigator.permissions, parameters);
            };
        });
    }

    // Perform a random delay based on configured min/max
    async randomDelay() {
        return randomDelay(this.config.browser.minDelay, this.config.browser.maxDelay);
    }
    
    // Wait for page to be fully loaded
    async waitForNetworkIdle(timeout = 5000) {
        return waitForNetworkIdle(this.page, timeout);
    }

    // Method to be implemented by platform-specific scrapers
    async scrapeRawContent() {
        throw new Error('scrapeRawContent must be implemented by child class');
    }

    // Clean up by closing the browser
    async close() {
        if (this.browser) {
            try {
                await this.browser.close();
                this.browser = null;
                this.page = null;
                console.log('Browser closed successfully');
            } catch (error) {
                console.error('Error while closing browser:', error);
                this.browser = null;
                this.page = null;
            }
        }
    }
}

module.exports = BaseScraper; 
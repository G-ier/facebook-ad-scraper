/**
 * Utility functions for web scraping
 */

/**
 * Delay execution for a specified amount of time
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after the delay
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate a random delay within a specified range
 * @param {number} min - Minimum delay in milliseconds
 * @param {number} max - Maximum delay in milliseconds
 * @returns {Promise} Promise that resolves after a random delay
 */
const randomDelay = async (min = 1000, max = 3000) => {
  const delay = Math.floor(Math.random() * (max - min + 1) + min);
  return sleep(delay);
};

/**
 * Scroll to the bottom of a page using a browser page instance
 * @param {Object} page - Puppeteer page object
 * @returns {Promise} Promise that resolves when scrolling is complete
 */
const scrollToBottom = async (page) => {
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
};

/**
 * Wait for network idle state
 * @param {Object} page - Puppeteer page object
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} Promise that resolves when network is idle
 */
const waitForNetworkIdle = async (page, timeout = 5000) => {
  await page.waitForFunction(
    () => document.readyState === 'complete',
    { timeout }
  );
  await sleep(timeout); // Additional wait to ensure dynamic content is loaded
};

/**
 * Retry a function multiple times
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Promise} Promise that resolves with the function result
 */
const retry = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
};

/**
 * Extract all text content from an element and its children
 * @param {Object} page - Puppeteer page object
 * @param {string} selector - CSS selector for the element
 * @returns {Promise<string>} Promise that resolves with the extracted text
 */
const extractText = async (page, selector) => {
  return page.evaluate((sel) => {
    const element = document.querySelector(sel);
    return element ? element.innerText : '';
  }, selector);
};

/**
 * Wait for a page to fully load, including dynamic content
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<void>} Promise that resolves when page is fully loaded
 */
const waitForPageLoad = async (page) => {
  // Wait for network to be mostly idle
  await page.waitForNetworkIdle({ idleTime: 1000 });
  
  // Additional delay to ensure dynamic content loads
  await sleep(2000);
  
  // Wait for any remaining AJAX requests to complete
  await page.evaluate(() => {
    /**
     * @returns {Promise<boolean>} Promise that resolves when page is ready
     */
    return new Promise((resolve) => {
      // If there are no pending XHR requests, resolve immediately
      if (document.readyState === 'complete') {
        resolve(true);
      } else {
        // Otherwise wait for the page to be ready
        window.addEventListener('load', () => resolve(true));
      }
    });
  });
};

module.exports = {
  sleep,
  randomDelay,
  scrollToBottom,
  waitForNetworkIdle,
  retry,
  extractText,
  waitForPageLoad
}; 
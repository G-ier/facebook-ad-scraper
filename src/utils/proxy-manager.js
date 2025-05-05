/**
 * Proxy Manager for web scraping
 * Helps rotate and manage proxy connections
 */

class ProxyManager {
  /**
   * Create a new ProxyManager
   * @param {Array} proxyList - List of proxy URLs (e.g., ["http://username:password@ip:port"])
   */
  constructor(proxyList = []) {
    this.proxyList = proxyList;
    this.currentIndex = 0;
    this.failedProxies = new Map(); // Track failed proxies and their failure count
  }

  /**
   * Add a proxy to the list
   * @param {string} proxyUrl - Proxy URL in format "http://username:password@ip:port"
   */
  addProxy(proxyUrl) {
    if (!this.proxyList.includes(proxyUrl)) {
      this.proxyList.push(proxyUrl);
    }
  }

  /**
   * Add multiple proxies to the list
   * @param {Array} proxyUrls - Array of proxy URLs
   */
  addProxies(proxyUrls) {
    if (!Array.isArray(proxyUrls)) {
      throw new Error('proxyUrls must be an array');
    }
    
    proxyUrls.forEach(url => this.addProxy(url));
  }

  /**
   * Get the next available proxy
   * @returns {string|null} Next proxy URL or null if no proxies are available
   */
  getNextProxy() {
    if (this.proxyList.length === 0) {
      return null;
    }

    // Get next proxy
    const proxy = this.proxyList[this.currentIndex];
    
    // Update index for next call
    this.currentIndex = (this.currentIndex + 1) % this.proxyList.length;
    
    return proxy;
  }

  /**
   * Mark a proxy as failed
   * @param {string} proxyUrl - The proxy URL that failed
   * @param {number} maxFailures - Maximum allowed failures before removing proxy
   */
  markProxyAsFailed(proxyUrl, maxFailures = 3) {
    // Update failure count
    const failCount = (this.failedProxies.get(proxyUrl) || 0) + 1;
    this.failedProxies.set(proxyUrl, failCount);
    
    // Remove proxy if it has failed too many times
    if (failCount >= maxFailures) {
      this.removeProxy(proxyUrl);
      console.log(`Removed proxy ${proxyUrl} after ${failCount} failures`);
    }
  }

  /**
   * Remove a proxy from the list
   * @param {string} proxyUrl - Proxy URL to remove
   */
  removeProxy(proxyUrl) {
    const index = this.proxyList.indexOf(proxyUrl);
    if (index !== -1) {
      this.proxyList.splice(index, 1);
      this.failedProxies.delete(proxyUrl);
      
      // Reset current index if necessary
      if (this.currentIndex >= this.proxyList.length && this.proxyList.length > 0) {
        this.currentIndex = 0;
      }
    }
  }

  /**
   * Get total count of available proxies
   * @returns {number} Number of available proxies
   */
  getProxyCount() {
    return this.proxyList.length;
  }

  /**
   * Check if any proxies are available
   * @returns {boolean} True if proxies are available
   */
  hasProxies() {
    return this.proxyList.length > 0;
  }

  /**
   * Get puppeteer launch args for proxy
   * @param {string|null} proxyUrl - Optional specific proxy URL to use
   * @returns {Object} Puppeteer launch args with proxy configuration
   */
  getPuppeteerArgs(proxyUrl = null) {
    const proxy = proxyUrl || this.getNextProxy();
    
    if (!proxy) {
      return {};
    }
    
    return {
      args: [
        `--proxy-server=${proxy}`
      ]
    };
  }
}

module.exports = ProxyManager; 
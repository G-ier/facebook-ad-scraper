// @ts-nocheck
/**
 * Configuration utility for managing environment-specific settings
 */

// Default configurations
const defaultConfig = {
  browser: {
    headless: true,
    timeout: 30000,
    stealth: true,
    rotateFingerprint: true,
    minDelay: 2000,
    maxDelay: 5000,
  },
  proxies: {
    enabled: false,
    list: [],
  },
  rateLimit: {
    maxRequests: 10,
    timeWindow: 60000, // 1 minute
  },
  retries: {
    maxAttempts: 3,
    initialDelay: 1000,
  }
};

// Environment-specific overrides
const environments = {
  development: {
    browser: {
      headless: false,
      timeout: 60000,
    }
  },
  test: {
    browser: {
      headless: true,
    }
  },
  production: {
    browser: {
      headless: true,
    }
  }
};

/**
 * Get the current environment
 * @returns {string} Current environment (development, test, or production)
 */
const getEnvironment = () => {
  // Try to get environment from process.env if it exists
  try {
    const env = typeof process !== 'undefined' && process.env && process.env.NODE_ENV;
    return env || 'development';
  } catch (e) {
    return 'development';
  }
};

/**
 * Get configuration for the current environment
 * @param {Object} overrides - Optional configuration overrides
 * @returns {Object} Configuration object with defaults and environment-specific overrides
 */
const getConfig = (overrides = {}) => {
  const env = getEnvironment();
  const envConfig = environments[env] || environments.development;
  
  // Deep merge defaultConfig, environment config, and overrides
  return deepMerge(defaultConfig, envConfig, overrides);
};

/**
 * Deep merge utility for objects
 * @param {...Object} objects - Objects to merge
 * @returns {Object} Merged object
 */
const deepMerge = (...objects) => {
  const result = {};
  
  objects.forEach(obj => {
    if (!obj) return;
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // If property is an object, recursively merge
        result[key] = deepMerge(result[key] || {}, value);
      } else {
        // Otherwise just assign the value
        result[key] = value;
      }
    });
  });
  
  return result;
};

module.exports = {
  getConfig,
  getEnvironment,
  deepMerge,
}; 
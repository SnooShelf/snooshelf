/**
 * SnooShelf Cache Manager
 * In-memory caching system for improved performance
 */

class CacheManager {
    constructor() {
        this.cache = new Map();
        this.timestamps = new Map();
        this.ttl = 5 * 60 * 1000; // 5 minutes default TTL
        this.maxSize = 50; // Maximum number of cached items
    }
    
    /**
     * Set a value in the cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} customTTL - Custom TTL in milliseconds (optional)
     */
    set(key, value, customTTL = null) {
        // Check if we need to evict old items
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        
        this.cache.set(key, value);
        this.timestamps.set(key, {
            created: Date.now(),
            ttl: customTTL || this.ttl
        });
        
        console.log(`Cache SET: ${key} (TTL: ${customTTL || this.ttl}ms)`);
    }
    
    /**
     * Get a value from the cache
     * @param {string} key - Cache key
     * @returns {any|null} Cached value or null if not found/expired
     */
    get(key) {
        if (!this.cache.has(key)) {
            return null;
        }
        
        const timestamp = this.timestamps.get(key);
        const age = Date.now() - timestamp.created;
        
        if (age > timestamp.ttl) {
            console.log(`Cache EXPIRED: ${key} (age: ${age}ms, TTL: ${timestamp.ttl}ms)`);
            this.delete(key);
            return null;
        }
        
        console.log(`Cache HIT: ${key} (age: ${age}ms)`);
        return this.cache.get(key);
    }
    
    /**
     * Delete a specific cache entry
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
        this.timestamps.delete(key);
        console.log(`Cache DELETE: ${key}`);
    }
    
    /**
     * Clear all cache entries
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.timestamps.clear();
        console.log(`Cache CLEAR: ${size} entries removed`);
    }
    
    /**
     * Check if a key exists and is not expired
     * @param {string} key - Cache key
     * @returns {boolean} True if key exists and is valid
     */
    has(key) {
        return this.cache.has(key) && this.get(key) !== null;
    }
    
    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        
        for (const [key, timestamp] of this.timestamps) {
            const age = now - timestamp.created;
            if (age > timestamp.ttl) {
                expiredEntries++;
            } else {
                validEntries++;
            }
        }
        
        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            maxSize: this.maxSize,
            memoryUsage: this.estimateMemoryUsage()
        };
    }
    
    /**
     * Evict the oldest cache entry
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        for (const [key, timestamp] of this.timestamps) {
            if (timestamp.created < oldestTime) {
                oldestTime = timestamp.created;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            console.log(`Cache EVICT: ${oldestKey} (oldest entry)`);
            this.delete(oldestKey);
        }
    }
    
    /**
     * Estimate memory usage of cache
     * @returns {number} Estimated memory usage in bytes
     */
    estimateMemoryUsage() {
        let totalSize = 0;
        
        for (const [key, value] of this.cache) {
            // Rough estimation
            totalSize += key.length * 2; // String characters
            totalSize += JSON.stringify(value).length * 2; // JSON stringified value
        }
        
        return totalSize;
    }
    
    /**
     * Clear expired entries
     * @returns {number} Number of entries cleared
     */
    clearExpired() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, timestamp] of this.timestamps) {
            const age = now - timestamp.created;
            if (age > timestamp.ttl) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => this.delete(key));
        
        console.log(`Cache CLEAR EXPIRED: ${expiredKeys.length} entries removed`);
        return expiredKeys.length;
    }
    
    /**
     * Set cache configuration
     * @param {Object} config - Configuration object
     */
    configure(config) {
        if (config.ttl !== undefined) {
            this.ttl = config.ttl;
        }
        if (config.maxSize !== undefined) {
            this.maxSize = config.maxSize;
        }
        console.log(`Cache CONFIG: TTL=${this.ttl}ms, MaxSize=${this.maxSize}`);
    }
}

/**
 * Cache keys constants
 */
const CACHE_KEYS = {
    ALL_SAVES: 'allSaves',
    USER_INFO: 'userInfo',
    STATS: 'stats',
    LAST_SYNC: 'lastSync',
    SEARCH: (query) => `search_${query.toLowerCase().trim()}`,
    FILTER: (type, value) => `filter_${type}_${value}`,
    EXPORT_SIZE: 'exportSize'
};

/**
 * Cache invalidation patterns
 */
const CACHE_PATTERNS = {
    SEARCH: 'search_',
    FILTER: 'filter_',
    ALL_DATA: ['allSaves', 'userInfo', 'stats', 'lastSync']
};

/**
 * Global cache instance
 */
const cache = new CacheManager();

/**
 * Cache invalidation functions
 */
const CacheInvalidation = {
    /**
     * Clear all cache entries
     */
    clearAll() {
        cache.clear();
    },
    
    /**
     * Clear cache entries matching a pattern
     * @param {string} pattern - Pattern to match
     */
    clearPattern(pattern) {
        const keysToDelete = [];
        
        for (const key of cache.cache.keys()) {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => cache.delete(key));
        console.log(`Cache CLEAR PATTERN: ${pattern} (${keysToDelete.length} entries)`);
    },
    
    /**
     * Clear all data-related cache entries
     */
    clearDataCache() {
        CACHE_PATTERNS.ALL_DATA.forEach(key => cache.delete(key));
        this.clearPattern(CACHE_PATTERNS.SEARCH);
        this.clearPattern(CACHE_PATTERNS.FILTER);
        console.log('Cache CLEAR DATA: All data-related entries removed');
    },
    
    /**
     * Clear search cache
     */
    clearSearchCache() {
        this.clearPattern(CACHE_PATTERNS.SEARCH);
    },
    
    /**
     * Clear filter cache
     */
    clearFilterCache() {
        this.clearPattern(CACHE_PATTERNS.FILTER);
    },
    
    /**
     * Clear expired entries
     */
    clearExpired() {
        return cache.clearExpired();
    }
};

/**
 * Cache helper functions for common operations
 */
const CacheHelpers = {
    /**
     * Get saves with caching
     * @returns {Promise<Array>} Array of saves
     */
    async getSaves() {
        if (cache.has(CACHE_KEYS.ALL_SAVES)) {
            return cache.get(CACHE_KEYS.ALL_SAVES);
        }
        
        // This would be called from storage.js
        const saves = await Storage.getAllPosts();
        cache.set(CACHE_KEYS.ALL_SAVES, saves, 10 * 60 * 1000); // 10 minutes TTL
        return saves;
    },
    
    /**
     * Get user info with caching
     * @returns {Promise<Object>} User info object
     */
    async getUserInfo() {
        if (cache.has(CACHE_KEYS.USER_INFO)) {
            return cache.get(CACHE_KEYS.USER_INFO);
        }
        
        const userInfo = await chrome.storage.local.get(['username', 'isPro']);
        cache.set(CACHE_KEYS.USER_INFO, userInfo, 30 * 60 * 1000); // 30 minutes TTL
        return userInfo;
    },
    
    /**
     * Get stats with caching
     * @param {Array} saves - Array of saves
     * @returns {Object} Stats object
     */
    getStats(saves) {
        if (cache.has(CACHE_KEYS.STATS)) {
            return cache.get(CACHE_KEYS.STATS);
        }
        
        // Calculate stats (this would call the actual stats function)
        const stats = calculateStats(saves);
        cache.set(CACHE_KEYS.STATS, stats, 5 * 60 * 1000); // 5 minutes TTL
        return stats;
    },
    
    /**
     * Get search results with caching
     * @param {string} query - Search query
     * @param {Array} saves - Array of saves to search
     * @returns {Array} Filtered results
     */
    getSearchResults(query, saves) {
        const cacheKey = CACHE_KEYS.SEARCH(query);
        
        if (cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }
        
        // Perform search
        const results = saves.filter(save => 
            save.title.toLowerCase().includes(query.toLowerCase()) ||
            save.subreddit.toLowerCase().includes(query.toLowerCase()) ||
            (save.content && save.content.toLowerCase().includes(query.toLowerCase()))
        );
        
        cache.set(cacheKey, results, 2 * 60 * 1000); // 2 minutes TTL
        return results;
    }
};

/**
 * Auto-cleanup expired entries every 5 minutes
 */
setInterval(() => {
    const cleared = CacheInvalidation.clearExpired();
    if (cleared > 0) {
        console.log(`Auto-cleanup: ${cleared} expired cache entries removed`);
    }
}, 5 * 60 * 1000);

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CacheManager,
        cache,
        CACHE_KEYS,
        CacheInvalidation,
        CacheHelpers
    };
}

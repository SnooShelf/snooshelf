/**
 * SnooShelf Configuration Template
 * Copy this file to config.js and add your actual API keys
 * 
 * IMPORTANT: Never commit config.js to public repositories
 * This template shows the structure without sensitive data
 */

// ============================================================================
// REDDIT OAUTH CONFIGURATION
// ============================================================================

/**
 * Reddit OAuth 2.0 Configuration
 * For installed app authentication flow (no client secret required)
 */
const REDDIT_OAUTH = {
    // Reddit app client ID (get from https://www.reddit.com/prefs/apps)
    clientId: "YOUR_REDDIT_CLIENT_ID_HERE",
    
    // Client secret - empty for installed apps (handled via AWS Lambda)
    clientSecret: "[PLACEHOLDER - I'll add my actual Client Secret]",
    
    // OAuth redirect URI (Chrome extension identity API)
    redirectUri: "https://www.reddit.com/api/v1/authorize/callback",
    
    // OAuth scopes - permissions we need from Reddit
    scope: "identity,history,read,save",
    
    // User agent string for API requests
    userAgent: "SnooShelf/0.1.0"
};

// ============================================================================
// REDDIT API ENDPOINTS
// ============================================================================

/**
 * Reddit API Endpoints
 * URLs for authentication and API calls
 */
const REDDIT_API = {
    // OAuth authorization URL
    authUrl: "https://www.reddit.com/api/v1/authorize",
    
    // OAuth token exchange URL
    tokenUrl: "https://www.reddit.com/api/v1/access_token",
    
    // Base URL for authenticated API calls
    apiBase: "https://oauth.reddit.com",
    
    // Specific API endpoints
    endpoints: {
        // Get user's saved posts
        savedPosts: "/user/me/saved",
        
        // Get user profile information
        userProfile: "/api/v1/me",
        
        // Get subreddit information
        subredditInfo: "/r/{subreddit}/about",
        
        // Get post information
        postInfo: "/api/info"
    }
};

// ============================================================================
// EXTENSION CONFIGURATION
// ============================================================================

/**
 * SnooShelf Extension Settings
 * Version, name, and extension-specific configuration
 */
const EXTENSION = {
    // Extension version
    version: "0.1.0",
    
    // Extension name
    name: "SnooShelf",
    
    // Extension description
    description: "Unlimited local storage for your Reddit saves. Never lose a saved post again.",
    
    // Storage configuration
    storage: {
        // IndexedDB database name
        dbName: "snooshelf",
        
        // IndexedDB version
        dbVersion: 1,
        
        // Chrome storage keys
        keys: {
            isAuthenticated: "isAuthenticated",
            totalSaves: "totalSaves",
            lastSync: "lastSync",
            isPro: "isPro",
            userSettings: "userSettings",
            redditTokens: "redditTokens"
        }
    }
};

// ============================================================================
// API RATE LIMITING
// ============================================================================

/**
 * Reddit API Rate Limiting Configuration
 * Reddit allows 60 requests per minute
 */
const RATE_LIMITS = {
    // Maximum requests per minute
    requestsPerMinute: 60,
    
    // Minimum delay between requests (milliseconds)
    minDelay: 1000,
    
    // Retry configuration
    maxRetries: 3,
    retryDelay: 5000
};

// ============================================================================
// STORAGE LIMITS
// ============================================================================

/**
 * Storage Configuration and Limits
 * Chrome extension storage constraints
 */
const STORAGE_LIMITS = {
    // Free tier save limit
    maxFreeSaves: 1000,
    
    // Pro tier (unlimited)
    maxProSaves: -1, // -1 means unlimited
    
    // Chrome storage local limit (5MB)
    chromeStorageLimit: 5 * 1024 * 1024, // 5MB in bytes
    
    // IndexedDB recommended limit (10GB+)
    indexedDBLimit: 10 * 1024 * 1024 * 1024 // 10GB in bytes
};

// ============================================================================
// UI CONFIGURATION
// ============================================================================

/**
 * User Interface Configuration
 * Popup dimensions, colors, and display settings
 */
const UI_CONFIG = {
    // Popup dimensions
    popup: {
        width: 400,
        height: 600
    },
    
    // Color scheme
    colors: {
        primary: "#FF4500", // Reddit orange
        secondary: "#0079D3", // Reddit blue
        success: "#28a745",
        warning: "#ffc107",
        danger: "#dc3545",
        light: "#f8f9fa",
        dark: "#1a1a1b"
    },
    
    // Display settings
    display: {
        savesPerPage: 20,
        searchDebounce: 300, // milliseconds
        animationDuration: 200 // milliseconds
    }
};

// ============================================================================
// MAIN CONFIG OBJECT
// ============================================================================

/**
 * Main Configuration Object
 * Exports all configuration settings for use throughout the extension
 */
const CONFIG = {
    // Reddit OAuth settings
    reddit: REDDIT_OAUTH,
    
    // Reddit API endpoints
    api: REDDIT_API,
    
    // Extension settings
    extension: EXTENSION,
    
    // Rate limiting configuration
    rateLimits: RATE_LIMITS,
    
    // Storage limits
    storageLimits: STORAGE_LIMITS,
    
    // UI configuration
    ui: UI_CONFIG
};

// Export configuration for use in other files
// Note: This will be available globally in the extension context
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// For Node.js environments (if needed for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

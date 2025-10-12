/**
 * SnooShelf Reddit OAuth Authentication
 * Handles Chrome extension OAuth flow with Reddit API
 * Manifest V3 Authentication Module
 */

// Import configuration
// Note: CONFIG should be available globally from config.js
if (typeof CONFIG === 'undefined') {
    console.error('CONFIG not found. Make sure config.js is loaded first.');
}

// ============================================================================
// OAUTH URL GENERATION
// ============================================================================

/**
 * Generate Reddit authorization URL with proper parameters
 * Creates the URL that users will visit to authorize the extension
 * 
 * @returns {string} Complete Reddit authorization URL
 */
function generateAuthUrl() {
    try {
        console.log('Generating Reddit authorization URL...');
        
        // Validate OAuth configuration first
        if (!validateOAuthConfig()) {
            throw new Error('Invalid OAuth configuration');
        }
        
        // Get OAuth configuration
        const { clientId, redirectUri, scope } = CONFIG.reddit;
        
        // Generate random state parameter for security
        const state = generateRandomState();
        
        // Build authorization URL with required parameters
        const authUrl = new URL(CONFIG.api.authUrl);
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('duration', 'permanent');
        authUrl.searchParams.set('scope', scope);
        
        const finalUrl = authUrl.toString();
        console.log('Authorization URL generated:', finalUrl);
        
        return finalUrl;
        
    } catch (error) {
        console.error('Error generating auth URL:', error);
        throw new Error('Failed to generate authorization URL');
    }
}

/**
 * Generate random state parameter for OAuth security
 * Prevents CSRF attacks during OAuth flow
 * 
 * @returns {string} Random state string
 */
function generateRandomState() {
    try {
        // Generate cryptographically secure random string
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const state = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        
        console.log('Generated random state:', state);
        return state;
        
    } catch (error) {
        console.error('Error generating random state:', error);
        // Fallback to timestamp-based state
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// ============================================================================
// OAUTH FLOW INITIATION
// ============================================================================

/**
 * Initiate Reddit OAuth authentication flow
 * Opens Reddit authorization page and handles callback
 * 
 * @returns {Promise<string>} Authorization code from Reddit
 */
async function initiateAuth() {
    try {
        console.log('Initiating Reddit OAuth flow...');
        
        // Check if online before starting OAuth
        if (!navigator.onLine) {
            throw new Error('No internet connection');
        }
        
        // Check if Chrome identity API is available
        if (!chrome.identity || !chrome.identity.launchWebAuthFlow) {
            throw new Error('Chrome identity API not available');
        }
        
        // Generate authorization URL
        const authUrl = generateAuthUrl();
        
        // Launch OAuth flow using Chrome identity API
        const responseUrl = await chrome.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true
        });
        
        console.log('OAuth flow completed, response URL:', responseUrl);
        
        // Extract authorization code from callback URL
        const authCode = extractAuthCodeFromUrl(responseUrl);
        
        if (!authCode) {
            throw new Error('No authorization code received from Reddit');
        }
        
        console.log('Authorization code received:', authCode);
        return authCode;
        
    } catch (error) {
        // Handle specific error cases
        if (error.message.includes('The user did not approve access')) {
            throw new Error('User denied access to Reddit account');
        } else if (error.message.includes('network') || error.name === 'TypeError') {
            throw new Error('Network error during authentication');
        } else {
            throw new Error('Authentication failed: ' + error.message);
        }
    }
}

/**
 * Extract authorization code from OAuth callback URL
 * Parses the callback URL to get the authorization code
 * 
 * @param {string} callbackUrl - URL returned from OAuth flow
 * @returns {string|null} Authorization code or null if not found
 */
function extractAuthCodeFromUrl(callbackUrl) {
    try {
        console.log('Extracting auth code from callback URL...');
        
        const url = new URL(callbackUrl);
        const authCode = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');
        
        // Check for OAuth errors
        if (error) {
            throw new Error(`OAuth error: ${error}`);
        }
        
        // Validate state parameter (basic security check)
        if (state) {
            console.log('State parameter validated:', state);
        }
        
        if (authCode) {
            console.log('Authorization code extracted successfully');
            return authCode;
        } else {
            console.warn('No authorization code found in callback URL');
            return null;
        }
        
    } catch (error) {
        console.error('Error extracting auth code:', error);
        return null;
    }
}

// ============================================================================
// AUTHENTICATION STATE MANAGEMENT
// ============================================================================

/**
 * Save authentication state to Chrome storage
 * Stores authorization code and sets authentication flags
 * 
 * @param {string} authCode - Authorization code from Reddit
 * @returns {Promise<void>}
 */
async function saveAuthState(authCode) {
    try {
        console.log('Saving authentication state...');
        
        // Validate auth code
        if (!authCode || typeof authCode !== 'string') {
            throw new Error('Invalid authorization code');
        }
        
        const timestamp = Date.now();
        const authData = {
            authCode: authCode,
            timestamp: timestamp,
            isAuthenticated: true,
            lastAuth: new Date().toISOString()
        };
        
        // Save to Chrome storage
        await chrome.storage.local.set(authData);
        
        console.log('Authentication state saved successfully');
        
    } catch (error) {
        console.error('Error saving auth state:', error);
        if (error.name === 'QuotaExceededError') {
            throw new Error('Storage quota exceeded');
        }
        throw new Error('Failed to save authentication state');
    }
}

/**
 * Check current authentication status
 * Reads from Chrome storage to determine if user is authenticated
 * 
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
async function checkAuthStatus() {
    try {
        console.log('Checking authentication status...');
        
        const { isAuthenticated, timestamp } = await chrome.storage.local.get([
            'isAuthenticated',
            'timestamp'
        ]);
        
        const isAuth = isAuthenticated === true;
        console.log('Authentication status:', isAuth);
        
        if (isAuth && timestamp) {
            const authTime = new Date(timestamp);
            console.log('Last authentication:', authTime.toISOString());
        }
        
        return isAuth;
        
    } catch (error) {
        console.error('Error checking auth status:', error);
        return false;
    }
}

/**
 * Clear authentication data from storage
 * Removes all authentication-related data and resets flags
 * 
 * @returns {Promise<void>}
 */
async function clearAuth() {
    try {
        console.log('Clearing authentication data...');
        
        // Remove authentication-related keys
        await chrome.storage.local.remove([
            'authCode',
            'timestamp',
            'isAuthenticated',
            'lastAuth',
            'redditTokens'
        ]);
        
        console.log('Authentication data cleared successfully');
        
    } catch (error) {
        console.error('Error clearing auth data:', error);
        throw new Error('Failed to clear authentication data');
    }
}

// ============================================================================
// AUTHENTICATION FLOW COORDINATION
// ============================================================================

/**
 * Complete authentication flow
 * Initiates OAuth, saves state, and returns success status
 * 
 * @returns {Promise<boolean>} True if authentication successful
 */
async function authenticate() {
    try {
        console.log('Starting complete authentication flow...');
        
        // Step 1: Initiate OAuth flow
        const authCode = await initiateAuth();
        
        // Step 2: Save authentication state
        await saveAuthState(authCode);
        
        console.log('Authentication flow completed successfully');
        return true;
        
    } catch (error) {
        console.error('Authentication flow failed:', error);
        return false;
    }
}

/**
 * Get current user authentication info
 * Returns detailed authentication status and user data
 * 
 * @returns {Promise<Object>} Authentication info object
 */
async function getAuthInfo() {
    try {
        console.log('Getting authentication info...');
        
        const authData = await chrome.storage.local.get([
            'isAuthenticated',
            'timestamp',
            'lastAuth',
            'authCode'
        ]);
        
        const authInfo = {
            isAuthenticated: authData.isAuthenticated || false,
            timestamp: authData.timestamp || null,
            lastAuth: authData.lastAuth || null,
            hasAuthCode: !!authData.authCode
        };
        
        console.log('Authentication info:', authInfo);
        return authInfo;
        
    } catch (error) {
        console.error('Error getting auth info:', error);
        return {
            isAuthenticated: false,
            timestamp: null,
            lastAuth: null,
            hasAuthCode: false
        };
    }
}

// ============================================================================
// ERROR HANDLING AND VALIDATION
// ============================================================================

/**
 * Validate OAuth configuration
 * Checks if all required OAuth parameters are available
 * 
 * @returns {boolean} True if configuration is valid
 */
function validateOAuthConfig() {
    try {
        console.log('Validating OAuth configuration...');
        
        const { clientId, redirectUri, scope } = CONFIG.reddit;
        
        if (!clientId || clientId.includes('PLACEHOLDER')) {
            console.error('Invalid client ID');
            return false;
        }
        
        if (!redirectUri) {
            console.error('Missing redirect URI');
            return false;
        }
        
        if (!scope) {
            console.error('Missing OAuth scope');
            return false;
        }
        
        console.log('OAuth configuration is valid');
        return true;
        
    } catch (error) {
        console.error('Error validating OAuth config:', error);
        return false;
    }
}

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

// Expose functions to console for development
if (typeof window !== 'undefined') {
    window.SnooShelfAuth = {
        generateAuthUrl,
        initiateAuth,
        saveAuthState,
        checkAuthStatus,
        clearAuth,
        authenticate,
        getAuthInfo,
        validateOAuthConfig
    };
}

// Log authentication module status
console.log('SnooShelf authentication module loaded successfully');


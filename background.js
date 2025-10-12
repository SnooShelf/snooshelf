/**
 * SnooShelf Background Service Worker
 * Handles extension lifecycle events and background tasks
 * Manifest V3 Service Worker
 */

// Import configuration and libraries
importScripts('config.js');
importScripts('reddit-api.js');
importScripts('storage.js');


// ============================================================================
// EXTENSION LIFECYCLE EVENTS
// ============================================================================

/**
 * Handle extension installation and updates
 * Sets up default storage values on first install
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    try {
        console.log('SnooShelf installed successfully');
        
        // Check if this is a fresh install (not an update)
        if (details.reason === 'install') {
            console.log('First time installation detected');
            await initializeDefaultStorage();
        } else if (details.reason === 'update') {
            console.log(`Extension updated from version ${details.previousVersion}`);
            // Future: Handle migration logic here
        }
        
    } catch (error) {
        console.error('Error during extension installation:', error);
    }
});

/**
 * Handle extension startup
 * Runs when the extension starts up
 */
chrome.runtime.onStartup.addListener(async () => {
    try {
        console.log('SnooShelf service worker started');
        
        // Check if user is authenticated and sync if needed
        const { isAuthenticated } = await chrome.storage.local.get('isAuthenticated');
        if (isAuthenticated) {
            console.log('User is authenticated, checking for sync needs');
            // Future: Implement auto-sync logic here
        }
        
    } catch (error) {
        console.error('Error during extension startup:', error);
    }
});

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Handle messages from popup, content scripts, and other parts of the extension
 * This is the main communication hub for the extension
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        console.log('Background received message:', message);
        
        // Handle different message types
        switch (message.action) {
            case 'getStorageData':
                handleGetStorageData(message, sendResponse);
                break;
                
            case 'updateStorageData':
                handleUpdateStorageData(message, sendResponse);
                break;
                
            case 'checkAuthentication':
                handleCheckAuthentication(message, sendResponse);
                break;
                
            case 'syncSaves':
                handleSyncSaves(message, sendResponse);
                break;
                
            case 'login':
                handleLogin(message, sendResponse);
                break;
                
            case 'logout':
                handleLogout(message, sendResponse);
                break;
                
            case 'getUserInfo':
                handleGetUserInfo(message, sendResponse);
                break;
                
            case 'clearAllSaves':
                handleClearAllSaves(message, sendResponse);
                break;
                
            case 'clearAllData':
                handleClearAllData(message, sendResponse);
                break;
                
            default:
                console.warn('Unknown message action:', message.action);
                sendResponse({ 
                    success: false, 
                    error: 'Unknown action' 
                });
        }
        
        // Return true to indicate we will send a response asynchronously
        return true;
        
    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Handle keyboard shortcuts
 * Opens settings page when Ctrl+Shift+S (or Cmd+Shift+S on Mac) is pressed
 */
chrome.commands.onCommand.addListener((command) => {
    try {
        console.log('Command received:', command);
        
        switch (command) {
            case 'open-settings':
                console.log('Opening settings page via keyboard shortcut');
                chrome.tabs.create({ 
                    url: chrome.runtime.getURL('settings.html') 
                });
                break;
                
            default:
                console.log('Unknown command:', command);
        }
        
    } catch (error) {
        console.error('Error handling command:', error);
    }
});

// ============================================================================
// STORAGE MANAGEMENT
// ============================================================================

/**
 * Initialize default storage values on first install
 * Sets up the basic state for a new user
 */
async function initializeDefaultStorage() {
    try {
        console.log('Initializing default storage values');
        
        const defaultValues = {
            isAuthenticated: false,
            totalSaves: 0,
            lastSync: null,
            isPro: false,
            userSettings: {
                autoSync: true,
                syncInterval: 15, // minutes
                theme: 'light'
            },
            redditTokens: {
                accessToken: null,
                refreshToken: null,
                expiresAt: null
            }
        };
        
        await chrome.storage.local.set(defaultValues);
        console.log('Default storage values initialized successfully');
        
    } catch (error) {
        console.error('Error initializing default storage:', error);
        throw error;
    }
}

/**
 * Handle getStorageData message
 * Returns requested storage data to the sender
 */
async function handleGetStorageData(message, sendResponse) {
    try {
        const { keys } = message;
        const data = await chrome.storage.local.get(keys);
        sendResponse({ 
            success: true, 
            data: data 
        });
    } catch (error) {
        console.error('Error getting storage data:', error);
        sendResponse({ 
            success: false, 
            error: error.message 
        });
    }
}

/**
 * Handle updateStorageData message
 * Updates storage with new values
 */
async function handleUpdateStorageData(message, sendResponse) {
    try {
        const { data } = message;
        await chrome.storage.local.set(data);
        sendResponse({ 
            success: true, 
            message: 'Storage updated successfully' 
        });
    } catch (error) {
        console.error('Error updating storage data:', error);
        sendResponse({ 
            success: false, 
            error: error.message 
        });
    }
}

/**
 * Handle checkAuthentication message
 * Checks if user is authenticated and tokens are valid
 */
async function handleCheckAuthentication(message, sendResponse) {
    try {
        const { isAuthenticated, redditTokens } = await chrome.storage.local.get([
            'isAuthenticated', 
            'redditTokens'
        ]);
        
        // Check if tokens exist and are not expired
        const isTokenValid = redditTokens && 
                           redditTokens.accessToken && 
                           redditTokens.expiresAt && 
                           Date.now() < redditTokens.expiresAt;
        
        const isAuthenticatedAndValid = isAuthenticated && isTokenValid;
        
        sendResponse({ 
            success: true, 
            isAuthenticated: isAuthenticatedAndValid,
            needsRefresh: isAuthenticated && !isTokenValid
        });
        
    } catch (error) {
        console.error('Error checking authentication:', error);
        sendResponse({ 
            success: false, 
            error: error.message 
        });
    }
}

/**
 * Handle syncSaves message
 * Fetches all saved posts from Reddit API and stores them locally
 */
async function handleSyncSaves(message, sendResponse) {
    try {
        console.log('Sync saves requested - starting full sync');
        
        // Get access token from storage
        const { redditTokens } = await chrome.storage.local.get('redditTokens');
        
        if (!redditTokens || !redditTokens.accessToken) {
            throw new Error('No access token found. Please login again.');
        }
        
        // Check if token is expired
        if (redditTokens.expiresAt && Date.now() >= redditTokens.expiresAt) {
            throw new Error('Access token expired. Please login again.');
        }
        
        // Get username from storage or fetch it
        let { username } = await chrome.storage.local.get('username');
        
        if (!username) {
            console.log('Username not found, fetching from Reddit API...');
            const userInfo = await RedditAPI.getUserInfo(redditTokens.accessToken);
            username = userInfo.username;
            
            // Save username for future use
            await chrome.storage.local.set({ username: username });
            console.log('Username saved:', username);
        }
        
        console.log('Starting sync for user:', username);
        
        // Fetch all saved posts from Reddit
        const allPosts = await RedditAPI.getAllSavedPosts(redditTokens.accessToken, username);
        
        console.log(`Fetched ${allPosts.length} posts from Reddit`);
        
        // Save posts to IndexedDB
        const savedCount = await SnooShelfStorage.savePosts(allPosts);
        
        console.log(`Saved ${savedCount} posts to local storage`);
        
        // Update storage with sync info
        const syncTime = Date.now();
        await chrome.storage.local.set({
            lastSync: syncTime,
            totalSaves: allPosts.length,
            saves: allPosts // Store saves in chrome.storage for popup access
        });
        
        console.log('Sync completed successfully');
        
        sendResponse({ 
            success: true, 
            message: `Sync completed! ${savedCount} saves imported.`,
            savesCount: savedCount,
            lastSync: syncTime
        });
        
    } catch (error) {
        console.error('Error syncing saves:', error);
        sendResponse({ 
            success: false, 
            error: error.message 
        });
    }
}

/**
 * Handle login message
 * Initiates Reddit OAuth flow using chrome.tabs.create()
 */
async function handleLogin(message, sendResponse) {
    try {
        console.log('Login requested from popup');
        
        // Check if CONFIG is available
        if (typeof CONFIG === 'undefined') {
            throw new Error('CONFIG not available in background script');
        }
        
        // Generate OAuth URL
        const authUrl = generateAuthUrl();
        console.log('Generated OAuth URL:', authUrl);
        
        // Use chrome.tabs.create() for OAuth flow
        const authResult = await initiateAuth(authUrl);
        
        if (!authResult.code) {
            throw new Error('No authorization code received from Reddit');
        }
        
        console.log('Authorization code received:', authResult.code);
        
        // Save authentication state
        await saveAuthState(authResult.code);
        
        // Send success response
        sendResponse({
            success: true,
            message: 'Login successful',
            authCode: authResult.code
        });
        
    } catch (error) {
        console.error('Login failed in background:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

/**
 * Handle logout message
 * Clears authentication data
 */
async function handleLogout(message, sendResponse) {
    try {
        console.log('Logout requested from popup');
        
        // Clear authentication data
        await chrome.storage.local.remove([
            'authCode',
            'timestamp',
            'isAuthenticated',
            'lastAuth',
            'username',
            'redditTokens',
            'totalSaves',
            'lastSync'
        ]);
        
        console.log('Authentication data cleared');
        
        sendResponse({
            success: true,
            message: 'Logout successful'
        });
        
    } catch (error) {
        console.error('Logout failed:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

/**
 * Handle getUserInfo message
 * Fetches username from Reddit API if not in storage
 */
async function handleGetUserInfo(message, sendResponse) {
    try {
        console.log('Get user info requested from popup');
        
        // First check if username is already in storage
        const { username } = await chrome.storage.local.get('username');
        if (username) {
            sendResponse({
                success: true,
                username: username
            });
            return;
        }
        
        // Username not in storage, fetch from Reddit API
        const { redditTokens } = await chrome.storage.local.get('redditTokens');
        
        if (!redditTokens || !redditTokens.accessToken) {
            throw new Error('No access token found. Please login again.');
        }
        
        // Check if token is expired
        if (redditTokens.expiresAt && Date.now() >= redditTokens.expiresAt) {
            throw new Error('Access token expired. Please login again.');
        }
        
        // Fetch username from Reddit API
        const userInfo = await RedditAPI.getUserInfo(redditTokens.accessToken);
        
        // Save username to storage
        await chrome.storage.local.set({ username: userInfo.username });
        
        sendResponse({
            success: true,
            username: userInfo.username
        });
        
    } catch (error) {
        console.error('Get user info failed:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// ============================================================================
// OAUTH HELPER FUNCTIONS
// ============================================================================

/**
 * Initiate OAuth flow using chrome.tabs.create()
 * Opens Reddit auth in new tab and listens for callback
 */
async function initiateAuth(authUrl) {
    return new Promise((resolve, reject) => {
        console.log('Opening Reddit auth in new tab:', authUrl);
        
        // Open Reddit auth in new tab
        chrome.tabs.create({ url: authUrl }, (tab) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            
            const authTabId = tab.id;
            console.log('Auth tab created with ID:', authTabId);
            
            // Listen for tab updates to detect redirect
            const listener = (tabId, changeInfo, tab) => {
                if (tabId !== authTabId) return;
                
                console.log('Tab updated:', { tabId, changeInfo, url: tab.url });
                
                // Check if URL contains callback
                if (changeInfo.url && changeInfo.url.includes('reddit.com/api/v1/authorize/callback')) {
                    console.log('Callback detected:', changeInfo.url);
                    
                    try {
                        const url = new URL(changeInfo.url);
                        const code = url.searchParams.get('code');
                        const error = url.searchParams.get('error');
                        
                        // Remove listener and close tab
                        chrome.tabs.onUpdated.removeListener(listener);
                        chrome.tabs.remove(authTabId);
                        
                        if (error) {
                            reject(new Error(`OAuth error: ${error}`));
                        } else if (code) {
                            resolve({ code });
                        } else {
                            reject(new Error('No authorization code'));
                        }
                    } catch (err) {
                        chrome.tabs.onUpdated.removeListener(listener);
                        chrome.tabs.remove(authTabId);
                        reject(err);
                    }
                }
            };
            
            chrome.tabs.onUpdated.addListener(listener);
            
            // Timeout after 5 minutes
            setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                chrome.tabs.remove(authTabId);
                reject(new Error('OAuth timeout - no callback received'));
            }, 5 * 60 * 1000);
        });
    });
}

/**
 * Generate Reddit authorization URL with proper parameters
 * Creates the URL that users will visit to authorize the extension
 */
function generateAuthUrl() {
    try {
        console.log('Generating Reddit authorization URL...');
        
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
        console.log('URL components:', {
            baseUrl: CONFIG.api.authUrl,
            clientId: clientId,
            redirectUri: redirectUri,
            scope: scope,
            state: state
        });
        
        return finalUrl;
        
    } catch (error) {
        console.error('Error generating auth URL:', error);
        throw new Error('Failed to generate authorization URL');
    }
}

/**
 * Generate random state parameter for OAuth security
 * Prevents CSRF attacks during OAuth flow
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


/**
 * Save authentication state to Chrome storage
 * Exchanges authorization code for access tokens and stores them
 */
async function saveAuthState(authCode) {
    try {
        console.log('Exchanging authorization code for access tokens...');
        
        // Exchange authorization code for access tokens
        const tokens = await RedditAPI.exchangeCodeForToken(authCode, null);
        
        console.log('Token exchange successful');
        
        // Fetch username from Reddit API
        console.log('Fetching username from Reddit API...');
        const userInfo = await RedditAPI.getUserInfo(tokens.accessToken);
        const username = userInfo.username;
        console.log('Username fetched:', username);
        
        // Calculate expiration time
        const timestamp = Date.now();
        const expiresAt = timestamp + (tokens.expiresIn * 1000);
        
        const authData = {
            authCode: authCode,
            timestamp: timestamp,
            isAuthenticated: true,
            lastAuth: new Date().toISOString(),
            username: username,
            redditTokens: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: expiresAt
            }
        };
        
        // Save to Chrome storage
        await chrome.storage.local.set(authData);
        
        console.log('Authentication state saved successfully');
        
    } catch (error) {
        console.error('Error saving auth state:', error);
        throw new Error('Failed to exchange authorization code for tokens');
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current storage state for debugging
 * Useful for development and troubleshooting
 */
async function getCurrentStorageState() {
    try {
        const allData = await chrome.storage.local.get(null);
        console.log('Current storage state:', allData);
        return allData;
    } catch (error) {
        console.error('Error getting storage state:', error);
        return null;
    }
}

/**
 * Clear all storage data (for development/testing)
 * WARNING: This will delete all user data
 */
async function clearAllStorage() {
    try {
        await chrome.storage.local.clear();
        console.log('All storage data cleared');
    } catch (error) {
        console.error('Error clearing storage:', error);
    }
}

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

// Expose utility functions to console for development
if (typeof window !== 'undefined') {
    window.SnooShelfDebug = {
        getStorageState: getCurrentStorageState,
        clearStorage: clearAllStorage
    };
}

// Log service worker status
console.log('SnooShelf background service worker loaded successfully');

/**
 * Handle clearAllSaves message
 * Clears all saves from storage
 */
async function handleClearAllSaves(message, sendResponse) {
    try {
        console.log('Clearing all saves...');
        
        // Clear saves from IndexedDB
        await SnooShelfStorage.clearAllPosts();
        
        // Clear saves from chrome.storage.local
        await chrome.storage.local.remove(['saves', 'totalSaves', 'lastSync']);
        
        console.log('All saves cleared successfully');
        
        sendResponse({ success: true, message: 'All saves cleared successfully' });
        
    } catch (error) {
        console.error('Error clearing saves:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Handle clearAllData message
 * Clears all data including saves, cache, and settings
 */
async function handleClearAllData(message, sendResponse) {
    try {
        console.log('Clearing all data...');
        
        // Clear all posts from IndexedDB
        await SnooShelfStorage.clearAllPosts();
        
        // Clear cache if available
        if (typeof CacheInvalidation !== 'undefined') {
            CacheInvalidation.clearAll();
        }
        
        // Clear storage settings
        await chrome.storage.local.clear();
        
        console.log('All data cleared successfully');
        sendResponse({ success: true, message: 'All data cleared successfully' });
        
    } catch (error) {
        console.error('Error clearing all data:', error);
        sendResponse({ success: false, error: error.message });
    }
}

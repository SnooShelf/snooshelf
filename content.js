/**
 * SnooShelf Content Script
 * Runs on Reddit pages to detect posts and prepare for future enhancements
 * Manifest V3 Content Script
 */

// ============================================================================
// CONTENT SCRIPT INITIALIZATION
// ============================================================================

/**
 * Initialize content script when DOM is ready
 * Ensures Reddit's page is fully loaded before running our code
 */
function initializeContentScript() {
    try {
        // Check if document.body exists (page is loaded)
        if (!document.body) {
            console.log('SnooShelf: Document body not ready, waiting...');
            return;
        }

        console.log('SnooShelf content script loaded on Reddit');
        
        // Detect current page type and log relevant information
        detectPageType();
        
        // Future: Add save button enhancements here
        addFutureEnhancementComment();
        
    } catch (error) {
        console.error('SnooShelf content script error:', error);
    }
}

/**
 * Detect what type of Reddit page we're on
 * Helps determine what functionality to enable
 */
function detectPageType() {
    try {
        const currentUrl = window.location.href;
        const pathname = window.location.pathname;
        
        console.log('SnooShelf: Current Reddit page detected:', {
            url: currentUrl,
            pathname: pathname,
            isPostPage: isRedditPostPage(pathname),
            isCommentPage: isRedditCommentPage(pathname),
            subreddit: extractSubreddit(pathname)
        });
        
    } catch (error) {
        console.error('SnooShelf: Error detecting page type:', error);
    }
}

/**
 * Check if current page is a Reddit post page
 * Matches pattern: /r/[subreddit]/comments/[postid]/
 */
function isRedditPostPage(pathname) {
    try {
        const postPagePattern = /^\/r\/[^\/]+\/comments\/[^\/]+\//;
        return postPagePattern.test(pathname);
    } catch (error) {
        console.error('SnooShelf: Error checking post page:', error);
        return false;
    }
}

/**
 * Check if current page is a Reddit comment page
 * Matches pattern: /r/[subreddit]/comments/[postid]/[title]/
 */
function isRedditCommentPage(pathname) {
    try {
        const commentPagePattern = /^\/r\/[^\/]+\/comments\/[^\/]+\/[^\/]+\//;
        return commentPagePattern.test(pathname);
    } catch (error) {
        console.error('SnooShelf: Error checking comment page:', error);
        return false;
    }
}

/**
 * Extract subreddit name from current URL
 * Returns subreddit name or null if not found
 */
function extractSubreddit(pathname) {
    try {
        const subredditMatch = pathname.match(/^\/r\/([^\/]+)\//);
        return subredditMatch ? subredditMatch[1] : null;
    } catch (error) {
        console.error('SnooShelf: Error extracting subreddit:', error);
        return null;
    }
}

/**
 * Add comment about future enhancements
 * TODO placeholder for save button integration
 */
function addFutureEnhancementComment() {
    try {
        console.log('SnooShelf: Future: Enhance save buttons to sync with SnooShelf');
        
        // Future: This is where we'll add save button enhancements
        // - Detect Reddit's save buttons
        // - Add SnooShelf sync functionality
        // - Show save status in Reddit's UI
        // - Handle bulk save operations
        
    } catch (error) {
        console.error('SnooShelf: Error adding future enhancement comment:', error);
    }
}

// ============================================================================
// REDDIT PAGE DETECTION
// ============================================================================

/**
 * Check if we're on a Reddit post or comment page
 * Returns true if we should enable SnooShelf functionality
 */
function shouldEnableSnooShelf() {
    try {
        const pathname = window.location.pathname;
        return isRedditPostPage(pathname) || isRedditCommentPage(pathname);
    } catch (error) {
        console.error('SnooShelf: Error checking if should enable:', error);
        return false;
    }
}

/**
 * Get current post information for future use
 * Extracts post ID, title, and other metadata
 */
function getCurrentPostInfo() {
    try {
        const pathname = window.location.pathname;
        const postIdMatch = pathname.match(/\/comments\/([^\/]+)\//);
        const postId = postIdMatch ? postIdMatch[1] : null;
        
        const subreddit = extractSubreddit(pathname);
        const title = document.title;
        
        return {
            postId: postId,
            subreddit: subreddit,
            title: title,
            url: window.location.href,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('SnooShelf: Error getting post info:', error);
        return null;
    }
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Listen for messages from background script or popup
 * Handles communication with other parts of the extension
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        console.log('SnooShelf content script received message:', message);
        
        switch (message.action) {
            case 'getPageInfo':
                handleGetPageInfo(message, sendResponse);
                break;
                
            case 'checkSaveStatus':
                handleCheckSaveStatus(message, sendResponse);
                break;
                
            default:
                console.warn('SnooShelf: Unknown message action:', message.action);
                sendResponse({ 
                    success: false, 
                    error: 'Unknown action' 
                });
        }
        
        return true; // Indicate we will send a response asynchronously
        
    } catch (error) {
        console.error('SnooShelf: Error handling message:', error);
        sendResponse({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Handle getPageInfo message
 * Returns information about the current Reddit page
 */
async function handleGetPageInfo(message, sendResponse) {
    try {
        const pageInfo = getCurrentPostInfo();
        const shouldEnable = shouldEnableSnooShelf();
        
        sendResponse({
            success: true,
            data: {
                pageInfo: pageInfo,
                shouldEnable: shouldEnable,
                isRedditPost: isRedditPostPage(window.location.pathname),
                isRedditComment: isRedditCommentPage(window.location.pathname)
            }
        });
    } catch (error) {
        console.error('SnooShelf: Error getting page info:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

/**
 * Handle checkSaveStatus message
 * Future: Check if current post is saved in SnooShelf
 */
async function handleCheckSaveStatus(message, sendResponse) {
    try {
        console.log('SnooShelf: Checking save status - placeholder for future implementation');
        
        // Future: Check if post is saved in SnooShelf storage
        // For now, return placeholder response
        sendResponse({
            success: true,
            isSaved: false,
            message: 'Save status checking coming soon'
        });
        
    } catch (error) {
        console.error('SnooShelf: Error checking save status:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Handle DOM content loaded event
 * Ensures Reddit's page is ready before running our code
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    // DOM is already loaded, run immediately
    initializeContentScript();
}

/**
 * Handle page navigation (for Reddit's SPA behavior)
 * Reddit uses client-side routing, so we need to detect URL changes
 */
let currentUrl = window.location.href;
const urlChangeObserver = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('SnooShelf: Page navigation detected, reinitializing...');
        
        // Small delay to ensure new page content is loaded
        setTimeout(() => {
            detectPageType();
        }, 500);
    }
});

// Start observing for URL changes
urlChangeObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

// Expose utility functions to console for development
if (typeof window !== 'undefined') {
    window.SnooShelfDebug = {
        getPageInfo: getCurrentPostInfo,
        shouldEnable: shouldEnableSnooShelf,
        isPostPage: isRedditPostPage,
        isCommentPage: isRedditCommentPage,
        extractSubreddit: extractSubreddit
    };
}

// Log content script status
console.log('SnooShelf content script loaded successfully');


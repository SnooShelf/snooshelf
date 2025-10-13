/**
 * SnooShelf Popup Script
 * Handles the full extension popup UI with saves list, search, and sync functionality
 */

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const elements = {
    // State containers
    header: document.getElementById('header'),
    loggedInState: document.getElementById('loggedInState'),
    loggedOutState: document.getElementById('loggedOutState'),
    loading: document.getElementById('loading'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingOverlayText: document.getElementById('loadingOverlayText'),
    
    // Header
    welcomeMessage: document.getElementById('welcomeMessage'),
    logoutBtn: document.getElementById('logoutBtn'),
    settingsIconBtn: document.getElementById('settingsIconBtn'),
    
    // Stats
    saveCount: document.getElementById('saveCount'),
    lastSync: document.getElementById('lastSync'),
    syncBtn: document.getElementById('syncBtn'),
    
    // Search
    searchInput: document.getElementById('searchInput'),
    
    // Stats
    statsSection: document.getElementById('statsSection'),
    statsHeader: document.getElementById('statsHeader'),
    statsToggle: document.getElementById('statsToggle'),
    statsContent: document.getElementById('statsContent'),
    totalSavesCount: document.getElementById('totalSavesCount'),
    totalSubredditsCount: document.getElementById('totalSubredditsCount'),
    oldestSave: document.getElementById('oldestSave'),
    newestSave: document.getElementById('newestSave'),
    topSubredditsChart: document.getElementById('topSubredditsChart'),
    
    // Saves list
    savesList: document.getElementById('savesList'),
    savesCount: document.getElementById('savesCount'),
    skeletonLoading: document.getElementById('skeletonLoading'),
    
    // Export buttons
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    exportJsonBtn: document.getElementById('exportJsonBtn'),
    exportMdBtn: document.getElementById('exportMdBtn'),
    exportSize: document.getElementById('exportSize'),
    
    // Bottom buttons
    settingsBtn: document.getElementById('settingsBtn'),
    helpBtn: document.getElementById('helpBtn'),
    upgradeBtn: document.getElementById('upgradeBtn'),
    
    // View elements
    mainView: document.getElementById('mainView'),
    settingsView: document.getElementById('settingsView'),
    backBtn: document.getElementById('backBtn'),
    
    // Settings view elements
    settingsUsername: document.getElementById('settingsUsername'),
    settingsConnectedDate: document.getElementById('settingsConnectedDate'),
    settingsSaveCount: document.getElementById('settingsSaveCount'),
    settingsStorageUsed: document.getElementById('settingsStorageUsed'),
    cacheStats: document.getElementById('cacheStats'),
    autoSync: document.getElementById('autoSync'),
    syncInterval: document.getElementById('syncInterval'),
    exportFormat: document.getElementById('exportFormat'),
    includeTimestamps: document.getElementById('includeTimestamps'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    clearAllDataBtn: document.getElementById('clearAllDataBtn'),
    clearCacheBtn: document.getElementById('clearCacheBtn'),
    
    // Modal elements
    settingsModal: document.getElementById('settingsModal'),
    settingsModalClose: document.getElementById('settingsModalClose'),
    confirmModal: document.getElementById('confirmModal'),
    confirmTitle: document.getElementById('confirmTitle'),
    confirmMessage: document.getElementById('confirmMessage'),
    confirmCancel: document.getElementById('confirmCancel'),
    confirmOk: document.getElementById('confirmOk'),
    
    // Settings elements
    storageUsed: document.getElementById('storageUsed'),
    storageLimit: document.getElementById('storageLimit'),
    clearAllSavesBtn: document.getElementById('clearAllSavesBtn'),
    accountUsername: document.getElementById('accountUsername'),
    accountPlan: document.getElementById('accountPlan'),
    aboutLastSync: document.getElementById('aboutLastSync'),
    
    // Login
    loginBtn: document.getElementById('loginBtn'),
    
    // Loading
    loadingText: document.getElementById('loadingText')
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let currentState = {
    isAuthenticated: false,
    saves: [],
    filteredSaves: [],
    searchQuery: '',
    isSyncing: false,
    lastSyncTime: null,
    totalSaves: 0
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the popup when it loads
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('SnooShelf popup initialized');
        
        // Show loading state
        showLoading(true, 'Loading...');
        
        // Check authentication status
        await checkAuthStatus();
        
        // Load user data if authenticated
        if (currentState.isAuthenticated) {
            await loadUserData();
            await loadSaves();
            await loadLastSyncTime();
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize performance optimizations
        initializePerformanceOptimizations();
        
        // Hide loading state
        showLoading(false);
        
        
    } catch (error) {
        console.error('Error initializing popup:', error);
        showError('Failed to initialize popup');
        showLoading(false);
    }
});

// ============================================================================
// CACHE INTEGRATION
// ============================================================================

/**
 * Get cached stats or calculate and cache them
 * @param {Array} saves - Array of saves
 * @returns {Object} Stats object
 */
function getCachedStats(saves) {
    if (cache.has(CACHE_KEYS.STATS)) {
        return cache.get(CACHE_KEYS.STATS);
    }
    
    const stats = calculateStats(saves);
    cache.set(CACHE_KEYS.STATS, stats, 5 * 60 * 1000); // 5 minutes TTL
    return stats;
}

/**
 * Get cached user info or fetch and cache it
 * @returns {Promise<Object>} User info object
 */
async function getCachedUserInfo() {
    if (cache.has(CACHE_KEYS.USER_INFO)) {
        return cache.get(CACHE_KEYS.USER_INFO);
    }
    
    const response = await chrome.storage.local.get(['username', 'isPro', 'lastSyncTime']);
    cache.set(CACHE_KEYS.USER_INFO, response, 30 * 60 * 1000); // 30 minutes TTL
    return response;
}

/**
 * Get cached search results or perform search and cache them
 * @param {string} query - Search query
 * @param {Array} saves - Array of saves to search
 * @returns {Array} Filtered results
 */
function getCachedSearchResults(query, saves) {
    const cacheKey = CACHE_KEYS.SEARCH(query);
    
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }
    
    const results = saves.filter(save => 
        save.title.toLowerCase().includes(query.toLowerCase()) ||
        save.subreddit.toLowerCase().includes(query.toLowerCase()) ||
        (save.content && save.content.toLowerCase().includes(query.toLowerCase()))
    );
    
    cache.set(cacheKey, results, 2 * 60 * 1000); // 2 minutes TTL
    return results;
}

// ============================================================================
// PERFORMANCE INITIALIZATION
// ============================================================================

/**
 * Initialize performance optimizations
 */
function initializePerformanceOptimizations() {
    // Initialize search manager
    searchManager = new SearchManager();
    
    // Set up debounced search
    const debouncedSearch = debounce(handleSearch, 300);
    elements.searchInput.addEventListener('input', (e) => {
        debouncedSearch(e);
    });
}

/**
 * Initialize list rendering based on data size
 */
function initializeListRendering(saves) {
    const useVirtualScrolling = saves.length > 100; // Threshold for virtual scrolling
    
    if (useVirtualScrolling) {
        // Use virtual scrolling for large lists
        virtualScroller = new VirtualScroller(elements.savesList, 60, 5);
        virtualScroller.setData(saves);
    } else {
        // Use pagination for smaller lists
        paginationManager = new PaginationManager(elements.savesList, 50);
        paginationManager.setData(saves);
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
    // Login/Logout
    elements.loginBtn.addEventListener('click', handleLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.settingsIconBtn.addEventListener('click', openSettings);
    
    // Add ripple effects
    addRippleEffect(elements.loginBtn);
    addRippleEffect(elements.logoutBtn);
    addRippleEffect(elements.settingsIconBtn);
    
    // Sync
    elements.syncBtn.addEventListener('click', handleSync);
    addRippleEffect(elements.syncBtn);
    
    // Search
    elements.searchInput.addEventListener('input', handleSearch);
    
    // Stats accordion
    elements.statsHeader.addEventListener('click', toggleStatsSection);
    
    // Export buttons
    elements.exportCsvBtn.addEventListener('click', () => handleExport('csv'));
    elements.exportJsonBtn.addEventListener('click', () => handleProFeature('JSON export'));
    elements.exportMdBtn.addEventListener('click', () => handleProFeature('Markdown export'));
    
    // Bottom buttons
    elements.settingsBtn.addEventListener('click', openSettings);
    elements.helpBtn.addEventListener('click', openHelp);
    elements.upgradeBtn.addEventListener('click', openUpgrade);
    
    // Settings view buttons
    elements.backBtn.addEventListener('click', closeSettings);
    elements.disconnectBtn.addEventListener('click', handleDisconnect);
    elements.clearAllDataBtn.addEventListener('click', handleClearAllData);
    elements.clearCacheBtn.addEventListener('click', handleClearCache);
    
    // Settings form elements
    elements.autoSync.addEventListener('change', saveSettings);
    elements.syncInterval.addEventListener('change', saveSettings);
    elements.exportFormat.addEventListener('change', saveSettings);
    elements.includeTimestamps.addEventListener('change', saveSettings);
    
    // Modal events
    elements.settingsModalClose.addEventListener('click', closeSettingsModal);
    elements.clearAllSavesBtn.addEventListener('click', handleClearAllSaves);
    elements.confirmCancel.addEventListener('click', closeConfirmModal);
    elements.confirmOk.addEventListener('click', confirmAction);
    
    // Close modals on overlay click
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) closeSettingsModal();
    });
    elements.confirmModal.addEventListener('click', (e) => {
        if (e.target === elements.confirmModal) closeConfirmModal();
    });
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Check authentication status and update UI
 */
async function checkAuthStatus() {
    try {
        const response = await sendMessageToBackground({ action: 'checkAuthentication' });
        
        if (response.success && response.isAuthenticated) {
            currentState.isAuthenticated = true;
            showLoggedInState();
        } else {
            currentState.isAuthenticated = false;
            showLoggedOutState();
        }
        
    } catch (error) {
        console.error('Error checking auth status:', error);
        currentState.isAuthenticated = false;
        showLoggedOutState();
    }
}

/**
 * Show logged in UI state
 */
async function showLoggedInState() {
    elements.header.classList.remove('hidden');
    elements.loggedInState.classList.remove('hidden');
    elements.loggedOutState.classList.add('hidden');
    
    // Try to get username and update welcome message
    try {
        const response = await sendMessageToBackground({ 
            action: 'getStorageData', 
            keys: ['username'] 
        });
        
        if (response.success && response.data && response.data.username) {
            updateWelcomeMessage(response.data.username);
        } else {
            // Username not found, try to fetch it
            console.log('Username not found in storage, fetching from Reddit API...');
            const userResponse = await sendMessageToBackground({ action: 'getUserInfo' });
            if (userResponse.success && userResponse.username) {
                updateWelcomeMessage(userResponse.username);
            }
        }
    } catch (error) {
        console.error('Error fetching username:', error);
        // Fallback to generic message
        updateWelcomeMessage(null);
    }
}

/**
 * Show logged out UI state
 */
function showLoggedOutState() {
    elements.header.classList.add('hidden');
    elements.loggedInState.classList.add('hidden');
    elements.loggedOutState.classList.remove('hidden');
}

/**
 * Handle login button click
 */
async function handleLogin() {
    try {
        showLoadingOverlay(true, 'Connecting to Reddit...');
        setButtonLoading(elements.loginBtn, true);
        
        // Check if online before attempting login
        if (!navigator.onLine) {
            showError('You\'re offline. Please check your internet connection and try again.');
            return;
        }
        
        const response = await sendMessageToBackground({ action: 'login' });
        
        if (response.success) {
            currentState.isAuthenticated = true;
            showLoggedInState();
            await loadUserData();
            await loadSaves();
            showSuccess('Login successful!');
        } else {
            showError(response.error || 'Login failed');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showError('Couldn\'t connect to Reddit. Please try again.');
    } finally {
        showLoadingOverlay(false);
        setButtonLoading(elements.loginBtn, false);
    }
}

/**
 * Handle logout button click
 */
async function handleLogout() {
    try {
        showLoading(true, 'Logging out...');
        elements.logoutBtn.disabled = true;
        
        const response = await sendMessageToBackground({ action: 'logout' });
        
        if (response.success) {
            currentState.isAuthenticated = false;
            currentState.saves = [];
            currentState.filteredSaves = [];
            showLoggedOutState();
        } else {
            showError(response.error || 'Logout failed');
        }
        
    } catch (error) {
        console.error('Logout error:', error);
        showError('Logout failed. Please try again.');
    } finally {
        showLoading(false);
        elements.logoutBtn.disabled = false;
    }
}

// ============================================================================
// DATA LOADING FUNCTIONS
// ============================================================================

/**
 * Load user data and update stats display
 */
async function loadUserData() {
    try {
        // Use cached user info
        const userData = await getCachedUserInfo();
        
        if (userData) {
            // Update welcome message with username
            updateWelcomeMessage(userData.username);
            
            // Load saves to calculate stats
            await loadSaves();
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

/**
 * Load last sync time from storage
 */
async function loadLastSyncTime() {
    try {
        const { lastSyncTime } = await chrome.storage.local.get('lastSyncTime');
        
        if (lastSyncTime) {
            currentState.lastSyncTime = lastSyncTime;
            elements.lastSync.textContent = formatDate(lastSyncTime);
        } else {
            elements.lastSync.textContent = 'Never';
        }
    } catch (error) {
        console.error('Error loading last sync time:', error);
        elements.lastSync.textContent = 'Never';
    }
}

/**
 * Load saves from storage
 */
async function loadSaves() {
    try {
        showSkeletonLoading(true);
        
        // Check cache first
        if (cache.has(CACHE_KEYS.ALL_SAVES)) {
            console.log('Loading saves from cache');
            currentState.saves = cache.get(CACHE_KEYS.ALL_SAVES);
            currentState.filteredSaves = [...currentState.saves];
            currentState.totalSaves = currentState.saves.length;
            
            // Initialize list rendering based on data size
            initializeListRendering(currentState.saves);
            
            // Calculate and update stats (with caching)
            const stats = getCachedStats(currentState.saves);
            updateStatsDisplay(stats);
            
            // Update both save count elements
            const saveCount = currentState.saves.length;
            elements.savesCount.textContent = `${saveCount} save${saveCount !== 1 ? 's' : ''}`;
            elements.saveCount.textContent = saveCount;
            
            // Update export size estimate
            updateExportSizeEstimate(currentState.saves);
            
            showSkeletonLoading(false);
            return;
        }
        
        // Load from storage if not in cache
        const response = await sendMessageToBackground({ 
            action: 'getStorageData', 
            keys: ['saves'] 
        });
        
        if (response.success && response.data && response.data.saves) {
            currentState.saves = response.data.saves;
            currentState.filteredSaves = [...currentState.saves];
            currentState.totalSaves = currentState.saves.length;
            
            // Cache the saves data
            cache.set(CACHE_KEYS.ALL_SAVES, currentState.saves, 10 * 60 * 1000); // 10 minutes
            
            // Initialize search engine with saves
            await searchEngine.buildSearchIndex();
            console.log(`Search index built with ${currentState.saves.length} documents`);
            
            // Initialize list rendering based on data size
            initializeListRendering(currentState.saves);
            
            // Calculate and update stats (with caching)
            const stats = getCachedStats(currentState.saves);
            updateStatsDisplay(stats);
            
            // Update both save count elements
            const saveCount = currentState.saves.length;
            elements.savesCount.textContent = `${saveCount} save${saveCount !== 1 ? 's' : ''}`;
            elements.saveCount.textContent = saveCount;
            
            // Update export size estimate
            updateExportSizeEstimate(currentState.saves);
        } else {
            // No saves yet, show empty state
            currentState.saves = [];
            currentState.filteredSaves = [];
            currentState.totalSaves = 0;
            showEmptyState();
            
            // Update stats with empty data
            const stats = calculateStats([]);
            updateStatsDisplay(stats);
            
            // Update both save count elements
            elements.savesCount.textContent = '0 saves';
            elements.saveCount.textContent = '0';
        }
        
    } catch (error) {
        console.error('Error loading saves:', error);
        showError('Failed to load saves');
        showEmptyState();
    } finally {
        showSkeletonLoading(false);
    }
}

/**
 * Update the stats display with user data
 */
function updateStatsDisplay(stats) {
    // Update stats card values with null checks and animations
    const totalSaves = stats.totalSaves || 0;
    const totalSubreddits = stats.totalSubreddits || 0;
    
    // Animate number counting up
    animateNumber(elements.totalSavesCount, 0, totalSaves);
    animateNumber(elements.totalSubredditsCount, 0, totalSubreddits);

    // Update date range
    elements.oldestSave.textContent = stats.oldestSave ? formatDate(stats.oldestSave) : 'Never';
    elements.newestSave.textContent = stats.newestSave ? formatDate(stats.newestSave) : 'Never';

    // Update top subreddits chart
    updateTopSubredditsChart(stats.topSubreddits || []);
}

/**
 * Update the welcome message with username
 */
function updateWelcomeMessage(username) {
    if (username) {
        elements.welcomeMessage.textContent = `Welcome back, ${username}!`;
    } else {
        elements.welcomeMessage.textContent = 'Welcome back!';
    }
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

/**
 * Handle sync button click
 */
async function handleSync() {
    try {
        currentState.isSyncing = true;
        setButtonLoading(elements.syncBtn, true);
        showSkeletonLoading(true);
        
        // Check if online before attempting sync
        if (!navigator.onLine) {
            showError('You\'re offline. Sync will happen when you\'re back online.');
            showErrorShake(elements.syncBtn);
            return;
        }
        
        const response = await sendMessageToBackground({ action: 'syncSaves' });
        
        if (response.success) {
            // Clear cache on successful sync
            CacheInvalidation.clearDataCache();
            
            // Update last sync time immediately
            const now = Date.now();
            await chrome.storage.local.set({ lastSyncTime: now });
            currentState.lastSyncTime = now;
            
            // Update last sync display
            elements.lastSync.textContent = 'Just now';
            
            // Reload saves after sync
            await loadSaves();
            await loadUserData();
            
            // Update save count in both places
            const saveCount = currentState.saves.length;
            elements.savesCount.textContent = `${saveCount} save${saveCount !== 1 ? 's' : ''}`;
            elements.saveCount.textContent = saveCount;
            
            // Show success animation
            showButtonSuccess(elements.syncBtn);
            showSuccess(`Sync complete: ${response.savesCount || 0} saves fetched`);
        } else {
            showError(response.error || 'Sync failed');
            showErrorShake(elements.syncBtn);
        }
        
    } catch (error) {
        console.error('Sync error:', error);
        showError('Sync failed. Check your internet and try again.');
        showErrorShake(elements.syncBtn);
    } finally {
        currentState.isSyncing = false;
        setButtonLoading(elements.syncBtn, false);
        showSkeletonLoading(false);
    }
}

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Handle search input
 */
function handleSearch(event) {
    const query = event.target.value;
    currentState.searchQuery = query;
    
    if (query.trim() === '') {
        // Show all saves
        currentState.filteredSaves = [...currentState.saves];
    } else {
        try {
            // Use Lunr search engine
            const results = searchEngine.search(query.trim());
            currentState.filteredSaves = results;
            console.log(`Search for "${query}" returned ${results.length} results`);
        } catch (error) {
            console.error('Search error:', error);
            showError('Search failed. Please try again.');
            currentState.filteredSaves = [...currentState.saves];
        }
    }

    // Update the display
    if (virtualScroller) {
        virtualScroller.setFilteredData(currentState.filteredSaves);
    } else if (paginationManager) {
        paginationManager.setFilteredData(currentState.filteredSaves);
    }
}

// ============================================================================
// SAVES DISPLAY FUNCTIONS
// ============================================================================

/**
 * Update the saves list display
 */
function updateSavesDisplay() {
    const saves = currentState.filteredSaves;
    
    // Update count
    elements.savesCount.textContent = `${saves.length} saves`;
    
    // Clear existing saves
    elements.savesList.innerHTML = '';
    
    if (saves.length === 0) {
        if (currentState.searchQuery) {
            showNoResults();
        } else {
            showEmptyState();
        }
        return;
    }
    
    // Render saves
    saves.forEach(save => {
        const saveElement = createSaveElement(save);
        elements.savesList.appendChild(saveElement);
    });
    
    // Add staggered animation to new items
    addStaggeredAnimation(elements.savesList);
}

/**
 * Create a save element
 */
function createSaveElement(save) {
    // Debug logging to verify timestamps
    console.log('Creating save element:', {
        id: save.id,
        title: save.title,
        created_utc: save.created_utc,
        created: save.created,
        saved: save.saved,
        created_date: new Date(save.created),
        saved_date: new Date(save.saved),
        formatted_created: formatDate(save.created),
        formatted_saved: formatDate(save.saved)
    });
    
    const div = document.createElement('div');
    div.className = 'save-item';
    div.innerHTML = `
        <div class="save-title">${escapeHtml(save.title)}</div>
        <div class="save-meta">
            <span class="subreddit-badge">r/${escapeHtml(save.subreddit)}</span>
            <span class="save-date">${formatDate(save.created)}</span>
        </div>
    `;
    
    // Add click handler to open post
    div.addEventListener('click', () => {
        chrome.tabs.create({ url: save.url });
    });
    
    return div;
}

/**
 * Show empty state when no saves
 */
function showEmptyState() {
    elements.savesList.innerHTML = `
        <div class="empty-state">
            <h3>No saves yet</h3>
            <p>Click "Sync Now" to import your Reddit saves</p>
        </div>
    `;
}

/**
 * Show no results state for search
 */
function showNoResults() {
    elements.savesList.innerHTML = `
        <div class="empty-state">
            <h3>No results found</h3>
            <p>Try a different search term</p>
        </div>
    `;
}

// ============================================================================
// BOTTOM BUTTON FUNCTIONS
// ============================================================================


function openHelp() {
    // TODO: Open help page
    console.log('Help clicked');
}

function openUpgrade() {
    // TODO: Open upgrade page
    console.log('Upgrade clicked');
}

// ============================================================================
// PERFORMANCE OPTIMIZATIONS
// ============================================================================

/**
 * Virtual scrolling implementation for large lists
 */
class VirtualScroller {
    constructor(container, itemHeight = 60, buffer = 5) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.buffer = buffer;
        this.data = [];
        this.filteredData = [];
        this.visibleRange = { start: 0, end: 0 };
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.isScrolling = false;
        
        this.setupScrollListener();
    }
    
    setData(data) {
        this.data = data;
        this.filteredData = [...data];
        this.render();
    }
    
    setFilteredData(filteredData) {
        this.filteredData = filteredData;
        this.render();
    }
    
    setupScrollListener() {
        this.container.addEventListener('scroll', () => {
            if (this.isScrolling) return;
            
            this.isScrolling = true;
            requestAnimationFrame(() => {
                this.handleScroll();
                this.isScrolling = false;
            });
        });
    }
    
    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        this.containerHeight = this.container.clientHeight;
        
        const newRange = this.calculateVisibleRange();
        
        if (newRange.start !== this.visibleRange.start || newRange.end !== this.visibleRange.end) {
            this.visibleRange = newRange;
            this.render();
        }
    }
    
    calculateVisibleRange() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight);
        
        return {
            start: Math.max(0, startIndex - this.buffer),
            end: Math.min(this.filteredData.length, endIndex + this.buffer)
        };
    }
    
    render() {
        // Clear existing content
        this.container.innerHTML = '';
        
        if (this.filteredData.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Set total height for scrollbar
        const totalHeight = this.filteredData.length * this.itemHeight;
        this.container.style.height = `${totalHeight}px`;
        
        // Create viewport container
        const viewport = document.createElement('div');
        viewport.style.position = 'relative';
        viewport.style.height = `${totalHeight}px`;
        
        // Render visible items
        const visibleItems = this.filteredData.slice(this.visibleRange.start, this.visibleRange.end);
        
        visibleItems.forEach((item, index) => {
            const actualIndex = this.visibleRange.start + index;
            const element = this.createItemElement(item, actualIndex);
            element.style.position = 'absolute';
            element.style.top = `${actualIndex * this.itemHeight}px`;
            element.style.width = '100%';
            viewport.appendChild(element);
        });
        
        this.container.appendChild(viewport);
    }
    
    createItemElement(item, index) {
        const div = document.createElement('div');
        div.className = 'save-item';
        div.innerHTML = `
            <div class="save-title">${escapeHtml(item.title)}</div>
            <div class="save-meta">
                <span class="subreddit-badge">r/${escapeHtml(item.subreddit)}</span>
                <span class="save-date">${formatDate(item.created)}</span>
            </div>
        `;
        
        // Add click handler
        div.addEventListener('click', () => {
            chrome.tabs.create({ url: item.url });
        });
        
        return div;
    }
    
    showEmptyState() {
        this.container.innerHTML = `
            <div class="no-results">
                <p>No saves found</p>
            </div>
        `;
        this.container.style.height = 'auto';
    }
}

/**
 * Debounced search function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Batch DOM updates using document fragment
 */
function batchUpdateList(container, items, createElementFn) {
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const element = createElementFn(item);
        fragment.appendChild(element);
    });
    container.appendChild(fragment);
}

/**
 * Search with caching and debouncing
 */
class SearchManager {
    constructor() {
        this.cache = new Map();
        this.searchTimeout = null;
        this.isSearching = false;
    }
    
    search(query, data, onResults) {
        // Clear previous search timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Show loading state
        this.isSearching = true;
        this.showSearchLoading(true);
        
        // Debounced search
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query, data, onResults);
        }, 300);
    }
    
    performSearch(query, data, onResults) {
        const normalizedQuery = query.toLowerCase().trim();
        
        // Check cache first
        if (this.cache.has(normalizedQuery)) {
            const results = this.cache.get(normalizedQuery);
            this.isSearching = false;
            this.showSearchLoading(false);
            onResults(results);
            return;
        }
        
        // Perform search
        const results = data.filter(item => 
            item.title.toLowerCase().includes(normalizedQuery) ||
            item.subreddit.toLowerCase().includes(normalizedQuery) ||
            (item.content && item.content.toLowerCase().includes(normalizedQuery))
        );
        
        // Cache results
        this.cache.set(normalizedQuery, results);
        
        this.isSearching = false;
        this.showSearchLoading(false);
        onResults(results);
    }
    
    showSearchLoading(show) {
        const searchInput = document.getElementById('searchInput');
        if (show) {
            searchInput.classList.add('search-loading');
        } else {
            searchInput.classList.remove('search-loading');
        }
    }
    
    clearCache() {
        this.cache.clear();
    }
}

// Global instances
let virtualScroller = null;
let searchManager = null;
let paginationManager = null;

/**
 * Pagination system as fallback for virtual scrolling
 */
class PaginationManager {
    constructor(container, itemsPerPage = 50) {
        this.container = container;
        this.itemsPerPage = itemsPerPage;
        this.currentPage = 1;
        this.totalPages = 1;
        this.data = [];
        this.filteredData = [];
    }
    
    setData(data) {
        this.data = data;
        this.filteredData = [...data];
        this.currentPage = 1;
        this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        this.render();
    }
    
    setFilteredData(filteredData) {
        this.filteredData = filteredData;
        this.currentPage = 1;
        this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        this.render();
    }
    
    render() {
        this.container.innerHTML = '';
        
        if (this.filteredData.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Calculate items for current page
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageItems = this.filteredData.slice(startIndex, endIndex);
        
        // Render items
        pageItems.forEach(item => {
            const element = this.createItemElement(item);
            this.container.appendChild(element);
        });
        
        // Add pagination controls
        this.addPaginationControls();
    }
    
    createItemElement(item) {
        const div = document.createElement('div');
        div.className = 'save-item';
        div.innerHTML = `
            <div class="save-title">${escapeHtml(item.title)}</div>
            <div class="save-meta">
                <span class="subreddit-badge">r/${escapeHtml(item.subreddit)}</span>
                <span class="save-date">${formatDate(item.created)}</span>
            </div>
        `;
        
        div.addEventListener('click', () => {
            chrome.tabs.create({ url: item.url });
        });
        
        return div;
    }
    
    addPaginationControls() {
        if (this.totalPages <= 1) return;
        
        const controls = document.createElement('div');
        controls.className = 'pagination-controls';
        controls.innerHTML = `
            <button class="pagination-btn" id="prevPage" ${this.currentPage === 1 ? 'disabled' : ''}>
                ← Previous
            </button>
            <span class="pagination-info">
                Page ${this.currentPage} of ${this.totalPages}
            </span>
            <button class="pagination-btn" id="nextPage" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                Next →
            </button>
        `;
        
        this.container.appendChild(controls);
        
        // Add event listeners
        const prevBtn = controls.querySelector('#prevPage');
        const nextBtn = controls.querySelector('#nextPage');
        
        prevBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.render();
            }
        });
        
        nextBtn.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.render();
            }
        });
    }
    
    showEmptyState() {
        this.container.innerHTML = `
            <div class="no-results">
                <p>No saves found</p>
            </div>
        `;
    }
}

// ============================================================================
// ANIMATION & VISUAL FEEDBACK
// ============================================================================

/**
 * Add ripple effect to button click
 */
function addRippleEffect(button) {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
}

/**
 * Set button loading state
 */
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('btn-loading');
        button.disabled = true;
    } else {
        button.classList.remove('btn-loading');
        button.disabled = false;
    }
}

/**
 * Show success animation on button
 */
function showButtonSuccess(button, duration = 2000) {
    button.classList.add('btn-success');
    setTimeout(() => {
        button.classList.remove('btn-success');
    }, duration);
}

/**
 * Show error shake animation
 */
function showErrorShake(element) {
    element.classList.add('animate-shake');
    setTimeout(() => {
        element.classList.remove('animate-shake');
    }, 600);
}

/**
 * Animate number counting up
 */
function animateNumber(element, start, end, duration = 1000) {
    const startTime = performance.now();
    const range = end - start;
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(start + (range * progress));
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

/**
 * Highlight search matches in text
 */
function highlightSearchMatches(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

/**
 * Add staggered animation to list items
 */
function addStaggeredAnimation(container) {
    const items = container.querySelectorAll('.save-item');
    items.forEach((item, index) => {
        item.style.animationDelay = `${index * 50}ms`;
    });
}

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

/**
 * Show or hide loading state
 */
function showLoading(show, text = 'Loading...') {
    elements.loadingText.textContent = text;
    elements.loading.style.display = show ? 'block' : 'none';
}

/**
 * Show loading overlay
 */
function showLoadingOverlay(show, text = 'Loading...') {
    elements.loadingOverlayText.textContent = text;
    elements.loadingOverlay.classList.toggle('hidden', !show);
}

/**
 * Show error message
 */
function showError(message) {
    console.error('Error:', message);
    Toast.showError(message);
}

/**
 * Show success message
 */
function showSuccess(message) {
    console.log('Success:', message);
    Toast.showSuccess(message);
}

/**
 * Show info message
 */
function showInfo(message) {
    console.log('Info:', message);
    Toast.showInfo(message);
}

/**
 * Show warning message
 */
function showWarning(message) {
    console.log('Warning:', message);
    Toast.showWarning(message);
}

/**
 * Set button loading state
 */
function setButtonLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.classList.add('loading');
    } else {
        button.disabled = false;
        button.classList.remove('loading');
    }
}

/**
 * Show skeleton loading for saves list
 */
function showSkeletonLoading(show) {
    elements.skeletonLoading.style.display = show ? 'block' : 'none';
    elements.savesList.style.display = show ? 'none' : 'block';
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Handle export button click
 */
async function handleExport(format) {
    try {
        const button = elements[`export${format.charAt(0).toUpperCase() + format.slice(1)}Btn`];
        setButtonLoading(button, true);
        showInfo(`Preparing ${format.toUpperCase()} export...`);
        
        // Validate format
        if (!['csv', 'json', 'markdown'].includes(format)) {
            throw new Error('Invalid export format');
        }
        
        // Check if we have saves to export
        if (!currentState.saves || currentState.saves.length === 0) {
            showError('No saves to export. Sync your saves first.');
            return;
        }
        
        // Export all saves
        const result = await SnooShelfExport.exportAll(format);
        
        if (result.success) {
            showSuccess(`Export complete! Downloaded ${result.filename} with ${result.postCount} saves.`);
            // Track export analytics
            trackExport(format, result.postCount);
        } else {
            showError('Export failed. Please try again.');
        }
        
    } catch (error) {
        console.error('Export error:', error);
        showError('Couldn\'t export saves. Please try again.');
    } finally {
        const button = elements[`export${format.charAt(0).toUpperCase() + format.slice(1)}Btn`];
        setButtonLoading(button, false);
    }
}

/**
 * Handle Pro feature clicks
 */
function handleProFeature(featureName) {
    showWarning(`${featureName} is a Pro feature. Upgrade to access this functionality.`);
    // TODO: Open upgrade modal or redirect to upgrade page
}

/**
 * Track export analytics
 */
function trackExport(format, count) {
    // Track export in storage for analytics
    chrome.storage.local.get(['exportStats'], (data) => {
        const stats = data.exportStats || { totalExports: 0, formatCounts: {} };
        stats.totalExports++;
        stats.formatCounts[format] = (stats.formatCounts[format] || 0) + 1;
        stats.lastExport = Date.now();
        chrome.storage.local.set({ exportStats: stats });
    });
}

/**
 * Update export size estimate
 */
function updateExportSizeEstimate(posts) {
    if (!posts || posts.length === 0) {
        elements.exportSize.textContent = '~0 KB';
        return;
    }
    
    // Estimate CSV size (rough calculation)
    const avgPostSize = 200; // Average characters per post in CSV
    const estimatedSize = posts.length * avgPostSize;
    const sizeKB = Math.max(1, Math.round(estimatedSize / 1024));
    
    elements.exportSize.textContent = `~${sizeKB} KB`;
}

/**
 * Open settings view
 */
function openSettings() {
    // Hide main view and show settings view
    elements.mainView.classList.add('hidden');
    elements.settingsView.classList.remove('hidden');
    
    // Load settings data (refresh in case auth status changed)
    loadSettingsData();
}

/**
 * Close settings view
 */
function closeSettings() {
    // Hide settings view and show main view
    elements.settingsView.classList.add('hidden');
    elements.mainView.classList.remove('hidden');
}

/**
 * Load settings data
 */
async function loadSettingsData() {
    try {
        // Check authentication status
        const authData = await chrome.storage.local.get(['accessToken', 'username', 'connectedDate', 'isAuthenticated']);
        
        // Debug logging
        console.log('Settings auth data:', authData);
        
        // Update username
        if (authData.username) {
            elements.settingsUsername.textContent = authData.username;
        } else {
            elements.settingsUsername.textContent = 'Not available';
        }
        
        // Update connection status
        // If we have username OR accessToken OR isAuthenticated flag, we're connected
        const isConnected = !!(authData.username || authData.accessToken || authData.isAuthenticated);
        
        console.log('Connection check:', {
            username: authData.username,
            accessToken: authData.accessToken ? 'exists' : 'missing',
            isAuthenticated: authData.isAuthenticated,
            isConnected: isConnected
        });
        
        if (isConnected) {
            if (authData.connectedDate) {
                const date = new Date(authData.connectedDate);
                elements.settingsConnectedDate.textContent = `✓ Connected (${date.toLocaleDateString()})`;
            } else {
                elements.settingsConnectedDate.textContent = '✓ Connected';
            }
        } else {
            elements.settingsConnectedDate.textContent = 'Not connected';
        }
        
        // Load save count
        elements.settingsSaveCount.textContent = currentState.saves.length;
        
        // Load storage usage (estimate)
        const estimatedSize = currentState.saves.length * 2; // Rough estimate: 2KB per save
        elements.settingsStorageUsed.textContent = `${Math.round(estimatedSize / 1024)} MB`;
        
        // Load cache stats
        if (typeof cache !== 'undefined' && cache.getStats) {
            const stats = cache.getStats();
            elements.cacheStats.textContent = stats.validEntries;
        }
        
        // Load settings
        const settings = await chrome.storage.local.get([
            'autoSync', 'syncInterval', 'exportFormat', 'includeTimestamps'
        ]);
        
        elements.autoSync.checked = settings.autoSync || false;
        elements.syncInterval.value = settings.syncInterval || 'manual';
        elements.exportFormat.value = settings.exportFormat || 'csv';
        elements.includeTimestamps.checked = settings.includeTimestamps !== false;
        
    } catch (error) {
        console.error('Error loading settings data:', error);
        // Set error states
        elements.settingsUsername.textContent = 'Error loading';
        elements.settingsConnectedDate.textContent = 'Error';
    }
}

/**
 * Save settings
 */
async function saveSettings() {
    try {
        const settings = {
            autoSync: elements.autoSync.checked,
            syncInterval: elements.syncInterval.value,
            exportFormat: elements.exportFormat.value,
            includeTimestamps: elements.includeTimestamps.checked
        };
        
        await chrome.storage.local.set(settings);
        console.log('Settings saved:', settings);
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('Failed to save settings');
    }
}

/**
 * Handle disconnect account
 */
async function handleDisconnect() {
    if (confirm('Are you sure you want to disconnect your Reddit account?')) {
        try {
            await handleLogout();
            closeSettings();
        } catch (error) {
            console.error('Error disconnecting:', error);
            showError('Failed to disconnect account');
        }
    }
}

/**
 * Handle clear all data
 */
async function handleClearAllData() {
    if (confirm('Are you sure you want to clear all saved data? This cannot be undone.')) {
        try {
            // Clear IndexedDB
            const response = await sendMessageToBackground({ action: 'clearAllData' });
            if (response.success) {
                showSuccess('All data cleared successfully');
                closeSettings();
                // Reload the main view
                await loadSaves();
            } else {
                showError('Failed to clear data');
            }
        } catch (error) {
            console.error('Error clearing data:', error);
            showError('Failed to clear data');
        }
    }
}

/**
 * Handle clear cache
 */
function handleClearCache() {
    if (typeof CacheInvalidation !== 'undefined') {
        CacheInvalidation.clearAll();
        showSuccess('Cache cleared successfully');
        loadSettingsData(); // Refresh cache stats
    } else {
        showError('Cache system not available');
    }
}

/**
 * Close settings modal
 */
function closeSettingsModal() {
    elements.settingsModal.classList.add('hidden');
}

/**
 * Update settings modal with current data
 */
async function updateSettingsModal() {
    try {
        // Update storage info
        const response = await sendMessageToBackground({ 
            action: 'getStorageData', 
            keys: ['saves', 'username', 'isPro', 'lastSyncTime'] 
        });
        
        if (response.success && response.data) {
            // Calculate storage usage
            const saves = response.data.saves || [];
            const storageSize = JSON.stringify(saves).length;
            const storageMB = (storageSize / (1024 * 1024)).toFixed(2);
            
            elements.storageUsed.textContent = `${storageMB} MB`;
            elements.storageLimit.textContent = 'Unlimited';
            
            // Update account info
            elements.accountUsername.textContent = response.data.username || 'Unknown';
            elements.accountPlan.textContent = response.data.isPro ? 'Pro' : 'Free';
            
            // Update last sync
            if (response.data.lastSyncTime) {
                elements.aboutLastSync.textContent = formatDate(response.data.lastSyncTime);
            } else {
                elements.aboutLastSync.textContent = 'Never';
            }
        }
    } catch (error) {
        console.error('Error updating settings modal:', error);
    }
}

/**
 * Handle clear all saves
 */
function handleClearAllSaves() {
    showConfirmModal(
        'Clear All Saves',
        'This will permanently delete all your saved posts. This action cannot be undone. Are you sure?',
        async () => {
            try {
                // Clear all saves from storage
                await sendMessageToBackground({ action: 'clearAllSaves' });
                
                // Reload the popup
                await loadSaves();
                await loadLastSyncTime();
                
                showSuccess('All saves have been cleared.');
                closeSettingsModal();
            } catch (error) {
                console.error('Error clearing saves:', error);
                showError('Failed to clear saves. Please try again.');
            }
        }
    );
}

/**
 * Show confirmation modal
 */
function showConfirmModal(title, message, onConfirm) {
    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    elements.confirmModal.classList.remove('hidden');
    
    // Store confirm callback
    elements.confirmOk.onclick = () => {
        onConfirm();
        closeConfirmModal();
    };
}

/**
 * Close confirmation modal
 */
function closeConfirmModal() {
    elements.confirmModal.classList.add('hidden');
    elements.confirmOk.onclick = null;
}

/**
 * Confirm action (placeholder)
 */
function confirmAction() {
    // This is handled by the onclick handler set in showConfirmModal
}

/**
 * Open help page
 */
function openHelp() {
    chrome.tabs.create({ url: 'https://github.com/your-repo/snooshelf' });
}

/**
 * Open upgrade page
 */
function openUpgrade() {
    chrome.tabs.create({ url: 'https://snooshelf.com/upgrade' });
}

// ============================================================================
// STATS FUNCTIONS
// ============================================================================

/**
 * Toggle stats section accordion
 */
function toggleStatsSection() {
    elements.statsSection.classList.toggle('collapsed');
}

/**
 * Calculate statistics from posts array
 * @param {Array} posts - Array of post objects
 * @returns {Object} Statistics object
 */
function calculateStats(posts) {
    if (!posts || posts.length === 0) {
        return {
            totalSaves: 0,
            totalSubreddits: 0,
            saveRate: 0,
            oldestSave: null,
            newestSave: null,
            topSubreddits: []
        };
    }

    // Count subreddits
    const subredditCounts = {};
    posts.forEach(post => {
        subredditCounts[post.subreddit] = (subredditCounts[post.subreddit] || 0) + 1;
    });

    // Get top 5 subreddits
    const topSubreddits = Object.entries(subredditCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([subreddit, count]) => ({ subreddit, count }));

    // Calculate date range
    const dates = posts.map(post => new Date(post.created)).filter(date => !isNaN(date.getTime()));
    const oldestDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const newestDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;

    return {
        totalSaves: posts.length,
        totalSubreddits: Object.keys(subredditCounts).length,
        oldestSave: oldestDate,
        newestSave: newestDate,
        topSubreddits: topSubreddits
    };
}


    /**
     * Update the top subreddits bar chart
     * @param {Array} topSubreddits - Array of {subreddit, count} objects
     */
    function updateTopSubredditsChart(topSubreddits) {
        if (!topSubreddits || topSubreddits.length === 0) {
            elements.topSubredditsChart.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No data available</div>';
            return;
        }

        const maxCount = Math.max(...topSubreddits.map(item => item.count));
        
        elements.topSubredditsChart.innerHTML = topSubreddits.map(item => {
            const percentage = (item.count / maxCount) * 100;
            const saveText = item.count === 1 ? 'save' : 'saves';
            return `
                <div class="chart-bar">
                    <div class="chart-label">r/${escapeHtml(item.subreddit)}</div>
                    <div class="chart-bar-container">
                        <div class="chart-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="chart-count">${item.count} ${saveText}</div>
                </div>
            `;
        }).join('');
    }

/**
 * Format date for display
 * @param {number|Date} timestamp - Timestamp in milliseconds or Date object
 */
function formatDate(timestamp) {
    // Check if timestamp exists and is valid
    if (!timestamp || (typeof timestamp !== 'number' && !(timestamp instanceof Date))) {
        return 'Never';
    }
    
    // Handle both timestamp (number) and Date object
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    // Debug logging
    console.log('formatDate called:', {
        input: timestamp,
        date: date,
        isValid: !isNaN(date.getTime()),
        now: new Date(),
        diffMs: new Date() - date
    });
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
        return 'Unknown date';
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    
    let result;
    if (diffMins < 1) {
        result = 'Just now';
    } else if (diffMins < 60) {
        result = `${diffMins}m ago`;
    } else if (diffHours < 24) {
        result = `${diffHours}h ago`;
    } else if (diffDays === 1) {
        result = 'Yesterday';
    } else if (diffDays < 7) {
        result = `${diffDays} days ago`;
    } else if (diffWeeks < 4) {
        result = `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    } else if (diffMonths < 12) {
        result = `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    } else {
        result = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    console.log('formatDate result:', result);
    return result;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// MESSAGE PASSING
// ============================================================================

/**
 * Send message to background script
 */
function sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

console.log('SnooShelf popup script loaded successfully');
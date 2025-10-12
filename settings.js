// settings.js - Settings page functionality for SnooShelf

const SnooShelfSettings = (() => {
    'use strict';

    // ============================================================================
    // CACHE MANAGEMENT
    // ============================================================================

    /**
     * Display cache statistics
     */
    function displayCacheStats() {
        if (typeof cache !== 'undefined' && cache.getStats) {
            const stats = cache.getStats();
            const memoryUsageKB = Math.round(stats.memoryUsage / 1024);
            
            const cacheStatsElement = document.getElementById('cacheStats');
            if (cacheStatsElement) {
                cacheStatsElement.innerHTML = `
                    <div class="cache-stats">
                        <h3>Cache Statistics</h3>
                        <div class="stat-row">
                            <span>Total Entries:</span>
                            <span>${stats.totalEntries}</span>
                        </div>
                        <div class="stat-row">
                            <span>Valid Entries:</span>
                            <span>${stats.validEntries}</span>
                        </div>
                        <div class="stat-row">
                            <span>Expired Entries:</span>
                            <span>${stats.expiredEntries}</span>
                        </div>
                        <div class="stat-row">
                            <span>Memory Usage:</span>
                            <span>${memoryUsageKB} KB</span>
                        </div>
                        <div class="stat-row">
                            <span>Max Size:</span>
                            <span>${stats.maxSize}</span>
                        </div>
                    </div>
                `;
            }
        }
    }

    /**
     * Clear cache
     */
    function clearCache() {
        if (typeof CacheInvalidation !== 'undefined') {
            CacheInvalidation.clearAll();
            showToast('Cache cleared successfully', 'success');
            displayCacheStats();
        }
    }

    /**
     * Clear expired cache entries
     */
    function clearExpiredCache() {
        if (typeof CacheInvalidation !== 'undefined') {
            const cleared = CacheInvalidation.clearExpired();
            showToast(`Cleared ${cleared} expired cache entries`, 'success');
            displayCacheStats();
        }
    }

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================

    // Default settings object
    const DEFAULT_SETTINGS = {
        autoSync: false,
        syncInterval: 'manual',
        syncOnStartup: false,
        postsPerPage: 50,
        defaultSort: 'newest',
        showSubredditColors: true,
        viewMode: 'comfortable',
        theme: 'light',
        exportFormat: 'csv',
        includeTimestamps: true,
        includeLinks: true,
        debugLogging: false
    };

    let currentSettings = { ...DEFAULT_SETTINGS };
    let accountInfo = {
        username: '',
        connectedSince: null,
        isConnected: false,
        lastSync: null
    };
    let storageInfo = {
        totalSaves: 0,
        storageUsed: 0,
        storageLimit: 'unlimited'
    };

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    /**
     * Initialize settings page
     */
    async function init() {
        console.log('SnooShelf Settings initializing...');
        
        try {
            // Load current settings
            await loadSettings();
            
            // Setup event listeners
            setupEventListeners();
            
            // Update UI with current settings
            updateUI();
            
            console.log('SnooShelf Settings initialized successfully');
            
        } catch (error) {
            console.error('Error initializing settings:', error);
            showError('Failed to load settings. Please refresh the page.');
        }
    }

    /**
     * Load settings from storage
     */
    async function loadSettings() {
        try {
            console.log('Loading settings from storage...');
            
            // Get all settings from Chrome storage
            const response = await sendMessageToBackground({ 
                action: 'getStorageData', 
                keys: [
                    'username', 'isAuthenticated', 'lastSyncTime', 'saves',
                    'settings', 'exportStats', 'redditTokens'
                ] 
            });

            if (response.success && response.data) {
                const data = response.data;
                
                // Load user settings
                if (data.settings) {
                    currentSettings = { ...DEFAULT_SETTINGS, ...data.settings };
                } else {
                    currentSettings = { ...DEFAULT_SETTINGS };
                }
                
                // Load account info
                accountInfo = {
                    username: data.username || 'Unknown',
                    isConnected: data.isAuthenticated || false,
                    connectedSince: data.redditTokens?.timestamp || null,
                    lastSync: data.lastSyncTime || null
                };
                
                // Calculate storage info
                storageInfo = await calculateStorageInfo(data.saves || []);
                
                console.log('Settings loaded successfully:', currentSettings);
            } else {
                console.log('No settings found, using defaults');
            }
            
        } catch (error) {
            console.error('Error loading settings:', error);
            throw error;
        }
    }

    /**
     * Save settings to storage
     */
    async function saveSettings(settingsObject = null) {
        try {
            const settingsToSave = settingsObject || currentSettings;
            
            // Validate settings values
            const validatedSettings = validateSettings(settingsToSave);
            
            // Save to Chrome storage
            await chrome.storage.local.set({ settings: validatedSettings });
            
            // Update current settings
            currentSettings = { ...validatedSettings };
            
            console.log('Settings saved successfully:', validatedSettings);
            showSuccess('Settings saved successfully');
            
            // Propagate changes to other extension parts if needed
            await propagateSettingsChanges(validatedSettings);
            
        } catch (error) {
            console.error('Error saving settings:', error);
            
            if (error.name === 'QuotaExceededError') {
                showError('Storage full. Please clear some space and try again.');
            } else {
                showError('Failed to save settings. Please try again.');
            }
            throw error;
        }
    }

    /**
     * Validate settings values
     */
    function validateSettings(settings) {
        const validated = { ...DEFAULT_SETTINGS };
        
        // Validate each setting with proper type checking
        if (typeof settings.autoSync === 'boolean') validated.autoSync = settings.autoSync;
        if (['manual', 'hourly', '6hours', 'daily'].includes(settings.syncInterval)) {
            validated.syncInterval = settings.syncInterval;
        }
        if (typeof settings.syncOnStartup === 'boolean') validated.syncOnStartup = settings.syncOnStartup;
        if ([25, 50, 100].includes(settings.postsPerPage)) validated.postsPerPage = settings.postsPerPage;
        if (['newest', 'oldest', 'subreddit'].includes(settings.defaultSort)) {
            validated.defaultSort = settings.defaultSort;
        }
        if (typeof settings.showSubredditColors === 'boolean') {
            validated.showSubredditColors = settings.showSubredditColors;
        }
        if (['comfortable', 'compact'].includes(settings.viewMode)) {
            validated.viewMode = settings.viewMode;
        }
        if (['light', 'dark', 'auto'].includes(settings.theme)) validated.theme = settings.theme;
        if (['csv', 'json', 'markdown'].includes(settings.exportFormat)) {
            validated.exportFormat = settings.exportFormat;
        }
        if (typeof settings.includeTimestamps === 'boolean') {
            validated.includeTimestamps = settings.includeTimestamps;
        }
        if (typeof settings.includeLinks === 'boolean') validated.includeLinks = settings.includeLinks;
        if (typeof settings.debugLogging === 'boolean') validated.debugLogging = settings.debugLogging;
        
        return validated;
    }

    /**
     * Propagate settings changes to other extension parts
     */
    async function propagateSettingsChanges(settings) {
        try {
            // Send settings to background script for global application
            await sendMessageToBackground({
                action: 'updateSettings',
                settings: settings
            });
        } catch (error) {
            console.warn('Could not propagate settings changes:', error);
        }
    }

    // ============================================================================
    // STORAGE CALCULATIONS
    // ============================================================================

    /**
     * Calculate storage information
     */
    async function calculateStorageInfo(saves) {
        try {
            const totalSaves = saves.length;
            const storageUsed = await getStorageSize(saves);
            const storagePercentage = getStoragePercentage(storageUsed);
            
            return {
                totalSaves,
                storageUsed,
                storagePercentage,
                storageLimit: 'unlimited' // IndexedDB has no practical limit
            };
        } catch (error) {
            console.error('Error calculating storage info:', error);
            return {
                totalSaves: 0,
                storageUsed: 0,
                storagePercentage: 0,
                storageLimit: 'unlimited'
            };
        }
    }

    /**
     * Calculate IndexedDB size
     */
    async function getStorageSize(saves) {
        try {
            // Calculate approximate size of saves data
            const savesSize = JSON.stringify(saves).length;
            
            // Add overhead for IndexedDB metadata (rough estimate)
            const overhead = savesSize * 0.1; // 10% overhead
            
            return savesSize + overhead;
        } catch (error) {
            console.error('Error calculating storage size:', error);
            return 0;
        }
    }

    /**
     * Calculate percentage of browser limit used
     */
    function getStoragePercentage(storageUsed) {
        // Chrome typically allows 50% of available disk space for IndexedDB
        // For demo purposes, we'll use a conservative estimate
        const estimatedLimit = 5 * 1024 * 1024 * 1024; // 5GB estimate
        return Math.min(100, (storageUsed / estimatedLimit) * 100);
    }

    /**
     * Format bytes to human-readable string
     */
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ============================================================================
    // EVENT LISTENERS
    // ============================================================================

    /**
     * Setup all event listeners
     */
    function setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // Account settings
        document.getElementById('disconnectAccountBtn').addEventListener('click', handleDisconnectAccount);

        // Sync settings - Auto-sync toggle change
        document.getElementById('autoSyncToggle').addEventListener('change', (e) => {
            currentSettings.autoSync = e.target.checked;
            saveSettings();
        });
        
        // Sync interval change
        document.getElementById('syncInterval').addEventListener('change', (e) => {
            currentSettings.syncInterval = e.target.value;
            saveSettings();
        });
        
        // Sync on startup change
        document.getElementById('syncOnStartup').addEventListener('change', (e) => {
            currentSettings.syncOnStartup = e.target.checked;
            saveSettings();
        });
        document.getElementById('syncNowBtn').addEventListener('click', handleSyncNow);

        // Storage settings
        document.getElementById('viewStorageDetailsBtn').addEventListener('click', showStorageDetails);
        document.getElementById('clearAllDataBtn').addEventListener('click', handleClearAllData);

        // Display preferences change
        document.getElementById('postsPerPage').addEventListener('change', (e) => {
            currentSettings.postsPerPage = parseInt(e.target.value);
            saveSettings();
        });
        document.getElementById('defaultSort').addEventListener('change', (e) => {
            currentSettings.defaultSort = e.target.value;
            saveSettings();
        });
        document.getElementById('showSubredditColors').addEventListener('change', (e) => {
            currentSettings.showSubredditColors = e.target.checked;
            saveSettings();
        });
        document.getElementById('compactView').addEventListener('change', (e) => {
            currentSettings.viewMode = e.target.checked ? 'compact' : 'comfortable';
            saveSettings();
        });
        document.getElementById('theme').addEventListener('change', (e) => {
            currentSettings.theme = e.target.value;
            saveSettings();
            applyTheme(e.target.value);
        });

        // Export defaults change
        document.getElementById('defaultExportFormat').addEventListener('change', (e) => {
            currentSettings.exportFormat = e.target.value;
            saveSettings();
        });
        document.getElementById('includeTimestamps').addEventListener('change', (e) => {
            currentSettings.includeTimestamps = e.target.checked;
            saveSettings();
        });
        document.getElementById('includeRedditLinks').addEventListener('change', (e) => {
            currentSettings.includeLinks = e.target.checked;
            saveSettings();
        });
        document.getElementById('exportNowBtn').addEventListener('click', handleExportNow);

        // Privacy settings
        document.getElementById('clearCacheBtn').addEventListener('click', handleClearCache);

        // Advanced settings
        document.getElementById('debugLogging').addEventListener('change', (e) => {
            currentSettings.debugLogging = e.target.checked;
            saveSettings();
        });
        document.getElementById('developerMode').addEventListener('change', (e) => {
            currentSettings.developerMode = e.target.checked;
            saveSettings();
        });
        document.getElementById('resetSettingsBtn').addEventListener('click', handleResetSettings);
        document.getElementById('exportSettingsBtn').addEventListener('click', exportSettings);
        document.getElementById('importSettingsBtn').addEventListener('click', () => importSettings());

        // About section
        document.getElementById('checkUpdatesBtn').addEventListener('click', handleCheckUpdates);
    }

    // ============================================================================
    // UI FUNCTIONS
    // ============================================================================

    /**
     * Switch between tabs
     */
    function switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    }

    /**
     * Update UI with current settings
     */
    function updateUI() {
        // Account section
        updateAccountSection();
        
        // Sync section
        updateSyncSection();
        
        // Storage section
        updateStorageSection();
        
        // Display section
        updateDisplaySection();
        
        // Export section
        updateExportSection();
        
        // About section
        updateAboutSection();
    }

    /**
     * Update account section
     */
    function updateAccountSection() {
        const username = accountInfo.username;
        const isConnected = accountInfo.isConnected;
        
        // Update avatar
        const avatar = document.getElementById('accountAvatar');
        avatar.textContent = username.charAt(0).toUpperCase();
        
        // Update username
        document.getElementById('accountUsername').textContent = username;
        
        // Update connected since
        const connectedSince = accountInfo.connectedSince;
        const connectedText = connectedSince ? 
            new Date(connectedSince).toLocaleDateString() : 'Unknown';
        document.getElementById('accountConnectedSince').textContent = connectedText;
        
        // Update status
        const status = document.getElementById('accountStatus');
        if (isConnected) {
            status.className = 'status-indicator status-connected';
            status.innerHTML = '<span>●</span> Connected';
        } else {
            status.className = 'status-indicator status-disconnected';
            status.innerHTML = '<span>●</span> Disconnected';
        }
    }

    /**
     * Update sync section
     */
    function updateSyncSection() {
        document.getElementById('autoSyncToggle').checked = currentSettings.autoSync;
        document.getElementById('syncInterval').value = currentSettings.syncInterval;
        document.getElementById('syncOnStartup').checked = currentSettings.syncOnStartup;
        
        // Update last sync time
        const lastSyncTime = accountInfo.lastSync;
        const lastSyncElement = document.getElementById('lastSyncTime');
        if (lastSyncTime) {
            lastSyncElement.textContent = formatDate(lastSyncTime);
        } else {
            lastSyncElement.textContent = 'Never';
        }
    }

    /**
     * Update storage section
     */
    function updateStorageSection() {
        document.getElementById('totalSaves').textContent = storageInfo.totalSaves.toLocaleString();
        document.getElementById('storageUsed').textContent = formatBytes(storageInfo.storageUsed);
        
        // Update storage progress
        const progressBar = document.getElementById('storageProgress');
        const storageDetails = document.getElementById('storageDetails');
        
        const percentage = storageInfo.storagePercentage;
        progressBar.style.width = `${percentage}%`;
        storageDetails.textContent = `${formatBytes(storageInfo.storageUsed)} of ${storageInfo.storageLimit} storage used`;
    }

    /**
     * Update display section
     */
    function updateDisplaySection() {
        document.getElementById('postsPerPage').value = currentSettings.postsPerPage;
        document.getElementById('defaultSort').value = currentSettings.defaultSort;
        document.getElementById('showSubredditColors').checked = currentSettings.showSubredditColors;
        document.getElementById('compactView').checked = currentSettings.viewMode === 'compact';
        document.getElementById('theme').value = currentSettings.theme;
    }

    /**
     * Update export section
     */
    function updateExportSection() {
        document.getElementById('defaultExportFormat').value = currentSettings.exportFormat;
        document.getElementById('includeTimestamps').checked = currentSettings.includeTimestamps;
        document.getElementById('includeRedditLinks').checked = currentSettings.includeLinks;
    }

    /**
     * Update about section
     */
    function updateAboutSection() {
        // Update build date
        document.getElementById('buildDate').textContent = new Date().toLocaleDateString();
        
        // Update Chrome version
        if (navigator.userAgent.includes('Chrome')) {
            const chromeVersion = navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
            document.getElementById('chromeVersion').textContent = chromeVersion;
        }
    }

    // ============================================================================
    // ACTION HANDLERS
    // ============================================================================

    /**
     * Handle disconnect account - calls clearAuth(), redirects to popup
     */
    async function handleDisconnectAccount() {
        if (confirm('Are you sure you want to disconnect your account? This will log you out and clear all local data.')) {
            try {
                await clearAuth();
                showSuccess('Account disconnected successfully');
                
                // Redirect to popup after a short delay
                setTimeout(() => {
                    window.location.href = 'popup.html';
                }, 1500);
                
            } catch (error) {
                console.error('Error disconnecting account:', error);
                showError('Failed to disconnect account');
            }
        }
    }

    /**
     * Clear authentication data
     */
    async function clearAuth() {
        try {
            // Clear all authentication data
            await chrome.storage.local.remove([
                'isAuthenticated', 'redditTokens', 'username', 
                'lastSyncTime', 'saves', 'totalSaves'
            ]);
            
            // Clear IndexedDB
            await sendMessageToBackground({ action: 'clearAllSaves' });
            
            console.log('Authentication data cleared');
            
        } catch (error) {
            console.error('Error clearing auth data:', error);
            throw error;
        }
    }

    /**
     * Handle sync now
     */
    async function handleSyncNow() {
        try {
            const button = document.getElementById('syncNowBtn');
            button.disabled = true;
            button.innerHTML = '<span class="spinner"></span> Syncing...';
            
            const response = await sendMessageToBackground({ action: 'syncSaves' });
            
            if (response.success) {
                showSuccess(`Sync complete! ${response.savesCount || 0} saves synced`);
                currentSettings.lastSync = Date.now();
                updateSyncSection();
            } else {
                showError(response.error || 'Sync failed');
            }
            
        } catch (error) {
            console.error('Error syncing:', error);
            showError('Sync failed. Please try again.');
        } finally {
            const button = document.getElementById('syncNowBtn');
            button.disabled = false;
            button.innerHTML = '<span>🔄</span> Sync Now';
        }
    }

    /**
     * Show storage details
     */
    function showStorageDetails() {
        const details = `
Storage Details:
• Total Saves: ${currentSettings.totalSaves.toLocaleString()}
• Storage Used: ${currentSettings.storageUsed} MB
• Storage Type: IndexedDB (Local)
• Limit: Unlimited
• Last Sync: ${currentSettings.lastSync ? formatDate(currentSettings.lastSync) : 'Never'}
        `;
        alert(details);
    }

    /**
     * Handle clear all data
     */
    async function handleClearAllData() {
        if (confirm('Are you sure you want to clear ALL local data? This will permanently delete all your saved posts and cannot be undone.')) {
            if (confirm('This action is irreversible. Type "DELETE" to confirm.')) {
                try {
                    await sendMessageToBackground({ action: 'clearAllSaves' });
                    showSuccess('All data cleared successfully');
                    
                    // Reload settings
                    await loadSettings();
                    updateUI();
                    
                } catch (error) {
                    console.error('Error clearing data:', error);
                    showError('Failed to clear data');
                }
            }
        }
    }

    /**
     * Handle export now
     */
    async function handleExportNow() {
        try {
            const format = currentSettings.defaultExportFormat;
            const button = document.getElementById('exportNowBtn');
            button.disabled = true;
            button.innerHTML = '<span class="spinner"></span> Exporting...';
            
            const result = await SnooShelfExport.exportAll(format);
            
            if (result.success) {
                showSuccess(`Export complete! Downloaded ${result.filename} with ${result.postCount} saves.`);
            } else {
                showError('Export failed');
            }
            
        } catch (error) {
            console.error('Error exporting:', error);
            showError('Export failed. Please try again.');
        } finally {
            const button = document.getElementById('exportNowBtn');
            button.disabled = false;
            button.innerHTML = '<span>📥</span> Export Now';
        }
    }

    /**
     * Handle clear cache
     */
    async function handleClearCache() {
        try {
            // Clear cache data
            await chrome.storage.local.remove(['cache', 'tempData']);
            showSuccess('Cache cleared successfully');
            
        } catch (error) {
            console.error('Error clearing cache:', error);
            showError('Failed to clear cache');
        }
    }

    /**
     * Handle reset settings - resets to defaults, reloads page
     */
    async function handleResetSettings() {
        if (confirm('Are you sure you want to reset all settings to their default values?')) {
            try {
                // Reset to defaults
                currentSettings = { ...DEFAULT_SETTINGS };
                
                await saveSettings();
                showSuccess('Settings reset to defaults');
                
                // Reload page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                
            } catch (error) {
                console.error('Error resetting settings:', error);
                showError('Failed to reset settings');
            }
        }
    }

    /**
     * Export settings as JSON
     */
    async function exportSettings() {
        try {
            const settingsData = {
                settings: currentSettings,
                accountInfo: accountInfo,
                storageInfo: storageInfo,
                exportedAt: new Date().toISOString(),
                version: '0.1.0',
                snooShelfVersion: '0.1.0'
            };
            
            const blob = new Blob([JSON.stringify(settingsData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `snooshelf-settings-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            showSuccess('Settings exported successfully');
            
        } catch (error) {
            console.error('Error exporting settings:', error);
            showError('Failed to export settings');
        }
    }

    /**
     * Import settings from JSON file
     */
    async function importSettings(file) {
        try {
            if (!file) {
                // Create file input if no file provided
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                
                input.onchange = async (e) => {
                    await importSettings(e.target.files[0]);
                };
                
                input.click();
                return;
            }
            
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.settings) {
                // Validate imported settings
                const validatedSettings = validateSettings(data.settings);
                
                // Update current settings
                currentSettings = { ...validatedSettings };
                
                // Save to storage
                await saveSettings(validatedSettings);
                
                // Update UI
                updateUI();
                
                showSuccess('Settings imported successfully');
            } else {
                showError('Invalid settings file format');
            }
            
        } catch (error) {
            console.error('Error importing settings:', error);
            showError('Failed to import settings. Please check the file format.');
        }
    }

    /**
     * Handle check updates - compares version with latest (placeholder)
     */
    function handleCheckUpdates() {
        showInfo('Checking for updates...');
        
        // Placeholder implementation - in real app, would check against API
        setTimeout(() => {
            const currentVersion = '0.1.0';
            const latestVersion = '0.1.0'; // This would come from API
            
            if (currentVersion === latestVersion) {
                showInfo('You are running the latest version (0.1.0)');
            } else {
                showInfo(`Update available! Current: ${currentVersion}, Latest: ${latestVersion}`);
            }
        }, 2000);
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    /**
     * Send message to background script
     */
    function sendMessageToBackground(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, resolve);
        });
    }

    /**
     * Format date for display
     */
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    /**
     * Apply theme
     */
    function applyTheme(theme) {
        // TODO: Implement theme switching
        console.log('Applying theme:', theme);
    }

    /**
     * Show success message
     */
    function showSuccess(message) {
        // Simple alert for now, could be replaced with toast
        alert('✅ ' + message);
    }

    /**
     * Show error message
     */
    function showError(message) {
        alert('❌ ' + message);
    }

    /**
     * Show info message
     */
    function showInfo(message) {
        alert('ℹ️ ' + message);
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    return {
        init,
        loadSettings,
        saveSettings,
        updateUI
    };
})();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    SnooShelfSettings.init();
});

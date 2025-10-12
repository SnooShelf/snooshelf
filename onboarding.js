// onboarding.js - First-time user onboarding flow
// Follows Chrome Extension Manifest V3 requirements - no inline scripts

console.log('Onboarding module loaded');

/**
 * Check if user has seen onboarding
 * @returns {Promise<boolean>} True if should show onboarding
 */
async function shouldShowOnboarding() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['hasSeenOnboarding'], (result) => {
            resolve(!result.hasSeenOnboarding);
        });
    });
}

/**
 * Mark onboarding as seen
 * @returns {Promise<void>}
 */
async function markOnboardingComplete() {
    return new Promise((resolve) => {
        chrome.storage.local.set({ hasSeenOnboarding: true }, resolve);
    });
}

/**
 * Show onboarding modal
 */
function showOnboardingModal() {
    const modal = document.getElementById('onboarding-modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Add animation class for smooth appearance
        modal.classList.add('onboarding-show');
    }
}

/**
 * Hide onboarding modal
 */
function hideOnboardingModal() {
    console.log('hideOnboardingModal called');
    const modal = document.getElementById('onboarding-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('onboarding-show');
        console.log('Modal hidden successfully');
    }
    markOnboardingComplete();
    console.log('Onboarding marked as complete');
}

/**
 * Initialize onboarding check
 */
async function initOnboarding() {
    try {
        const shouldShow = await shouldShowOnboarding();
        if (shouldShow) {
            showOnboardingModal();
        }
    } catch (error) {
        console.error('Onboarding initialization error:', error);
        // Don't break the app if onboarding fails
    }
}

/**
 * Setup onboarding event listeners
 */
function setupOnboardingListeners() {
    const closeBtn = document.getElementById('onboarding-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            hideOnboardingModal();
        });
    }
    
    // Close on overlay click
    const modal = document.getElementById('onboarding-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideOnboardingModal();
            }
        });
    }
}

/**
 * Reset onboarding (for testing purposes)
 */
function resetOnboarding() {
    chrome.storage.local.remove(['hasSeenOnboarding'], () => {
        console.log('Onboarding reset - will show on next popup open');
    });
}

// Export functions (make them globally accessible)
window.initOnboarding = initOnboarding;
window.hideOnboardingModal = hideOnboardingModal;
window.setupOnboardingListeners = setupOnboardingListeners;
window.resetOnboarding = resetOnboarding;

// Debug function for testing (only available in development)
if (typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:') {
    window.debugOnboarding = {
        show: showOnboardingModal,
        hide: hideOnboardingModal,
        reset: resetOnboarding,
        check: shouldShowOnboarding
    };
}

// Auto-setup listeners when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupOnboardingListeners);
} else {
    setupOnboardingListeners();
}

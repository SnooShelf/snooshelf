/**
 * Toast Notification System
 * Provides user feedback with success, error, and info messages
 */

class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.init();
    }

    /**
     * Initialize the toast container
     */
    init() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    /**
     * Show a success toast
     * @param {string} message - Message to display
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    showSuccess(message, duration = 3000) {
        this.showToast(message, 'success', duration);
    }

    /**
     * Show an error toast
     * @param {string} message - Message to display
     * @param {number} duration - Duration in milliseconds (default: 5000)
     */
    showError(message, duration = 5000) {
        this.showToast(message, 'error', duration);
    }

    /**
     * Show an info toast
     * @param {string} message - Message to display
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    showInfo(message, duration = 3000) {
        this.showToast(message, 'info', duration);
    }

    /**
     * Show a warning toast
     * @param {string} message - Message to display
     * @param {number} duration - Duration in milliseconds (default: 4000)
     */
    showWarning(message, duration = 4000) {
        this.showToast(message, 'warning', duration);
    }

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type (success, error, info, warning)
     * @param {number} duration - Duration in milliseconds
     */
    showToast(message, type, duration) {
        const id = Date.now() + Math.random();
        const toast = this.createToastElement(id, message, type);
        
        this.container.appendChild(toast);
        this.toasts.set(id, toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-show');
        });

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => {
                this.dismissToast(id);
            }, duration);
        }

        return id;
    }

    /**
     * Create a toast element
     * @param {string} id - Unique identifier
     * @param {string} message - Message to display
     * @param {string} type - Toast type
     * @returns {HTMLElement} Toast element
     */
    createToastElement(id, message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.dataset.id = id;

        const icon = this.getIcon(type);
        const closeButton = this.createCloseButton(id);

        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${icon}</div>
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
        `;
        toast.appendChild(closeButton);

        return toast;
    }

    /**
     * Get icon for toast type
     * @param {string} type - Toast type
     * @returns {string} Icon HTML
     */
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    /**
     * Create close button for toast
     * @param {string} id - Toast ID
     * @returns {HTMLElement} Close button
     */
    createCloseButton(id) {
        const button = document.createElement('button');
        button.className = 'toast-close';
        button.innerHTML = '×';
        button.onclick = () => this.dismissToast(id);
        return button;
    }

    /**
     * Dismiss a toast
     * @param {string} id - Toast ID
     */
    dismissToast(id) {
        const toast = this.toasts.get(id);
        if (toast) {
            toast.classList.add('toast-hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                this.toasts.delete(id);
            }, 300);
        }
    }

    /**
     * Dismiss all toasts
     */
    dismissAll() {
        this.toasts.forEach((toast, id) => {
            this.dismissToast(id);
        });
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global toast manager instance
const Toast = new ToastManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Toast;
}

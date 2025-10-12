// export.js - Export functions for Reddit saves
// Supports CSV, JSON, and Markdown formats

const SnooShelfExport = (() => {
    'use strict';

    // ============================================================================
    // CONSTANTS
    // ============================================================================

    const VERSION = '0.1.0';
    const MIME_TYPES = {
        csv: 'text/csv;charset=utf-8',
        json: 'application/json;charset=utf-8',
        md: 'text/markdown;charset=utf-8'
    };

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    /**
     * Escape text for CSV format
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeCSV(text) {
        if (typeof text !== 'string') {
            text = String(text || '');
        }
        
        // Escape quotes by doubling them
        text = text.replace(/"/g, '""');
        
        // Wrap in quotes if contains comma, quote, or newline
        if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
            text = `"${text}"`;
        }
        
        return text;
    }

    /**
     * Format timestamp to human-readable date
     * @param {number|Date} timestamp - Timestamp in milliseconds or Date object
     * @returns {string} Formatted date string
     */
    function formatDate(timestamp) {
        if (!timestamp) return 'Unknown';
        
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Sanitize filename to be safe for file system
     * @param {string} name - Filename to sanitize
     * @returns {string} Sanitized filename
     */
    function sanitizeFilename(name) {
        if (typeof name !== 'string') {
            name = String(name || 'snooshelf-export');
        }
        
        // Remove or replace invalid characters
        return name
            .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid chars with dash
            .replace(/\s+/g, '-')           // Replace spaces with dash
            .replace(/-+/g, '-')            // Collapse multiple dashes
            .replace(/^-|-$/g, '')          // Remove leading/trailing dashes
            .substring(0, 100);             // Limit length
    }

    /**
     * Generate filename with current date
     * @param {string} format - File format (csv, json, md)
     * @returns {string} Generated filename
     */
    function generateFilename(format) {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const ext = format.toLowerCase();
        return `snooshelf-saves-${date}.${ext}`;
    }

    // ============================================================================
    // EXPORT FUNCTIONS
    // ============================================================================

    /**
     * Export posts to CSV format
     * @param {Array} posts - Array of post objects
     * @returns {string} CSV string
     */
    function exportToCSV(posts) {
        try {
            // Validate input
            if (!Array.isArray(posts)) {
                throw new Error('Invalid posts data format');
            }
            
            if (posts.length === 0) {
                return 'Title,Subreddit,URL,Author,Date Created,Type,Post ID\n';
            }

            // CSV header
            const headers = [
                'Title',
                'Subreddit', 
                'URL',
                'Author',
                'Date Created',
                'Type',
                'Post ID'
            ];

            // Convert posts to CSV rows
            const rows = posts.map(post => {
                try {
                    return [
                        escapeCSV(post.title || ''),
                        escapeCSV(post.subreddit || ''),
                        escapeCSV(post.url || ''),
                        escapeCSV(post.author || ''),
                        escapeCSV(formatDate(post.created)),
                        escapeCSV(post.type || 'post'),
                        escapeCSV(post.id || '')
                    ];
                } catch (error) {
                    console.warn('Error processing post for CSV:', post.id, error);
                    return ['', '', '', '', '', '', '']; // Empty row for failed posts
                }
            });

            // Combine headers and rows
            const csvContent = [headers, ...rows]
                .map(row => row.join(','))
                .join('\n');

            return csvContent;
            
        } catch (error) {
            console.error('CSV export error:', error);
            throw new Error(`Failed to export CSV: ${error.message}`);
        }
    }

    /**
     * Export posts to JSON format
     * @param {Array} posts - Array of post objects
     * @returns {string} JSON string
     */
    function exportToJSON(posts) {
        if (!Array.isArray(posts)) {
            posts = [];
        }

        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                snooShelfVersion: VERSION,
                postCount: posts.length,
                exportFormat: 'json'
            },
            posts: posts.map(post => ({
                id: post.id,
                title: post.title,
                subreddit: post.subreddit,
                url: post.url,
                author: post.author,
                type: post.type,
                content: post.content,
                score: post.score,
                created: post.created,
                saved: post.saved,
                thumbnail: post.thumbnail
            }))
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Export posts to Markdown format
     * @param {Array} posts - Array of post objects
     * @returns {string} Markdown string
     */
    function exportToMarkdown(posts) {
        if (!Array.isArray(posts) || posts.length === 0) {
            return '# My Reddit Saves\n\nNo saves found.\n';
        }

        // Group posts by subreddit
        const groupedPosts = {};
        posts.forEach(post => {
            const subreddit = post.subreddit || 'unknown';
            if (!groupedPosts[subreddit]) {
                groupedPosts[subreddit] = [];
            }
            groupedPosts[subreddit].push(post);
        });

        // Sort subreddits alphabetically
        const sortedSubreddits = Object.keys(groupedPosts).sort();

        // Build markdown content
        let markdown = '# My Reddit Saves\n\n';
        markdown += `*Exported on ${formatDate(Date.now())} with SnooShelf v${VERSION}*\n\n`;
        markdown += `**Total Saves:** ${posts.length}\n\n`;

        sortedSubreddits.forEach(subreddit => {
            const subredditPosts = groupedPosts[subreddit];
            
            // Sort posts by date (newest first)
            subredditPosts.sort((a, b) => {
                const dateA = new Date(a.created || 0);
                const dateB = new Date(b.created || 0);
                return dateB - dateA;
            });

            markdown += `## r/${subreddit}\n\n`;
            
            subredditPosts.forEach(post => {
                const title = post.title || 'Untitled';
                const url = post.url || '#';
                const date = formatDate(post.created);
                const type = post.type === 'comment' ? ' (Comment)' : '';
                
                markdown += `- [${title}](${url})${type} - created on ${date}\n`;
            });
            
            markdown += '\n';
        });

        return markdown;
    }

    /**
     * Download file to user's computer
     * @param {string} content - File content
     * @param {string} filename - Filename for download
     * @param {string} mimeType - MIME type
     * @returns {Promise} Download promise
     */
    function downloadFile(content, filename, mimeType) {
        return new Promise((resolve, reject) => {
            try {
                // Create blob
                const blob = new Blob([content], { type: mimeType });
                
                // Create download URL
                const url = URL.createObjectURL(blob);
                
                // Create temporary download link
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.style.display = 'none';
                
                // Add to DOM, click, and remove
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up blob URL after a short delay
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 1000);
                
                console.log(`Downloaded: ${filename} (${content.length} bytes)`);
                resolve({ success: true, filename, size: content.length });
                
            } catch (error) {
                console.error('Download failed:', error);
                reject(new Error(`Download failed: ${error.message}`));
            }
        });
    }

    /**
     * Export all saves in specified format
     * @param {string} format - Export format ('csv', 'json', 'md')
     * @returns {Promise} Export promise
     */
    async function exportAll(format = 'csv') {
        try {
            console.log(`Starting ${format.toUpperCase()} export...`);
            
            // Validate format
            if (!['csv', 'json', 'markdown', 'md'].includes(format.toLowerCase())) {
                throw new Error(`Unsupported export format: ${format}`);
            }
            
            // Get all posts from storage
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage(
                    { action: 'getStorageData', keys: ['saves'] },
                    resolve
                );
            });

            if (!response.success || !response.data || !response.data.saves) {
                throw new Error('No saves found to export');
            }

            const posts = response.data.saves;
            console.log(`Found ${posts.length} posts to export`);

            // Validate posts data
            if (!Array.isArray(posts)) {
                throw new Error('Invalid saves data format');
            }

            // Generate filename
            const filename = generateFilename(format);
            
            // Export based on format
            let content, mimeType;
            switch (format.toLowerCase()) {
                case 'csv':
                    content = exportToCSV(posts);
                    mimeType = MIME_TYPES.csv;
                    break;
                case 'json':
                    content = exportToJSON(posts);
                    mimeType = MIME_TYPES.json;
                    break;
                case 'md':
                case 'markdown':
                    content = exportToMarkdown(posts);
                    mimeType = MIME_TYPES.md;
                    break;
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }

            // Download file
            await downloadFile(content, filename, mimeType);
            
            console.log(`Export completed: ${filename}`);
            return { success: true, filename, postCount: posts.length, format };
            
        } catch (error) {
            console.error('Export error:', error);
            throw new Error(`Export failed: ${error.message}`);
        }
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    return {
        // Main export function
        exportAll,
        
        // Individual format exports
        exportToCSV,
        exportToJSON,
        exportToMarkdown,
        
        // Utility functions
        downloadFile,
        escapeCSV,
        formatDate,
        sanitizeFilename,
        generateFilename,
        
        // Constants
        VERSION,
        MIME_TYPES
    };
})();

// Make available globally
if (typeof window !== 'undefined') {
    window.SnooShelfExport = SnooShelfExport;
}

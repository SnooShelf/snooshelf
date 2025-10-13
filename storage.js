// storage.js - IndexedDB storage manager for SnooShelf

const storage = {
  
  // Initialize the IndexedDB database
  async initDatabase() {
    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('SnooShelfDB', 1);
        
        request.onerror = () => {
          console.error('Failed to open database');
          reject(new Error('Failed to open database'));
        };
        
        request.onsuccess = () => {
          console.log('Database opened successfully');
          resolve(request.result);
        };
        
        request.onupgradeneeded = (event) => {
          try {
            const db = event.target.result;
            
            // Create saves object store
            if (!db.objectStoreNames.contains('saves')) {
              const savesStore = db.createObjectStore('saves', { keyPath: 'id' });
              
              // Create indexes for efficient querying
              savesStore.createIndex('subreddit', 'subreddit', { unique: false });
              savesStore.createIndex('created', 'created', { unique: false });
              savesStore.createIndex('type', 'type', { unique: false });
              savesStore.createIndex('author', 'author', { unique: false });
              savesStore.createIndex('saved_at', 'saved', { unique: false });
              
              console.log('Database schema created');
            }
          } catch (error) {
            console.error('Error creating database schema:', error);
            reject(new Error('Failed to create database schema'));
          }
        };
      });
    } catch (error) {
      console.error('Database initialization error:', error);
      throw new Error('Database initialization failed');
    }
  },
  
  // Save posts to IndexedDB
  async savePosts(posts) {
    try {
      // Validate input
      if (!Array.isArray(posts)) {
        throw new Error('Invalid posts data format');
      }
      
      if (posts.length === 0) {
        console.log('No posts to save');
        return 0;
      }
      
      const db = await this.initDatabase();
      const transaction = db.transaction(['saves'], 'readwrite');
      const store = transaction.objectStore('saves');
      
      let savedCount = 0;
      const errors = [];
      
      for (const post of posts) {
        try {
          // Validate post data
          if (!post.id || typeof post.id !== 'string') {
            console.warn('Skipping post with invalid ID:', post);
            continue;
          }
          
          await new Promise((resolve, reject) => {
            const request = store.put(post);
            request.onsuccess = () => {
              savedCount++;
              resolve();
            };
            request.onerror = () => {
              if (request.error.name === 'QuotaExceededError') {
                reject(new Error('Storage quota exceeded'));
              } else {
                reject(new Error(`Failed to save post ${post.id}`));
              }
            };
          });
        } catch (error) {
          console.error('Error saving post:', post.id, error);
          errors.push({ postId: post.id, error: error.message });
        }
      }
      
      if (errors.length > 0) {
        console.warn(`Failed to save ${errors.length} posts:`, errors);
      }
      
      console.log(`Saved ${savedCount} posts to IndexedDB`);
      return savedCount;
      
    } catch (error) {
      console.error('Save posts error:', error);
      throw new Error(`Failed to save posts: ${error.message}`);
    }
  },
  
  // Get all posts from IndexedDB
  async getAllPosts() {
    try {
      const db = await this.initDatabase();
      const transaction = db.transaction(['saves'], 'readonly');
      const store = transaction.objectStore('saves');
      const index = store.index('created');
      
      return new Promise((resolve, reject) => {
        const request = index.getAll();
        
        request.onsuccess = () => {
          try {
            // Sort by creation date (newest first)
            const posts = request.result.sort((a, b) => b.created - a.created);
            console.log(`Retrieved ${posts.length} posts from IndexedDB`);
            resolve(posts);
          } catch (error) {
            reject(new Error('Failed to process retrieved posts'));
          }
        };
        
        request.onerror = () => {
          console.error('Error retrieving posts:', request.error);
          if (request.error.name === 'InvalidStateError') {
            reject(new Error('Database unavailable'));
          } else {
            reject(new Error('Failed to retrieve posts'));
          }
        };
      });
      
    } catch (error) {
      console.error('Get posts error:', error);
      throw new Error(`Failed to get posts: ${error.message}`);
    }
  },
  
  // Search posts in IndexedDB
  async searchPosts(query) {
    try {
      // Validate query
      if (typeof query !== 'string') {
        throw new Error('Invalid search query');
      }
      
      const allPosts = await this.getAllPosts();
      
      if (!query || query.trim() === '') {
        return allPosts;
      }
      
      const searchTerm = query.toLowerCase();
      
      const filteredPosts = allPosts.filter(post => {
        try {
          return (
            (post.title && post.title.toLowerCase().includes(searchTerm)) ||
            (post.subreddit && post.subreddit.toLowerCase().includes(searchTerm)) ||
            (post.content && post.content.toLowerCase().includes(searchTerm)) ||
            (post.author && post.author.toLowerCase().includes(searchTerm))
          );
        } catch (error) {
          console.warn('Error filtering post:', post.id, error);
          return false;
        }
      });
      
      console.log(`Search "${query}" returned ${filteredPosts.length} results`);
      return filteredPosts;
      
    } catch (error) {
      console.error('Search posts error:', error);
      throw new Error(`Failed to search posts: ${error.message}`);
    }
  },
  
  // Get post by ID
  async getPostById(id) {
    try {
      const db = await this.initDatabase();
      const transaction = db.transaction(['saves'], 'readonly');
      const store = transaction.objectStore('saves');
      
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        
        request.onsuccess = () => {
          resolve(request.result || null);
        };
        
        request.onerror = () => {
          console.error('Error getting post:', request.error);
          reject(request.error);
        };
      });
      
    } catch (error) {
      console.error('Error getting post by ID:', error);
      throw error;
    }
  },
  
  // Delete post by ID
  async deletePost(id) {
    try {
      const db = await this.initDatabase();
      const transaction = db.transaction(['saves'], 'readwrite');
      const store = transaction.objectStore('saves');
      
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        
        request.onsuccess = () => {
          console.log(`Deleted post ${id}`);
          resolve(true);
        };
        
        request.onerror = () => {
          console.error('Error deleting post:', request.error);
          reject(request.error);
        };
      });
      
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  },
  
  // Clear all posts
  async clearAllPosts() {
    try {
      const db = await this.initDatabase();
      const transaction = db.transaction(['saves'], 'readwrite');
      const store = transaction.objectStore('saves');
      
      return new Promise((resolve, reject) => {
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log('All posts cleared from IndexedDB');
          resolve(true);
        };
        
        request.onerror = () => {
          console.error('Error clearing posts:', request.error);
          if (request.error.name === 'InvalidStateError') {
            reject(new Error('Database unavailable'));
          } else {
            reject(new Error('Failed to clear posts'));
          }
        };
      });
      
    } catch (error) {
      console.error('Clear posts error:', error);
      throw new Error(`Failed to clear posts: ${error.message}`);
    }
  },
  
  // Get statistics about stored posts
  async getStats() {
    try {
      const allPosts = await this.getAllPosts();
      
      // Count posts by subreddit
      const subredditCounts = {};
      allPosts.forEach(post => {
        subredditCounts[post.subreddit] = (subredditCounts[post.subreddit] || 0) + 1;
      });
      
      // Get top subreddits
      const topSubreddits = Object.entries(subredditCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([subreddit, count]) => ({ subreddit, count }));
      
      const stats = {
        totalPosts: allPosts.length,
        totalSubreddits: Object.keys(subredditCounts).length,
        topSubreddits: topSubreddits,
        postsByType: {
          post: allPosts.filter(p => p.type === 'post').length,
          comment: allPosts.filter(p => p.type === 'comment').length
        }
      };
      
      console.log('Database stats:', stats);
      return stats;
      
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  },

  /**
   * Get all unique subreddits with their post counts
   * @returns {Promise<Array<{name: string, count: number}>>} Array of subreddit objects with name and count
   */
  async getUniqueSubreddits() {
    try {
      const allPosts = await this.getAllPosts();
      
      // Create a Map to store subreddit counts
      const subredditMap = new Map();
      
      // Count posts for each subreddit
      allPosts.forEach(post => {
        if (!post.subreddit) {
          // Handle null/undefined subreddits
          const key = '[deleted]';
          subredditMap.set(key, (subredditMap.get(key) || 0) + 1);
          return;
        }
        
        // Remove 'r/' prefix if present and normalize
        const subredditName = post.subreddit.replace(/^r\//, '').trim();
        if (subredditName) {
          const key = `r/${subredditName}`;
          subredditMap.set(key, (subredditMap.get(key) || 0) + 1);
        }
      });
      
      // Convert Map to array and sort alphabetically
      const subreddits = Array.from(subredditMap.entries()).map(([name, count]) => ({
        name,
        count
      })).sort((a, b) => a.name.localeCompare(b.name));
      
      console.log(`Found ${subreddits.length} unique subreddits`);
      return subreddits;
      
    } catch (error) {
      console.error('Error getting unique subreddits:', error);
      throw new Error(`Failed to get unique subreddits: ${error.message}`);
    }
  }
};

// Make storage functions globally available only in popup context
if (typeof window !== 'undefined') {
  // Export the storage object directly in popup context
  window.storage = storage;
}
/**
 * SearchEngine class
 * Handles search functionality using Lunr.js for SnooShelf
 */
class SearchEngine {
  /**
   * Initialize empty search index
   */
  constructor() {
    this.index = null;
    this.documents = new Map(); // Store original documents for retrieval
  }

  /**
   * Build search index from all saves in IndexedDB
   * @returns {Promise<void>}
   */
  async buildSearchIndex() {
    try {
      // Get all saves from IndexedDB
      const saves = await storage.getAllPosts();

      if (!saves || saves.length === 0) {
        console.warn('No saves found in IndexedDB to index');
        return;
      }

      // Store original documents for retrieval
      this.documents.clear();
      saves.forEach(save => this.documents.set(save.id, save));

      // Create the search index
      this.index = lunr(function() {
        // Define fields with boost values
        this.field('title', { boost: 3 });      // Title matches are most important
        this.field('selftext', { boost: 2 });   // Post content is next
        this.field('subreddit', { boost: 1.5 }); // Subreddit is useful for filtering
        this.field('subreddit_prefixed', { boost: 1.5 }); // Also index with r/ prefix
        this.field('author', { boost: 1 });     // Author has normal weight

        // The ref field is the unique identifier for the document
        this.ref('id');

        // Add each save to the index
        saves.forEach(function(save) {
          // Create document with both subreddit formats
          const doc = {
            id: save.id,
            title: save.title || '',
            selftext: save.selftext || '',
            subreddit: save.subreddit || '',
            subreddit_prefixed: `r/${save.subreddit || ''}`, // Add r/ version
            author: save.author || ''
          };
          
          // Log the first document to verify structure
          if (saves.indexOf(save) === 0) {
            console.log('Sample document being indexed:', doc);
          }

          this.add(doc);
        }, this);
      });

      console.log(`Search index built with ${saves.length} documents`);
    } catch (error) {
      console.error('Failed to build search index:', error);
      throw new Error('Search index build failed');
    }
  }

  /**
   * Search the index for saves matching the query
   * @param {string} query - The search query
   * @returns {Array} Array of matching saves with scores
   */
  search(query) {
    if (!this.index) {
      throw new Error('Search index not initialized. Call buildSearchIndex() first.');
    }

    try {
      // Clean up query - remove r/ prefix if searching for subreddit
      const cleanQuery = query.trim().replace(/^r\//, '');

      // Perform the search
      const results = this.index.search(cleanQuery);

      // Map results to original documents and include score
      return results.map(result => ({
        ...this.documents.get(result.ref),
        score: result.score
      }));
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * Get the total number of documents in the index
   * @returns {number} Number of indexed documents
   */
  getDocumentCount() {
    return this.documents.size;
  }

  /**
   * Check if the search index is built
   * @returns {boolean} True if index is built
   */
  isIndexBuilt() {
    return this.index !== null;
  }
}

// Create instance and make it globally available in popup context
const searchEngine = new SearchEngine();
if (typeof window !== 'undefined') {
  window.searchEngine = searchEngine;
}
/**
 * search-engine.js
 * Handles search functionality using Lunr.js for SnooShelf
 */

class SearchEngine {
  constructor() {
    this.index = null;
    this.documents = new Map(); // Store original documents for retrieval
  }

  /**
   * Initialize or update the search index with Reddit saves
   * @param {Array} saves - Array of Reddit save objects
   */
  initializeIndex(saves) {
    // Store original documents
    this.documents.clear();
    saves.forEach(save => this.documents.set(save.id, save));

    // Create the search index
    this.index = lunr(function() {
      // Define boost values for different fields
      this.field('title', { boost: 10 }); // Title matches are most important
      this.field('selftext', { boost: 5 }); // Post content is next
      this.field('subreddit', { boost: 3 }); // Subreddit is useful for filtering
      this.field('author'); // Author has normal weight

      // The ref field is the unique identifier for the document
      this.ref('id');

      // Add each save to the index
      saves.forEach(function(save) {
        this.add({
          id: save.id,
          title: save.title || '',
          selftext: save.selftext || '',
          subreddit: save.subreddit || '',
          author: save.author || ''
        });
      }, this);
    });
  }

  /**
   * Search the index for saves matching the query
   * @param {string} query - The search query
   * @param {Object} options - Search options (e.g., filters)
   * @returns {Array} Array of matching saves with scores
   */
  search(query, options = {}) {
    if (!this.index) {
      throw new Error('Search index not initialized');
    }

    try {
      // Perform the search
      const results = this.index.search(query);

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
   * Clear the search index and document store
   */
  clearIndex() {
    this.index = null;
    this.documents.clear();
  }

  /**
   * Get the total number of documents in the index
   * @returns {number} Number of indexed documents
   */
  getDocumentCount() {
    return this.documents.size;
  }
}

// Create and expose a singleton instance globally
const searchEngine = new SearchEngine();
window.searchEngine = searchEngine;
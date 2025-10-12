// reddit-api.js - Reddit API wrapper (simplified, no error handler dependency)

const RedditAPI = {
  
  // Exchange authorization code for access token
  async exchangeCodeForToken(code, codeVerifier) {
    try {
      console.log('Exchanging code for token...');
      
      const params = {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: CONFIG.reddit.redirectUri
      };
      
      if (codeVerifier) {
        params.code_verifier = codeVerifier;
      }
      
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(CONFIG.reddit.clientId + ':')
        },
        body: new URLSearchParams(params)
      });
      
      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Token exchange successful');
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in
      };
      
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  },
  
  // Get current user info
  async getUserInfo(accessToken) {
    try {
      console.log('Fetching user info...');
      
      const response = await fetch('https://oauth.reddit.com/api/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': CONFIG.reddit.userAgent
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('User info retrieved:', data.name);
      
      return {
        username: data.name,
        id: data.id
      };
      
    } catch (error) {
      console.error('Get user info error:', error);
      throw new Error(`Failed to fetch user info: ${error.message}`);
    }
  },
  
  // Get saved posts for user
  async getSavedPosts(accessToken, username, after = null) {
    try {
      console.log('Fetching saved posts...', after ? `after: ${after}` : 'first page');
      
      const params = new URLSearchParams({
        limit: 100,
        raw_json: 1
      });
      
      if (after) {
        params.append('after', after);
      }
      
      const response = await fetch(
        `https://oauth.reddit.com/user/${username}/saved?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': CONFIG.reddit.userAgent
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch saved posts: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Fetched ${data.data.children.length} posts`);
      
      return {
        posts: data.data.children.map(child => this.parseSavedItem(child.data)),
        after: data.data.after
      };
      
    } catch (error) {
      console.error('Get saved posts error:', error);
      throw new Error(`Failed to fetch saved posts: ${error.message}`);
    }
  },
  
  // Get ALL saved posts (handles pagination)
  async getAllSavedPosts(accessToken, username) {
    try {
      console.log('Starting full sync...');
      
      let allPosts = [];
      let after = null;
      let pageCount = 0;
      const maxPages = 50;
      
      do {
        const result = await this.getSavedPosts(accessToken, username, after);
        allPosts = allPosts.concat(result.posts);
        after = result.after;
        pageCount++;
        
        console.log(`Page ${pageCount}: ${allPosts.length} total posts so far`);
        
        // Rate limiting: wait 1 second between requests
        if (after) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } while (after && pageCount < maxPages);
      
      if (pageCount >= maxPages) {
        console.warn('Reached maximum page limit');
      }
      
      console.log(`Sync complete: ${allPosts.length} total posts`);
      return allPosts;
      
    } catch (error) {
      console.error('Get all saved posts error:', error);
      throw new Error(`Failed to sync all saved posts: ${error.message}`);
    }
  },
  
  // Parse a saved item into our format
  parseSavedItem(item) {
    const createdTimestamp = item.created_utc ? item.created_utc * 1000 : Date.now();
    const savedTimestamp = item.saved_utc ? item.saved_utc * 1000 : Date.now();
    
    return {
      id: item.id,
      title: item.title || item.link_title || 'Comment',
      subreddit: item.subreddit,
      url: item.url || `https://reddit.com${item.permalink}`,
      author: item.author,
      created_utc: item.created_utc,
      created: createdTimestamp,
      saved_utc: item.saved_utc,
      saved: savedTimestamp,
      type: item.title ? 'post' : 'comment',
      content: item.selftext || item.body || '',
      thumbnail: item.thumbnail || '',
      score: item.score || 0
    };
  },
  
  // Helper function to format time ago
  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  }
};
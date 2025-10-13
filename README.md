# SnooShelf

Chrome extension for unlimited local storage of Reddit saves.

## 🚀 Current Status: Week 1 MVP Complete

### ✅ Working Features
- Reddit OAuth authentication
- Fetch all saved posts from Reddit  
- Local storage in IndexedDB (unlimited saves)
- Search saved posts
- View saves offline
- Export to CSV
- Settings page

### 🚧 Known Issues
- Onboarding flow disabled (will add in Week 2)
- Rate limiting UI disabled (will add in Week 2)
- Search is basic keyword matching only

### 📦 Installation

#### For Development:
1. Clone this repo
2. Add Reddit API credentials to `config.js`
3. Load unpacked extension in Chrome (`chrome://extensions`)

#### Requirements:
- Chrome browser
- Reddit account
- Reddit API credentials (from https://www.reddit.com/prefs/apps)

### 🛠️ Tech Stack
- Vanilla JavaScript (ES6+)
- Chrome Extension Manifest V3
- IndexedDB for storage
- Reddit OAuth 2.0

### 📅 Roadmap

**Week 2:**
- Advanced search with filters
- Better search algorithm (Lunr.js)
- Subreddit and date filtering

**Week 3:**
- Tags and folders
- Multiple export formats
- Bulk actions

**Week 4:**
- Stripe payment integration
- Pro tier features
- Chrome Web Store submission

### 🔒 Privacy
All data stored locally in your browser. Nothing is uploaded to any server.

### 📄 License
MIT


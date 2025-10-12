SnooShelf - Product Requirements Document (PRD)
Product Name: SnooShelfVersion: 1.0 (MVP)Last Updated: October 2025Document Owner: FounderStatus: Pre-Development

📋 Executive Summary
Product Vision
SnooShelf is a privacy-first Chrome extension that eliminates Reddit's 1,000-save limit by storing unlimited saves locally in the user's browser, with instant offline search and simple organization tools.
Problem Statement
Reddit's native save system frustrates 50M+ power users with:
Hard 1,000-post limit with automatic deletion of older saves
Zero organization capabilities (no folders, tags, or categories)
No search functionality beyond manual scrolling
Permanent loss of valuable content
Solution
A local-first Chrome extension that stores saves in the browser's IndexedDB, enabling:
✅ Unlimited saves (browser storage, not servers)
✅ Instant offline search (Lunr.js, no latency)
✅ Simple organization (tags, folders)
✅ Privacy-first (data never leaves user's device)
✅ Affordable pricing ($4.99/month vs $10 competitors)
Success Metrics (90 Days)
2,000 total users
160 paid subscribers (8% conversion)
$800 MRR
<12% monthly churn
4.5+ star Chrome Store rating

🎯 Product Goals & Objectives
Primary Goals
Solve the limit problem: Users can save unlimited Reddit posts
Enable discovery: Users can find any save in <5 seconds
Provide organization: Users can categorize saves meaningfully
Ensure privacy: 100% local storage, zero server data collection
Non-Goals (Post-MVP)
❌ Mobile app (browser extension only)
❌ Multi-platform saves (Reddit-only for MVP)
❌ Social features (sharing, collaboration)
❌ AI-powered recommendations
❌ Browser sync across devices (future feature)

👥 Target Users
Primary Persona: "Reddit Power User"
Demographics:
Age: 25-45
Tech-savvy, productivity-focused
Uses Reddit 30+ min/day
Saves 5-10+ posts per week
Pain Points:
Hit the 1,000-save limit multiple times
Lost valuable content permanently
Spends 10+ minutes scrolling to find old saves
Frustrated by lack of organization
Behaviors:
Uses Chrome as primary browser (90%+)
Willing to pay $5-10/month for tools
Values privacy and data control
Active in r/productivity, r/chrome, niche hobby subreddits
Secondary Persona: "Content Curator"
Researchers, writers, students
Uses Reddit saves as reference library
Needs to export/share collections
Higher willingness to pay ($10-15/month)

🏗️ Technical Architecture
Core Technology Stack
Frontend (User Interface)
HTML5/CSS3/JavaScript (ES6+): Extension UI
Chrome Extension Manifest V3: Latest Chrome standard
No framework: Vanilla JS for minimal bundle size
Data Storage
IndexedDB: Browser-native database
Capacity: 10GB+ per user
Persistent: Survives browser restarts
Offline: Works without internet
Search Engine
Lunr.js v2.3.9: Client-side full-text search
Indexing: Title, content, subreddit, author
Performance: <100ms for 10,000 posts
No server required
Authentication
Reddit OAuth 2.0: Secure login flow
Permissions: Read saved posts only
Token storage: Encrypted in Chrome storage
Refresh: Auto-renew before expiry
Backend (Minimal)
AWS Lambda (Node.js): Serverless OAuth handler
Only purpose: Exchange Reddit auth code for token
Cost: ~$5-10/month total
Region: US-East-1
Payment Processing
Stripe Checkout: Subscription billing
Plans: Free tier, Pro ($4.99/month)
Webhooks: Handle subscription events
PCI compliant: No card data stored
Data Flow Architecture
User clicks "Save" on Reddit 
    ↓
SnooShelf detects save (Chrome API)
    ↓
Fetch post data from Reddit API
    ↓
Store in IndexedDB (local browser)
    ↓
Index with Lunr.js (searchable)
    ↓
Display in extension popup
Privacy Architecture
100% Local Storage: All saves in browser IndexedDB
No Cloud Database: Zero post content on servers
Minimal API Calls: 1 initial sync + incremental updates
Optional Cloud Backup: User-controlled export to Google Drive/Dropbox

✨ Feature Specifications
MVP Features (Launch Day)
1. Core Save Management
1.1 Import Existing Saves
Trigger: User clicks "Sync Saves" button
Process:
OAuth login with Reddit (if not authenticated)
Fetch all saved posts via Reddit API (/api/v1/me/saved)
Store in IndexedDB (post ID, title, content, subreddit, date, URL, author)
Build Lunr.js search index
Display count: "1,247 saves synced"
Performance: 1,000 saves in <30 seconds
Edge Cases:
Reddit API rate limit → Show progress, resume later
Network failure → Save partial data, retry on next sync
1.2 Auto-Sync New Saves
Trigger: User saves post on Reddit
Process:
Chrome API detects save action
Fetch new post data
Add to IndexedDB + update search index
Badge notification: "+1 new save"
Frequency: Real-time (immediate)
Offline Behavior: Queue saves, sync when online
1.3 Delete Saves
Trigger: User clicks trash icon on save
Process:
Confirmation modal: "Delete this save?"
Remove from IndexedDB + search index
Update count display
Important: Deletes from SnooShelf only, not Reddit
2. Search Functionality
2.1 Basic Search (Free Tier)
Input: Search bar in popup (always visible)
Query Types:
Keyword: "machine learning" → Search title + content
Subreddit: "r/productivity" → Filter by subreddit
Results Display:
Title (clickable to Reddit post)
Subreddit badge
Save date (relative: "3 days ago")
Snippet (first 150 chars of content)
Performance: <100ms for 1,000 saves
No Results: "No saves match '[query]' - try different keywords"
2.2 Advanced Search (Pro Tier)
Filters:
Date range: "Last 30 days," "Custom range"
Subreddit dropdown: All saved subreddits
Tags: Multi-select tag filter
Sort: Relevance, Date (newest/oldest), Upvotes
Saved Searches: Save common filters as presets
Syntax: Support author:username, subreddit:name, before:2024-01-01
3. Organization System (Pro Tier)
3.1 Tagging
Add Tag:
Click "+" icon on save
Type tag name or select existing
Multi-tag support (e.g., "productivity", "tutorial", "coding")
Tag Management:
Rename tags (updates all associated saves)
Delete tags (removes from saves, doesn't delete saves)
Tag color coding (8 preset colors)
Display: Tag pills below save title
3.2 Folder System
Structure: Single-level folders (no nesting for MVP)
Create Folder:
Click "New Folder" in sidebar
Name folder (e.g., "Work Ideas," "Recipes")
Drag saves into folder or use "Move to Folder" dropdown
Folder View: Clicking folder shows only saves inside
Default Folders: "All Saves," "Unorganized"
3.3 Bulk Actions (Pro Tier)
Select Multiple: Checkbox selection (Shift+click for range)
Actions Available:
Add tags to selected
Move to folder
Export selected
Delete selected
Limit: Max 100 saves per bulk action
4. Export Features
4.1 CSV Export (Free Tier)
Format: Spreadsheet-compatible
Columns: Title, URL, Subreddit, Author, Date Saved, Tags, Folder
Trigger: "Export" button → "Download as CSV"
Filename: snooshelf-saves-2024-10-07.csv
4.2 Markdown Export (Pro Tier)
Format: Human-readable, organized by folder
Structure: # SnooShelf Export - October 7, 2024## Work Ideas- [Post Title](https://reddit.com/...) - r/entrepreneur - Oct 5, 2024  Tags: #productivity #startup## Recipes- [Best Pasta Recipe](https://reddit.com/...) - r/cooking - Oct 1, 2024

Use Case: Paste into Notion, Obsidian, personal wiki
4.3 JSON Export (Pro Tier)
Format: Machine-readable, complete data structure
Use Case: Backup, import to other tools, data analysis
Structure: {  "version": "1.0",  "export_date": "2024-10-07",  "saves": [    {      "id": "abc123",      "title": "Post Title",      "url": "https://...",      "content": "...",      "subreddit": "productivity",      "author": "username",      "date_saved": "2024-10-05T14:30:00Z",      "tags": ["productivity", "tools"],      "folder": "Work Ideas"    }  ]}

4.4 Cloud Backup (Pro Tier)
Option 1: Google Drive Sync
User clicks "Backup to Google Drive"
OAuth consent for Drive access
Saves JSON export to /SnooShelf/backup-[date].json
Auto-backup: Weekly option
Option 2: Dropbox Sync
Same as Google Drive flow
Uses Dropbox API
5. User Interface
5.1 Extension Popup
Dimensions: 400px wide × 600px tall
Layout:
Header: Logo, search bar, sync button
Sidebar: Folders list (collapsible)
Main area: Save cards (scrollable list)
Footer: Settings icon, upgrade button (if free tier)
Theme: Light mode (dark mode post-MVP)
5.2 Save Card Design
Components:
Thumbnail (if post has image, 80×80px)
Title (bold, 2-line max with ellipsis)
Subreddit badge (colored by subreddit)
Date + author (small gray text)
Action icons: Open, Tag, Folder, Delete
Tags (pill badges below)
Interaction:
Click title → Opens Reddit post in new tab
Hover → Show full title tooltip
Right-click → Context menu (open, copy link, delete)
5.3 Settings Page
Access: Click gear icon in popup
Sections:
Account: Reddit username, disconnect button
Sync Settings: Auto-sync toggle, sync interval
Storage: Used space, clear cache
Export: Quick export buttons
Subscription: Plan status, manage billing
About: Version, privacy policy, terms
6. Payment & Subscription
6.1 Free Tier Limits
Saves: 1,000 local saves max
Search: Basic keyword only
Export: CSV only
Organization: No tags/folders
Paywall Behavior:
At 950 saves: Warning banner "Approaching limit, upgrade for unlimited"
At 1,000 saves: Block new saves, show upgrade modal
6.2 Pro Tier ($4.99/month)
Features Unlocked:
Unlimited saves
Advanced search (filters, saved searches)
Tags & folders
All export formats (CSV, Markdown, JSON)
Cloud backup (Google Drive/Dropbox)
Billing: Stripe Checkout
Monthly recurring
Cancel anytime (no refunds, access until end of period)
6.3 Upgrade Flow
User clicks "Upgrade to Pro" button
Redirect to Stripe Checkout (hosted page)
Complete payment
Stripe webhook → Activate license
Extension checks license → Unlock features
Success message: "Welcome to SnooShelf Pro!"
6.4 License Validation
Method: API call to Lambda function
Frequency: On extension startup + every 24 hours
Storage: License key in Chrome storage (encrypted)
Offline Grace: 7 days before re-validation required

🎨 User Experience (UX) Requirements
Onboarding Flow (First-Time Users)
Step 1: Installation
User installs from Chrome Web Store
Extension icon appears in toolbar
Welcome badge: "Click to get started!"
Step 2: Welcome Screen
Welcome message: "Welcome to SnooShelf! Manage your Reddit saves like never before."
Features preview: 3 cards (Unlimited, Search, Organize)
CTA button: "Connect Reddit"
Step 3: Reddit Authentication
Click "Connect Reddit" → OAuth popup
Reddit permissions screen: "SnooShelf wants to access your saved posts"
Approve → Return to extension
Success: "Connected as u/[username]"
Step 4: Initial Sync
Progress modal: "Syncing your saves... 347/1,247"
Completion: "All set! 1,247 saves synced."
Tooltip overlay: "Try searching for a post →" (points to search bar)
Step 5: Feature Discovery
Tooltips on first use (dismissible):
"Click + to add tags" (on first hover over save)
"Export your saves anytime" (on first settings visit)
Core User Flows
Flow 1: Find a Save
Open extension popup
Type keyword in search → Results appear instantly
Click result → Opens Reddit post
Flow 2: Organize Saves
Click save → "Add Tag" button
Type tag name → Autocomplete suggests existing tags
Save now shows tag pill
(Pro) Drag save to folder in sidebar
Flow 3: Export Collection
Filter saves (e.g., tag: "recipes")
Click "Export" button
Choose format (CSV/Markdown/JSON)
File downloads automatically
Flow 4: Upgrade to Pro
Hit 1,000 save limit OR click "Upgrade" button
See feature comparison: Free vs Pro
Click "Upgrade Now" → Stripe checkout
Complete payment → Instant activation
Error States & Edge Cases
Error 1: Reddit API Down
Message: "Can't sync right now. Reddit may be down. Try again in a few minutes."
Action: Retry button
Error 2: Storage Quota Exceeded
Message: "Your browser storage is full. Free up space or enable cloud backup."
Action: Link to Chrome storage settings
Error 3: Authentication Expired
Message: "Your Reddit session expired. Please reconnect."
Action: "Reconnect Reddit" button → OAuth flow
Error 4: Payment Failed
Message: "Payment didn't go through. Please update your payment method."
Action: Link to Stripe customer portal
Edge Case 1: User Deletes Extension
Data remains in IndexedDB (browser storage)
Reinstalling restores data automatically (same Chrome profile)
Edge Case 2: User Switches Devices
Free tier: Data is device-specific (not synced)
Pro tier: Export/import workflow (future: Chrome sync API)

🔒 Privacy & Security
Data Handling Principles
Local-First: All saves stored in user's browser, never on servers
Minimal Collection: Only Reddit access token stored server-side (encrypted)
User Control: User can export and delete all data anytime
Transparency: Clear privacy policy, no hidden data sharing
Privacy Policy Summary
Data Collected:
Reddit username (for display only)
Saved posts (stored locally only)
Email (if Pro subscriber, for billing)
Data NOT Collected:
Browsing history
Personal messages
Search queries (processed locally)
Third-Party Sharing: None, except Stripe for payments
Security Measures
OAuth Token: Encrypted in Chrome storage
HTTPS Only: All API calls over secure connection
No Password Storage: Use Reddit OAuth, never ask for password
Content Security Policy: Prevent XSS attacks
Regular Updates: Security patches within 48 hours
Compliance
GDPR: Right to access, export, delete data (built-in features)
CCPA: No sale of personal information (we don't collect it)
Chrome Web Store: Follow all privacy policies

📊 Analytics & Metrics
User Metrics (Track Locally)
Total saves stored
Searches per day
Most used tags
Export frequency
Business Metrics (Server-Side)
Total installs (Chrome Web Store API)
Active users (daily/weekly/monthly)
Conversion rate (Free → Pro)
Churn rate (Pro cancellations)
MRR (Monthly Recurring Revenue)
Performance Metrics
Extension load time (<500ms)
Search latency (<100ms)
Sync speed (1,000 saves in <30 seconds)
Crash rate (<0.1%)
Privacy-Conscious Analytics
No User Tracking: Use aggregate metrics only
No Third-Party Analytics: No Google Analytics, Mixpanel, etc.
Opt-In: Ask permission for anonymous usage stats

🚀 Launch Requirements
Pre-Launch Checklist
Legal & Compliance:
[ ] Privacy Policy published (on website)
[ ] Terms of Service published
[ ] Reddit API ToS compliance review
[ ] Chrome Web Store policies check
[ ] GDPR consent flow (EU users)
Technical:
[ ] All MVP features working
[ ] Tested with 1,000+ saves
[ ] Payment flow tested (Stripe test mode)
[ ] Error handling for all edge cases
[ ] Cross-browser tested (Chrome, Edge, Brave)
Content:
[ ] Chrome Web Store listing (title, description, screenshots)
[ ] Landing page (snooshelf.com)
[ ] Support email (support@snooshelf.com)
[ ] FAQ page
Quality Assurance:
[ ] 10 beta testers used without critical bugs
[ ] Load tested (10,000 saves)
[ ] Security audit (basic)
[ ] Accessibility check (keyboard navigation)
Success Criteria (Launch Week)
100+ installs
8% conversion to Pro (8 paid users)
<5 critical bugs reported
4+ star average rating

🔄 Post-MVP Roadmap (Future Versions)
Version 1.1 (Month 2)
Dark mode
Keyboard shortcuts (Ctrl+F to search)
Bulk tag editing
Import from JSON (restore backups)
Version 1.2 (Month 3)
Chrome sync API (cross-device sync)
Smart folders (auto-organize by subreddit)
Advanced filters (upvotes, comments count)
Version 1.3 (Month 4)
Firefox extension
Scheduled backups (auto-export weekly)
Saved searches (reusable filters)
Version 2.0 (Month 6)
AI-powered tagging suggestions
Duplicate detection
Reddit comment saves
Mobile companion app (view-only)

📝 Open Questions & Decisions Needed
Technical Decisions
Search Ranking: Prioritize title matches over content? (Recommendation: Yes)
Folder Nesting: Allow subfolders in MVP? (Recommendation: No, add in v1.1)
Image Caching: Store post thumbnails locally? (Recommendation: No, fetch on demand)
Business Decisions
Free Trial: Offer 7-day Pro trial? (Recommendation: Yes, increases conversion)
Annual Plan: Add $49.99/year (2 months free)? (Recommendation: Post-MVP)
Refund Policy: No refunds, or 7-day money-back? (Recommendation: 7-day)
UX Decisions
Default View: Show "All Saves" or "Unorganized" first? (Recommendation: All Saves)
Search Scope: Search within current folder or all saves? (Recommendation: All, with filter option)
Delete Confirmation: Always confirm or skip for bulk? (Recommendation: Always confirm)

🎯 Success Definition
MVP is successful if:
✅ 100+ users in first week (validation)
✅ 8%+ conversion to Pro (revenue validation)
✅ <12% monthly churn (retention validation)
✅ 4.5+ star rating (quality validation)
✅ Users saving 1,000+ posts each (usage validation)
MVP fails if:
❌ <50 users in first week (no demand)
❌ <3% conversion (pricing/value mismatch)
❌ >25% churn (product not sticky)
❌ <3.5 star rating (quality issues)
❌ Chrome Store rejection (compliance failure)

📞 Stakeholder Sign-Off
Product Owner (Founder): ___________________ Date: ___________
Next Steps:
Review and approve PRD
Create technical architecture document
Begin Week 1 development (manifest.json)

Document Version History:
v1.0 - October 2025 - Initial PRD (Pre-Development)
Related Documents:
Architecture Document (to be created)
API Integration Guide (to be created)
UI Component Library (to be created)

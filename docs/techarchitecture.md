const anonymousData = { event, properties: { ...properties, // Context (no PII) extensionVersion:
chrome.runtime.getManifest().version, browser: navigator.userAgent.includes('Edg') ? 'edge' :
'chrome', timestamp: Date.now() } };
// Send to simple analytics endpoint (optional)
// For MVP: Just log locally
console.log('[Analytics]', anonymousData);
}
// Usage examples static trackSync(saveCount) { this.track('sync_completed', { saveCount }); }
static trackSearch(resultCount) { this.track('search_performed', { resultCount }); }
static trackUpgrade() { this.track('upgrade_clicked'); } }
### Performance Monitoring
```javascript
// Monitor critical operations
class PerformanceMonitor {
static measurements = new Map();
static start(operation) {
this.measurements.set(operation, performance.now());
}
static end(operation) {
const start = this.measurements.get(operation);
if (!start) return;
const duration = performance.now() - start;
this.measurements.delete(operation);
// Log slow operations
if (duration > 1000) {
console.warn(`[Performance] ${operation} took $
{duration.toFixed(2)}ms (slow!)`);
Analytics.track('slow_operation', { operation, duration
});
}
return duration;
}
}
// Usage
PerformanceMonitor.start('sync');
await syncSaves();
const duration = PerformanceMonitor.end('sync');
console.log(`Sync took ${duration}ms`);
🔐 Privacy Architecture Details
Data Flow - Privacy Perspective
┌─────────────────────────────────────────────┐ │ USER'S BROWSER (Everything stays here) │
│ ┌─────────────────────────────────────┐ │
│ │ IndexedDB (Local Storage) │ │
│ │ • All saved posts │ │
│ │ • Search index │ │
│ │ • Tags, folders, settings │ │
│ │ • Encrypted auth tokens │ │
│ └─────────────────────────────────────┘ │
│ │
│ What NEVER leaves the browser: │
│ ❌ Post content │
│ ❌ Search queries │
│ ❌ Tags/folders │
│ ❌ User preferences │
└─────────────────────────────────────────────┘
│ │ (Only these 3 things leave)
▼
┌─────────────────────────────────────────────┐ │ EXTERNAL SERVERS │
│ ┌─────────────────────────────────────┐ │
│ │ Reddit: │ │
│ │ ✅ Access token (encrypted) │ │
│ │ │ │
│ │ SnooShelf Lambda: │ │
│ │ ✅ License key (for validation) │ │
│ │ │ │
│ │ Stripe: │ │
│ │ ✅ Payment info (PCI compliant) │ │
│ └─────────────────────────────────────┘ │ └─────────────────────────────────────────────┘
Privacy Policy Requirements
What to include in Privacy Policy:
1. 2. 3. 4. 5. Data Collection: "We only collect your Reddit username and email (for billing)"
Local Storage: "All saves stored in your browser, never on our servers"
Third Parties: "Reddit (for authentication), Stripe (for payments)"
Analytics: "Optional anonymous usage stats (opt-in)"
Data Deletion: "Uninstall extension = all data deleted automatically"
🔄 Sync Strategy
Background Sync Architecture
// Service Worker: Periodic sync
chrome.alarms.create('autoSync', { periodInMinutes: 15 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
if (alarm.name === 'autoSync') {
const { autoSync } = await
chrome.storage.local.get('autoSync');
if (autoSync) {
await performIncrementalSync();
}
}
});
async function performIncrementalSync() {
const { lastSyncAt } = await
chrome.storage.local.get('lastSyncAt');
// Fetch only new saves since last sync
const newSaves = await
RedditAPI.fetchSavesAfter(lastSyncAt);
// Add to IndexedDB
for (const save of newSaves) {
await StorageManager.addSave(save);
await SearchEngine.addToIndex(save);
}
// Update last sync timestamp
await chrome.storage.local.set({ lastSyncAt: Date.now() });
// Badge notification
if (newSaves.length > 0) {
chrome.action.setBadgeText({ text: `+${newSaves.length}
` });
chrome.action.setBadgeBackgroundColor({ color:
'#FF4500' });
}
}
Conflict Resolution
// If user saves/unsaves while offline
class SyncQueue {
static queue = [];
static async addToQueue(action) {
this.queue.push({ action, timestamp: Date.now() });
await chrome.storage.local.set({ syncQueue:
this.queue });
}
static async processQueue() {
const { syncQueue } = await
chrome.storage.local.get('syncQueue');
this.queue = syncQueue || [];
for (const item of this.queue) {
try {
await this.processAction(item.action);
} catch (error) {
console.error('Failed to sync action:', item, error);
}
}
// Clear queue
this.queue = [];
await chrome.storage.local.set({ syncQueue: [] });
}
static async processAction(action) {
switch (action.type) {
case 'SAVE':
await RedditAPI.savePost(action.postId);
break;
case 'UNSAVE':
await RedditAPI.unsavePost(action.postId);
break;
}
}
}
// Run on network reconnect
window.addEventListener('online', async () => {
await SyncQueue.processQueue();
await performIncrementalSync();
});
📦 Build & Deployment Process
Build Pipeline
# 1. Development
npm run dev # Watch mode, auto-reload
# 2. Production Build
npm run build # Minify, optimize
├── Minify JS (Terser)
├── Minify CSS (cssnano)
├── Optimize images
├── Generate manifest.json
└── Create .zip for Chrome Store
# 3. Version Bump
npm version patch # 1.0.0 → 1.0.1
npm version minor # 1.0.0 → 1.1.0
npm version major # 1.0.0 → 2.0.0
# 4. Deploy to Chrome Web Store
npm run deploy # Upload .zip to Chrome Store
Deployment Checklist
## Pre-Deployment
- [ ] All tests pass
- [ ] No console errors
- [ ] Load tested with 10,000 saves
- [ ] Privacy Policy updated
- [ ] Version bumped in manifest.json
- [ ] Changelog updated
## Chrome Web Store Submission
- [ ] Build production .zip
- [ ] Update store listing (if changed)
- [ ] Upload screenshots (1280×800 or 640×400)
- [ ] Set pricing (Free with IAP)
- [ ] Submit for review
## Post-Deployment
- [ ] Monitor error reports (Chrome Web Store dashboard)
- [ ] Check analytics for issues
- [ ] Respond to user reviews
- [ ] Plan next version features
🔧 Development Environment Setup
Required Tools
# 1. Node.js & npm
node --version # v18+
npm --version # v9+
# 2. Install dependencies
npm install
# Package.json dependencies:
{
"dependencies": {
"lunr": "^2.3.9", # Search engine
"idb": "^7.1.1" # IndexedDB wrapper
},
"devDependencies": {
"terser": "^5.19.0", # JS minifier
"cssnano": "^6.0.1", # CSS minifier
"eslint": "^8.45.0", # Linting
"web-ext": "^7.6.2" # Extension dev tools
}
}
# 3. Chrome Extension CLI (optional)
npm install -g web-ext
# 4. AWS CLI (for Lambda deployment)
pip install awscli
aws configure
Local Development Workflow
# 1. Start development server
npm run dev
# This watches for file changes and:
# - Rebuilds extension
# - Auto-reloads in Chrome
# - Runs linter
# 2. Load extension in Chrome
# chrome://extensions/ → Enable Developer Mode → Load
unpacked
# 3. Make changes, see live updates
# 4. Debug
# Right-click extension icon → Inspect popup
# Or check chrome://serviceworker-internals for service
worker logs
🔄 Migration Strategy (Future Schema Changes)
Database Versioning
// Handle schema migrations
async function openDatabase() {
return new Promise((resolve, reject) => {
const request = indexedDB.open('snooshelf', 2); //
Version 2
request.onupgradeneeded = (event) => {
const db = event.target.result;
const oldVersion = event.oldVersion;
// Migration from v1 to v2
if (oldVersion < 2) {
// Add new index to 'saves' store
const savesStore =
event.target.transaction.objectStore('saves');
if (!savesStore.indexNames.contains('author')) {
savesStore.createIndex('author', 'author',
{ unique: false });
}
console.log('Migrated database from v1 to v2');
// Future migrations
if (oldVersion < 3) {
// Add new object store, etc.
}
}
};
request.onsuccess = () => resolve(request.result);
request.onerror = () => reject(request.error);
});
}
Data Export/Import (Backup & Restore)
// Export all data for backup
async function exportFullBackup() {
const backup = {
version: '1.0',
timestamp: Date.now(),
saves: await StorageManager.getAllSaves(),
tags: await StorageManager.getAllTags(),
folders: await StorageManager.getAllFolders(),
settings: await chrome.storage.local.get()
};
const json = JSON.stringify(backup);
const blob = new Blob([json], { type: 'application/
json' });
const url = URL.createObjectURL(blob);
// Download file
chrome.downloads.download({
url,
filename: `snooshelf-backup-${Date.now()}.json`,
saveAs: true
});
}
// Import from backup
async function importFromBackup(file) {
const text = await file.text();
const backup = JSON.parse(text);
// Validate backup format
if (backup.version !== '1.0') {
throw new Error('Unsupported backup version');
}
// Clear existing data
await StorageManager.clearAllData();
// Import saves
for (const save of backup.saves) {
await StorageManager.addSave(save);
}
// Import tags
for (const tag of backup.tags) {
await StorageManager.addTag(tag);
}
// Import folders
for (const folder of backup.folders) {
await StorageManager.addFolder(folder);
}
// Import settings
await chrome.storage.local.set(backup.settings);
// Rebuild search index
await SearchEngine.rebuildIndex();
UI.showSuccess(`Imported ${backup.saves.length} saves from
backup`);
}
🚀 Scaling Considerations (Post-MVP)
When User Base Grows
At 1,000 users:
• Current architecture handles fine
• AWS Lambda free tier sufficient
• No infrastructure changes needed
At 10,000 users:
• May need DynamoDB (license storage)
• Cost: ~$50/month total
• Still profitable at $4.99/user
At 100,000 users:
• Consider CDN for static assets
• Add Redis for license caching
• Multiple Lambda regions (latency)
• Cost: ~$500/month
• Revenue: ~$40,000/month (8% conversion)
Future Architecture Enhancements
┌─────────────────────────────────────────┐ │ Chrome Extension (No changes) │ └────────────────┬────────────────────────┘ │
▼
┌─────────────────────────────────────────┐ │ CDN (CloudFront) │
│ • Static assets │
│ • Landing page │ └────────────────┬────────────────────────┘ │
▼
┌─────────────────────────────────────────┐ │ API Gateway + Lambda (Multi-region) │
│ • US-East-1 (primary) │
│ • EU-West-1 (Europe users) │
│ • AP-Southeast-1 (Asia users) │ └────────────────┬────────────────────────┘ │
▼
┌─────────────────────────────────────────┐ │ ElastiCache (Redis) │
│ • License key caching (5 min TTL) │
│ • Rate limit tracking │ └────────────────┬────────────────────────┘ │
▼
┌─────────────────────────────────────────┐ │ DynamoDB (Global Tables) │
│ • Multi-region replication │
│ • Auto-scaling enabled │ └─────────────────────────────────────────┘
📊 Monitoring & Observability
Key Metrics to Track
// Extension health metrics
const metrics = {
// Performance
avgLoadTime: 0, // Popup load time
avgSearchTime: 0, // Search latency
avgSyncTime: 0, // Sync duration
// Usage
dailyActiveUsers: 0,
savesPerUser: 0,
searchesPerDay: 0,
// Business
conversionRate: 0, // Free → Pro
churnRate: 0, // Monthly cancellations
mrr: 0, // Monthly recurring revenue
// Errors
crashRate: 0, // % of sessions with crash
apiErrorRate: 0, // Failed API calls
syncFailRate: 0 // Failed syncs
};
// Log to CloudWatch (via Lambda)
async function logMetric(metricName, value) {
await fetch('https://api.snooshelf.com/metrics', {
method: 'POST',
body: JSON.stringify({ metricName, value, timestamp:
Date.now() })
});
}
Error Reporting
// Capture and report critical errors
window.addEventListener('error', async (event) => {
const errorReport = {
message: event.error.message,
stack: event.error.stack,
version: chrome.runtime.getManifest().version,
timestamp: Date.now(),
// NO user identifiers
};
// Send to error tracking (e.g., Sentry, or custom Lambda)
await fetch('https://api.snooshelf.com/errors', {
method: 'POST',
body: JSON.stringify(errorReport)
});
console.error('[Crash Report Sent]', errorReport);
});
🔐 Security Considerations
Threat Model
Threats:
1. XSS Attack: Malicious save content executes JS
◦ Mitigation: Escape all user content, use textContent
2. Token Theft: OAuth tokens stolen from storage
◦ Mitigation: Encrypt tokens with Web Crypto API
3. MITM Attack: Intercept API calls
◦ Mitigation: HTTPS only, certificate pinning
4. Malicious Extension Update: Compromised update
◦ Mitigation: Chrome Web Store verification, code signing
5. Data Loss: Corrupted IndexedDB
◦ Mitigation: Export reminders, backup to cloud (opt-in)
Security Best Practices
// 1. Content Security Policy (in manifest.json)
{
"content_security_policy": {
"extension_pages": "script-src 'self'; object-src 'self';
style-src 'self' 'unsafe-inline'"
}
}
// 2. Sanitize URLs before opening
function openSafeUrl(url) {
const allowedDomains = ['reddit.com', 'redd.it'];
const urlObj = new URL(url);
if (!allowedDomains.some(domain =>
urlObj.hostname.endsWith(domain))) {
UI.showWarning('Cannot open untrusted URL');
return;
}
chrome.tabs.create({ url });
}
// 3. Validate all external data
function validateSave(save) {
if (typeof save.id !== 'string' || !
save.id.startsWith('t3_')) {
throw new Error('Invalid save ID');
}
if (typeof save.title !== 'string' || save.title.length >
300) {
throw new Error('Invalid title');
}
// More validation...
return true;
}
// 4. Rate limit user actions (prevent abuse)
class ActionRateLimiter {
constructor(maxActions, windowMs) {
this.maxActions = maxActions;
this.windowMs = windowMs;
this.actions = [];
}
canPerform() {
const now = Date.now();
this.actions = this.actions.filter(time => now - time <
this.windowMs);
if (this.actions.length >= this.maxActions) {
return false;
}
this.actions.push(now);
return true;
}
}
// Usage: Limit exports to 10 per hour
const exportLimiter = new ActionRateLimiter(10, 60 * 60 *
1000);
async function exportSaves() {
if (!exportLimiter.canPerform()) {
UI.showError('Export limit reached. Please wait before
exporting again.');
return;
}
// Proceed with export...
}
📱 Cross-Browser Compatibility
Browser Support (MVP)
Supported:
• ✅ Chrome (v88+, Manifest V3)
• ✅ Edge (v88+, Chromium-based)
• ✅ Brave (v1.30+)
Not Supported (MVP):
• ❌ Firefox (different extension API, MV2)
• ❌ Safari (no MV3 support, different API)
• ❌ Opera (Chromium-based but not tested)
Chrome API Compatibility
// Check for API availability
if (chrome.storage && chrome.storage.local) {
// Use chrome.storage
} else {
console.error('Chrome storage API not available');
}
// Polyfill for missing APIs (if needed)
if (!chrome.action) {
// Fallback to chrome.browserAction (MV2)
chrome.action = chrome.browserAction;
}
🎯 Success Metrics & KPIs
Technical KPIs
const technicalKPIs = {
// Performance
popupLoadTime: { target: 500, current: 0, unit: 'ms' },
searchLatency: { target: 100, current: 0, unit: 'ms' },
syncSpeed: { target: 30, current: 0, unit: 'seconds for 1k
saves' },
// Reliability
crashRate: { target: 0.1, current: 0, unit: '%' },
syncSuccessRate: { target: 99, current: 0, unit: '%' },
uptime: { target: 99.9, current: 0, unit: '%' },
// Scale
'saves' },
save' },
saves' }
};
maxSavesSupported: { target: 50000, current: 0, unit:
storageEfficiency: { target: 2, current: 0, unit: 'KB per
memoryUsage: { target: 100, current: 0, unit: 'MB for 10k
Business KPIs
const businessKPIs = {
// Growth
weeklyInstalls: { target: 500, current: 0 },
dailyActiveUsers: { target: 200, current: 0 },
retention30Day: { target: 60, current: 0, unit: '%' },
// Revenue
conversionRate: { target: 8, current: 0, unit: '%' },
mrr: { target: 800, current: 0, unit: 'USD' },
churnRate: { target: 12, current: 0, unit: '%' },
ltv: { target: 90, current: 0, unit: 'USD' },
// Quality
chromeStoreRating: { target: 4.5, current: 0, unit: 'stars'
},
supportTickets: { target: 5, current: 0, unit: 'per
week' },
bugReports: { target: 2, current: 0, unit: 'per week' }
};
🔄 Continuous Integration/Deployment (Future)
CI/CD Pipeline
# .github/workflows/deploy.yml
name: Deploy Extension
on:
push:
branches: [main]
tags: ['v*']
jobs:
test:
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
with:
node-version: 18
- run: npm install
- run: npm run lint
- run: npm run test
build:
needs: test
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
- run: npm install
- run: npm run build
- uses: actions/upload-artifact@v3
with:
name: extension
path: dist/snooshelf.zip
deploy:
needs: build
runs-on: ubuntu-latest
if: startsWith(github.ref, 'refs/tags/v')
steps:
- uses: actions/download-artifact@v3
with:
name: extension
- name: Upload to Chrome Web Store
uses: mnao305/chrome-extension-upload@v4.0.1
with:
file-path: snooshelf.zip
extension-id: ${{ secrets.CHROME_EXTENSION_ID }}
client-id: ${{ secrets.CHROME_CLIENT_ID }}
client-secret: ${{ secrets.CHROME_CLIENT_SECRET }}
refresh-token: ${{ secrets.CHROME_REFRESH_TOKEN }}
📚 Architecture Decisions Record (ADR)
ADR 001: Local-First Architecture
Status: Accepted
Date: October 2025
Context:
Need to store unlimited Reddit saves while minimizing infrastructure costs and maximizing privacy.
Decision:
Use IndexedDB (browser storage) instead of cloud database.
Consequences:
• ✅ 98% cost reduction vs cloud storage
• ✅ Complete privacy (data never leaves browser)
• ✅ Instant offline access
• ❌ No cross-device sync (MVP limitation)
• ❌ Data loss if browser cache cleared (mitigated with export)
ADR 002: Lunr.js for Search
Status: Accepted
Date: October 2025
Context:
Need full-text search without server-side processing.
Decision:
Use Lunr.js client-side search library.
Consequences:
• ✅ <100ms search latency
• ✅ Works completely offline
• ✅ No API costs
• ❌ Limited to boolean search (no fuzzy matching)
• ❌ Index size ~10% of data size
ADR 003: Minimal Backend (AWS Lambda)
Status: Accepted
Date: October 2025
Context:
Need OAuth token exchange but want to minimize infrastructure.
Decision:
Use AWS Lambda serverless functions only for OAuth and license validation.
Consequences:
• ✅ <$20/month infrastructure cost
• ✅ Auto-scaling
• ✅ No server management
• ❌ Cold start latency (~500ms)
• ❌ Limited to 15-minute execution time (not an issue for our use case)
🎓 Learning Resources & References
Key Documentation
1. Chrome Extensions:
◦ https://developer.chrome.com/docs/extensions/mv3/
◦ Manifest V3 migration guide
◦ Service worker best practices
2. IndexedDB:
◦ https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
◦ IDB library docs: https://github.com/jakearchibald/idb
3. Lunr.js:
◦ https://lunrjs.com/
◦ Search query syntax
◦ Index customization
4. Reddit API:
◦ https://www.reddit.com/dev/api
◦ OAuth 2.0 flow
◦ Rate limits
5. Stripe:
◦ https://stripe.com/docs/payments/checkout
◦ Webhook handling
◦ Subscription management
🏁 Conclusion
This architecture document defines the complete technical blueprint for SnooShelf. The local-first
approach minimizes costs while maximizing privacy and performance.
Key Architecture Highlights:
1. 2. 3. 4. Privacy-First: 100% local storage, zero data collection
Cost-Optimized: <$20/month infrastructure at scale
Performance: <500ms load, <100ms search
Scalable: Handles 50,000+ saves per user
5. Next Steps:
Secure: Encrypted tokens, XSS prevention, HTTPS only
1. ✅ Review architecture document
2. ⏭ Create database schema document (detailed IndexedDB structure)
3. ⏭ Create API integration guide (Reddit + Stripe specifics)
4. ⏭ Create UI component library (reusable patterns)
5. ⏭ Begin development (Week 1, Day 1)
Document Version: 1.0
Last Updated: October 2025
Next Review: After MVP launch
Related Documents:
• Product Requirements Document (PRD)
• .cursorrules (Development Standards)
• Database Schema (to be created)
• API Integration Guide (to be created)
• UI Component Library (to be created)# SnooShelf - Technical Architecture Document
Version: 1.0
Last Updated: October 2025
Status: Pre-Development
📋 Document Purpose
This document defines the technical architecture for SnooShelf, a local-first Chrome extension for
managing unlimited Reddit saves. It covers system design, data flows, component interactions,
storage strategies, and deployment architecture.
🏗 System Architecture Overview
High-Level Architecture
┌────────────────────────────────────────────────────────────
─┐ │ USER
│ │ (Chrome Browser)
│ └────────────────────────────────────────────────────────────
─┘
│
▼
┌────────────────────────────────────────────────────────────
─┐ │ SNOOSHELF CHROME EXTENSION
│ │ ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐
│ │ │ Popup UI │ │ Settings │ │ Service Worker │
│ │ │ (popup.js) │ │ (settings.js)│ │ (background.js) │
│ │ └─────────────┘ └──────────────┘ └──────────────────┘
│ │ │ │ │
│ │ └─────────────────┴────────────────────┘
│ │ │
│ │ ▼
│ │ ┌──────────────────────────────────────────────────────┐
│ │ │ CORE LIBRARIES │
│ │ │ ┌──────────┐ ┌─────────┐ ┌────────────┐ ┌────────┐ │
│ │ │ │ Storage │ │ Search │ │ Reddit API │ │ Stripe │ │
│ │ │ │ Manager │ │ Engine │ │ Client │ │ Client │ │
│ │ │ └──────────┘ └─────────┘ └────────────┘ └────────┘ │
│ │ └──────────────────────────────────────────────────────┘
│ │ │
│ │ ▼
│ │ ┌──────────────────────────────────────────────────────┐
│ │ │ LOCAL STORAGE (IndexedDB) │
│ │ │ • Saves (posts) • Search Index (Lunr.js) │
│ │ │ • Tags • User Settings │
│
│ │ • Folders • Auth Tokens (encrypted) │
│ │ └──────────────────────────────────────────────────────┘
│ └────────────────────────────────────────────────────────────
─┘
│
▼
┌────────────────────────────────────────────────────────────
─┐ │ EXTERNAL SERVICES
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│ │ │ Reddit API │ │ AWS Lambda │ │ Stripe API │
│ │ │ (OAuth + │ │ (OAuth Token │ │ (Payments) │
│ │ │ Saves API) │ │ Exchange) │ │ │
│ │ └──────────────┘ └──────────────┘ └──────────────────┘
│ └────────────────────────────────────────────────────────────
─┘
Architecture Principles
1. 2. 3. 4. 5. Local-First: All user data stored in browser, servers only for authentication/payment
Privacy by Design: Zero tracking, no analytics, no data collection
Minimal Backend: Serverless functions only (OAuth, license validation)
Offline-Capable: Works completely offline after initial sync
Performance-Optimized: <500ms load time, <100ms search latency
🔧 Component Architecture
1. Frontend Components
1.1 Popup UI (src/popup/)
Purpose: Main user interface (400×600px popup)
Responsibilities:
• Display saved posts in scrollable list
• Handle search input and display results
• Manage tag/folder UI interactions
• Trigger sync operations
• Show upgrade prompts (Free tier)
Key Files:
src/popup/
├── popup.html # Main popup structure
├── popup.js # UI logic and event handlers
├── popup.css # Styling
└── components/
├── save-card.js # Individual save display
├── search-bar.js # Search input component
└── folder-tree.js # Sidebar folder navigation
Data Flow:
User types in search
→ popup.js captures input
→ Calls SearchEngine.search(query)
→ Receives results from IndexedDB
→ Renders SaveCard components
→ User clicks save
→ Opens Reddit post in new tab
1.2 Settings Page (src/settings/)
Purpose: Configuration and account management
Responsibilities:
• Display Reddit account connection status
• Manage sync settings (auto-sync interval)
• Show storage usage (IndexedDB size)
• Handle export operations
• Manage subscription (Pro tier)
• Display Privacy Policy / Terms
Key Files:
src/settings/
├── settings.html # Settings page layout
├── settings.js # Settings logic
└── settings.css # Settings styles
1.3 Service Worker (src/background/)
Purpose: Background tasks, no UI access (Manifest V3 requirement)
Responsibilities:
• Handle Reddit OAuth flow (redirects, token exchange)
• Periodic save syncing (every 15 minutes)
• Monitor new saves (real-time detection)
• License validation (daily check)
• Badge notifications (new save count)
Key File:
src/background/
└── service-worker.js # Background script (replaces
background.html in MV3)
Important: Service workers have NO access to DOM or window object. All UI updates must use
message passing.
2. Core Libraries
2.1 Storage Manager (src/lib/storage.js)
Purpose: Abstraction layer for IndexedDB operations
API Design:
class StorageManager {
// Initialize database
static async init(): Promise<void>
// Saves
static async addSave(save: Save): Promise<void>
static async getSave(id: string): Promise<Save>
static async getAllSaves(): Promise<Save[]>
static async updateSave(id: string, updates:
Partial<Save>): Promise<void>
static async deleteSave(id: string): Promise<void>
static async getSavesBySubreddit(subreddit: string):
Promise<Save[]>
static async getSavesByTag(tag: string): Promise<Save[]>
static async getSavesByFolder(folder: string):
Promise<Save[]>
// Tags
static async addTag(tag: Tag): Promise<void>
static async getAllTags(): Promise<Tag[]>
static async renameTag(oldName: string, newName: string):
Promise<void>
static async deleteTag(name: string): Promise<void>
// Folders
static async addFolder(folder: Folder): Promise<void>
static async getAllFolders(): Promise<Folder[]>
static async renameFolder(oldName: string, newName:
string): Promise<void>
static async deleteFolder(name: string): Promise<void>
// Settings
static async getSetting(key: string): Promise<any>
static async setSetting(key: string, value: any):
Promise<void>
// Utility
static async getStorageSize(): Promise<number>
static async clearAllData(): Promise<void>
static async exportToJSON(): Promise<string>
static async importFromJSON(json: string): Promise<void>
}
Implementation Details:
• Uses IDB library wrapper for Promise-based API
• Implements connection pooling (reuse DB connection)
• Handles schema migrations (version upgrades)
• Includes error recovery (corrupted data handling)
2.2 Search Engine (src/lib/search.js)
Purpose: Full-text search using Lunr.js
API Design:
class SearchEngine {
// Build initial index from saves
static async buildIndex(saves: Save[]): Promise<void>
// Add single save to index
static async addToIndex(save: Save): Promise<void>
// Remove save from index
static async removeFromIndex(saveId: string): Promise<void>
// Search with filters
static async search(query: string, filters?:
SearchFilters): Promise<SearchResult[]>
// Get search suggestions (autocomplete)
static async getSuggestions(partial: string):
Promise<string[]>
// Rebuild entire index (for large updates)
static async rebuildIndex(): Promise<void>
// Persist index to IndexedDB
static async saveIndex(): Promise<void>
// Load index from IndexedDB
static async loadIndex(): Promise<void>
}
interface SearchFilters {
subreddit?: string
tags?: string[]
dateRange?: { start: Date, end: Date }
folder?: string
sortBy?: 'relevance' | 'date' | 'upvotes'
}
interface SearchResult {
save: Save
score: number // Relevance score from Lunr.js
matchedFields: string[] // Which fields matched (title,
content, etc.)
}
Search Algorithm:
1. User types query → "machine learning"
2. SearchEngine.search() called
3. Load Lunr.js index from IndexedDB (if not in memory)
4. Lunr.js returns matching save IDs + scores
5. Fetch full save objects from IndexedDB
6. Apply additional filters (date, tags, etc.)
7. Sort by score or date
8. Return top 100 results (pagination)
Performance Optimizations:
• Index cached in memory (rebuild only on changes)
• Debounced search (300ms delay after typing stops)
• Incremental indexing (don't rebuild entire index for 1 new save)
• Field boosting: Title (10×), Content (5×), Subreddit (3×)
2.3 Reddit API Client (src/lib/reddit-api.js)
Purpose: Interact with Reddit OAuth and Data APIs
API Design:
class RedditAPI {
// Authentication
static async authenticate(): Promise<AuthResult>
static async refreshToken(): Promise<string>
static async revokeToken(): Promise<void>
// Fetch saves
static async fetchAllSaves(): Promise<Save[]>
static async fetchSavesAfter(cursor: string):
Promise<PaginatedSaves>
// Save actions
static async savePosts(postId: string): Promise<void> //
Save on Reddit
static async unsavePost(postId: string): Promise<void> //
Unsave on Reddit
// Rate limiting
static getRateLimitStatus(): RateLimitInfo
static async waitForRateLimit(): Promise<void>
}
interface AuthResult {
accessToken: string
refreshToken: string
expiresAt: number
username: string
}
interface PaginatedSaves {
saves: Save[]
after: string | null // Cursor for next page
hasMore: boolean
}
interface RateLimitInfo {
remaining: number
resetAt: number
}
OAuth Flow (Authorization Code):
1. User clicks "Connect Reddit"
2. Extension redirects to Reddit OAuth URL:
https://www.reddit.com/api/v1/authorize?
client_id=YOUR_CLIENT_ID&
response_type=code&
state=RANDOM_STRING&
redirect_uri=https://YOUR_LAMBDA_URL/callback&
scope=history&
duration=permanent
3. User approves on Reddit
4. Reddit redirects to Lambda with auth code
5. Lambda exchanges code for access/refresh tokens
6. Lambda returns tokens to extension
7. Extension stores tokens (encrypted) in
chrome.storage.local
8. Extension can now call Reddit API
Rate Limiting:
• Reddit limit: 60 requests/minute
• SnooShelf strategy:
◦ Batch fetch (100 saves per request)
◦ Cache responses (don't re-fetch existing saves)
◦ Exponential backoff on 429 errors
◦ Client-side throttling (1 req/second max)
2.4 Stripe Client (src/lib/stripe.js)
Purpose: Handle payments and license validation
API Design:
class StripeClient {
// Create checkout session
static async createCheckout(): Promise<string> // Returns
checkout URL
// Validate license key
static async validateLicense(key: string):
Promise<LicenseStatus>
// Manage subscription
static async getSubscriptionStatus():
Promise<SubscriptionInfo>
static async cancelSubscription(): Promise<void>
static async updatePaymentMethod(): Promise<string> //
Returns portal URL
}
interface LicenseStatus {
valid: boolean
tier: 'free' | 'pro'
expiresAt: number
subscriptionId: string
}
interface SubscriptionInfo {
status: 'active' | 'canceled' | 'past_due'
currentPeriodEnd: number
cancelAtPeriodEnd: boolean
}
Payment Flow:
1. User clicks "Upgrade to Pro"
2. Extension calls StripeClient.createCheckout()
3. Backend Lambda creates Stripe Checkout Session
4. Lambda returns checkout URL
5. Extension opens URL in new tab
6. User completes payment on Stripe
7. Stripe redirects to success page (snooshelf.com/success?
session_id=X)
8. Success page calls Lambda webhook
9. Lambda validates payment, generates license key
10. Success page passes license key to extension via URL
parameter
11. Extension stores license key
12. Extension unlocks Pro features
3. Data Models
3.1 Save Object
interface Save {
id: string // Reddit post ID (e.g.,
't3_abc123')
type: 'post' | 'comment' // Content type
title: string // Post title
content: string // Post body (selftext or
comment text)
url: string // Reddit post URL
subreddit: string // Subreddit name (without
'r/')
author: string // Reddit username
score: number // Upvotes - downvotes
numComments: number // Comment count
createdAt: number // Post creation timestamp
(Unix ms)
savedAt: number // When user saved (Unix ms)
thumbnail?: string // Image thumbnail URL
tags: string[] // User-added tags
folder?: string // User-assigned folder
notes?: string // User notes (Pro feature)
}
3.2 Tag Object
interface Tag {
id: string // UUID
name: string // Tag name (unique)
color: string // Hex color (#FF4500)
createdAt: number // Creation timestamp
saveCount: number // Number of saves with this
tag
}
3.3 Folder Object
interface Folder {
id: string // UUID
name: string // Folder name (unique)
icon?: string // Emoji or icon name
createdAt: number // Creation timestamp
saveCount: number // Number of saves in folder
parent?: string // Parent folder ID (for
nesting, post-MVP)
}
3.4 Settings Object
interface Settings {
// Account
redditUsername: string
redditConnected: boolean
// Sync
autoSync: boolean
syncInterval: number // Minutes (15, 30, 60)
lastSyncAt: number // Timestamp
// UI
theme: 'light' | 'dark'
defaultView: 'all' | 'unorganized' | string // Folder ID
sortBy: 'date' | 'relevance' | 'upvotes'
// Pro
licenseKey?: string
proStatus: {
valid: boolean
tier: 'free' | 'pro'
expiresAt: number
lastChecked: number
}
// Privacy
analyticsEnabled: boolean // Opt-in only
}
💾 Storage Architecture
IndexedDB Schema
Database Name: snooshelf
Version: 1
Object Stores:
1. saves (Primary Store)
{
keyPath: 'id',
indexes: [
{ name: 'subreddit', keyPath: 'subreddit', unique:
false },
{ name: 'savedAt', keyPath: 'savedAt', unique: false },
{ name: 'tags', keyPath: 'tags', multiEntry:
true }, // Multi-entry for array
{ name: 'folder', keyPath: 'folder', unique: false },
{ name: 'author', keyPath: 'author', unique: false }
]
}
Query Examples:
// Get all saves from r/programming
const saves = await db.getAllFromIndex('saves', 'subreddit',
'programming');
// Get saves with tag "tutorial"
const saves = await db.getAllFromIndex('saves', 'tags',
'tutorial');
// Get saves in date range (cursor scan)
const range = IDBKeyRange.bound(startDate, endDate);
const cursor = await
db.transaction('saves').store.index('savedAt').openCursor(ran
ge);
2. tags
{
keyPath: 'id',
indexes: [
{ name: 'name', keyPath: 'name', unique: true } // Tag
names must be unique
}
]
3. folders
{
keyPath: 'id',
indexes: [
{ name: 'name', keyPath: 'name', unique: true }
]
4. settings
}
{
}
keyPath: 'key' // Key-value store for settings
5. searchIndex
{
keyPath: 'version', // Single record, updated on each re-
index
value: string // Serialized Lunr.js index
}
Storage Limits & Management
Browser Storage Quotas:
• Chrome: 10GB+ (dynamic based on available disk)
• IndexedDB: Unlimited with unlimitedStorage permission
• chrome.storage.local: 5MB (for settings only)
Estimated Storage Usage:
• Average save: 2KB (title, content, metadata)
• 1,000 saves: ~2MB
• 10,000 saves: ~20MB
• 50,000 saves: ~100MB
• Lunr.js index: ~10% of save data size
Storage Management:
// Check storage usage
async function getStorageSize() {
if (navigator.storage && navigator.storage.estimate) {
const estimate = await navigator.storage.estimate();
return {
usage: estimate.usage, // Bytes used
quota: estimate.quota, // Total quota
percentUsed: (estimate.usage / estimate.quota) * 100
};
}
}
// Clear old saves (if user wants to free space)
async function deleteOldSaves(olderThanDays) {
const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 *
1000);
const tx = db.transaction('saves', 'readwrite');
const index = tx.store.index('savedAt');
for await (const cursor of
index.iterate(IDBKeyRange.upperBound(cutoff))) {
await cursor.delete();
}
}
🔄 Data Flow Diagrams
Flow 1: Initial Sync (First-Time User)
┌─────────┐ │ User │
│ clicks │
│"Sync" │ └────┬────┘ │
▼
┌────────────────────┐ │ Service Worker │
│ Checks OAuth token │ └────────┬───────────┘ │
▼
┌────────┐ │ Valid? │ └───┬────┘ │ ┌────┴────┐ │ │
Yes No
│ │
│ ▼
│ ┌──────────────┐
│ │ Start OAuth │
│ │ Flow │
│ └──────────────┘
│
▼
┌──────────────────────────┐ │ Fetch saves from Reddit │
│ GET /user/me/saved │
│ (paginated, 100/request) │ └────────────┬─────────────┘ │
▼
┌──────────────────────────┐ │ For each save: │
│ 1. Check if exists in DB │
│ 2. Skip if duplicate │
│ 3. Insert new save │
│ 4. Update search index │ └────────────┬─────────────┘ │
▼
┌──────────────────────────┐ │ Show progress to user │
│ "Synced 347/1,247 saves" │ └────────────┬─────────────┘ │
▼
┌──────────────────────────┐ │ Complete! │
│ Display all saves in UI │ └──────────────────────────┘
Flow 2: Real-Time Search
┌─────────┐ │ User │
│ types │
│ "react" │ └────┬────┘ │
▼
┌──────────────────┐ │ Debounce 300ms │
│ (wait for pause) │ └────────┬─────────┘ │
▼
┌──────────────────────┐ │ SearchEngine.search()│ └────────┬─────────────┘ │
▼
┌──────────────────────────────┐ │ Load Lunr.js index from │
│ IndexedDB (if not in memory) │ └────────────┬─────────────────┘ │
▼
┌──────────────────────────────┐ │ Lunr.js searches index │
│ Returns: [ │
│ { ref: 't3_abc', score: 3 }│
│ { ref: 't3_def', score: 2 }│
│ ] │ └────────────┬─────────────────┘ │
▼
┌──────────────────────────────┐ │ Fetch full save objects │
│ from IndexedDB by ID │ └────────────┬─────────────────┘ │
▼
┌──────────────────────────────┐ │ Apply additional filters │
│ (date range, tags, folder) │ └────────────┬─────────────────┘ │
▼
┌──────────────────────────────┐ │ Sort by relevance/date │
│ Limit to top 100 results │ └────────────┬─────────────────┘ │
▼
┌──────────────────────────────┐ │ Render in UI (<100ms total) │ └──────────────────────────────┘
Flow 3: Add Tag to Save
┌─────────┐ │ User │
│ clicks │
│ "Tag" │ └────┬────┘ │
▼
┌──────────────────┐ │ Check Pro status │ └────────┬─────────┘ │ ┌────┴────┐ │ │
Pro Free
│ │
│ ▼
│ ┌──────────────┐
│ │ Show paywall │
│ │ modal │
│ └──────────────┘
│
▼
┌──────────────────────┐ │ Show tag input modal │
│ with autocomplete │ └────────┬─────────────┘ │
▼
┌──────────────────────┐ │ User types tag name │
│ "javascript" │ └────────┬─────────────┘ │
▼
┌────────┐ │ Exists?│ └───┬────┘ │ ┌────┴────┐ │ │
Yes No
│ │
│ ▼
│ ┌────────────────┐
│ │ Create new tag │
│ │ in 'tags' store│
│ └────────────────┘
│
▼
┌──────────────────────────┐ │ Update save.tags array │
│ in IndexedDB │ └────────────┬─────────────┘ │
▼
┌──────────────────────────┐ │ Update search index │
│ (re-index this save) │ └────────────┬─────────────┘ │
▼
┌──────────────────────────┐ │ Update UI │
│ (show new tag pill) │ └──────────────────────────┘
🔐 Security Architecture
Authentication & Authorization
OAuth Token Storage:
// Encrypt tokens before storing
async function storeTokens(accessToken, refreshToken) {
const encryptedAccess = await encrypt(accessToken);
const encryptedRefresh = await encrypt(refreshToken);
await chrome.storage.local.set({
auth: {
accessToken: encryptedAccess,
refreshToken: encryptedRefresh,
expiresAt: Date.now() + (3600 * 1000) // 1 hour
}
});
}
// Encryption using Web Crypto API
async function encrypt(text) {
const encoder = new TextEncoder();
const data = encoder.encode(text);
const key = await getEncryptionKey(); // Derived from
user's Chrome profile
const iv = crypto.getRandomValues(new Uint8Array(12));
const encrypted = await crypto.subtle.encrypt(
{ name: 'AES-GCM', iv },
key,
data
);
return { encrypted: arrayBufferToBase64(encrypted), iv:
arrayBufferToBase64(iv) };
}
Token Refresh Strategy:
// Auto-refresh before expiry
async function ensureValidToken() {
const { auth } = await chrome.storage.local.get('auth');
if (Date.now() + (5 * 60 * 1000) >= auth.expiresAt) {
// Less than 5 minutes until expiry, refresh now
const newTokens = await RedditAPI.refreshToken();
await storeTokens(newTokens.accessToken,
newTokens.refreshToken);
}
return decrypt(auth.accessToken);
}
Content Security Policy
Manifest CSP:
{
"content_security_policy": {
"extension_pages": "script-src 'self'; object-src 'self'"
}
}
Implications:
• ❌ No inline <script> tags
• ❌ No eval() or new Function()
• ❌ No external scripts (except from CDN with hash)
• ✅ All JS in separate files
• ✅ Use event listeners, not inline handlers
XSS Prevention
// Always escape user-generated content
function escapeHtml(unsafe) {
return unsafe
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&#039;");
}
// Use textContent, not innerHTML for user data
element.textContent = save.title; // Safe
// element.innerHTML = save.title; // UNSAFE - XSS risk!
// Sanitize URLs before opening
function isSafeUrl(url) {
return url.startsWith('https://') ||
url.startsWith('http://');
}
if (isSafeUrl(save.url)) {
chrome.tabs.create({ url: save.url });
}
🚀 Deployment Architecture
Chrome Extension Distribution
┌─────────────────────────────────────┐ │ Developer (You) │
│ ┌─────────────────────────────┐ │
│ │ 1. Build extension │ │
│ │ 2. Zip files │ │
│ │ 3. Upload to Chrome Store │ │
│ └─────────────────────────────┘ │ └────────────────┬────────────────────┘ │
▼
┌─────────────────────────────────────┐ │ Chrome Web Store │
│ ┌─────────────────────────────┐ │
│ │ Review (1-3 days) │ │
│ │ Automated checks + manual │ │
│ └─────────────────────────────┘ │ └────────────────┬────────────────────┘ │
▼
┌─────────────────────────────────────┐
│ Public Listing │
│ ┌─────────────────────────────┐ │
│ │ Users install from store │ │
│ │ Auto-updates every 5 hours │ │
│ └─────────────────────────────┘ │ └─────────────────────────────────────┘
Backend Infrastructure (AWS)
┌─────────────────────────────────────────────┐ │ AWS Lambda Functions │
│ ┌─────────────────────────────────────┐ │
│ │ 1. oauth-handler │ │
│ │ - Exchange Reddit auth code │ │
│ │ - Return access/refresh tokens │ │
│ │ │ │
│ │ 2. validate-license │ │
│ │ - Check Stripe subscription │ │
│ │ - Return Pro status │ │
│ │ │ │
│ │ 3. create-checkout │ │
│ │ - Create Stripe session │ │
│ │ - Return checkout URL │ │
│ │ │ │
│ │ 4. stripe-webhook │ │
│ │ - Handle payment events │ │
│ │ - Generate license keys │ │
│ └─────────────────────────────────────┘ │
│ │
│ Runtime: Node.js 18.x │
│ Memory: 256MB │
│ Timeout: 10 seconds │
│ Cost: ~$5-10/month (1M requests free) │ └─────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐ │ API Gateway (REST) │
│ ┌─────────────────────────────────────┐ │
│ │ POST /oauth/callback │ │
│ │ POST /license/validate │ │
│ │ POST /checkout/create │ │
│ │ POST /webhook/stripe │ │
│ └─────────────────────────────────────┘ │
│ │
│ HTTPS only, CORS enabled │
│ Rate limiting: 100 req/min per IP │ └─────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐ │ DynamoDB (Optional, for license keys) │
│ ┌─────────────────────────────────────┐ │
│ │ Table: licenses │ │
│ │ Key: licenseKey (string) │ │
│ │ Attributes: │ │
│ │ - stripeCustomerId │ │
│ │ - tier (free/pro) │ │
│ │ - expiresAt │ │
│ │ - createdAt │ │
│ └─────────────────────────────────────┘ │
│ │
│ Cost: Free tier (25GB, 25 WCU/RCU) │ └─────────────────────────────────────────────┘
Static Hosting (Landing Page)
┌─────────────────────────────────────────────┐ │ Netlify / Vercel / Cloudflare Pages │
│ ┌─────────────────────────────────────┐ │
│ │ snooshelf.com │ │
│ │ - Landing page │ │
│ │ - Privacy Policy │ │
│ │ - Terms of Service │ │
│ │ - Success/Cancel pages │ │
│ └─────────────────────────────────────┘ │
│ │
│ Deploy: Git push to main branch │
│ CDN: Global edge network │
│ Cost: Free (hobby plan) │ └─────────────────────────────────────────────┘
📡 API Integration Architecture
Reddit API Integration
Endpoints Used:
1. OAuth Authorization
GET https://www.reddit.com/api/v1/authorize
2. Token Exchange (in Lambda, not extension)
POST https://www.reddit.com/api/v1/access_token
3. Fetch Saved Posts
GET https://oauth.reddit.com/user/me/saved
4. User Info
GET https://oauth.reddit.com/api/v1/me
Rate Limiting Strategy:
class RateLimiter {
constructor() {
this.requests = [];
this.maxRequests = 60;
this.windowMs = 60 * 1000; // 1 minute
}
async throttle() {
const now = Date.now();
// Remove requests older than window
this.requests = this.requests.filter(time => now - time <
this.windowMs);
if (this.requests.length >= this.maxRequests) {
// Wait until oldest request expires
const oldestRequest = this.requests[0];
const waitTime = this.windowMs - (now - oldestRequest);
await sleep(waitTime);
return this.throttle(); // Try again
}
this.requests.push(now);
}
}
// Usage
const rateLimiter = new RateLimiter();
async function fetchSaves() {
await rateLimiter.throttle();
const response = await fetch('https://oauth.reddit.com/
user/me/saved', {
headers: { 'Authorization': `Bearer ${token}` }
});
return response.json();
}
Pagination Handling:
async function fetchAllSaves() {
let allSaves = [];
let after = null;
do {
const url = `https://oauth.reddit.com/user/me/saved?
limit=100${after ? `&after=${after}` : ''}`;
const response = await fetch(url, {
headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
allSaves = allSaves.concat(data.data.children.map(child
=> child.data));
after = data.data.after;
// Progress update
chrome.runtime.sendMessage({
type: 'SYNC_PROGRESS',
count: allSaves.length
});
} while (after !== null);
return allSaves;
}
Stripe API Integration
Checkout Flow:
// Lambda function: create-checkout
exports.handler = async (event) => {
const stripe = require('stripe')
(process.env.STRIPE_SECRET_KEY);
const session = await stripe.checkout.sessions.create({
payment_method_types: ['card'],
line_items: [{
price: 'price_1ABC123', // Pro Monthly $4.99
quantity: 1,
}],
mode: 'subscription',
success_url: 'https://snooshelf.com/success?
session_id={CHECKOUT_SESSION_ID}',
cancel_url: 'https://snooshelf.com/cancel',
});
return {
statusCode: 200,
body: JSON.stringify({ url: session.url })
};
};
Webhook Handling:
// Lambda function: stripe-webhook
exports.handler = async (event) => {
const stripe = require('stripe')
(process.env.STRIPE_SECRET_KEY);
const sig = event.headers['stripe-signature'];
let stripeEvent;
try {
stripeEvent = stripe.webhooks.constructEvent(
event.body,
sig,
process.env.STRIPE_WEBHOOK_SECRET
);
} catch (err) {
return { statusCode: 400, body: 'Webhook signature
verification failed' };
}
// Handle different event types
switch (stripeEvent.type) {
case 'checkout.session.completed':
const session = stripeEvent.data.object;
await createLicense(session.customer,
session.subscription);
break;
case 'customer.subscription.deleted':
const subscription = stripeEvent.data.object;
await revokeLicense(subscription.customer);
break;
case 'invoice.payment_failed':
// Handle failed payment (notify user)
break;
}
return { statusCode: 200, body: 'Success' };
};
async function createLicense(customerId, subscriptionId) {
const licenseKey = generateLicenseKey(); // UUID v4
await dynamoDB.put({
TableName: 'licenses',
Item: {
licenseKey,
stripeCustomerId: customerId,
stripeSubscriptionId: subscriptionId,
tier: 'pro',
expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), //
30 days
createdAt: Date.now()
}
});
return licenseKey;
}
🔄 State Management
Application State (In-Memory)
// Simple state management without framework
class AppState {
constructor() {
this.state = {
// Auth
isAuthenticated: false,
username: null,
// Data
saves: [],
tags: [],
folders: [],
// UI
currentView: 'all',
searchQuery: '',
selectedFolder: null,
selectedTags: [],
// Settings
settings: {},
// Subscription
isPro: false,
licenseStatus: null,
// Sync
isSyncing: false,
lastSyncAt: null,
syncProgress: 0
};
this.listeners = new Map();
}
// Get state
get(key) {
return this.state[key];
}
// Set state and notify listeners
set(key, value) {
this.state[key] = value;
this.notify(key, value);
}
// Subscribe to state changes
subscribe(key, callback) {
if (!this.listeners.has(key)) {
this.listeners.set(key, []);
}
this.listeners.get(key).push(callback);
// Return unsubscribe function
return () => {
const callbacks = this.listeners.get(key);
const index = callbacks.indexOf(callback);
if (index > -1) callbacks.splice(index, 1);
};
}
// Notify listeners
notify(key, value) {
const callbacks = this.listeners.get(key) || [];
callbacks.forEach(cb => cb(value));
}
// Batch updates (for performance)
batch(updates) {
Object.entries(updates).forEach(([key, value]) => {
this.state[key] = value;
});
Object.entries(updates).forEach(([key, value]) => {
this.notify(key, value);
});
}
}
// Singleton instance
const appState = new AppState();
// Usage in components
appState.subscribe('saves', (saves) => {
renderSavesList(saves);
});
appState.set('saves', newSaves); // Triggers render
Persistence Strategy
// Sync state to storage on changes
appState.subscribe('settings', async (settings) => {
await chrome.storage.local.set({ settings });
});
// Load state on startup
async function initializeState() {
const { settings } = await
chrome.storage.local.get('settings');
appState.set('settings', settings || {});
const saves = await StorageManager.getAllSaves();
appState.set('saves', saves);
const tags = await StorageManager.getAllTags();
appState.set('tags', tags);
const folders = await StorageManager.getAllFolders();
appState.set('folders', folders);
}
📊 Performance Optimization Strategy
1. Initial Load Performance
Target: Popup opens in <500ms
Optimizations:
// Lazy load search index
let searchIndexLoaded = false;
async function ensureSearchIndexLoaded() {
if (searchIndexLoaded) return;
await SearchEngine.loadIndex();
searchIndexLoaded = true;
}
// Only load when user searches
searchInput.addEventListener('focus', async () => {
await ensureSearchIndexLoaded();
});
// Virtualize long lists (only render visible items)
class VirtualList {
constructor(container, items, renderItem) {
this.container = container;
this.items = items;
this.renderItem = renderItem;
this.itemHeight = 80; // px
this.visibleCount = Math.ceil(container.clientHeight /
this.itemHeight);
this.scrollTop = 0;
this.render();
container.addEventListener('scroll', () =>
this.onScroll());
}
render() {
const startIndex = Math.floor(this.scrollTop /
this.itemHeight);
const endIndex = Math.min(startIndex + this.visibleCount
+ 1, this.items.length);
this.container.innerHTML = '';
this.container.style.height = `${this.items.length *
this.itemHeight}px`;
const fragment = document.createDocumentFragment();
for (let i = startIndex; i < endIndex; i++) {
const item = this.renderItem(this.items[i]);
item.style.position = 'absolute';
item.style.top = `${i * this.itemHeight}px`;
fragment.appendChild(item);
}
this.container.appendChild(fragment);
}
onScroll() {
this.scrollTop = this.container.scrollTop;
this.render();
}
}
// Usage
const virtualList = new VirtualList(
document.getElementById('saves-list'),
saves,
(save) => createSaveCard(save)
);
2. Search Performance
Target: <100ms for 10,000 saves
Optimizations:
// Debounce search input
const debouncedSearch = debounce(async (query) => {
const results = await SearchEngine.search(query);
renderResults(results);
}, 300);
// Incremental indexing (don't rebuild entire index)
class IncrementalSearchIndex {
async addSave(save) {
// Add to Lunr.js index without rebuilding
this.index.add({
id: save.id,
title: save.title,
content: save.content,
subreddit: save.subreddit
});
// Persist index every 10 additions (batch)
this.pendingUpdates++;
if (this.pendingUpdates >= 10) {
await this.saveIndex();
this.pendingUpdates = 0;
}
}
async removeSave(saveId) {
this.index.remove({ id: saveId });
await this.saveIndex();
}
}
// Cache search results (memoization)
const searchCache = new Map();
async function cachedSearch(query, filters) {
const cacheKey = JSON.stringify({ query, filters });
if (searchCache.has(cacheKey)) {
return searchCache.get(cacheKey);
}
const results = await SearchEngine.search(query, filters);
searchCache.set(cacheKey, results);
// Limit cache size
if (searchCache.size > 100) {
const firstKey = searchCache.keys().next().value;
searchCache.delete(firstKey);
}
return results;
}
3. Memory Management
Target: <100MB for 10,000 saves
Optimizations:
// Don't load all saves into memory
// Use IndexedDB cursors for pagination
async function loadSavesPaginated(page = 0, pageSize = 50) {
const offset = page * pageSize;
const saves = [];
const tx = db.transaction('saves', 'readonly');
const cursor = await tx.store.openCursor();
let skipped = 0;
let count = 0;
while (cursor) {
if (skipped < offset) {
skipped++;
cursor.continue();
continue;
}
if (count >= pageSize) break;
saves.push(cursor.value);
count++;
cursor.continue();
}
return saves;
}
// Clear unused data from memory
function clearMemoryCache() {
searchCache.clear();
searchIndexLoaded = false;
// Force garbage collection (if possible)
if (global.gc) global.gc();
}
// Run cleanup on tab close
window.addEventListener('beforeunload', () => {
clearMemoryCache();
});
4. Network Performance
Optimizations:
// Batch API requests
async function batchFetchSaves(saveIds) {
// Reddit API doesn't support batch fetch
// So we cache aggressively to avoid re-fetching
const uncachedIds = saveIds.filter(id => !cache.has(id));
if (uncachedIds.length === 0) {
return saveIds.map(id => cache.get(id));
}
// Fetch only uncached saves
const saves = await Promise.all(
uncachedIds.map(id => RedditAPI.fetchSave(id))
);
// Update cache
saves.forEach(save => cache.set(save.id, save));
return saveIds.map(id => cache.get(id));
}
// Retry with exponential backoff
async function fetchWithRetry(fn, maxRetries = 3) {
for (let i = 0; i < maxRetries; i++) {
try {
return await fn();
} catch (error) {
if (i === maxRetries - 1) throw error;
const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
await sleep(delay);
}
}
}
🧪 Testing Strategy
Unit Testing (Future)
// Example test for StorageManager
describe('StorageManager', () => {
beforeEach(async () => {
await StorageManager.clearAllData();
});
test('should add save to IndexedDB', async () => {
const save = {
id: 't3_test123',
title: 'Test Post',
subreddit: 'test'
};
await StorageManager.addSave(save);
const retrieved = await
StorageManager.getSave('t3_test123');
expect(retrieved.title).toBe('Test Post');
});
test('should query saves by subreddit', async () => {
await StorageManager.addSave({ id: '1', subreddit: 'test'
});
await StorageManager.addSave({ id: '2', subreddit: 'test'
});
await StorageManager.addSave({ id: '3', subreddit:
'other' });
const testSaves = await
StorageManager.getSavesBySubreddit('test');
expect(testSaves.length).toBe(2);
});
});
Integration Testing
Manual Test Checklist:
1. Install extension → OAuth flow works
2. Sync 100 saves → All stored correctly
3. Search for keyword → Results appear <100ms
4. Add tag to save → Tag persists after reload
5. Export to CSV → File downloads correctly
6. Upgrade to Pro → Stripe payment succeeds
7. Offline mode → Extension works without internet
8. Browser restart → Data persists
Load Testing
// Simulate 10,000 saves
async function loadTest() {
console.time('Add 10k saves');
for (let i = 0; i < 10000; i++) {
await StorageManager.addSave({
id: `t3_${i}`,
title: `Post ${i}`,
content: 'Lorem ipsum '.repeat(50),
subreddit: `sub${i % 100}`,
savedAt: Date.now()
});
if (i % 1000 === 0) {
console.log(`Added ${i} saves`);
}
}
console.timeEnd('Add 10k saves');
// Test search performance
console.time('Search 10k saves');
const results = await SearchEngine.search('ipsum');
console.timeEnd('Search 10k saves');
console.log(`Found ${results.length} results`);
}
🚨 Error Handling & Recovery
Error Classification
class AppError extends Error {
constructor(message, type, recoverable = true) {
super(message);
this.type = type;
this.recoverable = recoverable;
}
}
// Error types
const ErrorTypes = {
NETWORK: 'network',
AUTH: 'auth',
STORAGE: 'storage',
PAYMENT: 'payment',
RATE_LIMIT: 'rate_limit',
UNKNOWN: 'unknown'
};
// Error handler
async function handleError(error) {
let appError;
if (error instanceof AppError) {
appError = error;
} else if (error.message.includes('rate limit')) {
appError = new AppError('Too many requests. Please
wait.', ErrorTypes.RATE_LIMIT);
} else if (error.message.includes('401')) {
appError = new AppError('Authentication expired. Please
reconnect.', ErrorTypes.AUTH);
} else if (!navigator.onLine) {
appError = new AppError('No internet connection.',
ErrorTypes.NETWORK);
} else {
appError = new AppError('Something went wrong.',
ErrorTypes.UNKNOWN);
}
// Log error
console.error('[Error]', appError.type, appError.message,
error);
// Show user-friendly message
UI.showError(appError.message);
// Attempt recovery
if (appError.recoverable) {
await attemptRecovery(appError);
}
}
async function attemptRecovery(error) {
switch (error.type) {
case ErrorTypes.AUTH:
// Auto-refresh token
await RedditAPI.refreshToken();
break;
case ErrorTypes.RATE_LIMIT:
// Wait and retry
await sleep(60000); // 1 minute
break;
case ErrorTypes.NETWORK:
// Queue action for when online
window.addEventListener('online', () => {
UI.showSuccess('Back online! Retrying...');
});
break;
}
}
Data Recovery
// Backup before destructive operations
async function safeDelete(saveId) {
// Backup to temp storage
const save = await StorageManager.getSave(saveId);
await chrome.storage.local.set({
lastDeleted: { save, timestamp: Date.now() }
});
// Delete
await StorageManager.deleteSave(saveId);
// Show undo option
UI.showSnackbar('Save deleted', {
action: 'Undo',
onAction: async () => {
const { lastDeleted } = await
chrome.storage.local.get('lastDeleted');
await StorageManager.addSave(lastDeleted.save);
UI.showSuccess('Save restored');
},
});
duration: 10000 // 10 seconds to undo
}
// Recover from corrupted IndexedDB
async function recoverDatabase() {
try {
await StorageManager.init();
} catch (error) {
console.error('Database corrupted, attempting
recovery...');
// Delete corrupted database
await indexedDB.deleteDatabase('snooshelf');
// Reinitialize
await StorageManager.init();
// Re-sync from Reddit
await RedditAPI.fetchAllSaves();
UI.showWarning('Database recovered. Please re-sync your
saves.');
}
}
📈 Analytics & Monitoring
Privacy-First Analytics
// Only track anonymous, aggregate metrics
class Analytics {
static async track(event, properties = {}) {
const { analyticsEnabled } = await
chrome.storage.local.get('analyticsEnabled');
if (!analyticsEnabled) return; // Respect user opt-out
// NO user identifiers (no IP, no user ID)
const anonymousData = {
event,
properties: {
...properties,
// Context (no PII)
extensionVersion:
chrome.runtime.getManifest().version,
browser: navigator.userAgent.includes('Edg') ? 'edge'
: 'chrome',
timestamp: Date.now()
}
};
// Send to simple analytics endpoint (optional)
// For MVP: Just log locally
console.log('[Analytics]', anonymousData);
}
// Usage examples
static trackSync(saveCount) {
this.track('sync_completed', { saveCount });
}
static trackSearch(resultCount) {
this.track('search_performed', { resultCount });
}
static trackUpgrade() {
this.track('upgrade_clicked');
}
}
Performance Monitoring
// Monitor critical operations
class PerformanceMonitor {
static measurements = new Map();
static start(operation) {
this.measurements.set(operation, performance.now());
}
static end(operation) {
const start = this.measurements.get(operation);
if (!start) return;
const duration = performance.now() - start;
this.measurements.delete(operation);
// Log slow operations
if (duration > 1000) {
console.warn(`[Performance] ${operation} took $
{duration.toFixed(2)}ms (slow!)`);
Analytics.track('slow_operation', { operation, duration
});
}
return duration;
}
}
// Usage
PerformanceMonitor.start('sync');
await syncSaves();
const duration = PerformanceMonitor.end('sync');
console.log(`Sync took ${duration}ms`);
🔐 Privacy Architecture Details
Data Flow - Privacy Perspective
┌─────────────────────────────────────────────┐ │ USER'S BROWSER (Everything stays here) │
│ ┌─────────────────────────────────────┐ │
│ │ IndexedDB (Local Storage) │ │
│ │ • All saved posts │ │
│ │ • Search index │ │
│ │ • Tags, folders, settings │ │
│ │ • Encrypted auth tokens │ │
│ └─────────────────────────────────────┘ │
│ │
│ What NEVER leaves the browser: │
│ ❌ Post content │
│ ❌ Search queries │
│ ❌ Tags/folders │
│ ❌ User preferences │
└─────────────────────────────────────────────┘
│ │ (Only these 3 things leave)
▼
┌─────────────────────────────────────────────┐ │ EXTERNAL SERVERS │
│ ┌─────────────────────────────────────┐ │
│ │ Reddit: │ │
│ │ ✅ Access token (encrypted) │ │
│ │ │ │
│ │ SnooShelf Lambda: │ │
│ │ ✅ License key (for validation) │ │
│ │ │ │
│ │ Stripe: │ │
│ │ ✅ Payment info (PCI compliant) │ │
│ └─────────────────────────────────────┘ │ └─────────────────────────────────────────────┘
Privacy Policy Requirements
What to include in Privacy Policy:
1. 2. 3. 4. 5. Data Collection: "We only collect your Reddit username and email (for billing)"
Local Storage: "All saves stored in your browser, never on our servers"
Third Parties: "Reddit (for authentication), Stripe (for payments)"
Analytics: "Optional anonymous usage stats (opt-in)"
Data Deletion: "Uninstall extension = all data deleted automatically"
🔄 Sync Strategy
Background Sync Architecture
// Service Worker: Periodic sync
chrome.alarms.create('autoSync', { periodInMinutes: 15 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
if (alarm.name === 'autoSync') {
const { autoSync } = await
chrome.storage.local.get('autoSync');
if (autoSync) {
await performIncrementalSync();
}
}
});
async function performIncrementalSync() {
const { lastSyncAt } = await
chrome.storage.local.get('lastSyncAt');
// Fetch only new saves since last sync
const newSaves = await
RedditAPI.fetchSavesAfter(lastSyncAt);
// Add to IndexedDB
for (const save of newSaves) {
await StorageManager.addSave(save);
await SearchEngine.addToIndex(save);
}
// Update last sync timestamp
await chrome.storage.local.set({ lastSyncAt: Date.now() });
// Badge notification
if (newSaves.length > 0) {
chrome.action.setBadgeText({ text: `+${newSaves.length}
` });
chrome.action.setBadgeBackgroundColor({ color:
'#FF4500' });
}
}
Conflict Resolution
// If user saves/unsaves while offline
class SyncQueue {
static queue = [];
static async addToQueue(action) {
this.queue.push({ action, timestamp: Date.now() });
await chrome.storage.local.set({ syncQueue:
this.queue });
}
static async processQueue() {
const { syncQueue } = await
chrome.storage.local.get('syncQueue');
this.queue = syncQueue || [];
for (const item of this.queue) {
try {
await this.processAction(item.action);
} catch (error) {
console.error('Failed to sync action:', item, error);
}
}
// Clear queue
this.queue = [];
await chrome.storage.local.set({ syncQueue: [] });
}
static async processAction(action) {
switch (action.type) {
case 'SAVE':
await RedditAPI.savePost(action.postId);
break;
case 'UNSAVE':
await RedditAPI.unsavePost(action.postId);
break;
}
}
}
// Run on network reconnect
window.addEventListener('online', async () => {
await SyncQueue.processQueue();
await performIncrementalSync();
});
📦 Build & Deployment Process
Build Pipeline
# 1. Development
npm run dev # Watch mode, auto-reload
# 2. Production Build
npm run build # Minify, optimize
├── Minify JS (Terser)
├── Minify CSS (cssnano)
├── Optimize images
├── Generate manifest.json
└── Create .zip for Chrome Store
# 3. Version Bump
npm version patch # 1.0.0 → 1.0.1
npm version minor # 1.0.0 → 1.1.0
npm version major # 1.0.0 → 2.0.0
# 4. Deploy to Chrome Web Store
npm run deploy # Upload .zip to Chrome Store
Deployment Checklist
## Pre-Deployment
- [ ] All tests pass
- [ ] No console errors
- [ ] Load tested with 10,000 saves
- [ ] Privacy Policy updated
- [ ] Version bumped in manifest.json
- [ ] Changelog updated
## Chrome Web Store Submission
- [ ] Build production .zip
- [ ] Update store listing (if changed)
- [ ] Upload screenshots (1280×800 or 640×400)
- [ ] Set pricing (Free with IAP)
- [ ] Submit for review
## Post-Deployment
- [ ] Monitor error reports (Chrome Web Store dashboard)
- [ ] Check analytics for issues
- [ ] Respond to user reviews
- [ ] Plan next version features
🔧 Development Environment Setup
Required Tools
# 1. Node.js & npm
node --version # v18+
npm --version # v9+
# 2. Install dependencies
npm install
# Package.json dependencies:
{
"dependencies": {
"lunr": "^2.3.9", # Search engine
"idb": "^7.1.1" # IndexedDB wrapper
},
"devDependencies": {
"terser": "^5.19.0", # JS minifier
"cssnano": "^6.0.1", # CSS minifier
"eslint": "^8.45.0", # Linting
"web-ext": "^7.6.2" # Extension dev tools
}
}
# 3. Chrome Extension CLI (optional)
npm install -g web-ext
# 4. AWS CLI (for Lambda deployment)
pip install awscli
aws configure
Local Development Workflow
# 1. Start development server
npm run dev
# This watches for file changes and:
# - Rebuilds extension
# - Auto-reloads in Chrome
# - Runs linter
# 2. Load extension in Chrome
# chrome://extensions/ → Enable Developer Mode → Load
unpacked
# 3. Make changes, see live updates
# 4. Debug
# Right-click extension icon → Inspect popup
# Or check chrome://serviceworker-internals for service
worker logs
🔄 Migration Strategy (Future Schema Changes)
Database Versioning
// Handle schema migrations
async function openDatabase() {
return new Promise((resolve, reject) => {
const request = indexedDB.open('snooshelf', 2); //
Version 2
request.onupgradeneeded = (event) => {
const db = event.target.result;
const oldVersion = event.oldVersion;
// Migration from v1 to v2
if (oldVersion < 2) {
// Add new index to 'saves' store
const savesStore =
event.target.transaction.objectStore('saves');
if (!savesStore.indexNames.contains('author')) {
savesStore.createIndex('author', 'author',
{ unique: false });
}
console.log('Migrated database from v1 to v2');
// Future migrations
if (oldVersion < 3) {
// Add new object store, etc.
}
}
};
request.onsuccess = () => resolve(request.result);
request.onerror = () => reject(request.error);
});
}
Data Export/Import (Backup & Restore)
// Export all data for backup
async function exportFullBackup() {
const backup = {
version: '1.0',
timestamp: Date.now(),
saves: await StorageManager.getAllSaves(),
tags: await StorageManager.getAllTags(),
folders: await StorageManager.getAllFolders(),
settings: await chrome.storage.local.get()
};
const json = JSON.stringify(backup);
const blob = new Blob([json], { type: 'application/
json' });
const url = URL.createObjectURL(blob);
// Download file
chrome.downloads.download({
url,
filename: `snooshelf-backup-${Date.now()}.json`,
saveAs: true
});
}
// Import from backup
async function importFromBackup(file) {
const text = await file.text();
const backup = JSON.parse(text);
// Validate backup format
if (backup.version !== '1.0') {
throw new Error('Unsupported backup version');
}
// Clear existing data
await StorageManager.clearAllData();
// Import saves
for (const save of backup.saves) {
await StorageManager.addSave(save);
}
// Import tags
for (const tag of backup.tags) {
await StorageManager.addTag(tag);
}
// Import folders
for (const folder of backup.folders) {
await StorageManager.addFolder(folder);
}
// Import settings
await chrome.storage.local.set(backup.settings);
// Rebuild search index
await SearchEngine.rebuildIndex();
UI.showSuccess(`Imported ${backup.saves.length} saves from
backup`);
}
🚀 Scaling Considerations (Post-MVP)
When User Base Grows
At 1,000 users:
• Current architecture handles fine
• AWS Lambda free tier sufficient
• No infrastructure changes needed
At 10,000 users:
• May need DynamoDB (license storage)
• Cost: ~$50/month total
• Still profitable at $4.99/user
At 100,000 users:
• Consider CDN for static assets
• Add Redis for license caching
• Multiple Lambda regions (latency)
• Cost: ~$500/month
• Revenue: ~$40,000/month (8% conversion)
Future Architecture Enhancements
┌─────────────────────────────────────────┐ │ Chrome Extension (No changes) │ └────────────────┬────────────────────────┘ │
▼
┌─────────────────────────────────────────┐ │ CDN (CloudFront) │
│ • Static assets │
│ • Landing page │ └────────────────┬────────────────────────┘ │
▼
┌─────────────────────────────────────────┐ │ API Gateway + Lambda (Multi-region) │
│ • US-East-1 (primary) │
│ • EU-West-1 (Europe users) │
│ • AP-Southeast-1 (Asia users) │ └────────────────┬────────────────────────┘ │
▼
┌─────────────────────────────────────────┐ │ ElastiCache (Redis) │
│ • License key caching (5 min TTL) │
│ • Rate limit tracking │ └────────────────┬────────────────────────┘ │
▼
┌─────────────────────────────────────────┐ │ DynamoDB (Global Tables) │
│ • Multi-region replication │
│ • Auto-scaling enabled │ └─────────────────────────────────────────┘
📊 Monitoring & Observability
Key Metrics to Track
// Extension health metrics
const metrics = {
// Performance
avgLoadTime: 0, // Popup load time
avgSearchTime: 0, // Search latency
avgSyncTime: 0, // Sync duration
// Usage
dailyActiveUsers: 0,
savesPerUser: 0,
searchesPerDay: 0,
// Business
conversionRate: 0, // Free → Pro
churnRate: 0, // Monthly cancellations
mrr: 0, // Monthly recurring revenue
// Errors
crashRate: 0, // % of sessions with crash
apiErrorRate: 0, // Failed API calls
syncFailRate: 0 // Failed syncs
};
// Log to CloudWatch (via Lambda)
async function logMetric(metricName, value) {
await fetch('https://api.snooshelf.com/metrics', {
method: 'POST',
body: JSON.stringify({ metricName, value, timestamp:
Date.now() })
});
}
Error Reporting
// Capture and report critical errors
window.addEventListener('error', async (event) => {
const errorReport = {
message: event.error.message,
stack: event.error.stack,
version: chrome.runtime.getManifest().version,
timestamp: Date.now(),
// NO user identifiers
};
// Send to error tracking (e.g., Sentry, or custom Lambda)
await fetch('https://api.snooshelf.com/errors', {
method: 'POST',
body: JSON.stringify(errorReport)
});
console.error('[Crash Report Sent]', errorReport);
});
🔐 Security Considerations
Threat Model
Threats:
1. XSS Attack: Malicious save content executes JS
◦ Mitigation: Escape all user content, use textContent
2. Token Theft: OAuth tokens stolen from storage
◦ Mitigation: Encrypt tokens with Web Crypto API
3. MITM Attack: Intercept API calls
◦ Mitigation: HTTPS only, certificate pinning
4. Malicious Extension Update: Compromised update
◦ Mitigation: Chrome Web Store verification, code signing
5. Data Loss: Corrupted IndexedDB
◦ Mitigation: Export reminders, backup to cloud (opt-in)
Security Best Practices
// 1. Content Security Policy (in manifest.json)
{
"content_security_policy": {
"extension_pages": "script-src 'self'; object-src 'self';
style-src 'self' 'unsafe-inline'"
}
}
// 2. Sanitize URLs before opening
function openSafeUrl(url) {
const allowedDomains = ['reddit.com', 'redd.it'];
const urlObj = new URL(url);
if (!allowedDomains.some(domain =>
urlObj.hostname.endsWith(domain))) {
UI.showWarning('Cannot open untrusted URL');
return;
}
chrome.tabs.create({ url });
}
// 3. Validate all external data
function validateSave(save) {
if (typeof save.id !== 'string' || !
save.id.startsWith('t3_')) {
throw new Error('Invalid save ID');
}
if (typeof save.title !== 'string' || save.title.length >
300) {
throw new Error('Invalid title');
}
// More validation...
return true;
}
// 4. Rate limit user actions (prevent abuse)
class ActionRateLimiter {
constructor(maxActions, windowMs) {
this.maxActions = maxActions;
this.windowMs = windowMs;
this.actions = [];
}
canPerform() {
const now = Date.now();
this.actions = this.actions.filter(time => now - time <
this.windowMs);
if (this.actions.length >= this.maxActions) {
return false;
}
this.actions.push(now);
return true;
}
}
// Usage: Limit exports to 10 per hour
const exportLimiter = new ActionRateLimiter(10, 60 * 60 *
1000);
async function exportSaves() {
if (!exportLimiter.canPerform()) {
UI.showError('Export limit reached. Please wait before
exporting again.');
return;
}
// Proceed with export...
}
📱 Cross-Browser Compatibility
Browser Support (MVP)
Supported:
• ✅ Chrome (v88+, Manifest V3)
• ✅ Edge (v88+, Chromium-based)
• ✅ Brave (v1.30+)
Not Supported (MVP):
• ❌ Firefox (different extension API, MV2)
• ❌ Safari (no MV3 support, different API)
• ❌ Opera (Chromium-based but not tested)
Chrome API Compatibility
// Check for API availability
if (chrome.storage && chrome.storage.local) {
// Use chrome.storage
} else {
console.error('Chrome storage API not available');
}
// Polyfill for missing APIs (if needed)
if (!chrome.action) {
// Fallback to chrome.browserAction (MV2)
chrome.action = chrome.browserAction;
}
🎯 Success Metrics & KPIs
Technical KPIs
const technicalKPIs = {
// Performance
popupLoadTime: { target: 500, current: 0, unit: 'ms' },
searchLatency: { target: 100, current: 0, unit: 'ms' },
syncSpeed: { target: 30, current: 0, unit: 'seconds for 1k
saves' },
// Reliability
crashRate: { target: 0.1, current: 0, unit: '%' },
syncSuccessRate: { target: 99, current: 0, unit: '%' },
uptime: { target: 99.9, current: 0, unit: '%' },
// Scale
'saves' },
save' },
saves' }
};
maxSavesSupported: { target: 50000, current: 0, unit:
storageEfficiency: { target: 2, current: 0, unit: 'KB per
memoryUsage: { target: 100, current: 0, unit: 'MB for 10k
Business KPIs
const businessKPIs = {
// Growth
weeklyInstalls: { target: 500, current: 0 },
dailyActiveUsers: { target: 200, current: 0 },
retention30Day: { target: 60, current: 0, unit: '%' },
// Revenue
conversionRate: { target: 8, current: 0, unit: '%' },
mrr: { target: 800, current: 0, unit: 'USD' },
churnRate: { target: 12, current: 0, unit: '%' },
ltv: { target: 90, current: 0, unit: 'USD' },
// Quality
chromeStoreRating: { target: 4.5, current: 0, unit: 'stars'
},
supportTickets: { target: 5, current: 0, unit: 'per
week' },
bugReports: { target: 2, current: 0, unit: 'per week' }
};
🔄 Continuous Integration/Deployment (Future)
CI/CD Pipeline
# .github/workflows/deploy.yml
name: Deploy Extension
on:
push:
branches: [main]
tags: ['v*']
jobs:
test:
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
with:
node-version: 18
- run: npm install
- run: npm run lint
- run: npm run test
build:
needs: test
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v3
- uses: actions/setup-node@v3
- run: npm install
- run: npm run build
- uses: actions/upload-artifact@v3
with:
name: extension
path: dist/snooshelf.zip
deploy:
needs: build
runs-on: ubuntu-latest
if: startsWith(github.ref, 'refs/tags/v')
steps:
- uses: actions/download-artifact@v3
with:
name: extension
- name: Upload to Chrome Web Store
uses: mnao305/chrome-extension-upload@v4.0.1
with:
file-path: snooshelf.zip
extension-id: ${{ secrets.CHROME_EXTENSION_ID }}
client-id: ${{ secrets.CHROME_CLIENT_ID }}
client-secret: ${{ secrets.CHROME_CLIENT_SECRET }}
refresh-token: ${{ secrets.CHROME_REFRESH_TOKEN }}
📚 Architecture Decisions Record (ADR)
ADR 001: Local-First Architecture
Status: Accepted
Date: October 2025
Context:
Need to store unlimited Reddit saves while minimizing infrastructure costs and maximizing privacy.
Decision:
Use IndexedDB (browser storage) instead of cloud database.
Consequences:
• ✅ 98% cost reduction vs cloud storage
• ✅ Complete privacy (data never leaves browser)
• ✅ Instant offline access
• ❌ No cross-device sync (MVP limitation)
• ❌ Data loss if browser cache cleared (mitigated with export)
ADR 002: Lunr.js for Search
Status: Accepted
Date: October 2025
Context:
Need full-text search without server-side processing.
Decision:
Use Lunr.js client-side search library.
Consequences:
• ✅ <100ms search latency
• ✅ Works completely offline
• ✅ No API costs
• ❌ Limited to boolean search (no fuzzy matching)
• ❌ Index size ~10% of data size
ADR 003: Minimal Backend (AWS Lambda)
Status: Accepted
Date: October 2025
Context:
Need OAuth token exchange but want to minimize infrastructure.
Decision:
Use AWS Lambda serverless functions only for OAuth and license validation.
Consequences:
• ✅ <$20/month infrastructure cost
• ✅ Auto-scaling
• ✅ No server management
• ❌ Cold start latency (~500ms)
• ❌ Limited to 15-minute execution time (not an issue for our use case)
🎓 Learning Resources & References
Key Documentation
1. Chrome Extensions:
◦ https://developer.chrome.com/docs/extensions/mv3/
◦ Manifest V3 migration guide
◦ Service worker best practices
2. IndexedDB:
◦ https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
◦ IDB library docs: https://github.com/jakearchibald/idb
3. Lunr.js:
◦ https://lunrjs.com/
◦ Search query syntax
◦ Index customization
4. Reddit API:
◦ https://www.reddit.com/dev/api
◦ OAuth 2.0 flow
◦ Rate limits
5. Stripe:
◦ https://stripe.com/docs/payments/checkout
◦ Webhook handling
◦ Subscription management
🏁 Conclusion
This architecture document defines the complete technical blueprint for SnooShelf. The local-first
approach minimizes costs while maximizing privacy and performance.
Key Architecture Highlights:
1. 2. 3. 4. Privacy-First: 100% local storage, zero data collection
Cost-Optimized: <$20/month infrastructure at scale
Performance: <500ms load, <100ms search
Scalable: Handles 50,000+ saves per user
5. Next Steps:
Secure: Encrypted tokens, XSS prevention, HTTPS only
1. ✅ Review architecture document
2. ⏭ Create database schema document (detailed IndexedDB structure)
3. ⏭ Create API integration guide (Reddit + Stripe specifics)
4. ⏭ Create UI component library (reusable patterns)
5. ⏭ Begin development (Week 1, Day 1)
Document Version: 1.0
Last Updated: October 2025
Next Review: After MVP launch
Related Documents:
• Product Requirements Document (PRD)
• .cursorrules (Development Standards)
• Database Schema (to be created)
• API Integration Guide (to be created)
• UI Component Library (to be created)
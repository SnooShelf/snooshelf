Manifest Requirements
manifest.json (Manifest V3)
{
"manifest_version": 3,
"name": "SnooShelf",
"version": "1.0.0",
"description": "Your Reddit library, organized and safe.
Unlimited saves with instant search.",
"icons": {
"16": "assets/icons/icon16.png",
"48": "assets/icons/icon48.png",
"128": "assets/icons/icon128.png"
},
"action": {
"default_popup": "src/popup/popup.html",
"default_icon": {
"16": "assets/icons/icon16.png",
"48": "assets/icons/icon48.png",
"128": "assets/icons/icon128.png"
}
},
"background": {
"service_worker": "src/background/service-worker.js",
"type": "module"
},
"permissions": [
"storage",
"unlimitedStorage",
"alarms"
],
"host_permissions": [
"https://www.reddit.com/*",
"https://oauth.reddit.com/*"
],
"content_security_policy": {
"extension_pages": "script-src 'self'; object-src 'self'"
},
"options_page": "src/settings/settings.html"
}
Permissions Explained
• storage: Chrome storage API (settings, tokens)
• unlimitedStorage: Remove IndexedDB quota (10GB+)
• alarms: Background sync (15 min intervals)
• reddit.com: OAuth access
• oauth.reddit.com: API calls
Required File Structure
snooshelf/
├── manifest.json
├── assets/icons/
│ ├── icon16.png
│ ├── icon48.png
│ └── icon128.png
├── src/
│ ├── popup/
│ │ ├── popup.html
│ │ ├── popup.js
│ │ └── popup.css
│ ├── background/
│ │ └── service-worker.js
│ └── settings/
│ ├── settings.html
│ ├── settings.js
│ └── settings.css
Chrome Web Store Requirements
• Icons: PNG format only
• 128×128 required for store listing
• Description max: 132 chars
• Name max: 45 chars
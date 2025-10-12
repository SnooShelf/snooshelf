Feature Specifications
1. Sync Saves
Initial Sync
Trigger: User clicks "Sync Saves"
Flow:
1. Progress: "Syncing... 0 saves"
2. Fetch 100 at a time
3. Store in IndexedDB
4. Update: "347/1,247"
5. Build search index
6. Complete!
Code:
async function initialSync() {
let allSaves = [], after = null;
do {
const { saves, after: next } = await
RedditAPI.fetchSaves(after);
for (const save of saves) {
await StorageManager.addSave(save);
}
allSaves = allSaves.concat(saves);
after = next;
UI.showProgress(allSaves.length);
} while (after);
await SearchEngine.buildIndex(allSaves);
await chrome.storage.local.set({ lastSyncAt: Date.now() });
}
Auto-Sync
Trigger: Every 15 min
Code:
chrome.alarms.create('autoSync', { periodInMinutes: 15 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
if (alarm.name === 'autoSync') {
const { autoSync } = await
chrome.storage.local.get('autoSync');
if (!autoSync) return;
const newSaves = await syncNewSavesOnly();
if (newSaves.length > 0) {
chrome.action.setBadgeText({ text: `+${newSaves.length}
` });
}
}
});
2. Search
Basic (Free)
Features:
• Keyword search
• Debounced 300ms
• Instant (<100ms)
• Top 100 results
Code:
searchInput.addEventListener('input', debounce(async (e) => {
const query = e.target.value.trim();
if (!query) {
displayAllSaves();
return;
}
const results = await SearchEngine.search(query);
displaySearchResults(results);
}, 300));
Advanced (Pro)
Additional:
• Filter by subreddit
• Filter by tags
• Date range
• Sort by relevance/date/score
3. Tags (Pro)
Add Tag
Trigger: Click tag icon
Code:
async function addTag(saveId, tagName) {
let tag = await StorageManager.getTagByName(tagName);
if (!tag) {
tag = {
id: crypto.randomUUID(),
name: tagName,
color: 'yellow',
createdAt: Date.now(),
saveCount: 0
};
await StorageManager.addTag(tag);
}
const save = await StorageManager.getSave(saveId);
if (!save.tags.includes(tagName)) {
save.tags.push(tagName);
await StorageManager.updateSave(saveId, save);
tag.saveCount++;
await StorageManager.updateTag(tag.id, tag);
}
await SearchEngine.updateSaveInIndex(save);
}
4. Folders (Pro)
Create Folder
Trigger: "New Folder" button
Code:
async function createFolder(name, icon = '📁 ') {
const folder = {
id: crypto.randomUUID(),
name,
icon,
createdAt: Date.now(),
saveCount: 0
};
await StorageManager.addFolder(folder);
UI.addFolderToSidebar(folder);
}
Move to Folder
Code:
async function moveSaveToFolder(saveId, folderName) {
const save = await StorageManager.getSave(saveId);
const oldFolder = save.folder;
save.folder = folderName;
await StorageManager.updateSave(saveId, save);
if (oldFolder) await decrementFolderCount(oldFolder);
await incrementFolderCount(folderName);
}
5. Export
CSV (Free)
Code:
async function exportToCSV() {
const saves = await StorageManager.getAllSaves();
const csv = [
['Title', 'URL', 'Subreddit', 'Author', 'Date', 'Tags',
'Folder'],
...saves.map(s => [
s.title,
s.url,
s.subreddit,
s.author,
new Date(s.savedAt).toISOString(),
s.tags.join(';'),
s.folder || ''
])
].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
downloadFile(`snooshelf-${Date.now()}.csv`, csv);
}
Markdown (Pro)
Format:
# SnooShelf Export
## Learning
- [Python tutorial](url) - r/programming - Oct 5
Tags: #python #tutorial
JSON (Pro)
Format:
{
"version": "1.0",
"exportDate": "2024-10-07",
"saves": [...]
}
6. Upgrade to Pro
Show Paywall
Trigger:
• Hit 1,000 limit
• Click "Add Tag" (free)
• Click "Create Folder" (free)
Code:
function showUpgradeModal() {
const modal = `
<div class="upgrade-modal">
<h2>Upgrade to Pro</h2>
<div class="comparison">
<div class="free">
<h3>Free</h3>
<ul>
<li>1,000 saves</li>
<li>Basic search</li>
<li>CSV export</li>
</ul>
</div>
<div class="pro">
<h3>Pro - $4.99/mo</h3>
<ul>
<li>✅ Unlimited saves</li>
<li>✅ Advanced search</li>
<li>✅ Tags & folders</li>
<li>✅ All exports</li>
</ul>
</div>
</div>
<button onclick="upgradeNow()">Upgrade Now</button>
</div>
`;
UI.showModal(modal);
}
async function upgradeNow() {
const url = await StripeClient.createCheckout();
chrome.tabs.create({ url });
}
7. Pro Enforcement
Check Status
Code:
async function isPro() {
const { proStatus } = await
chrome.storage.local.get('proStatus');
if (!proStatus || !proStatus.valid) return false;
if (Date.now() > proStatus.expiresAt) return false;
return proStatus.tier === 'pro';
}
Enforce Limits
Code:
async function canAddSave() {
const pro = await isPro();
if (pro) return true;
const count = await StorageManager.getSaveCount();
if (count >= 1000) {
showUpgradeModal();
return false;
}
if (count >= 950) {
UI.showWarning('Approaching 1,000 limit!');
}
return true;
}
async function canUseFeature(feature) {
const pro = await isPro();
if (!pro && ['tags', 'folders'].includes(feature)) {
showUpgradeModal();
return false;
}
return true;
}
8. Settings
Sync Settings
• Auto-sync: ON/OFF toggle
• Interval: 15/30/60 min
• Last synced: Timestamp
• Sync now: Button
Code:
document.getElementById('auto-
sync').addEventListener('change', async (e) => {
await chrome.storage.local.set({ autoSync: e.target.checked
});
if (e.target.checked) {
chrome.alarms.create('autoSync', { periodInMinutes:
15 });
} else {
chrome.alarms.clear('autoSync');
}
});
Storage Info
• Total saves: 1,247
• Storage used: 2.5 MB
• Clear cache button
Code:
async function displayStorageInfo() {
const saves = await StorageManager.getAllSaves();
const { usage } = await navigator.storage.estimate();
document.getElementById('save-count').textContent =
saves.length;
document.getElementById('storage-used').textContent =
`${(usage / 1024 / 1024).toFixed(1)} MB`;
}
Account
• Connected as: u/username
• Disconnect button
Code:
async function disconnectReddit() {
await chrome.storage.local.remove(['accessToken',
'refreshToken']);
UI.showLogin();
}
9. Notifications
Badge
Code:
chrome.action.setBadgeText({ text: '+3' });
chrome.action.setBadgeBackgroundColor({ color: '#FF4500' });
// Clear on popup open
chrome.action.onClicked.addListener(() => {
chrome.action.setBadgeText({ text: '' });
});
Toast Messages
Code:
function showToast(message, type = 'success') {
const toast = document.createElement('div');
toast.className = `toast toast-${type}`;
toast.textContent = message;
document.body.appendChild(toast);
setTimeout(() => toast.classList.add('show'), 100);
setTimeout(() => {
toast.classList.remove('show');
setTimeout(() => toast.remove(), 300);
}, 3000);
}
Error Handling
Network Error
• Show: "Can't sync. Check connection."
• Retry button
• Queue for online
Rate Limit
• Show: "Rate limited. Try in 5 min."
• Auto-retry after wait
Storage Full
• Show: "Storage full. Export & delete old saves."
• Link to export
Payment Failed
• Show: "Payment failed. Update payment method."
• Link to Stripe portal
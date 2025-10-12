Reddit API Integration Guide
OAuth Setup
Register: https://www.reddit.com/prefs/apps
• Type: web app
• Redirect: https://YOUR_LAMBDA/callback
• Get: Client ID & Secret
OAuth Flow
1. Redirect
const authUrl = `https://www.reddit.com/api/v1/authorize?` +
`client_id=${CLIENT_ID}&response_type=code&` +
`state=${crypto.randomUUID()}&` +
`redirect_uri=${REDIRECT_URI}&` +
`duration=permanent&scope=history,identity`;
chrome.tabs.create({ url: authUrl });
2. Exchange (Lambda)
const response = await fetch('https://www.reddit.com/api/v1/
access_token', {
method: 'POST',
headers: {
'Authorization': `Basic ${btoa(`${CLIENT_ID}:$
{CLIENT_SECRET}`)}`,
'Content-Type': 'application/x-www-form-urlencoded'
},
body: `grant_type=authorization_code&code=${code}
&redirect_uri=${REDIRECT_URI}`
});
3. Store
await chrome.storage.local.set({
accessToken: encrypt(data.access_token),
refreshToken: encrypt(data.refresh_token),
expiresAt: Date.now() + (data.expires_in * 1000)
});
API Endpoints
Fetch Saves
const fetchSaves = async (after = null) => {
const url = `https://oauth.reddit.com/user/me/saved?
limit=100${after ? `&after=${after}` : ''}`;
const response = await fetch(url, {
headers: {
'Authorization': `Bearer ${accessToken}`,
'User-Agent': 'SnooShelf/1.0'
}
});
return response.json();
};
Get Username
const response = await fetch('https://oauth.reddit.com/api/
v1/me', {
headers: { 'Authorization': `Bearer ${accessToken}` }
});
Rate Limiting
Limits: 60 req/min, 600 req/10min
class RateLimiter {
constructor() {
this.requests = [];
this.maxPerMinute = 60;
}
async throttle() {
const now = Date.now();
this.requests = this.requests.filter(t => now - t <
60000);
if (this.requests.length >= this.maxPerMinute) {
const wait = 60000 - (now - this.requests[0]);
await new Promise(r => setTimeout(r, wait));
return this.throttle();
}
this.requests.push(now);
}
}
Sync Strategy
Initial
const syncAll = async () => {
let allSaves = [], after = null;
do {
await rateLimiter.throttle();
const { saves, after: next } = await fetchSaves(after);
allSaves = allSaves.concat(saves);
after = next;
chrome.runtime.sendMessage({ type: 'PROGRESS', count:
allSaves.length });
} while (after);
return allSaves;
};
Incremental
const syncNew = async () => {
const { lastSyncAt } = await
chrome.storage.local.get('lastSyncAt');
const { saves } = await fetchSaves();
return saves.filter(s => s.created_utc * 1000 >
lastSyncAt);
};
Save Structure
Reddit:
{
kind: "t3",
data: {
id: "abc123",
title: "Title",
selftext: "Content",
subreddit: "programming",
author: "user",
score: 1234,
created_utc: 1696723200
}
Transform to:
}
{
id: "t3_abc123",
title: "Title",
content: "Content",
subreddit: "programming",
author: "user",
score: 1234,
}
createdAt: 1696723200000,
savedAt: Date.now(),
tags: [],
folder: null
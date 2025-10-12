Database Schema (IndexedDB)
Config
const DB_NAME = 'snooshelf';
const DB_VERSION = 1;
Object Stores
1. saves
Structure:
{
keyPath: 'id',
indexes: [
{ name: 'subreddit', keyPath: 'subreddit' },
{ name: 'savedAt', keyPath: 'savedAt' },
{ name: 'tags', keyPath: 'tags', multiEntry: true },
{ name: 'folder', keyPath: 'folder' },
{ name: 'author', keyPath: 'author' }
]
}
Model:
interface Save {
id: string; // 't3_abc123'
type: 'post' | 'comment';
title: string;
content: string;
url: string;
subreddit: string;
author: string;
score: number;
numComments: number;
createdAt: number;
savedAt: number;
thumbnail?: string;
tags: string[];
folder?: string;
notes?: string;
}
Example:
{
id: 't3_xyz789',
type: 'post',
title: 'Python web scraping',
content: 'Tutorial...',
url: 'https://reddit.com/...',
subreddit: 'programming',
author: 'pythondev',
score: 1234,
numComments: 56,
createdAt: 1696723200000,
savedAt: 1697328000000,
tags: ['python', 'tutorial'],
folder: 'Learning'
}
2. tags
Structure:
{
keyPath: 'id',
indexes: [
{ name: 'name', keyPath: 'name', unique: true }
]
}
Model:
interface Tag {
id: string; // UUID
name: string; // 'python'
color: string; // 'yellow'
createdAt: number;
saveCount: number;
}
3. folders
Structure:
{
keyPath: 'id',
indexes: [
{ name: 'name', keyPath: 'name', unique: true }
]
}
Model:
interface Folder {
id: string; // UUID
name: string; // 'Work'
icon?: string; // '💼'
createdAt: number;
saveCount: number;
}
4. settings
Structure:
{ keyPath: 'key' } // Key-value store
Examples:
{ key: 'theme', value: 'light' }
{ key: 'autoSync', value: true }
{ key: 'syncInterval', value: 15 }
{ key: 'searchIndex', value: '...' }
Queries
Get All
const saves = await db.getAll('saves');
By Subreddit
const saves = await db.getAllFromIndex('saves', 'subreddit',
'programming');
By Tag
const saves = await db.getAllFromIndex('saves', 'tags',
'python');
By Folder
const saves = await db.getAllFromIndex('saves', 'folder',
'Work');
By Date Range
const range = IDBKeyRange.bound(startDate, endDate);
const cursor = await
db.transaction('saves').store.index('savedAt').openCursor(ran
ge);
const saves = [];
while (cursor) {
saves.push(cursor.value);
await cursor.continue();
}
CRUD
Create
await db.put('saves', {
id: 't3_abc123',
title: 'Post',
tags: ['python'],
folder: 'Learning',
savedAt: Date.now()
});
Read
const save = await db.get('saves', 't3_abc123');
Update
const save = await db.get('saves', 't3_abc123');
save.tags.push('tutorial');
await db.put('saves', save);
Delete
await db.delete('saves', 't3_abc123');
Initialization
import { openDB } from 'idb';
const initDB = async () => {
return openDB(DB_NAME, DB_VERSION, {
upgrade(db) {
if (!db.objectStoreNames.contains('saves')) {
const store = db.createObjectStore('saves',
{ keyPath: 'id' });
store.createIndex('subreddit', 'subreddit');
store.createIndex('savedAt', 'savedAt');
store.createIndex('tags', 'tags', { multiEntry:
true });
store.createIndex('folder', 'folder');
store.createIndex('author', 'author');
}
if (!db.objectStoreNames.contains('tags')) {
const tags = db.createObjectStore('tags', { keyPath:
tags.createIndex('name', 'name', { unique: true });
'id' });
}
if (!db.objectStoreNames.contains('folders')) {
const folders = db.createObjectStore('folders',
{ keyPath: 'id' });
folders.createIndex('name', 'name', { unique:
true });
}
if (!db.objectStoreNames.contains('settings')) {
db.createObjectStore('settings', { keyPath: 'key' });
}
}
});
};
Storage Estimates
• 1,000 saves: ~2MB
• 10,000 saves: ~20MB
• 50,000 saves: ~100MB
• Search index: +10%
Limit: 10GB+ with unlimitedStorage
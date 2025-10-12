SnooShelf - UI Design Guide
Version: 1.0
Last Updated: October 2025
🎨 Visual Identity
Brand Colors
:root {
/* Primary - Reddit Orange */
--primary: #FF4500;
--primary-hover: #FF5722;
--primary-light: #FF6B3D;
/* Background */
--bg-main: #FFFFFF;
--bg-secondary: #F6F7F8;
--bg-sidebar: #F6F7F8;
/* Text */
--text-primary: #1A1A1B;
--text-secondary: #7C7C7C;
--text-muted: #A8A8A8;
/* Borders */
--border: #EDEFF1;
--border-hover: #D7DADC;
/* Tag Colors */
--tag-yellow: #FFF4CC;
--tag-yellow-text: #806600;
--tag-blue: #E1F5FF;
--tag-green: #E8F5E9;
--tag-purple: #F3E5F5;
}
Logo & Icon
Icon: Reddit Snoo mascot in orange (#FF4500)
Size: 128×128px for Chrome Store, 48×48px for extension
Style: Friendly, rounded, simple
📐 Layout Structure
Extension Popup (400×600px)
┌─────────────────────────────────────┐
│ 🔴 SnooShelf [🔍 Search] │ ← Header (60px)
├─────────────┬───────────────────────┤
│ 📁 Work │ Python web scraping │
│ │ #python 3d │
│ 📁 Personal │ │
│ │ Industry news │
│ 📁 Learning │ #news 1w │
│ │ │
│ (240px) │ Home workout... │ ← Main (540px)
│ │ #fitness 1w │
│ │ │
│ │ Beginner's guide... │
│ │ #investing 1w │ └─────────────┴───────────────────────┘
🧩 Components
Header
<header class="header">
<div class="header-left">
<img src="icon48.png" class="logo" alt="SnooShelf">
<h1>SnooShelf</h1>
</div>
<div class="search-bar">
<input type="text" placeholder="Search">
<span class="search-icon">🔍 </span>
</div>
</header>
.header {
display: flex;
justify-content: space-between;
align-items: center;
padding: 16px;
background: var(--bg-main);
border-bottom: 1px solid var(--border);
}
.logo {
width: 32px;
height: 32px;
margin-right: 12px;
}
.search-bar {
background: var(--bg-secondary);
border-radius: 20px;
padding: 8px 16px;
display: flex;
align-items: center;
width: 200px;
}
.search-bar input {
border: none;
background: transparent;
outline: none;
width: 100%;
font-size: 14px;
}
Sidebar (Folders)
<aside class="sidebar">
<div class="folder">
<span class="folder-icon">📁 </span>
<span class="folder-name">Work</span>
</div>
<div class="folder">
<span class="folder-icon">📁 </span>
<span class="folder-name">Personal</span>
</div>
<div class="folder">
<span class="folder-icon">📁 </span>
<span class="folder-name">Learning</span>
</div>
</aside>
.sidebar {
width: 240px;
background: var(--bg-sidebar);
padding: 16px;
border-right: 1px solid var(--border);
}
.folder {
display: flex;
align-items: center;
padding: 12px;
border-radius: 8px;
cursor: pointer;
margin-bottom: 4px;
color: var(--text-primary);
transition: background 0.2s;
}
}
.folder:hover {
background: #E8E9EB;
.folder-icon {
margin-right: 12px;
font-size: 18px;
}
.folder-name {
font-size: 14px;
font-weight: 500;
}
Save Card
<div class="save-card">
<div class="save-content">
<h3 class="save-title">Python web scraping tutorial</h3>
<div class="save-meta">
<span class="tag">#python</span>
<span class="save-date">3d</span>
</div>
</div>
</div>
.save-card {
padding: 16px;
border-bottom: 1px solid var(--border);
cursor: pointer;
transition: background 0.2s;
}
.save-card:hover {
background: var(--bg-secondary);
}
.save-title {
font-size: 16px;
font-weight: 500;
color: var(--text-primary);
margin: 0 0 8px 0;
line-height: 1.4;
}
.save-meta {
display: flex;
align-items: center;
gap: 12px;
}
.tag {
background: var(--tag-yellow);
color: var(--tag-yellow-text);
padding: 4px 12px;
border-radius: 12px;
font-size: 13px;
font-weight: 500;
}
.save-date {
color: var(--text-secondary);
font-size: 13px;
}
🎯 Design Principles
1. 2. 3. 4. 5. Clean & Simple: Minimal UI, focus on content
Reddit Familiarity: Use Reddit orange, similar spacing
Scannable: Clear hierarchy, easy to find saves quickly
Friendly: Use emojis for folders (📁 , 💼 , 🍳 , 📚 )
Fast: No loading spinners, instant feedback
📱 Responsive Behavior
Popup is fixed 400×600px (Chrome extension standard)
When many folders:
• Sidebar scrolls independently
• Main content scrolls independently
When search active:
• Sidebar hides temporarily (mobile-like)
• Search results take full width
✨ Interactions
Hover States
• Folders: Light gray background (#E8E9EB)
• Save cards: Light gray background (#F6F7F8)
• Tags: Slight darkening of background
Click States
• Active folder: Orange left border (4px)
• Selected save: Subtle orange background tint
Animations
• Keep minimal for performance
• Folder expand/collapse: 200ms ease
• Tag hover: 150ms transition
🔤 Typography
/* Font Stack */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
'Roboto', 'Helvetica', 'Arial', sans-serif;
/* Sizes */
--text-xl: 20px; /* Headers */
--text-lg: 16px; /* Save titles */
--text-md: 14px; /* Body, folders */
--text-sm: 13px; /* Tags, metadata */
--text-xs: 12px; /* Timestamps */
/* Weights */
--weight-normal: 400;
--weight-medium: 500;
--weight-semibold: 600;
🎨 Tag Design
Predefined Color Options:
/* Yellow (default) */
.tag-yellow { background: #FFF4CC; color: #806600; }
/* Blue */
.tag-blue { background: #E1F5FF; color: #014361; }
/* Green */
.tag-green { background: #E8F5E9; color: #1B5E20; }
/* Purple */
.tag-purple { background: #F3E5F5; color: #4A148C; }
/* Red */
Tag Behavior:
.tag-red { background: #FFEBEE; color: #B71C1C; }
• Pill shape (border-radius: 12px)
• Padding: 4px 12px
• Multiple tags wrap naturally
• Click tag to filter by it
🚀 Implementation Notes
Use Cursor AI to generate:
1. Start with this color scheme
2. Follow the component structure exactly
3. Keep CSS simple (no frameworks needed)
4. Use CSS variables for easy theming later
File Structure:
src/popup/
├── popup.html
├── popup.css ← All styles from this guide
└── popup.js
Key Takeaway: Clean, Reddit-inspired design with orange accent, folder sidebar, and card-based
saves list. Focus on simplicity and speed.
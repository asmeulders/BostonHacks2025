# Study Focus Assistant - File Organization

## Folder Structure

### `/popup/`
**Main Extension Popup Interface**
- `popup.html` - Extension popup UI (click extension icon to access)
- `popup.js` - Testing interface and domain management logic

### `/distraction-alert/`
**Tab Switching Distraction System**
- `distraction-popup.js` - Injectable popup that appears on non-work tabs
- `distraction-content.js` - Content script for fallback popup functionality

### `/shared/`
**Shared Utilities**
- `domain-utils.js` - Common domain extraction and validation functions

### Root Files
- `service-worker.js` - Main service worker for tab management and coordination
- `content.js` - Legacy content script (can be removed)
- `manifest.json` - Extension configuration

## How It Works

1. **Background Script** (`service-worker.js`) monitors tab switches
2. **Distraction Alert** (`distraction-alert/`) shows popup when switching to non-work tabs
3. **Main Popup** (`popup/`) provides interface for managing work domains
4. **Shared Utils** (`shared/`) contains common functionality used across components

## For Your Teammate

The frontend components are clearly separated:
- Main UI: `/popup/` folder
- Distraction alerts: `/distraction-alert/` folder  
- Backend logic: `service-worker.js`
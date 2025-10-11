// Study Focus Assistant - Background Script

class StudyFocusManager {
  constructor() {
    this.workDomains = new Set();
    this.lastActiveTabId = null;
    this.init();
  }

  async init() {
    // Load existing work domains from storage
    await this.loadWorkDomains();
    
    // Set up event listeners
    this.setupEventListeners();
    
    console.log('Study Focus Assistant initialized');
  }

  setupEventListeners() {
    // Listen for tab activation (switching)
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      console.log('Tab activated:', activeInfo.tabId);
      await this.handleTabSwitch(activeInfo.tabId);
    });

    // Listen for tab updates (URL changes)
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.active) {
        console.log('Tab updated and active:', tabId, tab.url);
        await this.handleTabSwitch(tabId);
      }
    });

    // Listen for messages from content script and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  async handleTabSwitch(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        console.log('Skipping chrome internal page:', tab.url);
        return; // Skip chrome internal pages
      }

      const domain = this.extractDomain(tab.url);
      const isWorkTab = this.isWorkDomain(domain);

      console.log(`Tab switch detected - Domain: ${domain}, Is Work Tab: ${isWorkTab}, Work Domains:`, Array.from(this.workDomains));

      // Store the current tab info
      this.lastActiveTabId = tabId;

      if (!isWorkTab) {
        console.log(`Showing distraction prompt for non-work domain: ${domain}`);
        // This is a non-work tab, show distraction prompt
        await this.showDistractionPrompt(tabId, domain);
      } else {
        console.log(`${domain} is a work domain, no prompt needed`);
      }

    } catch (error) {
      console.error('Error handling tab switch:', error);
    }
  }

  async showDistractionPrompt(tabId, domain) {
    try {
      console.log(`Attempting to inject script into tab ${tabId} for domain ${domain}`);
      
      // Wait a moment for the page to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Inject the distraction prompt into the current tab
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: showPromptOverlayFunction,
        args: [domain]
      });
      
      console.log(`Successfully injected distraction prompt for ${domain}`);
    } catch (error) {
      console.error('Error showing distraction prompt:', error);
      
      // Fallback: try to use content script messaging
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: 'showDistractionPrompt',
          domain: domain
        });
        console.log('Fallback: sent message to content script');
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'addWorkDomain':
        await this.addWorkDomain(message.domain);
        sendResponse({ success: true });
        break;

      case 'removeWorkDomain':
        await this.removeWorkDomain(message.domain);
        sendResponse({ success: true });
        break;

      case 'getWorkDomains':
        sendResponse({ domains: Array.from(this.workDomains) });
        break;

      case 'goBack':
        // Go back in history
        try {
          await chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            func: () => window.history.back()
          });
          sendResponse({ success: true });
        } catch (error) {
          console.error('Error going back:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return url;
    }
  }

  isWorkDomain(domain) {
    return this.workDomains.has(domain);
  }

  async addWorkDomain(domain) {
    this.workDomains.add(domain);
    await this.saveWorkDomains();
    console.log(`Added work domain: ${domain}`);
  }

  async removeWorkDomain(domain) {
    this.workDomains.delete(domain);
    await this.saveWorkDomains();
    console.log(`Removed work domain: ${domain}`);
  }

  async saveWorkDomains() {
    try {
      await chrome.storage.local.set({
        workDomains: Array.from(this.workDomains)
      });
    } catch (error) {
      console.error('Error saving work domains:', error);
    }
  }

  async loadWorkDomains() {
    try {
      const result = await chrome.storage.local.get(['workDomains']);
      if (result.workDomains) {
        this.workDomains = new Set(result.workDomains);
        console.log('Loaded work domains:', this.workDomains);
      }
    } catch (error) {
      console.error('Error loading work domains:', error);
    }
  }
}

// Standalone function for injection (must be outside the class)
function showPromptOverlayFunction(domain) {
  console.log('showPromptOverlay called for domain:', domain);
  
  // Check if overlay already exists
  if (document.getElementById('study-focus-overlay')) {
    console.log('Overlay already exists, skipping');
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'study-focus-overlay';
  overlay.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      z-index: 999999;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
    ">
      <div style="
        background: white;
        padding: 30px;
        border-radius: 10px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      ">
        <h2 style="color: #333; margin-bottom: 15px;">⚠️ Distraction Alert</h2>
        <p style="color: #666; margin-bottom: 20px;">
          You've switched to <strong>${domain}</strong><br>
          Is this a work-related site?
        </p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="study-focus-yes" style="
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          ">Yes, it's work</button>
          <button id="study-focus-no" style="
            background: #f44336;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          ">No, go back</button>
        </div>
      </div>
    </div>
  `;

  console.log('Adding overlay to document body');
  document.body.appendChild(overlay);

  // Add event listeners
  const yesButton = document.getElementById('study-focus-yes');
  const noButton = document.getElementById('study-focus-no');
  
  if (yesButton) {
    yesButton.addEventListener('click', () => {
      console.log('Yes button clicked for domain:', domain);
      // Use chrome.runtime if available
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'addWorkDomain',
          domain: domain
        });
      }
      overlay.remove();
    });
  }

  if (noButton) {
    noButton.addEventListener('click', () => {
      console.log('No button clicked');
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'goBack'
        });
      }
      overlay.remove();
    });
  }

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (overlay.parentNode) {
      console.log('Auto-removing overlay after timeout');
      overlay.remove();
    }
  }, 10000);
  
  console.log('Overlay setup complete');
}

// Initialize the Study Focus Manager
const studyFocusManager = new StudyFocusManager();
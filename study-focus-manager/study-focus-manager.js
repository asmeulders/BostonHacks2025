// Study Focus Assistant - Background Script

export class StudyFocusManager {
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

//   toggleSession() {
//     this.activeSession = !this.activeSession;
//     console.log(`Session active: ${this.activeSession}`)
//     return 
//   }

  async handleTabSwitch(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);

      const { activeSession } = await chrome.storage.local.get('activeSession');
      
      if (!activeSession || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
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
      
      // Inject the distraction alert script into the current tab
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['distraction-alert/distraction-popup.js']
      });
      
      // Then call the function
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (domain) => {
          if (typeof showDistractionAlert === 'function') {
            showDistractionAlert(domain);
          }
        },
        args: [domain]
      });
      
      console.log(`Successfully injected distraction prompt for ${domain}`);
    } catch (error) {
      console.error('Error showing distraction prompt:', error);
      
      // Fallback: try to use content script messaging
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: 'showDistractionAlert',
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
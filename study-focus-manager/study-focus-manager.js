// Study Focus Assistant - Background Script

export class StudyFocusManager {
  constructor() {
    this.workDomains = new Set();
    this.lastActiveTabId = null;
    this.geminiApiKey = null;
    this.init();
  }

  async init() {
    // Load existing work domains from storage
    await this.loadWorkDomains();
    await this.loadGeminiApiKey();
    
    // Set up event listeners
    this.setupEventListeners();

    console.log('Study Focus Assistant initialized');
  }

  async loadGeminiApiKey() {
    try {
      // First, try to load from Chrome storage
      const result = await chrome.storage.local.get(['geminiApiKey']);
      if (result.geminiApiKey) {
        this.geminiApiKey = result.geminiApiKey;
        console.log('API key loaded from Chrome storage');
        return;
      }
      
      // If not in Chrome storage, try to load from config.json
      try {
        const response = await fetch(chrome.runtime.getURL('config.json'));
        const config = await response.json();
        if (config.geminiApiKey) {
          this.geminiApiKey = config.geminiApiKey;
          // Store it in Chrome storage for future use
          await chrome.storage.local.set({ geminiApiKey: config.geminiApiKey });
          console.log('API key loaded from config.json and stored in Chrome storage');
          return;
        }
      } catch (configError) {
        console.warn('Could not load from config.json:', configError.message);
      }
      
      console.warn('No API key found in Chrome storage or config.json. Please configure your API key.');
      this.geminiApiKey = null;
      
    } catch (error) {
      console.error('Error loading Gemini API key:', error);
      this.geminiApiKey = null;
    }
  }

  async askGemini(question) {
    if (!this.geminiApiKey) {
      return 'Gemini API key not configured. Please set it up first.';
    }

    console.log('=== GEMINI API DEBUG ===');
    console.log('Question:', question);
    console.log('API Key (first 10 chars):', this.geminiApiKey.substring(0, 10) + '...');

    try {
      const requestBody = {
        contents: [{
          parts: [{
            text: `You are a helpful work/study assistant. Answer this work/study question clearly and concisely.
                    If the question seems like a distraction or unrelated to working, steer the user back
                    to work. Remember to be friendly and helpful.: ${question}`
          }]
        }]
      };

      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers));

      const data = await response.json();
      console.log('Full API response:', JSON.stringify(data, null, 2));
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const answer = data.candidates[0].content.parts[0].text;
        console.log('Extracted answer:', answer);
        return answer;
      } else {
        console.log('No valid response found in candidates');
        console.log('Available candidates:', data.candidates);
        if (data.error) {
          console.log('API Error:', data.error);
          return `API Error: ${data.error.message || 'Unknown error'}`;
        }
        return 'Sorry, I couldn\'t generate a response.';
      }
    } catch (error) {
      console.error('=== GEMINI API ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return 'Error connecting to AI service. Please try again.';
    }
  }

  async askStudyQuestion(question) {
    return await this.askGemini(question);
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

    // Note: Message listener for chat is now handled in service-worker.js
  }

  //   toggleSession() {
  //     this.activeSession = !this.activeSession;
  //     console.log(`Session active: ${this.activeSession}`)
  //     return 
  //   }

  async handleTabSwitch(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);

      // ---- guards ----
      const { extensionEnabled, activeSession, mode } =
        await chrome.storage.local.get(['extensionEnabled', 'activeSession', 'mode']);

      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        console.log('Skipping internal page:', tab.url);
        return;
      }
      if (extensionEnabled === false) {
        console.log('Extension disabled → no gating');
        return;
      }
      if (mode === 'normal') {
        console.log('Mode is normal → no gating');
        return;
      }

      // Only show distraction prompts if there's an active session
      // if (!activeSession) {
      //   console.log('No active session, skipping distraction check for:', tab.url);
      //   return;
      // }

      const domain = this.extractDomain(tab.url);
      const isWorkTab = this.isWorkDomain(domain);

      console.log(`Tab switch - domain: ${domain}, isWork: ${isWorkTab}`);

      this.lastActiveTabId = tabId;

      if (!isWorkTab) {
        await this.showDistractionPrompt(tabId, domain);
      } else {
        console.log(`${domain} is a work domain, no prompt.`);
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

      case 'extensionToggled':
        console.log('Extension toggled:', message.enabled ? 'enabled' : 'disabled');
        sendResponse({ success: true });
        break;

      case 'SESSION_STARTED':
        console.log('Session started:', message.sessionType, message.duration);
        sendResponse({ success: true });
        break;

      case 'SESSION_ENDED':
        console.log('Session ended');
        sendResponse({ success: true });
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

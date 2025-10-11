// Study Focus Assistant - Background Script (Lockdown on Focused Mode)

class StudyFocusManager {
  constructor() {
    this.workDomains = new Set();
    this.lastActiveTabId = null;

    // live-in-memory mirrors of storage
    this.mode = 'normal';
    this.interceptEnabled = true;
    this.sessionActive = false;
    this.phase = 'IDLE';

    this.init();
  }

  async init() {
    // Load persisted domain list
    await this.loadWorkDomains();

    // Load mode/intercept/session defaults
    const s = await chrome.storage.local.get(['mode', 'interceptEnabled', 'sessionActive', 'phase']);
    this.mode = s.mode || 'normal';
    this.interceptEnabled = s.interceptEnabled !== false; // default true
    this.sessionActive = !!s.sessionActive;
    this.phase = s.phase || 'IDLE';

    this.setupEventListeners();

    // If we start up already in focused mode, establish a baseline work domain
    if (this.mode === 'focused') {
      await this.addCurrentActiveDomainAsWork();
    }

    console.log('Study Focus Assistant initialized (mode:', this.mode, ', intercept:', this.interceptEnabled, ')');
  }

  setupEventListeners() {
    // Listen for tab activation (switching)
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        await this.handleTabSwitch(activeInfo.tabId);
      } catch (e) {
        console.warn('onActivated error', e);
      }
    });

    // Listen for tab updates (URL changes)
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.active) {
        try {
          await this.handleTabSwitch(tabId);
        } catch (e) {
          console.warn('onUpdated error', e);
        }
      }
    });

    // Keep in-memory mirrors in sync with storage
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if ('mode' in changes) this.mode = changes.mode.newValue ?? 'normal';
      if ('interceptEnabled' in changes) this.interceptEnabled = changes.interceptEnabled.newValue !== false;
      if ('sessionActive' in changes) this.sessionActive = !!changes.sessionActive.newValue;
      if ('phase' in changes) this.phase = changes.phase.newValue ?? 'IDLE';
    });

    // Listen for messages from content script and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  async handleTabSwitch(tabId) {
    // Lockdown rule: only prompt when intercept is on AND mode is focused
    if (!(this.interceptEnabled && this.mode === 'focused')) return;

    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

      const domain = this.extractDomain(tab.url);
      const isWorkTab = this.isWorkDomain(domain);

      this.lastActiveTabId = tabId;

      if (!isWorkTab) {
        await this.showDistractionPrompt(tabId, domain);
      }
    } catch (error) {
      console.error('Error handling tab switch:', error);
    }
  }

  async showDistractionPrompt(tabId, domain) {
    try {
      // allow page to settle a bit
      await new Promise(resolve => setTimeout(resolve, 200));

      // Prefer messaging a content script overlay if you have one registered
      await chrome.tabs.sendMessage(tabId, {
        action: 'showDistractionAlert',
        domain
      });
    } catch (fallbackError) {
      // Fallback: attempt to inject a legacy popup script if present
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['distraction-alert/distraction-popup.js']
        });
        await chrome.scripting.executeScript({
          target: { tabId },
          func: (d) => { if (typeof showDistractionAlert === 'function') showDistractionAlert(d); },
          args: [domain]
        });
      } catch (err) {
        console.error('Failed to show distraction prompt:', err);
      }
    }
  }

  async handleMessage(message, sender, sendResponse) {
    const kind = message.type || message.action; // support either shape

    switch (kind) {
      /* ---------- Mode & Intercept ---------- */
      case 'TOGGLE_MODE': {
        const mode = message.mode === 'focused' ? 'focused' : 'normal';
        await chrome.storage.local.set({ mode });
        this.mode = mode;

        if (mode === 'focused') {
          // Lockdown baseline: current active tab's DOMAIN becomes work
          await this.addCurrentActiveDomainAsWork();
          // Ensure intercept is ON for lockdown to function
          await chrome.storage.local.set({ interceptEnabled: true });
          this.interceptEnabled = true;
        }

        sendResponse?.({ success: true });
        return;
      }

      case 'SET_INTERCEPT': {
        const interceptEnabled = !!message.enabled;
        await chrome.storage.local.set({ interceptEnabled });
        this.interceptEnabled = interceptEnabled;
        sendResponse?.({ success: true });
        return;
      }

      /* ---------- Minimal Session Controls (optional) ---------- */
      case 'START_SESSION': {
        await chrome.storage.local.set({
          sessionActive: true,
          phase: 'FOCUS',
          mode: 'focused'
        });
        this.sessionActive = true;
        this.phase = 'FOCUS';
        this.mode = 'focused';
        // Lockdown baseline on start as well
        await this.addCurrentActiveDomainAsWork();
        // Make sure intercept is on
        await chrome.storage.local.set({ interceptEnabled: true });
        this.interceptEnabled = true;

        sendResponse?.({ success: true });
        return;
      }

      case 'STOP_SESSION': {
        await chrome.storage.local.set({
          sessionActive: false,
          phase: 'IDLE'
        });
        this.sessionActive = false;
        this.phase = 'IDLE';
        sendResponse?.({ success: true });
        return;
      }

      /* ---------- Optional: GET_STATE for popup ---------- */
      case 'GET_STATE': {
        const state = await chrome.storage.local.get([
          'mode',
          'interceptEnabled',
          'sessionActive',
          'phase'
        ]);
        sendResponse?.({
          mode: state.mode ?? 'normal',
          interceptEnabled: state.interceptEnabled !== false,
          sessionActive: state.sessionActive ?? false,
          phase: state.phase ?? 'IDLE'
        });
        return;
      }

      /* ---------- Legacy domain management (kept) ---------- */
      case 'addWorkDomain': {
        await this.addWorkDomain(message.domain);
        sendResponse?.({ success: true });
        return;
      }

      case 'removeWorkDomain': {
        await this.removeWorkDomain(message.domain);
        sendResponse?.({ success: true });
        return;
      }

      case 'getWorkDomains': {
        sendResponse?.({ domains: Array.from(this.workDomains) });
        return;
      }

      case 'goBack': {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: sender?.tab?.id },
            func: () => window.history.back()
          });
          sendResponse?.({ success: true });
        } catch (error) {
          sendResponse?.({ success: false, error: error?.message || String(error) });
        }
        return;
      }

      default:
        sendResponse?.({ success: false, error: 'Unknown action' });
    }
  }

  /* ---------- Lockdown helper: add active tab's DOMAIN as work ---------- */
  async addCurrentActiveDomainAsWork() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) return;
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

      const domain = this.extractDomain(tab.url);
      if (!domain) return;

      this.workDomains.add(domain);
      await this.saveWorkDomains();
      this.lastActiveTabId = tab.id;

      console.log(`[Lockdown] Baseline work domain set: ${domain} (tab ${tab.id})`);
    } catch (e) {
      console.warn('Failed to set baseline work domain:', e);
    }
  }

  /* ---------- Utilities & domain persistence ---------- */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  isWorkDomain(domain) {
    return this.workDomains.has(domain);
  }

  async addWorkDomain(domain) {
    if (!domain) return;
    this.workDomains.add(domain);
    await this.saveWorkDomains();
    console.log(`Added work domain: ${domain}`);
  }

  async removeWorkDomain(domain) {
    if (!domain) return;
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

// Initialize the Study Focus Manager
const studyFocusManager = new StudyFocusManager();

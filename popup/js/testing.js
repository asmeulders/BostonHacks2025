// Testing page JavaScript functionality

class TestingManager {
  constructor() {
    this.currentTab = null;
    this.workDomains = [];
    this.testResults = {};
    this.selectedDuration = 1; // Default 1 minute for testing
    this.debugMode = true;
    
    this.init();
  }

  async init() {
    try {
      await this.loadTestingData();
      this.setupEventListeners();
      this.updateUI();
      this.initializeDebugConsole();
    } catch (error) {
      PopupUtils.logError('Failed to initialize testing manager:', error);
      this.showTestMessage('Failed to initialize testing tools', 'error');
    }
  }

  async loadTestingData() {
    try {
      // Load current tab
      this.currentTab = await PopupUtils.getCurrentTab();
      
      // Load work domains
      const data = await PopupUtils.getStorage(['workDomains']);
      this.workDomains = data.workDomains || [];
      
      // Load extension info
      this.extensionInfo = {
        version: chrome.runtime.getManifest().version,
        id: chrome.runtime.id,
        permissions: chrome.runtime.getManifest().permissions
      };
    } catch (error) {
      PopupUtils.logError('Failed to load testing data:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // Current tab actions
    const addCurrentBtn = document.getElementById('addCurrentDomain');
    const refreshBtn = document.getElementById('refreshTabInfo');
    
    if (addCurrentBtn) {
      addCurrentBtn.addEventListener('click', () => this.addCurrentDomainTest());
    }
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshTabInfo());
    }

    // Quick action buttons
    const testTriggerBtn = document.getElementById('testTrigger');
    const simulateDistractionBtn = document.getElementById('simulateDistraction');
    const testNotificationBtn = document.getElementById('testNotification');

    if (testTriggerBtn) {
      testTriggerBtn.addEventListener('click', () => this.triggerTestPopup());
    }
    
    if (simulateDistractionBtn) {
      simulateDistractionBtn.addEventListener('click', () => this.simulateDistraction());
    }
    
    if (testNotificationBtn) {
      testNotificationBtn.addEventListener('click', () => this.testNotification());
    }

    // Manual domain testing
    const manualAddBtn = document.getElementById('manualAdd');
    const domainInput = document.getElementById('domainInput');
    const clearAllBtn = document.getElementById('clearAll');

    if (manualAddBtn && domainInput) {
      manualAddBtn.addEventListener('click', () => this.addManualDomain());
      domainInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.addManualDomain();
      });
    }
    
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => this.clearAllDomains());
    }

    // Session testing
    const durationBtns = document.querySelectorAll('.duration-btn');
    const startTestSessionBtn = document.getElementById('startTestSession');
    const endTestSessionBtn = document.getElementById('endTestSession');

    durationBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectTestDuration(parseInt(e.target.dataset.duration));
        this.updateDurationButtons();
      });
    });

    if (startTestSessionBtn) {
      startTestSessionBtn.addEventListener('click', () => this.startTestSession());
    }
    
    if (endTestSessionBtn) {
      endTestSessionBtn.addEventListener('click', () => this.endTestSession());
    }

    // API testing
    const testBackgroundBtn = document.getElementById('testBackgroundComm');
    const testStorageBtn = document.getElementById('testStorageAPI');

    if (testBackgroundBtn) {
      testBackgroundBtn.addEventListener('click', () => this.testBackgroundCommunication());
    }
    
    if (testStorageBtn) {
      testStorageBtn.addEventListener('click', () => this.testStorageAPI());
    }

    // Debug controls
    const refreshDebugBtn = document.getElementById('refreshDebugInfo');
    const clearLogsBtn = document.getElementById('clearLogs');
    const toggleDebugBtn = document.getElementById('toggleDebugConsole');

    if (refreshDebugBtn) {
      refreshDebugBtn.addEventListener('click', () => this.refreshDebugInfo());
    }
    
    if (clearLogsBtn) {
      clearLogsBtn.addEventListener('click', () => this.clearConsoleLogs());
    }
    
    if (toggleDebugBtn) {
      toggleDebugBtn.addEventListener('click', () => this.toggleDebugConsole());
    }

    // Data management
    const exportBtn = document.getElementById('exportTestData');
    const importBtn = document.getElementById('importTestData');
    const resetBtn = document.getElementById('resetTestData');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportTestData());
    }
    
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importTestData());
    }
    
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetTestData());
    }
  }

  updateUI() {
    this.updateCurrentTabDisplay();
    this.updateDomainsList();
    this.updateSessionStatus();
    this.updateDebugInfo();
  }

  updateCurrentTabDisplay() {
    const tabDisplay = document.getElementById('currentTab');
    if (!tabDisplay || !this.currentTab) return;

    const domain = PopupUtils.extractDomain(this.currentTab.url);
    const isWorkDomain = domain && this.workDomains.includes(domain);

    tabDisplay.innerHTML = `
      <div class="current-tab-info">
        <strong>Title:</strong> ${PopupUtils.sanitizeInput(this.currentTab.title)}<br>
        <strong>URL:</strong> ${PopupUtils.sanitizeInput(this.currentTab.url)}<br>
        <strong>Domain:</strong> ${domain || 'No domain'}<br>
        <strong>Status:</strong> ${isWorkDomain ? '✅ Work Domain' : '⚠️ Non-Work Domain'}<br>
        <strong>Tab ID:</strong> ${this.currentTab.id}
      </div>
    `;
  }

  updateDomainsList() {
    const domainsList = document.getElementById('workDomains');
    if (!domainsList) return;

    if (this.workDomains.length === 0) {
      domainsList.innerHTML = '<div class="empty-domains">No work domains added</div>';
      return;
    }

    const domainsHTML = this.workDomains.map(domain => `
      <div class="domain-item">${domain}</div>
    `).join('');

    domainsList.innerHTML = domainsHTML;
  }

  updateSessionStatus() {
    const sessionStatus = document.getElementById('sessionStatus');
    if (!sessionStatus) return;

    // Check if there's an active session
    PopupUtils.getStorage(['currentSession']).then(data => {
      if (data.currentSession) {
        const session = data.currentSession;
        sessionStatus.innerHTML = `
          Active Session:
          Type: ${session.type}
          Remaining: ${PopupUtils.formatTime(session.timeRemaining)}
          Started: ${new Date(session.startTime).toLocaleTimeString()}
        `;
      } else {
        sessionStatus.innerHTML = 'No active session';
      }
    });
  }

  updateDurationButtons() {
    const durationBtns = document.querySelectorAll('.duration-btn');
    durationBtns.forEach(btn => {
      const duration = parseInt(btn.dataset.duration);
      btn.classList.toggle('active', duration === this.selectedDuration);
    });
  }

  selectTestDuration(duration) {
    this.selectedDuration = duration;
    this.updateDurationButtons();
  }

  // Current tab testing
  async addCurrentDomainTest() {
    if (!this.currentTab) {
      this.showTestMessage('No current tab available', 'error');
      return;
    }

    const domain = PopupUtils.extractDomain(this.currentTab.url);
    if (!domain) {
      this.showTestMessage('Cannot extract domain from current URL', 'error');
      return;
    }

    if (this.workDomains.includes(domain)) {
      this.showTestMessage('Domain already exists in work domains', 'warning');
      return;
    }

    try {
      this.workDomains.push(domain);
      await PopupUtils.setStorage({ workDomains: this.workDomains });
      
      this.showTestMessage(`Added "${domain}" to work domains`, 'success');
      this.updateUI();
      this.logToConsole('info', `Domain added: ${domain}`);
    } catch (error) {
      this.showTestMessage('Failed to add domain', 'error');
      this.logToConsole('error', 'Failed to add domain:', error);
    }
  }

  async refreshTabInfo() {
    try {
      this.currentTab = await PopupUtils.getCurrentTab();
      this.updateCurrentTabDisplay();
      this.showTestMessage('Tab information refreshed', 'success');
      this.logToConsole('info', 'Tab information refreshed');
    } catch (error) {
      this.showTestMessage('Failed to refresh tab info', 'error');
      this.logToConsole('error', 'Failed to refresh tab info:', error);
    }
  }

  // Quick action tests
  async triggerTestPopup() {
    try {
      const response = await PopupUtils.sendMessage({
        type: 'TRIGGER_TEST_POPUP',
        tabId: this.currentTab.id
      });
      
      if (response && response.success) {
        this.showTestMessage('Test popup triggered successfully', 'success');
        this.logToConsole('info', 'Test popup triggered');
      } else {
        this.showTestMessage('Failed to trigger test popup', 'error');
        this.logToConsole('error', 'Test popup trigger failed');
      }
    } catch (error) {
      this.showTestMessage('Error triggering test popup', 'error');
      this.logToConsole('error', 'Test popup error:', error);
    }
  }

  async simulateDistraction() {
    try {
      const response = await PopupUtils.sendMessage({
        type: 'SIMULATE_DISTRACTION',
        domain: PopupUtils.extractDomain(this.currentTab.url)
      });
      
      if (response && response.success) {
        this.showTestMessage('Distraction event simulated', 'success');
        this.logToConsole('info', 'Distraction simulated');
      } else {
        this.showTestMessage('Failed to simulate distraction', 'error');
        this.logToConsole('error', 'Distraction simulation failed');
      }
    } catch (error) {
      this.showTestMessage('Error simulating distraction', 'error');
      this.logToConsole('error', 'Distraction simulation error:', error);
    }
  }

  async testNotification() {
    try {
      await PopupUtils.showNotification(
        'Test Notification',
        'This is a test notification from Study Focus extension'
      );
      this.showTestMessage('Test notification sent', 'success');
      this.logToConsole('info', 'Test notification sent');
    } catch (error) {
      this.showTestMessage('Failed to send notification', 'error');
      this.logToConsole('error', 'Notification test error:', error);
    }
  }

  // Manual domain testing
  async addManualDomain() {
    const input = document.getElementById('domainInput');
    if (!input) return;

    const domain = input.value.trim().toLowerCase();
    
    if (!domain) {
      this.showTestMessage('Please enter a domain', 'error');
      return;
    }

    if (!PopupUtils.isValidDomain(domain)) {
      this.showTestMessage('Invalid domain format', 'error');
      return;
    }

    if (this.workDomains.includes(domain)) {
      this.showTestMessage('Domain already exists', 'warning');
      return;
    }

    try {
      this.workDomains.push(domain);
      await PopupUtils.setStorage({ workDomains: this.workDomains });
      
      input.value = '';
      this.showTestMessage(`Added "${domain}" to work domains`, 'success');
      this.updateUI();
      this.logToConsole('info', `Manual domain added: ${domain}`);
    } catch (error) {
      this.showTestMessage('Failed to add domain', 'error');
      this.logToConsole('error', 'Failed to add manual domain:', error);
    }
  }

  async clearAllDomains() {
    if (this.workDomains.length === 0) {
      this.showTestMessage('No domains to clear', 'warning');
      return;
    }

    if (confirm(`Clear all ${this.workDomains.length} work domains?`)) {
      try {
        this.workDomains = [];
        await PopupUtils.setStorage({ workDomains: [] });
        
        this.showTestMessage('All work domains cleared', 'success');
        this.updateUI();
        this.logToConsole('info', 'All domains cleared');
      } catch (error) {
        this.showTestMessage('Failed to clear domains', 'error');
        this.logToConsole('error', 'Failed to clear domains:', error);
      }
    }
  }

  // Session testing
  async startTestSession() {
    try {
      const duration = this.selectedDuration * 60; // Convert minutes to seconds
      
      const response = await PopupUtils.sendMessage({
        type: 'START_TEST_SESSION',
        duration: duration,
        sessionType: 'test'
      });
      
      if (response && response.success) {
        this.showTestMessage(`Started test session (${this.selectedDuration}min)`, 'success');
        this.updateSessionStatus();
        this.logToConsole('info', `Test session started: ${duration}s`);
      } else {
        this.showTestMessage('Failed to start test session', 'error');
        this.logToConsole('error', 'Test session start failed');
      }
    } catch (error) {
      this.showTestMessage('Error starting test session', 'error');
      this.logToConsole('error', 'Test session start error:', error);
    }
  }

  async endTestSession() {
    try {
      const response = await PopupUtils.sendMessage({
        type: 'END_TEST_SESSION'
      });
      
      if (response && response.success) {
        this.showTestMessage('Test session ended', 'success');
        this.updateSessionStatus();
        this.logToConsole('info', 'Test session ended');
      } else {
        this.showTestMessage('Failed to end test session', 'error');
        this.logToConsole('error', 'Test session end failed');
      }
    } catch (error) {
      this.showTestMessage('Error ending test session', 'error');
      this.logToConsole('error', 'Test session end error:', error);
    }
  }

  // API testing
  async testBackgroundCommunication() {
    const resultDiv = document.getElementById('backgroundCommResult');
    if (!resultDiv) return;

    resultDiv.textContent = 'Testing...';
    resultDiv.className = 'test-result loading';

    try {
      const testMessage = {
        type: 'TEST_COMMUNICATION',
        timestamp: Date.now(),
        data: { test: 'communication check' }
      };

      const response = await PopupUtils.sendMessage(testMessage);
      
      if (response) {
        resultDiv.textContent = `✅ Success: ${JSON.stringify(response)}`;
        resultDiv.className = 'test-result success';
        this.logToConsole('info', 'Background communication test passed:', response);
      } else {
        resultDiv.textContent = '❌ No response from background script';
        resultDiv.className = 'test-result error';
        this.logToConsole('error', 'Background communication test failed: No response');
      }
    } catch (error) {
      resultDiv.textContent = `❌ Error: ${error.message}`;
      resultDiv.className = 'test-result error';
      this.logToConsole('error', 'Background communication test error:', error);
    }
  }

  async testStorageAPI() {
    const resultDiv = document.getElementById('storageResult');
    if (!resultDiv) return;

    resultDiv.textContent = 'Testing...';
    resultDiv.className = 'test-result loading';

    try {
      const testData = {
        testKey: 'testValue',
        timestamp: Date.now(),
        number: 42,
        array: [1, 2, 3],
        object: { nested: true }
      };

      // Test write
      await PopupUtils.setStorage({ testStorage: testData });
      
      // Test read
      const result = await PopupUtils.getStorage(['testStorage']);
      
      if (JSON.stringify(result.testStorage) === JSON.stringify(testData)) {
        resultDiv.textContent = '✅ Storage read/write successful';
        resultDiv.className = 'test-result success';
        this.logToConsole('info', 'Storage API test passed');
        
        // Clean up
        await PopupUtils.removeStorage(['testStorage']);
      } else {
        resultDiv.textContent = '❌ Data mismatch in storage test';
        resultDiv.className = 'test-result error';
        this.logToConsole('error', 'Storage API test failed: Data mismatch');
      }
    } catch (error) {
      resultDiv.textContent = `❌ Error: ${error.message}`;
      resultDiv.className = 'test-result error';
      this.logToConsole('error', 'Storage API test error:', error);
    }
  }

  // Debug functionality
  initializeDebugConsole() {
    this.consoleLogs = [];
    
    // Override console methods to capture logs
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };

    ['log', 'warn', 'error', 'info'].forEach(level => {
      console[level] = (...args) => {
        originalConsole[level](...args);
        this.logToConsole(level, ...args);
      };
    });
  }

  logToConsole(level, ...args) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      level,
      timestamp,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
    };

    this.consoleLogs.push(logEntry);
    
    // Keep only last 50 logs
    if (this.consoleLogs.length > 50) {
      this.consoleLogs = this.consoleLogs.slice(-50);
    }

    this.updateConsoleDisplay();
  }

  updateConsoleDisplay() {
    const consoleLogsDiv = document.getElementById('consoleLogs');
    if (!consoleLogsDiv) return;

    const logsHTML = this.consoleLogs.map(log => `
      <div class="console-log-entry">
        <span class="console-log-timestamp">${log.timestamp}</span>
        <span class="console-log-level ${log.level}">[${log.level.toUpperCase()}]</span>
        <span class="console-log-message">${log.message}</span>
      </div>
    `).join('');

    consoleLogsDiv.innerHTML = logsHTML;
    consoleLogsDiv.scrollTop = consoleLogsDiv.scrollHeight;
  }

  clearConsoleLogs() {
    this.consoleLogs = [];
    this.updateConsoleDisplay();
    this.showTestMessage('Console logs cleared', 'info');
  }

  toggleDebugConsole() {
    const debugConsole = document.getElementById('debugConsole');
    const toggleBtn = document.getElementById('toggleDebugConsole');
    
    if (debugConsole && toggleBtn) {
      const isVisible = debugConsole.style.display !== 'none';
      debugConsole.style.display = isVisible ? 'none' : 'block';
      toggleBtn.textContent = isVisible ? '+' : '−';
    }
  }

  async refreshDebugInfo() {
    const extensionInfoDiv = document.getElementById('extensionInfo');
    const storageDataDiv = document.getElementById('storageData');

    if (extensionInfoDiv) {
      extensionInfoDiv.textContent = JSON.stringify(this.extensionInfo, null, 2);
    }

    if (storageDataDiv) {
      try {
        const allData = await PopupUtils.getStorage(null);
        storageDataDiv.textContent = JSON.stringify(allData, null, 2);
      } catch (error) {
        storageDataDiv.textContent = `Error loading storage: ${error.message}`;
      }
    }

    this.showTestMessage('Debug info refreshed', 'info');
  }

  updateDebugInfo() {
    // Initial load of debug info
    setTimeout(() => this.refreshDebugInfo(), 100);
  }

  // Data management
  exportTestData() {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      workDomains: this.workDomains,
      testResults: this.testResults,
      consoleLogs: this.consoleLogs,
      extensionInfo: this.extensionInfo
    };

    const filename = `study-focus-test-data-${new Date().toISOString().split('T')[0]}.json`;
    PopupUtils.downloadJSON(exportData, filename);
    this.showTestMessage('Test data exported successfully', 'success');
  }

  importTestData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const content = await PopupUtils.readFileAsText(file);
        const importData = JSON.parse(content);
        
        if (importData.workDomains) {
          this.workDomains = importData.workDomains;
          await PopupUtils.setStorage({ workDomains: this.workDomains });
        }
        
        if (importData.consoleLogs) {
          this.consoleLogs = importData.consoleLogs;
          this.updateConsoleDisplay();
        }

        this.updateUI();
        this.showTestMessage('Test data imported successfully', 'success');
      } catch (error) {
        this.showTestMessage('Failed to import test data', 'error');
        this.logToConsole('error', 'Import failed:', error);
      }
    };

    input.click();
  }

  async resetTestData() {
    if (confirm('Reset all test data? This will clear domains, logs, and test results.')) {
      try {
        this.workDomains = [];
        this.testResults = {};
        this.consoleLogs = [];
        
        await PopupUtils.clearStorage();
        
        this.updateUI();
        this.showTestMessage('Test data reset successfully', 'success');
        this.logToConsole('info', 'Test data reset');
      } catch (error) {
        this.showTestMessage('Failed to reset test data', 'error');
        this.logToConsole('error', 'Reset failed:', error);
      }
    }
  }

  showTestMessage(text, type = 'info') {
    const messageEl = document.getElementById('testingMessage');
    if (!messageEl) return;

    messageEl.className = `testing-message ${type}`;
    messageEl.textContent = text;
    messageEl.classList.add('show');

    setTimeout(() => {
      messageEl.classList.remove('show');
    }, 3000);
  }
}

// Initialize testing manager when page loads
let testingManager;

document.addEventListener('DOMContentLoaded', () => {
  testingManager = new TestingManager();
});

// Export for global access
window.testingManager = testingManager;
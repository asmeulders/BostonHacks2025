// Domain Manager JavaScript functionality

export class DomainManager {
  constructor() {
    this.currentTab = null;
    this.workDomains = [];
    this.isLoading = false;
    
    this.init();
  }

  async init() {
    try {
      await this.loadCurrentTab();
      await this.loadWorkDomains();
      this.setupEventListeners();
      this.updateUI();
    } catch (error) {
      PopupUtils.logError('Failed to initialize domain manager:', error);
      PopupUtils.showError('Failed to initialize. Please refresh the page.');
    }
  }

  async loadCurrentTab() {
    try {
      this.currentTab = await PopupUtils.getCurrentTab();
    } catch (error) {
      PopupUtils.logError('Failed to load current tab:', error);
      throw error;
    }
  }

  async loadWorkDomains() {
    try {
      const data = await PopupUtils.getStorage(['workDomains']);
      this.workDomains = data.workDomains || [];
    } catch (error) {
      PopupUtils.logError('Failed to load work domains:', error);
      throw error;
    }
  }

  async saveWorkDomains() {
    try {
      await PopupUtils.setStorage({ workDomains: this.workDomains });
      return true;
    } catch (error) {
      PopupUtils.logError('Failed to save work domains:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // Add current domain button
    const addCurrentBtn = document.getElementById('addCurrentDomain');
    if (addCurrentBtn) {
      addCurrentBtn.addEventListener('click', () => this.addCurrentDomain());
    }

    // Manual domain input
    const domainInput = document.getElementById('domainInput');
    const addBtn = document.getElementById('addDomain');
    
    if (domainInput && addBtn) {
      addBtn.addEventListener('click', () => this.addManualDomain());
      domainInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addManualDomain();
        }
      });
      
      // Real-time validation
      domainInput.addEventListener('input', () => this.validateDomainInput());
    }

    // Clear all domains button
    const clearAllBtn = document.getElementById('clearAll');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => this.clearAllDomains());
    }

    document.getElementById("workDomains").addEventListener("click", (event) => {
      if (event.target.closest(".domain-remove")) {
        const item = event.target.closest(".domain-item");
        if (item) {
          const domain = item.dataset.domain;
          console.log("Removing domain:", domain);

          // Remove from UI
          item.remove();

          this.removeDomain(domain);
        }
      }
    });
  }

  updateUI() {
    this.updateCurrentTabDisplay();
    this.updateDomainsList();
  }

  updateCurrentTabDisplay() {
    const tabDisplay = document.getElementById('currentTab');
    if (!tabDisplay || !this.currentTab) return;

    const domain = PopupUtils.extractDomain(this.currentTab.url);
    const isWorkDomain = domain && this.workDomains.includes(domain);
    
    tabDisplay.innerHTML = `
      <div class="tab-info">
        <div class="tab-title">${PopupUtils.sanitizeInput(this.currentTab.title)}</div>
        <div class="tab-domain">${domain || 'No domain'}</div>
        <div class="tab-url">${PopupUtils.sanitizeInput(this.currentTab.url)}</div>
        <div class="tab-status">
          <span class="status-indicator ${isWorkDomain ? 'work' : 'non-work'}"></span>
          ${isWorkDomain ? 'Work Domain' : 'Non-Work Domain'}
        </div>
      </div>
    `;

    // Update add current domain button
    const addCurrentBtn = document.getElementById('addCurrentDomain');
    if (addCurrentBtn) {
      if (domain && !this.workDomains.includes(domain)) {
        addCurrentBtn.disabled = false;
        addCurrentBtn.textContent = `Add "${domain}" as Work`;
      } else if (domain && this.workDomains.includes(domain)) {
        addCurrentBtn.disabled = true;
        addCurrentBtn.textContent = `"${domain}" Already Added`;
      } else {
        addCurrentBtn.disabled = true;
        addCurrentBtn.textContent = 'No Valid Domain';
      }
    }
  }

  updateDomainsList() {
    const domainsList = document.getElementById('workDomains');
    if (!domainsList) return;

    if (this.workDomains.length === 0) {
      domainsList.innerHTML = `
        <div class="empty-domains">
          <span class="empty-domains-icon">🌐</span>
          No work domains added yet. Add your work websites to get started!
        </div>
      `;
      return;
    }

    const domainsHTML = this.workDomains.map((domain, index) => `
      <div class="domain-item" data-domain="${domain}">
        <span class="domain-name">${domain}</span>
        <div class="domain-actions">
          <button class="domain-remove" title="Remove domain">
            🗑️
          </button>
        </div>
      </div>
    `).join('');

    domainsList.innerHTML = domainsHTML;
  }

  getCurrentDomainStatus() {
    if (!this.currentTab) {
      return { emoji: '❓', label: 'Unknown' };
    }

    const domain = PopupUtils.extractDomain(this.currentTab.url);
    if (!domain) {
      return { emoji: '🚫', label: 'No Domain' };
    }

    const isWorkDomain = this.workDomains.includes(domain);
    return {
      emoji: isWorkDomain ? '✅' : '⚠️',
      label: isWorkDomain ? 'Work Site' : 'Non-Work'
    };
  }

  validateDomainInput() {
    const input = document.getElementById('domainInput');
    const validation = document.getElementById('domainValidation');
    
    if (!input || !validation) return;

    const domain = input.value.trim().toLowerCase();
    
    if (!domain) {
      validation.textContent = '';
      validation.className = 'domain-validation';
      return;
    }

    if (PopupUtils.isValidDomain(domain)) {
      if (this.workDomains.includes(domain)) {
        validation.textContent = 'Domain already exists';
        validation.className = 'domain-validation invalid';
      } else {
        validation.textContent = 'Valid domain';
        validation.className = 'domain-validation valid';
      }
    } else {
      validation.textContent = 'Invalid domain format';
      validation.className = 'domain-validation invalid';
    }
  }

  // async addDomain(domain) {
  //   if (!domain) {
  //     PopupUtils.showError('Cannot extract domain from current URL');
  //     return;
  //   }

  //   if (this.workDomains.includes(domain)) {
  //     PopupUtils.showWarning('Domain is already in work domains list');
  //     return;
  //   }

  //   try {
  //     this.workDomains.push(domain);
  //     await this.saveWorkDomains();
      
  //     // Notify background script
  //     await PopupUtils.sendMessage({
  //       type: 'DOMAIN_ADDED',
  //       domain: domain
  //     });

  //     PopupUtils.showSuccess(`Added "${domain}" to work domains`);
  //     this.updateUI();
  //   } catch (error) {
  //     PopupUtils.logError('Failed to add current domain:', error);
  //     PopupUtils.showError('Failed to add domain. Please try again.');
  //   }
  // }

  async addCurrentDomain() {
    if (!this.currentTab) {
      PopupUtils.showError('No current tab information available');
      return;
    }

    const domain = PopupUtils.extractDomain(this.currentTab.url);
    if (!domain) {
      PopupUtils.showError('Cannot extract domain from current URL');
      return;
    }

    if (this.workDomains.includes(domain)) {
      PopupUtils.showWarning('Domain is already in work domains list');
      return;
    }

    try {
      this.workDomains.push(domain);
      await this.saveWorkDomains();
      
      // Notify background script
      await PopupUtils.sendMessage({
        type: 'DOMAIN_ADDED',
        domain: domain
      });

      PopupUtils.showSuccess(`Added "${domain}" to work domains`);
      this.updateUI();
    } catch (error) {
      PopupUtils.logError('Failed to add current domain:', error);
      PopupUtils.showError('Failed to add domain. Please try again.');
    }
  }

  async addManualDomain() {
    const input = document.getElementById('domainInput');
    if (!input) return;

    const domain = input.value.trim().toLowerCase();
    
    if (!domain) {
      PopupUtils.showError('Please enter a domain');
      return;
    }

    if (!PopupUtils.isValidDomain(domain)) {
      PopupUtils.showError('Please enter a valid domain format');
      return;
    }

    if (this.workDomains.includes(domain)) {
      PopupUtils.showWarning('Domain already exists in work domains');
      return;
    }

    try {
      this.workDomains.push(domain);
      await this.saveWorkDomains();
      
      // Notify background script
      await PopupUtils.sendMessage({
        type: 'DOMAIN_ADDED',
        domain: domain
      });

      input.value = '';
      this.validateDomainInput();
      PopupUtils.showSuccess(`Added "${domain}" to work domains`);
      this.updateUI();
    } catch (error) {
      PopupUtils.logError('Failed to add manual domain:', error);
      PopupUtils.showError('Failed to add domain. Please try again.');
    }
  }

  async removeDomain(domain) {
    console.log(`Attempting to remove ${domain}...`);
    const index = this.workDomains.indexOf(domain);

    if (confirm(`Remove "${domain}" from work domains?`)) {
      try {
        this.workDomains.splice(index, 1);
        console.log(`Work domains: ${this.workDomains}`)
        await this.saveWorkDomains();
        
        // Notify background script
        await PopupUtils.sendMessage({
          type: 'DOMAIN_REMOVED',
          domain: domain
        });

        PopupUtils.showSuccess(`Removed "${domain}" from work domains`);
        this.updateUI();
      } catch (error) {
        PopupUtils.logError('Failed to remove domain:', error);
        PopupUtils.showError('Failed to remove domain. Please try again.');
      }
    } else {
      console.log("Declined to remove ${domain}");
    }
  }

  async clearAllDomains() {
    if (this.workDomains.length === 0) {
      PopupUtils.showWarning('No domains to clear');
      return;
    }

    if (confirm(`Remove all ${this.workDomains.length} work domains?`)) {
      try {
        this.workDomains = [];
        await this.saveWorkDomains();
        
        // Notify background script
        await PopupUtils.sendMessage({
          type: 'ALL_DOMAINS_CLEARED'
        });

        PopupUtils.showSuccess('All work domains cleared');
        this.updateUI();
      } catch (error) {
        PopupUtils.logError('Failed to clear domains:', error);
        PopupUtils.showError('Failed to clear domains. Please try again.');
      }
    }
  }
}

export const domainManager = new DomainManager();
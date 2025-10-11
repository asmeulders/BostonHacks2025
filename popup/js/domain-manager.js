// Domain Manager JavaScript functionality

class DomainManager {
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

    // Refresh tab info button
    const refreshBtn = document.getElementById('refreshTabInfo');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshTabInfo());
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
    const clearAllBtn = document.getElementById('clearAllDomains');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => this.clearAllDomains());
    }

    // Import/Export buttons
    const exportBtn = document.getElementById('exportDomains');
    const importBtn = document.getElementById('importDomains');
    const importFile = document.getElementById('importFile');
    
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportDomains());
    }
    
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', (e) => this.importDomains(e));
    }

    // Search functionality
    const searchInput = document.getElementById('domainSearch');
    if (searchInput) {
      searchInput.addEventListener('input', PopupUtils.debounce(() => {
        this.filterDomains(searchInput.value);
      }, 300));
    }

    // Filter tabs
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.setActiveFilter(e.target.dataset.filter);
      });
    });
  }

  updateUI() {
    this.updateCurrentTabDisplay();
    this.updateDomainsList();
    this.updateStatistics();
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
          <button class="domain-edit" onclick="domainManager.editDomain(${index})" title="Edit domain">
            ✏️
          </button>
          <button class="domain-remove" onclick="domainManager.removeDomain(${index})" title="Remove domain">
            🗑️
          </button>
        </div>
      </div>
    `).join('');

    domainsList.innerHTML = domainsHTML;
  }

  updateStatistics() {
    const statsContainer = document.getElementById('domainStats');
    if (!statsContainer) return;

    const totalDomains = this.workDomains.length;
    const currentDomainStatus = this.getCurrentDomainStatus();
    
    statsContainer.innerHTML = `
      <div class="stat-card">
        <span class="stat-number">${totalDomains}</span>
        <span class="stat-label">Work Domains</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">${currentDomainStatus.emoji}</span>
        <span class="stat-label">${currentDomainStatus.label}</span>
      </div>
    `;
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

  async removeDomain(index) {
    if (index < 0 || index >= this.workDomains.length) return;

    const domain = this.workDomains[index];
    
    if (confirm(`Remove "${domain}" from work domains?`)) {
      try {
        this.workDomains.splice(index, 1);
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
    }
  }

  async editDomain(index) {
    if (index < 0 || index >= this.workDomains.length) return;

    const currentDomain = this.workDomains[index];
    const newDomain = prompt(`Edit domain:`, currentDomain);
    
    if (newDomain === null) return; // User cancelled
    
    const trimmedDomain = newDomain.trim().toLowerCase();
    
    if (!trimmedDomain) {
      PopupUtils.showError('Domain cannot be empty');
      return;
    }

    if (!PopupUtils.isValidDomain(trimmedDomain)) {
      PopupUtils.showError('Please enter a valid domain format');
      return;
    }

    if (trimmedDomain !== currentDomain && this.workDomains.includes(trimmedDomain)) {
      PopupUtils.showError('Domain already exists in work domains');
      return;
    }

    if (trimmedDomain === currentDomain) {
      return; // No change
    }

    try {
      this.workDomains[index] = trimmedDomain;
      await this.saveWorkDomains();
      
      // Notify background script
      await PopupUtils.sendMessage({
        type: 'DOMAIN_UPDATED',
        oldDomain: currentDomain,
        newDomain: trimmedDomain
      });

      PopupUtils.showSuccess(`Updated domain to "${trimmedDomain}"`);
      this.updateUI();
    } catch (error) {
      PopupUtils.logError('Failed to edit domain:', error);
      PopupUtils.showError('Failed to update domain. Please try again.');
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

  async refreshTabInfo() {
    try {
      await this.loadCurrentTab();
      this.updateCurrentTabDisplay();
      PopupUtils.showSuccess('Tab information refreshed');
    } catch (error) {
      PopupUtils.logError('Failed to refresh tab info:', error);
      PopupUtils.showError('Failed to refresh tab information');
    }
  }

  exportDomains() {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      workDomains: this.workDomains,
      totalCount: this.workDomains.length
    };

    const filename = `study-focus-domains-${new Date().toISOString().split('T')[0]}.json`;
    PopupUtils.downloadJSON(exportData, filename);
    PopupUtils.showSuccess('Domains exported successfully');
  }

  async importDomains(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const content = await PopupUtils.readFileAsText(file);
      const importData = JSON.parse(content);
      
      if (!importData.workDomains || !Array.isArray(importData.workDomains)) {
        throw new Error('Invalid file format');
      }

      const validDomains = importData.workDomains.filter(domain => 
        typeof domain === 'string' && PopupUtils.isValidDomain(domain)
      );

      if (validDomains.length === 0) {
        PopupUtils.showError('No valid domains found in import file');
        return;
      }

      // Merge with existing domains
      const newDomains = validDomains.filter(domain => !this.workDomains.includes(domain));
      
      if (newDomains.length === 0) {
        PopupUtils.showWarning('All domains from import file already exist');
        return;
      }

      this.workDomains.push(...newDomains);
      await this.saveWorkDomains();
      
      // Notify background script
      await PopupUtils.sendMessage({
        type: 'DOMAINS_IMPORTED',
        domains: newDomains
      });

      PopupUtils.showSuccess(`Imported ${newDomains.length} new domains`);
      this.updateUI();
    } catch (error) {
      PopupUtils.logError('Failed to import domains:', error);
      PopupUtils.showError('Failed to import domains. Please check the file format.');
    } finally {
      event.target.value = ''; // Reset file input
    }
  }

  filterDomains(searchTerm) {
    const domainItems = document.querySelectorAll('.domain-item');
    const normalizedSearch = searchTerm.toLowerCase().trim();

    domainItems.forEach(item => {
      const domain = item.dataset.domain.toLowerCase();
      const matches = domain.includes(normalizedSearch);
      item.style.display = matches ? 'flex' : 'none';
    });

    // Update results count
    const visibleCount = Array.from(domainItems).filter(item => 
      item.style.display !== 'none'
    ).length;
    
    this.updateSearchResults(visibleCount, this.workDomains.length);
  }

  updateSearchResults(visibleCount, totalCount) {
    let resultsInfo = document.getElementById('searchResults');
    if (!resultsInfo) {
      resultsInfo = document.createElement('div');
      resultsInfo.id = 'searchResults';
      resultsInfo.className = 'search-results-info';
      const domainsList = document.getElementById('workDomains');
      if (domainsList && domainsList.parentNode) {
        domainsList.parentNode.insertBefore(resultsInfo, domainsList);
      }
    }

    if (visibleCount === totalCount) {
      resultsInfo.textContent = '';
    } else {
      resultsInfo.textContent = `Showing ${visibleCount} of ${totalCount} domains`;
    }
  }

  setActiveFilter(filter) {
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === filter);
    });

    // Apply filter logic here if needed
    // For now, we'll just update the UI
    this.updateDomainsList();
  }
}

// Initialize domain manager when page loads
let domainManager;

document.addEventListener('DOMContentLoaded', () => {
  domainManager = new DomainManager();
});

// Export for global access
window.domainManager = domainManager;
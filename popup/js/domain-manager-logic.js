// domain-manager-logic.js
export class DomainManagerLogic {
  constructor() {
    this.workDomains = [];
  }

  async load() {
    const data = await chrome.storage.local.get('workDomains');
    this.workDomains = data.workDomains || [];
  }

  async save() {
    await chrome.storage.local.set({ workDomains: this.workDomains });
  }

  async add(domain) {
    if (!this.workDomains.includes(domain)) {
      this.workDomains.push(domain);
      await this.save();
    }
  }

  async remove(domain) {
    this.workDomains = this.workDomains.filter(d => d !== domain);
    await this.save();
  }

  async clearAll() {
    this.workDomains = [];
    await this.save();
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

  async saveWorkDomains() {
    try {
      await PopupUtils.setStorage({ workDomains: this.workDomains });
      return true;
    } catch (error) {
      PopupUtils.logError('Failed to save work domains:', error);
      throw error;
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
      // this.updateUI();
    } catch (error) {
      PopupUtils.logError('Failed to add manual domain:', error);
      PopupUtils.showError('Failed to add domain. Please try again.');
    }
  }
}

export const domainManagerLogic = new DomainManagerLogic();

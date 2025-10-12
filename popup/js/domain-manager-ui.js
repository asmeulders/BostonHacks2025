// domain-manager-ui.js
import { domainManagerLogic } from './domain-manager-logic.js';

export class DomainManagerUI {
  constructor() {
    this.logic = domainManagerLogic;
    this.initUI();
  }

  async initUI() {
    await this.logic.load();
    this.updateUI();
    this.setupEventListeners();
  }

  setupEventListeners() {
    console.log("here")
    document.getElementById('workDomains').addEventListener('click', async (event) => {
      const btn = event.target.closest('.domain-remove');
      if (!btn) return;

      const item = btn.closest('.domain-item');
      const domain = item.dataset.domain;
      if (confirm(`Remove "${domain}"?`)) {
        await this.logic.remove(domain);
        this.updateUI();
      }
    });

    // // Add domain button
    // const addBtn = document.getElementById('addCurrentDomain');
    // if (addBtn) {
    //   addBtn.addEventListener('click', async () => {
    //     const tabDisplay = document.getElementById('currentTab');
    //     if (!tabDisplay || !this.currentTab) return;
    //     const domain = PopupUtils.extractDomain(this.currentTab.url);;
    //     await this.logic.add(domain);
    //     this.updateUI();
    //   });
    // }

    // Manual domain input
    const domainInput = document.getElementById('domainInput');
    const addBtn = document.getElementById('addDomain');
    console.log(domainInput, addBtn)
    
    if (domainInput && addBtn) {
      addBtn.addEventListener('click', () => {
        domainManagerLogic.addManualDomain();
        this.updateUI();
        console.log("added");
      });
      domainInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          domainManagerLogic.addManualDomain();
        }
      });
      
      // Real-time validation
      domainInput.addEventListener('input', () => this.logic.validateDomainInput());
    }
  }

  updateDomainsList() {
    const domainsList = document.getElementById('workDomains');
    if (!domainsList) return;

    if (this.logic.workDomains.length === 0) {
      domainsList.innerHTML = `
        <div class="empty-domains">
          <span class="empty-domains-icon">🌐</span>
          No work domains added yet. Add your work websites to get started!
        </div>
      `;
      return;
    }

    const domainsHTML = this.logic.workDomains.map((domain, index) => `
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

  updateUI() {
    this.updateDomainsList();
    const container = document.getElementById('workDomains');
    container.innerHTML = '';
    this.logic.workDomains.forEach(domain => {
      const div = document.createElement('div');
      div.className = 'domain-item';
      div.dataset.domain = domain;
      div.innerHTML = `<span>${domain}</span><button class="domain-remove">🗑️</button>`;
      container.appendChild(div);
    });
    this.updateCurrentTabDisplay()
  }
}

const domainManagerUI = new DomainManagerUI();

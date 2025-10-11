// Main popup index JavaScript functionality

class MainPopupManager {
  constructor() {
    this.currentTab = null;
    this.workDomains = [];
    this.currentSession = null;
    
    this.init();
  }

  async init() {
    try {
      await this.loadCurrentData();
      this.setupEventListeners();
    } catch (error) {
      PopupUtils.logError('Failed to initialize main popup:', error);
      PopupUtils.showError('Failed to initialize. Please refresh the extension.');
    }
  }

  async loadCurrentData() {
    try {
      // Load current tab
      this.currentTab = await PopupUtils.getCurrentTab();
      
      // Load work domains
      const storage = await PopupUtils.getStorage(['workDomains', 'currentSession']);
      this.workDomains = storage.workDomains || [];
      this.currentSession = storage.currentSession || null;
    } catch (error) {
      PopupUtils.logError('Failed to load current data:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // Quick add domain button
    const quickAddBtn = document.getElementById('quickAddDomain');
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', () => this.quickAddCurrentDomain());
    }

    // Quick start session button
    const quickStartBtn = document.getElementById('quickStartSession');
    if (quickStartBtn) {
      quickStartBtn.addEventListener('click', () => this.quickStartSession());
    }

    // Navigation cards - add hover effects and click handling
    const navCards = document.querySelectorAll('.nav-card');
    navCards.forEach(card => {
      card.addEventListener('click', (e) => {
        // Add a small loading indicator
        const originalText = card.innerHTML;
        card.style.opacity = '0.7';
        
        // Reset after navigation
        setTimeout(() => {
          card.style.opacity = '1';
        }, 500);
      });
    });
  }

  updateQuickActions(currentDomain, isWorkDomain) {
    const quickAddBtn = document.getElementById('quickAddDomain');
    const quickStartBtn = document.getElementById('quickStartSession');

    // Update add domain button
    if (quickAddBtn) {
      if (currentDomain && !isWorkDomain) {
        quickAddBtn.disabled = false;
        quickAddBtn.textContent = `Add "${currentDomain}"`;
        quickAddBtn.title = `Add ${currentDomain} to work domains`;
      } else if (currentDomain && isWorkDomain) {
        quickAddBtn.disabled = true;
        quickAddBtn.textContent = 'Already Added';
        quickAddBtn.title = `${currentDomain} is already a work domain`;
      } else {
        quickAddBtn.disabled = true;
        quickAddBtn.textContent = 'No Valid Domain';
        quickAddBtn.title = 'No valid domain to add';
      }
    }

    // Update start session button
    if (quickStartBtn) {
      if (this.currentSession) {
        quickStartBtn.disabled = true;
        quickStartBtn.textContent = 'Session Active';
        quickStartBtn.className = 'action-button secondary';
        quickStartBtn.title = 'A session is already running';
      } else {
        quickStartBtn.disabled = false;
        quickStartBtn.textContent = 'Start Focus Session';
        quickStartBtn.className = 'action-button success';
        quickStartBtn.title = 'Start a 25-minute focus session';
      }
    }
  }

  async getTodayStatistics() {
    try {
      const storage = await PopupUtils.getStorage(['sessionHistory']);
      const sessionHistory = storage.sessionHistory || [];
      
      const today = new Date().toDateString();
      const todaySessions = sessionHistory.filter(session => 
        new Date(session.endTime).toDateString() === today &&
        session.completed &&
        session.type === 'pomodoro'
      );

      const totalTime = todaySessions.reduce((sum, session) => sum + session.duration, 0);

      return {
        sessions: todaySessions.length,
        totalTime: totalTime
      };
    } catch (error) {
      PopupUtils.logError('Failed to get today statistics:', error);
      return { sessions: 0, totalTime: 0 };
    }
  }

  async quickAddCurrentDomain() {
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
      // Update local state
      this.workDomains.push(domain);
      
      // Save to storage
      await PopupUtils.setStorage({ workDomains: this.workDomains });
      
      // Notify background script
      await PopupUtils.sendMessage({
        type: 'DOMAIN_ADDED',
        domain: domain
      });

      PopupUtils.showSuccess(`Added "${domain}" to work domains`);
      
      // Update UI
      await this.updateStatusDisplay();
      
    } catch (error) {
      PopupUtils.logError('Failed to add current domain:', error);
      PopupUtils.showError('Failed to add domain. Please try again.');
      
      // Revert local state
      const index = this.workDomains.indexOf(domain);
      if (index > -1) {
        this.workDomains.splice(index, 1);
      }
    }
  }

  async quickStartSession() {
    if (this.currentSession) {
      PopupUtils.showWarning('A session is already running');
      return;
    }

    try {
      // Start a default 25-minute pomodoro session
      const duration = 25 * 60; // 25 minutes in seconds
      
      const sessionData = {
        type: 'pomodoro',
        startTime: Date.now(),
        duration: duration,
        timeRemaining: duration,
        sessionCount: 0
      };

      // Save session data
      await PopupUtils.setStorage({ currentSession: sessionData });
      
      // Notify background script
      await PopupUtils.sendMessage({
        type: 'SESSION_STARTED',
        sessionType: 'pomodoro',
        duration: duration
      });

      this.currentSession = sessionData;
      PopupUtils.showSuccess('25-minute focus session started!');
      
      // Update UI
      await this.updateStatusDisplay();
      
      // Suggest navigating to session page
      setTimeout(() => {
        if (confirm('Session started! Would you like to open the Study Sessions page to view the timer?')) {
          window.location.href = 'pages/study-session.html';
        }
      }, 1000);
      
    } catch (error) {
      PopupUtils.logError('Failed to start quick session:', error);
      PopupUtils.showError('Failed to start session. Please try again.');
    }
  }

  // Refresh data periodically
  startPeriodicUpdate() {
    setInterval(() => {
      this.loadCurrentData().then(() => {
        this.updateStatusDisplay();
      }).catch(error => {
        PopupUtils.logError('Failed to refresh data:', error);
      });
    }, 5000); // Update every 5 seconds
  }
}

// Add custom styles for the status display
const customStyles = `
  .status-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }
  
  .status-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color);
  }
  
  .status-icon {
    font-size: var(--font-size-lg);
    flex-shrink: 0;
  }
  
  .status-info {
    flex: 1;
    min-width: 0;
  }
  
  .status-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    font-weight: 500;
    margin-bottom: 2px;
  }
  
  .status-value {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    font-weight: 600;
  }
  
  .status-detail {
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .status-error {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--danger-color);
    border-radius: var(--border-radius);
    color: var(--danger-color);
    text-align: center;
  }
  
  .quick-actions {
    display: flex;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }
  
  .quick-actions .action-button {
    flex: 1;
    min-width: 140px;
  }
  
  @media (max-width: 400px) {
    .status-grid {
      grid-template-columns: 1fr;
    }
    
    .quick-actions {
      flex-direction: column;
    }
    
    .quick-actions .action-button {
      width: 100%;
    }
  }
`;

// Inject custom styles
const styleSheet = document.createElement('style');
styleSheet.textContent = customStyles;
document.head.appendChild(styleSheet);

// Initialize main popup manager when page loads
let mainPopupManager;

document.addEventListener('DOMContentLoaded', () => {
  mainPopupManager = new MainPopupManager();
  
  // Start periodic updates
  mainPopupManager.startPeriodicUpdate();
});

// Export for global access
window.mainPopupManager = mainPopupManager;